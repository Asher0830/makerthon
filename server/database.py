# ==============================================================================
# 資料庫連線與 Session 管理
# ==============================================================================

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# SQLite 需要開啟 WAL mode 和 foreign keys
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

# 開啟 SQLite Foreign Key 支援
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI Dependency：取得資料庫 Session，請求結束後自動關閉。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
