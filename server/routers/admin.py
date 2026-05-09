# ==============================================================================
# Router: 超級管理員後台 (/api/admin)
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, time, timedelta

from database import get_db
from models import User, Store, Cup, Record
from schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminGlobalStatsResponse,
    StoreCreateRequest,
    StoreUpdateRequest,
    CupCreateRequest,
    CupUpdateRequest,
    UserUpdateRequest,
    AdminOverdueListResponse,
    AdminOverdueRecordItem,
    UserSuspensionRequest,
    AdminLogListResponse,
)
from auth import create_admin_token, get_admin, get_password_hash
from config import SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD
from utils.logger import log_event
from models import SystemLog

router = APIRouter(prefix="/api/admin", tags=["超級管理員"])

# ── 登入 ──────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=AdminLoginResponse)
def admin_login(req: AdminLoginRequest):
    """超級管理員登入（寫死於 config.py）。"""
    if req.username != SUPER_ADMIN_USERNAME or req.password != SUPER_ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")
    
    token = create_admin_token()
    return AdminLoginResponse(access_token=token)

# ── 儀表板與統計 ──────────────────────────────────────────────────────────────

@router.get("/stats/global", response_model=AdminGlobalStatsResponse)
def global_stats(_admin_id: str = Depends(get_admin), db: Session = Depends(get_db)):
    """全域統計資料。"""
    tz_taipei = timezone(timedelta(hours=8))
    now_taipei = datetime.now(tz_taipei)
    
    today_start = datetime.combine(
        now_taipei.date(), time.min
    ).replace(tzinfo=tz_taipei)

    total_users = db.query(User).count()
    total_cups = db.query(Cup).count()
    cups_in_stock = db.query(Cup).filter(Cup.state == "in_stock").count()
    cups_borrowed = db.query(Cup).filter(Cup.state == "borrowed").count()
    
    overdue_count = db.query(Record).filter(
        Record.state.in_(["ongoing", "overdue"]),
        Record.due_date < now_taipei
    ).count()

    today_borrow = db.query(Record).filter(Record.borrow_time >= today_start).count()
    today_return = db.query(Record).filter(Record.return_time >= today_start).count()

    return AdminGlobalStatsResponse(
        total_users=total_users,
        total_cups=total_cups,
        cups_in_stock=cups_in_stock,
        cups_borrowed=cups_borrowed,
        overdue_count=overdue_count,
        today_borrow=today_borrow,
        today_return=today_return,
    )

# ── 使用者管理 (Users) ────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """列出所有使用者。"""
    total = db.query(User).count()
    users = db.query(User).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "users": users
    }

