# ==============================================================================
# Router: 店家後台 (/api/store)
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, time, timedelta

from database import get_db
from models import Store, Record, Cup
from schemas import (
    StoreLoginRequest,
    StoreLoginResponse,
    StoreChangePasswordRequest,
    StoreDashboardResponse,
    StoreRecordsResponse,
    StoreRecordItem,
    StoreCupsStockResponse,
    StoreCupItem,
)
from auth import create_store_token, get_current_store_id, get_password_hash, verify_password

router = APIRouter(prefix="/api/store", tags=["店家後台"])


# ── 店家登入 ──────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=StoreLoginResponse)
def store_login(req: StoreLoginRequest, db: Session = Depends(get_db)):
    """
    店家登入（store_id + 密碼）→ 核發 Store JWT。
    """
    store = db.query(Store).filter(Store.store_id == req.store_id).first()
    if not store:
        raise HTTPException(status_code=401, detail="店號不存在")

    if not verify_password(req.password, store.password_hash):
        raise HTTPException(status_code=401, detail="密碼錯誤")

    token = create_store_token(store.store_id)
    return StoreLoginResponse(
        access_token=token,
        store_id=store.store_id,
        store_name=store.name,
    )


# ── 修改密碼 ──────────────────────────────────────────────────────────────────

@router.post("/auth/change-password")
def store_change_password(
    req: StoreChangePasswordRequest,
    store_id: str = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    """修改店家密碼。"""
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="店家不存在")

    if not verify_password(req.old_password, store.password_hash):
        raise HTTPException(status_code=401, detail="舊密碼錯誤")

    store.password_hash = get_password_hash(req.new_password)
    db.commit()
    return {"message": "密碼已更新"}


# ── 店家儀表板 ────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=StoreDashboardResponse)
def store_dashboard(
    store_id: str = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    """取得本店今日借出/歸還數量與庫存。"""
    tz_taipei = timezone(timedelta(hours=8))
    today_start = datetime.combine(
        datetime.now(tz_taipei).date(), time.min
    ).replace(tzinfo=tz_taipei)

    today_borrowed = (
        db.query(Record)
        .filter(
            Record.borrow_store_id == store_id,
            Record.borrow_time >= today_start,
        )
        .count()
    )

    today_returned = (
        db.query(Record)
        .filter(
            Record.return_store_id == store_id,
            Record.return_time >= today_start,
        )
        .count()
    )

    store = db.query(Store).filter(Store.store_id == store_id).first()
    in_stock = store.cups_in_stock if store else 0

    overdue_unreturned = (
        db.query(Record)
        .filter(
            Record.borrow_store_id == store_id,
            Record.state.in_(["ongoing", "overdue"]),
            Record.due_date < datetime.now(tz_taipei),
        )
        .count()
    )

    return StoreDashboardResponse(
        store_id=store_id,
        today_borrowed=today_borrowed,
        today_returned=today_returned,
        in_stock=in_stock,
        overdue_unreturned=overdue_unreturned,
    )


# ── 本店紀錄 ──────────────────────────────────────────────────────────────────

@router.get("/records", response_model=StoreRecordsResponse)
def store_records(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    store_id: str = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    """查詢本店的借還明細（分頁）。"""
    from sqlalchemy import or_

    query = db.query(Record).filter(
        or_(
            Record.borrow_store_id == store_id,
            Record.return_store_id == store_id,
        )
    )

    total = query.count()
    records = (
        query.order_by(Record.borrow_time.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return StoreRecordsResponse(
        total=total,
        page=page,
        per_page=per_page,
        records=[
            StoreRecordItem(
                serial_num=r.serial_num,
                uuid=r.uuid,
                cup_id=r.cup_id,
                borrow_time=r.borrow_time,
                return_time=r.return_time,
                state=r.state,
            )
            for r in records
        ],
    )


# ── 本店庫存杯子 ──────────────────────────────────────────────────────────────

@router.get("/cups/stock", response_model=StoreCupsStockResponse)
def store_cups_stock(
    store_id: str = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    """列出本店目前在庫的杯子。"""
    cups = db.query(Cup).filter(Cup.store_id == store_id).all()
    return StoreCupsStockResponse(
        total=len(cups),
        cups=[
            StoreCupItem(
                cup_id=c.cup_id,
                state=c.state,
                holder_uuid=c.holder_uuid,
                last_updated=c.last_updated,
            )
            for c in cups
        ],
    )


# ── 還杯去向分析（去識別化）─────────────────────────────────────────────────

@router.get("/analytics/return-destinations")
def store_return_destinations(
    store_id: str = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    """
    分析從本店借出的杯子，客人都去哪裡還。
    回傳去識別化的店名與百分比。
    """
    # 找出所有「從本店借出且已歸還」的紀錄
    records = (
        db.query(Record)
        .filter(
            Record.borrow_store_id == store_id,
            Record.state == "returned",
            Record.return_store_id.isnot(None),
        )
        .all()
    )

    if not records:
        return {"total": 0, "destinations": []}

    # 統計各歸還店家次數
    destination_count = {}
    for r in records:
        destination_count[r.return_store_id] = destination_count.get(r.return_store_id, 0) + 1

    total = len(records)
    
    # 查詢店名
    store_ids = list(destination_count.keys())
    stores = db.query(Store).filter(Store.store_id.in_(store_ids)).all()
    store_map = {s.store_id: s.name for s in stores}

    destinations = []
    other_index = 65  # 'A'
    for sid, count in sorted(destination_count.items(), key=lambda x: -x[1]):
        if sid == store_id:
            display_name = "本店"
        else:
            display_name = f"其他門市 {chr(other_index)}"
            other_index += 1
            
        destinations.append({
            "store_name": display_name,
            "count": count,
            "percentage": round(count / total * 100, 1),
        })

    return {"total": total, "destinations": destinations}

