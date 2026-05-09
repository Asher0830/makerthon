# ==============================================================================
# Router: 懸賞系統 API (/api/bounty)
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import random

from database import get_db
from models import Bounty, User, Store
from auth import get_current_user_id

router = APIRouter(prefix="/api/bounty", tags=["懸賞系統"])

def _utcnow():
    return datetime.now(timezone(timedelta(hours=8)))

@router.get("/list")
def list_bounties(db: Session = Depends(get_db)):
    """列出所有待領取的懸賞任務。"""
    bounties = db.query(Bounty).filter(Bounty.status == "open").all()
    return [{
        "bounty_id": b.bounty_id,
        "title": b.title,
        "type": b.type,
        "from_store_id": b.from_store_id,
        "to_store_id": b.to_store_id,
        "from_store_name": b.from_store.name if b.from_store else "清洗中心",
        "to_store_name": b.to_store.name if b.to_store else "清洗中心",
        "cup_count": b.cup_count,
        "reward_points": b.reward_points,
        "created_at": b.created_at
    } for b in bounties]

@router.post("/take/{bounty_id}")
def take_bounty(bounty_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """接取一個懸賞任務。"""
    # 檢查使用者是否已經有正在進行的任務（一次只能接一個）
    ongoing = db.query(Bounty).filter(Bounty.worker_uuid == user_id, Bounty.status == "taken").first()
    if ongoing:
        raise HTTPException(status_code=400, detail="您已經有一個正在進行的任務了")

    bounty = db.query(Bounty).filter(Bounty.bounty_id == bounty_id, Bounty.status == "open").first()
    if not bounty:
        raise HTTPException(status_code=404, detail="找不到任務或已被領取")

    bounty.status = "taken"
    bounty.worker_uuid = user_id
    db.commit()
    return {"status": "success", "message": "任務接取成功，加油！"}

@router.post("/complete/{bounty_id}")
def complete_bounty(bounty_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """完成懸賞任務並領取獎勵。"""
    bounty = db.query(Bounty).filter(Bounty.bounty_id == bounty_id, Bounty.worker_uuid == user_id, Bounty.status == "taken").first()
    if not bounty:
        raise HTTPException(status_code=404, detail="找不到您的進行中任務")

    user = db.query(User).filter(User.uuid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    # 1. 更新任務狀態
    bounty.status = "completed"
    bounty.completed_at = _utcnow()

    # 2. 發放獎勵
    user.points += bounty.reward_points
    
    db.commit()
    return {
        "status": "success", 
        "reward_points": bounty.reward_points, 
        "current_points": user.points,
        "message": f"任務完成！恭喜獲得 {bounty.reward_points} 點小樹點！"
    }

@router.get("/my")
def get_my_bounty(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """查看我目前接取的任務。"""
    bounty = db.query(Bounty).filter(Bounty.worker_uuid == user_id, Bounty.status == "taken").first()
    if not bounty:
        return {"has_task": False}
    
    return {
        "has_task": True,
        "bounty_id": bounty.bounty_id,
        "title": bounty.title,
        "from_store_id": bounty.from_store_id,
        "to_store_id": bounty.to_store_id,
        "from_store_name": bounty.from_store.name if bounty.from_store else "清洗中心",
        "to_store_name": bounty.to_store.name if bounty.to_store else "清洗中心",
        "cup_count": bounty.cup_count,
        "reward_points": bounty.reward_points
    }

@router.post("/seed")
def seed_bounties(db: Session = Depends(get_db)):
    """(測試用) 生成一些隨機懸賞任務。"""
    stores = db.query(Store).all()
    if len(stores) < 2:
        return {"error": "門市數量不足，無法生成任務"}
    
    types = ["collect", "distribute"]
    titles = {
        "collect": "♻️ 回收任務：清空門市回收箱",
        "distribute": "🚚 補貨任務：運送乾淨杯具"
    }

    new_tasks = []
    for _ in range(5):
        t = random.choice(types)
        s1 = random.choice(stores)
        s2 = random.choice(stores)
        while s1.store_id == s2.store_id:
            s2 = random.choice(stores)

        # 隨機點數與杯數
        cups = random.randint(5, 20)
        points = cups * 5 + random.randint(20, 100)

        task = Bounty(
            title=titles[t],
            type=t,
            from_store_id=s1.store_id if t == "collect" else None, # collect 從店出發, distribute 從中心出發
            to_store_id=None if t == "collect" else s2.store_id,
            cup_count=cups,
            reward_points=points,
            status="open"
        )
        db.add(task)
        new_tasks.append(task)
    
    db.commit()
    return {"message": f"成功生成 {len(new_tasks)} 個懸賞任務"}
