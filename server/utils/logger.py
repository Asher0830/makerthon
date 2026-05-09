from sqlalchemy.orm import Session
from models import SystemLog

def log_event(db: Session, category: str, event: str, details: str = "", level: str = "INFO", operator_id: str = None):
    """將系統事件寫入資料庫日誌。"""
    try:
        new_log = SystemLog(
            category=category,
            event=event,
            details=details,
            level=level,
            operator_id=operator_id
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        print(f"Failed to log event: {e}")
        db.rollback()
