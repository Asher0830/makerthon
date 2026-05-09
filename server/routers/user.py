# ==============================================================================
# Router: 使用者 API (/api/user)
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from database import get_db
from models import User, Record, Store
from schemas import (
    UserInfoResponse,
    UserCupsResponse,
    CupHoldingItem,
    UserHistoryResponse,
    RecordItem,
    UserStatsResponse,
)
from auth import get_current_user_id

router = APIRouter(prefix="/api/user", tags=["使用者"])


@router.get("/me", response_model=UserInfoResponse)
def get_me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """取得當前登入使用者的基本資料。"""
    user = db.query(User).filter(User.uuid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    return UserInfoResponse(
        uuid=user.uuid,
        email=user.email,
        name=user.name,
        current_borrow_count=user.current_borrow_count,
        total_borrow_count=user.total_borrow_count,
        points=user.points,
        created_at=user.created_at,
    )


@router.get("/cups", response_model=UserCupsResponse)
def get_my_cups(
    user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """取得目前持有的杯子列表（含剩餘天數）。"""
    ongoing_records = (
        db.query(Record)
        .filter(Record.uuid == user_id, Record.state.in_(["ongoing", "overdue"]))
        .all()
    )

    now = datetime.now(timezone.utc)
    cups = []
    for r in ongoing_records:
        days_remaining = 0
        is_overdue = False
        if r.due_date:
            # Ensure r.due_date has timezone info if comparing with aware 'now'
            due_date = r.due_date.replace(tzinfo=timezone.utc) if r.due_date.tzinfo is None else r.due_date
            delta = due_date - now
            days_remaining = max(0, delta.days)
            is_overdue = delta.total_seconds() < 0

        cups.append(
            CupHoldingItem(
                cup_id=r.cup_id,
                borrow_store_id=r.borrow_store_id,
                borrow_store_name=r.borrow_store.name if r.borrow_store else "未知店家",
                borrow_time=r.borrow_time,
                due_date=r.due_date,
                days_remaining=days_remaining,
                is_overdue=is_overdue,
            )
        )

    return UserCupsResponse(current_count=len(cups), cups=cups)


@router.get("/history", response_model=UserHistoryResponse)
def get_my_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    state: str = Query("all", pattern="^(all|ongoing|returned|overdue)$"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """取得借還歷史紀錄（支援分頁與狀態篩選）。"""
    query = db.query(Record).filter(Record.uuid == user_id)
    if state != "all":
        query = query.filter(Record.state == state)

    total = query.count()
    records = (
        query.order_by(Record.borrow_time.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return UserHistoryResponse(
        total=total,
        page=page,
        per_page=per_page,
        records=[
            RecordItem(
                serial_num=r.serial_num,
                cup_id=r.cup_id,
                borrow_store_id=r.borrow_store_id,
                borrow_store_name=r.borrow_store.name if r.borrow_store else "未知店家",
                borrow_time=r.borrow_time,
                return_store_id=r.return_store_id,
                return_store_name=r.return_store.name if r.return_store else "未知店家",
                return_time=r.return_time,
                due_date=r.due_date,
                state=r.state,
            )
            for r in records
        ],
    )


@router.get("/stats", response_model=UserStatsResponse)
def get_my_stats(
    user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """取得使用者統計資料（目前借用 / 歷史總數）。"""
    user = db.query(User).filter(User.uuid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    return UserStatsResponse(
        current_borrow_count=user.current_borrow_count,
        total_borrow_count=user.total_borrow_count,
        points=user.points,
    )


@router.get("/stores")
def get_all_stores(db: Session = Depends(get_db)):
    """取得所有門市列表。"""
    stores = db.query(Store).all()
    return [{
        "store_id": s.store_id,
        "name": s.name,
        "real_local": s.real_local,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "cups_in_stock": s.cups_in_stock
    } for s in stores]


@router.post("/deduct_points")
def deduct_points(
    amount: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """扣除使用者的小樹點。"""
    user = db.query(User).filter(User.uuid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")
    
    if user.points < amount:
        raise HTTPException(status_code=400, detail="點數不足")
    
    user.points -= amount
    db.commit()
    return {"status": "success", "remaining_points": user.points}
