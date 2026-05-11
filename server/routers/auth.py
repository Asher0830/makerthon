# ==============================================================================
# Router: 使用者認證 (/api/auth)
# ==============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserLoginRequest, UserLoginResponse, UserRegisterRequest, UserRegisterResponse
from auth import create_user_token, decode_token, get_current_user_id, get_password_hash, verify_password
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/auth", tags=["認證"])

import random
import uuid
from datetime import datetime, timedelta, timezone
from models import Cup, Record, Store

@router.post("/register", response_model=UserRegisterResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """使用者註冊，附贈新手大禮包 (1000點 + 隨機紀錄)。"""
    import traceback
    try:
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=400, detail="此 Email 已經註冊過")
        
        # 1. 建立使用者
        user = User(
            email=req.email,
            password_hash=get_password_hash(req.password),
            name=req.name,
            points=1000,
            current_borrow_count=0,
            total_borrow_count=0
        )
        db.add(user)
        db.commit() # 先 commit 確保使用者存在
        db.refresh(user)
        
        # 2. 生成隨機紀錄 (新手大禮包)
        try:
            all_stores = db.query(Store).all()
            available_cups = db.query(Cup).filter(Cup.state == "in_stock").limit(10).all()
            
            if all_stores and len(available_cups) >= 5:
                # 隨機挑 2 個杯子變借用中
                for i in range(2):
                    cup = available_cups[i]
                    store = random.choice(all_stores)
                    
                    cup.state = "borrowed"
                    cup.holder_uuid = user.uuid
                    cup.store_id = None
                    
                    new_record = Record(
                        serial_num=str(uuid.uuid4()),
                        uuid=user.uuid,
                        cup_id=cup.cup_id,
                        borrow_store_id=store.store_id,
                        borrow_time=datetime.now(timezone(timedelta(hours=8))) - timedelta(hours=random.randint(1, 24)),
                        due_date=datetime.now(timezone(timedelta(hours=8))) + timedelta(days=3),
                        state="ongoing"
                    )
                    db.add(new_record)
                    user.current_borrow_count += 1
                    user.total_borrow_count += 1
                    if store.cups_in_stock > 0: store.cups_in_stock -= 1

                # 隨機挑 3 個杯子變歷史紀錄
                for i in range(2, 5):
                    dummy_cup_id = f"EC-NEW-{uuid.uuid4().hex[:6].upper()}"
                    b_store = random.choice(all_stores)
                    r_store = random.choice(all_stores)
                    
                    # 先建立虛擬杯子，否則 Record 會報外鍵錯誤
                    new_cup = Cup(
                        cup_id=dummy_cup_id,
                        state="in_stock",
                        store_id=r_store.store_id
                    )
                    db.add(new_cup)
                    
                    b_time = datetime.now(timezone(timedelta(hours=8))) - timedelta(days=random.randint(5, 10))
                    r_time = b_time + timedelta(days=random.randint(1, 2))
                    
                    new_hist = Record(
                        serial_num=str(uuid.uuid4()),
                        uuid=user.uuid,
                        cup_id=dummy_cup_id,
                        borrow_store_id=b_store.store_id,
                        return_store_id=r_store.store_id,
                        borrow_time=b_time,
                        return_time=r_time,
                        state="returned"
                    )
                    db.add(new_hist)
                    user.total_borrow_count += 1
                
                db.commit() # 再次 commit 禮包內容

        except Exception as gift_err:
            print(f"新手禮包生成失敗 (略過): {gift_err}")
            # 禮包失敗不影響註冊，所以不拋出異常
            
        access_token = create_user_token(user.uuid)
        return UserRegisterResponse(
            access_token=access_token,
            uuid=user.uuid,
            email=user.email,
            name=user.name,
            is_new_user=True
        )

    except HTTPException:
        # 這是我們主動拋出的錯誤 (如 Email 重複)，直接往外傳，不要當成 500
        raise
    except Exception as e:
        # 這裡會捕捉到導致 500 錯誤的真正原因
        error_msg = f"註冊發生嚴重錯誤: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        with open("error_log.txt", "a", encoding="utf-8") as f:
            f.write(f"\n--- {datetime.now()} ---\n{error_msg}\n")
        raise HTTPException(status_code=500, detail="伺服器內部錯誤，已記錄日誌")

@router.post("/login", response_model=UserLoginResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """使用者登入（Email + 密碼）。"""
    user = db.query(User).filter(User.email == req.email).first()
    
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email 或密碼錯誤")
        
    access_token = create_user_token(user.uuid)
    return UserLoginResponse(
        access_token=access_token,
        uuid=user.uuid,
        email=user.email,
        name=user.name
    )


@router.post("/refresh")
def refresh_token(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """使用現有的有效 JWT 換發新 JWT。"""
    user = db.query(User).filter(User.uuid == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    new_token = create_user_token(user.uuid)
    return {"access_token": new_token, "token_type": "bearer"}
