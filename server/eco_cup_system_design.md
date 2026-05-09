# 環保杯管理系統 — 系統設計規劃文件 (v1.0)

> **技術選型建議：Python 3.x / FastAPI + SQLite (SQLAlchemy ORM)**
> 延續既有專案結構，沿用 `database.db` 與 FastAPI 框架。
> 若日後資料量增長，可無縫遷移至 PostgreSQL / MySQL（只需更改 `DATABASE_URL`）。

---

## 一、資料庫 Schema 設計

### 表 1 — `users`（使用者）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `uuid` | TEXT PRIMARY KEY | 系統內部唯一識別碼（UUID4） |
| `google_id` | TEXT UNIQUE NOT NULL | Google OAuth `sub` 欄位 |
| `email` | TEXT NOT NULL | 使用者 Email |
| `name` | TEXT | 顯示名稱（從 Google Token 解析） |
| `current_borrow_count` | INTEGER DEFAULT 0 | 目前持有杯子數量（快取欄位） |
| `total_borrow_count` | INTEGER DEFAULT 0 | 歷史借出總次數 |
| `created_at` | DATETIME DEFAULT now | 帳號建立時間 |

> **說明：** `current_borrow_count` 為快取欄位，避免每次查詢都計算 records 表；每次借/還時同步更新。

---

### 表 2 — `stores`（店家）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `store_id` | TEXT PRIMARY KEY | 店號（如 `S001`，人工指定） |
| `name` | TEXT NOT NULL | 店家名稱 |
| `real_local` | TEXT | 實體地址 |
| `password_hash` | TEXT NOT NULL | 密碼雜湊（預設 `1111` 的 bcrypt hash） |
| `scanner_id` | TEXT UNIQUE | 對應的 ESP32 掃杯器識別碼 |
| `cups_in_stock` | INTEGER DEFAULT 0 | 目前庫存杯子數（快取） |
| `created_at` | DATETIME DEFAULT now | 建立時間 |

---

### 表 3 — `cups`（杯子）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `cup_id` | TEXT PRIMARY KEY | RFID 杯子碼 |
| `state` | TEXT NOT NULL | 狀態：`in_stock` / `borrowed` |
| `store_id` | TEXT FK→stores | 目前所在店號（在庫時有值） |
| `holder_uuid` | TEXT FK→users | 目前持有者 UUID（借出時有值） |
| `last_updated` | DATETIME | 最後狀態更新時間 |

---

### 表 4 — `records`（借還歷史紀錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `serial_num` | TEXT PRIMARY KEY | 紀錄流水號（UUID4） |
| `uuid` | TEXT FK→users NOT NULL | 借用者 UUID |
| `cup_id` | TEXT FK→cups NOT NULL | 杯子碼 |
| `store_id` | TEXT FK→stores | 紀錄建立時所在店號（保留） |
| `borrow_store_id` | TEXT FK→stores | 借出店號 |
| `borrow_time` | DATETIME | 借出時間 |
| `return_store_id` | TEXT FK→stores | 歸還店號（未還時為 NULL） |
| `return_time` | DATETIME | 歸還時間（未還時為 NULL） |
| `due_date` | DATETIME | 應還日期（借出日 + 14 天） |
| `state` | TEXT NOT NULL | `ongoing` / `returned` / `overdue` |

---

### Schema ER 關係圖

```
users ──< records >── cups
            |
         stores (borrow_store_id / return_store_id)
cups ──── stores (store_id：目前在庫位置)
stores ── (scanner_id → ESP32 映射)
```

---

## 二、ESP32 通訊策略

### 建議方案：**WebSocket（優先）**

| 比較項目 | WebSocket | MQTT |
|----------|-----------|------|
| 架構複雜度 | 低（FastAPI 內建） | 高（需額外 Broker） |
| 適用規模 | 小～中型 LAN | 大型、多節點 IoT |
| 雙向推送 | ✅ 原生支援 | ✅ 需訂閱/發布 |
| 斷線重連 | 需自行實作 | Broker 代管 |
| 本系統適合度 | ✅ 推薦 | 備選方案 |

**結論：** 區域網路 + 少量 ESP32 → WebSocket 足夠且架構最簡單。

### WebSocket 資料協議

