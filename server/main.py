# ==============================================================================
# FastAPI 主應用程式 (Main Application)
# ==============================================================================

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import engine, Base
from routers import auth, user, qrcode, store, admin
from tasks.email_cron import check_and_send_overdue_reminders

# 設定日誌
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

# 建立 SQLite 資料表 (若不存在)
Base.metadata.create_all(bind=engine)

# 設定排程器 (指定 GMT+8 時區)
scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時執行
    logger.info("🚀 啟動 IoT 環保杯租借系統伺服器...")
    
    # 註冊 Cron Job：台北時間每天早上 08:00 執行
    scheduler.add_job(
        check_and_send_overdue_reminders, 
        "cron", 
        hour=8, 
        minute=0, 
        id="overdue_email_job",
        timezone="Asia/Taipei"
    )
    scheduler.start()
    logger.info("✅ APScheduler 定時任務已啟動 (每天 08:00)")
    
    yield
    
    # 關閉時執行
    logger.info("🛑 關閉伺服器與排程器...")
    scheduler.shutdown()

# 初始化 FastAPI
app = FastAPI(
    title="IoT 環保杯租借系統",
    description="結合 ESP32 掃杯器與 Web/App 客戶端的環保杯管理後端",
    version="1.0.0",
    lifespan=lifespan,
)

# 設定 CORS（允許跨域，供前端介接）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 實際部署時建議改為明確的網域
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載 Router
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(qrcode.router)
app.include_router(store.router)
app.include_router(admin.router)

@app.api_route("/health", methods=["GET", "HEAD"], tags=["系統"])
def health_check():
    """健康檢查端點。"""
    return {"status": "ok", "message": "Eco Cup System is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