@router.patch("/users/{uuid}")
def update_user(
    uuid: str,
    req: UserUpdateRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """修改使用者資料。"""
    user = db.query(User).filter(User.uuid == uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if req.name is not None: user.name = req.name
    if req.email is not None: user.email = req.email
    db.commit()
    return {"message": "User updated"}

# ── 店家管理 (Stores) ─────────────────────────────────────────────────────────

@router.get("/stores")
def list_stores(_admin_id: str = Depends(get_admin), db: Session = Depends(get_db)):
    """列出所有店家。"""
    stores = db.query(Store).all()
    return stores

@router.post("/stores")
def create_store(
    req: StoreCreateRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """新增店家。"""
    if db.query(Store).filter(Store.store_id == req.store_id).first():
        raise HTTPException(status_code=409, detail="Store ID exists")
    if req.scanner_id and db.query(Store).filter(Store.scanner_id == req.scanner_id).first():
        raise HTTPException(status_code=409, detail="Scanner ID already assigned")
        
    store = Store(
        store_id=req.store_id,
        name=req.name,
        real_local=req.real_local,
        password_hash=get_password_hash(req.password),
        scanner_id=req.scanner_id,
        cups_in_stock=0
    )
    db.add(store)
    db.commit()
    return {"message": "Store created", "store_id": store.store_id}

@router.patch("/stores/{store_id}")
def update_store(
    store_id: str,
    req: StoreUpdateRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """修改店家。"""
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    if req.name is not None: store.name = req.name
    if req.real_local is not None: store.real_local = req.real_local
    if req.scanner_id is not None: store.scanner_id = req.scanner_id
    db.commit()
    return {"message": "Store updated"}

# ── 杯子管理 (Cups) ───────────────────────────────────────────────────────────

@router.get("/cups")
def list_cups(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """列出所有杯子。"""
    total = db.query(Cup).count()
    cups = db.query(Cup).offset((page - 1) * per_page).limit(per_page).all()
    return {"total": total, "cups": cups}

@router.post("/cups")
def create_cup(
    req: CupCreateRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """登錄新杯子。"""
    if db.query(Cup).filter(Cup.cup_id == req.cup_id).first():
        raise HTTPException(status_code=409, detail="Cup ID exists")
    
    store = db.query(Store).filter(Store.store_id == req.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    cup = Cup(
        cup_id=req.cup_id,
        state="in_stock",
        store_id=req.store_id
    )
    store.cups_in_stock += 1
    db.add(cup)
    db.commit()
    return {"message": "Cup created", "cup_id": cup.cup_id}

@router.patch("/cups/{cup_id}")
def update_cup(
    cup_id: str,
    req: CupUpdateRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """修改杯子狀態或所在位置。"""
    cup = db.query(Cup).filter(Cup.cup_id == cup_id).first()
    if not cup:
        raise HTTPException(status_code=404, detail="Cup not found")
    
    if req.state is not None: cup.state = req.state
    if req.store_id is not None: cup.store_id = req.store_id
    if req.holder_uuid is not None: cup.holder_uuid = req.holder_uuid
    db.commit()
    return {"message": "Cup updated"}


# ── 店家排行榜 ────────────────────────────────────────────────────────────────

@router.get("/stats/store-rankings")
def store_rankings(
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """各店家借出量與歸還量排行。"""
    from sqlalchemy import func

    # 借出量排行
    borrow_ranks = (
        db.query(Record.borrow_store_id, func.count(Record.serial_num).label("count"))
        .group_by(Record.borrow_store_id)
        .order_by(func.count(Record.serial_num).desc())
        .all()
    )

    # 歸還量排行
    return_ranks = (
        db.query(Record.return_store_id, func.count(Record.serial_num).label("count"))
        .filter(Record.return_store_id.isnot(None))
        .group_by(Record.return_store_id)
        .order_by(func.count(Record.serial_num).desc())
        .all()
    )

    # 查詢所有店名
    all_store_ids = set([r[0] for r in borrow_ranks] + [r[0] for r in return_ranks if r[0]])
    stores = db.query(Store).filter(Store.store_id.in_(all_store_ids)).all()
    store_map = {s.store_id: s.name for s in stores}

    return {
        "borrow_rankings": [
            {"store_id": sid, "store_name": store_map.get(sid, sid), "count": cnt}
            for sid, cnt in borrow_ranks
        ],
        "return_rankings": [
            {"store_id": sid, "store_name": store_map.get(sid, sid), "count": cnt}
            for sid, cnt in return_ranks
        ],
    }

@router.get("/stats/overdue-records", response_model=AdminOverdueListResponse)
def list_overdue_records(
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """取得所有逾期中的借用紀錄與使用者資訊。"""
    tz_taipei = timezone(timedelta(hours=8))
    now_taipei = datetime.now(tz_taipei)

    # 查詢所有狀態為 ongoing 或 overdue 且 due_date < now 的紀錄
    overdue_records = (
        db.query(Record)
        .filter(
            Record.state.in_(["ongoing", "overdue"]),
            Record.due_date < now_taipei
        )
        .order_by(Record.due_date.asc())
        .all()
    )

    # 取得關聯的店名與使用者名稱
    result = []
    for r in overdue_records:
        user = db.query(User).filter(User.uuid == r.uuid).first()
        store = db.query(Store).filter(Store.store_id == r.borrow_store_id).first()
        
        result.append({
            "serial_num": r.serial_num,
            "user_uuid": r.uuid,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "N/A",
            "cup_id": r.cup_id,
            "borrow_store_name": store.name if store else r.borrow_store_id,
            "borrow_time": r.borrow_time,
            "due_date": r.due_date,
            "state": r.state,
            "is_suspended": user.is_suspended if user else 0
        })

    return {
        "total": len(result),
        "overdue_records": result
    }

@router.put("/users/{user_uuid}/suspend")
def suspend_user(
    user_uuid: str,
    req: UserSuspensionRequest,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """手動停權或解除停權。"""
    user = db.query(User).filter(User.uuid == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="找不到使用者")
    
    user.is_suspended = req.is_suspended
    db.commit()
    
    status_text = "停權" if req.is_suspended == 1 else "解除停權"
    log_event(db, "ADMIN", f"管理員{status_text}使用者: {user.email}", f"UUID: {user_uuid}", operator_id="ADMIN")
    
    return {"status": "ok", "message": f"使用者 {user.email} 已 {status_text}"}

@router.get("/logs", response_model=AdminLogListResponse)
def get_system_logs(
    limit: int = 50,
    offset: int = 0,
    _admin_id: str = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """取得系統操作日誌。"""
    total = db.query(SystemLog).count()
    logs = (
        db.query(SystemLog)
        .order_by(SystemLog.timestamp.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    return {"total": total, "logs": logs}