**ESP32 → Server（掃描上報）**
```
格式："{cup_id},{uuid},{status_code}"

status_code 說明：
  前兩碼 11 = 借出（borrow）
  前兩碼 00 = 歸還（return）
  後四碼    = 店號（如 0001 表示 S0001）

範例（借出）："CUP_ABC123,user-uuid-xxx,110001"
範例（歸還）："CUP_ABC123,user-uuid-xxx,000001"
```

**Server → ESP32（推送 UUID）**
```json
{
  "action": "bind_uuid",
  "uuid": "user-uuid-xxx",
  "store_id": "S0001"
}
```

---

## 三、API Route 完整規劃

### Base URL：`http://192.168.X.X:8000`

---

### 🔐 A. 使用者認證 (Auth)

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|:----:|
| POST | `/api/auth/google` | Google ID Token 驗證 → 核發 JWT | ❌ |
| POST | `/api/auth/refresh` | 刷新 JWT Token | ✅ Bearer |

**POST `/api/auth/google`**
```json
// Request
{ "id_token": "Google_ID_Token_string" }

// Response 200
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com",
  "name": "顯示名稱",
  "is_new_user": true
}
```

---

### 👤 B. 使用者 API (User)

> 全部需要 `Authorization: Bearer <JWT>` Header

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/user/me` | 取得當前使用者基本資料 |
| GET | `/api/user/cups` | 取得目前持有的杯子列表與剩餘天數 |
| GET | `/api/user/history` | 取得借還歷史紀錄（支援分頁） |
| GET | `/api/user/stats` | 取得統計（目前借用數 / 歷史總次數） |

**GET `/api/user/cups` Response**
```json
{
  "current_count": 2,
  "cups": [
    {
      "cup_id": "CUP_ABC123",
      "borrow_store": "S0001",
      "borrow_time": "2026-05-01T08:00:00Z",
      "due_date": "2026-05-15T08:00:00Z",
      "days_remaining": 6,
      "is_overdue": false
    }
  ]
}
```

**GET `/api/user/history` Query Params**
```
?page=1&per_page=20&state=returned   (state: ongoing/returned/overdue/all)
```

---

### 📱 C. QR Code / ESP32 推送 API

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|:----:|
| POST | `/api/qrcode/scan` | 前端掃描 QR Code → 推送 UUID 給對應掃杯器 | ✅ Bearer |
| WS | `/ws/scanner/{scanner_id}` | ESP32 建立 WebSocket 長連線 | ❌（IP 白名單） |

**POST `/api/qrcode/scan`**
```json
// Request（前端傳入）
{
  "scanner_id": "ESP32_STORE_S0001",
  "store_id": "S0001"
}

// Response 200
{
  "status": "pushed",
  "message": "UUID 已推送至掃杯器",
  "scanner_id": "ESP32_STORE_S0001"
}

// Response 404
{ "detail": "找不到對應的掃杯器，或掃杯器未連線" }
```

**WS `/ws/scanner/{scanner_id}`（ESP32 端）**
```
連線建立後，ESP32 傳送掃描資料：
  "CUP_ABC123,user-uuid-xxx,110001"

Server 解析後：
1. 更新 cups 表狀態
2. 寫入 records 表
3. 更新 users.current_borrow_count
4. 回傳確認訊息：{"status": "ok", "action": "borrowed"}
```

---

### 🏪 D. 店家後台 API (Store Admin)

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|:----:|
| POST | `/api/store/auth/login` | 店家登入（store_id + 密碼）→ 核發 Store JWT | ❌ |
| POST | `/api/store/auth/change-password` | 修改密碼 | ✅ Store JWT |
| GET | `/api/store/dashboard` | 本店今日借出/歸還數量 | ✅ Store JWT |
| GET | `/api/store/records` | 本店借還明細（可篩選日期） | ✅ Store JWT |
| GET | `/api/store/cups/stock` | 本店目前在庫杯子列表 | ✅ Store JWT |

**POST `/api/store/auth/login`**
```json
// Request
{ "store_id": "S0001", "password": "1111" }

