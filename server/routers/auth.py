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

@router.post("/register", response_model=UserRegisterResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """使用者註冊（Email + 密碼）。"""
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="此 Email 已經註冊過")
    
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        name=req.name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_user_token(user.uuid)
    return UserRegisterResponse(
        access_token=access_token,
        uuid=user.uuid,
        email=user.email,
        name=user.name
    )

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
