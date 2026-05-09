# ==============================================================================
# 設定檔 (Configuration)
# ==============================================================================
# 集中管理所有可部署修改的常數


# --- JWT ---
JWT_SECRET_KEY = "c0fb97f71f0c8e2e5d9f5e47ddd3721652b44197a9112349894659754900b2f9"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30  # 使用者 Token 有效期：1 個月
STORE_JWT_EXPIRE_HOURS = 1  # 店家 Token 有效期：12 小時
ADMIN_JWT_EXPIRE_HOURS = 1   # 超管 Token 有效期：1 小時

# --- Database ---
DATABASE_URL = "sqlite:///./database.db"

# --- 業務規則 ---
MAX_BORROW_LIMIT = 5          # 每位使用者同時借杯上限
BORROW_DAYS_LIMIT = 14        # 借杯歸還期限（天）
OVERDUE_REMINDER_DAYS = 3     # 到期前幾天開始提醒

# --- SendGrid Email ---
SENDGRID_API_KEY = "YOUR_SENDGRID_API_KEY"
SENDGRID_FROM_EMAIL = "noreply@your-domain.com"
SENDGRID_FROM_NAME = "環保杯管理系統"

# --- 超級管理員 ---
SUPER_ADMIN_USERNAME = "admin"
SUPER_ADMIN_PASSWORD = "admin1234"  # 部署時務必修改