// Response 200
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "store_id": "S0001",
  "store_name": "環保杯站 台北一號"
}
```

**GET `/api/store/dashboard` Response**
```json
{
  "store_id": "S0001",
  "today": {
    "borrowed": 15,
    "returned": 8,
    "in_stock": 42
  },
  "overdue_unreturned": 3
}
```

---

### 🛡️ E. 超級管理員 API (Super Admin)

> 需要 Super Admin JWT（獨立帳號，不走 Google OAuth）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/admin/auth/login` | 超管登入 |
| GET | `/api/admin/users` | 列出所有使用者（分頁） |
| GET | `/api/admin/users/{uuid}` | 查詢特定使用者詳細資料 |
| PATCH | `/api/admin/users/{uuid}` | 修改使用者資料 |
| DELETE | `/api/admin/users/{uuid}` | 刪除使用者 |
| GET | `/api/admin/stores` | 列出所有店家 |
| POST | `/api/admin/stores` | 新增店家 |
| PATCH | `/api/admin/stores/{store_id}` | 修改店家資料 |
| DELETE | `/api/admin/stores/{store_id}` | 刪除店家 |
| GET | `/api/admin/cups` | 列出所有杯子（可篩選狀態） |
| POST | `/api/admin/cups` | 新增杯子（RFID 登錄） |
| PATCH | `/api/admin/cups/{cup_id}` | 修改杯子資料 |
| DELETE | `/api/admin/cups/{cup_id}` | 刪除杯子 |
| GET | `/api/admin/records` | 全域借還紀錄查詢 |
| GET | `/api/admin/stats/global` | 全域統計儀表板 |

**GET `/api/admin/stats/global` Response**
```json
{
  "total_users": 1024,
  "total_cups": 500,
  "cups_in_stock": 312,
  "cups_borrowed": 188,
  "overdue_count": 12,
  "today_borrow": 45,
  "today_return": 38
}
```

---

### ⏰ F. Cron Job — 逾期提醒 Email

| 執行時間 | 功能 |
|----------|------|
| 每天 08:00 | 撈取 `records.state='ongoing'` 且 `due_date <= 今日 + 3天` 的紀錄，發送提醒 Email |
| 每天 08:00 | 更新 `records.state='overdue'`（due_date < 今日） |

**推薦 SMTP 服務：**
- **Gmail SMTP** (`smtp.gmail.com:587`)：免費，需開啟應用程式密碼
- **SendGrid**：API Key 驅動，每日 100 封免費
- **Mailgun**：每月 5,000 封免費

**Cron 實作方案：**
```python
# 使用 APScheduler（整合進 FastAPI，不需額外服務）
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(send_overdue_emails, "cron", hour=8, minute=0)
scheduler.start()
```

---

## 四、專案目錄結構（建議）

```
server/
├── main.py              # FastAPI 入口，掛載所有 router
├── config.py            # 設定（Google Client ID, JWT 密鑰, SMTP, DB URL）
├── database.py          # SQLAlchemy engine + Session
├── models.py            # ORM 模型（User, Store, Cup, Record）
├── schemas.py           # Pydantic 請求/回應格式
├── auth.py              # JWT 工具（使用者 / 店家 / 超管 三種簽發）
│
├── routers/
│   ├── auth.py          # /api/auth/*
│   ├── user.py          # /api/user/*
│   ├── qrcode.py        # /api/qrcode/*
│   ├── store.py         # /api/store/*
│   └── admin.py         # /api/admin/*
│
├── websocket/
│   └── scanner.py       # WS /ws/scanner/{scanner_id} + 連線池管理
│
├── tasks/
│   └── email_cron.py    # APScheduler 定時任務 + SMTP 發信邏輯
│
├── database.db          # SQLite 資料庫
└── requirements.txt
```

---

## 五、建議新增的 Python 套件

在現有 `requirements.txt` 基礎上新增：

```
fastapi
uvicorn[standard]
sqlalchemy
google-auth
requests
PyJWT
pydantic
passlib[bcrypt]      # 密碼雜湊（店家密碼）
apscheduler          # Cron Job 排程
aiosmtplib           # 非同步 SMTP 發信
python-jose[cryptography]  # 備用：更豐富的 JWT 支援
websockets           # WebSocket 輔助
```

---

## 六、錯誤碼規範

| HTTP Status | 代碼 | 說明 |
|------------|------|------|
| 200 | OK | 成功 |
| 201 | Created | 資源建立成功 |
| 400 | Bad Request | 請求格式錯誤 |
| 401 | Unauthorized | 未登入 / Token 無效 |
| 403 | Forbidden | 無權限（如超過借杯上限 5 個） |
| 404 | Not Found | 找不到資源 |
| 409 | Conflict | 資源衝突（如重複借同一杯） |
| 422 | Unprocessable Entity | 欄位驗證失敗（Pydantic 自動回傳） |
| 500 | Internal Server Error | 伺服器錯誤 |

---

*文件版本：v1.0 | 最後更新：2026-05-09*
