# ==============================================================================
# Cron Job — 定時發送逾期提醒 Email
# ==============================================================================

import logging
from datetime import datetime, timezone, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from database import SessionLocal
from models import Record, User
from config import (
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME,
    OVERDUE_REMINDER_DAYS,
)

logger = logging.getLogger("email_cron")


def send_overdue_email(to_email: str, user_name: str, cup_id: str, due_date: datetime, is_overdue: bool):
    """透過 SendGrid 發送提醒 Email。"""
    if SENDGRID_API_KEY == "YOUR_SENDGRID_API_KEY":
        logger.warning(f"⚠️ 尚未設定 SendGrid API Key，跳過發信至 {to_email}")
        return

    subject = "環保杯逾期通知" if is_overdue else "環保杯歸還提醒"
    status_text = "已經逾期" if is_overdue else "即將到期"
    
    html_content = f"""
    <h3>親愛的 {user_name} 您好：</h3>
    <p>您借用的環保杯（編號：<strong>{cup_id}</strong>）{status_text}。</p>
    <p>應歸還日期：{due_date.strftime('%Y-%m-%d %H:%M')}</p>
    <p>請盡速至合作店家歸還，共同維護環保，謝謝您！</p>
    <br>
    <p>環保杯管理系統 團隊敬上</p>
    """

    message = Mail(
        from_email=(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"✅ 成功發送提醒信至 {to_email}，Status Code: {response.status_code}")
    except Exception as e:
        logger.error(f"❌ 發送信件至 {to_email} 失敗: {e}")


def check_and_send_overdue_reminders():
    """每日 08:00 執行的排程任務：檢查即將逾期與已逾期的紀錄並發信。"""
    logger.info("🕒 開始執行逾期杯子檢查與發信任務...")
    
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        reminder_threshold = now + timedelta(days=OVERDUE_REMINDER_DAYS)

        # 找尋狀態為 ongoing 或 overdue，且距離 due_date 不到 3 天的紀錄
        records = db.query(Record).filter(
            Record.state.in_(["ongoing", "overdue"]),
            Record.due_date <= reminder_threshold
        ).all()

        count = 0
        deduction_count = 0
        for record in records:
            # 判斷是否已經真的逾期
            is_overdue = record.due_date < now
            
            # 如果已經逾期，更新資料庫狀態為 overdue
            if is_overdue:
                if record.state != "overdue":
                    record.state = "overdue"
                
                # 逾期扣點：每逾期一天扣 10 點
                user_to_punish = db.query(User).filter(User.uuid == record.uuid).first()
                if user_to_punish:
                    user_to_punish.points = max(0, user_to_punish.points - 10)
                    deduction_count += 1
            
            user = db.query(User).filter(User.uuid == record.uuid).first()
            if user and user.email:
                send_overdue_email(
                    to_email=user.email,
                    user_name=user.name or "使用者",
                    cup_id=record.cup_id,
                    due_date=record.due_date,
                    is_overdue=is_overdue
                )
                count += 1
                
        db.commit()
        logger.info(f"✅ 檢查任務完成，共發送 {count} 封提醒信，扣除 {deduction_count} 人次點數。")

    except Exception as e:
        logger.error(f"❌ 定時任務執行發生錯誤: {e}")
        db.rollback()
    finally:
        db.close()
