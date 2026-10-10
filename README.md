```markdown
# 🌿 Green Express (Eco-Cup) 循環杯物聯網管理系統

Green Express 是一個專為減塑場域設計的循環杯借還系統。透過整合 **FastAPI (後端)**、**React (行動端網頁)** 與 **ESP32 (物聯網掃描器)**，提供用戶「掃碼即借、放杯即還」的無縫體驗，並為店家提供即時的庫存監控後台。

## 🏗️ 系統架構

本系統由三大核心模組組成：

1. **Frontend (用戶端/店家後台)**
   - 技術棧：React + Vite + TailwindCSS / Vanilla CSS
   - 功能：JWT 身分認證、QR Code 借杯、個人持有杯數管理、點數與「樹靈養成」遊戲化模組、店家庫存儀表板。
2. **Backend (核心 API 伺服器)**
   - 技術棧：Python 3.x + FastAPI + SQLAlchemy + SQLite
   - 功能：RESTful API 服務、WebSocket 長連線管理、Cron Job 排程逾期檢測、Email 逾期提醒發送。
3. **Hardware (機台掃描器)**
   - 技術棧：ESP32 + Arduino C++ + RFID 模組
   - 功能：透過 WebSocket 與伺服器維持雙向通訊，解析 RFID 杯子碼，執行借出/歸還狀態上報。

## 📂 專案目錄結構

```text
makerthon-main/
├── web/eco-cup-app/       # Frontend：React 行動端與後台網頁
├── server/                # Backend：FastAPI 伺服器
│   ├── routers/           # API 路由 (auth, user, store, admin, qrcode)
│   ├── websocket/         # WebSocket 連線池與掃描器邏輯
│   ├── tasks/             # 排程任務 (Email 逾期提醒)
│   ├── models.py          # SQLAlchemy ORM 模型
│   ├── schemas.py         # Pydantic 資料驗證模型
│   └── main.py            # FastAPI 程式進入點
├── esp32/                 # Hardware：ESP32 韌體原始碼
└── README.md              # 專案說明文件

```

## 🚀 快速啟動指南

### 1. 啟動 Backend (API 伺服器)

請確保已安裝 Python 3.10+。

```bash
cd server
pip install -r requirements.txt
python main.py

```

> 預設運行於 `http://localhost:8000`。
> API 互動式文件 (Swagger UI) 位於：`http://localhost:8000/docs`

### 2. 啟動 Frontend (網頁端)

請確保已安裝 Node.js 18+。

```bash
cd web/eco-cup-app
npm install
npm run dev

```

> 預設運行於 `http://localhost:5173`。

### 3. ESP32 硬體燒錄

1. 透過 Arduino IDE 開啟 `esp32/esp32.ino`。
2. 安裝依賴函式庫：`ArduinoJson`, `WebSocketsClient`。
3. 修改程式碼中的 Wi-Fi SSID、密碼，以及 `WS_URL`（指向伺服器 IP，例如 `ws://192.168.X.X:8000/ws/scanner/ESP32_001`）。
4. 燒錄至 ESP32 開發板。

## 📡 通訊協定與 API 規範

### ESP32 WebSocket 協定

* **連線端點**: `ws://<SERVER_IP>:8000/ws/scanner/{scanner_id}`
* **借杯觸發 (Server -> ESP32)**:
```json
{ "action": "bind_uuid", "uuid": "user-uuid", "store_id": "S001" }

```


* **狀態上報 (ESP32 -> Server)**:
傳送字串格式：`{cup_id},{uuid},{status_code}`
* `status_code` 前兩碼：`11` (借出), `00` (歸還)
* `status_code` 後四碼：店號
* 範例：`CUP_ABC123,user-uuid,11S001`



### 核心 REST API 路由

| 路由 | 方法 | 權限 | 描述 |
| --- | --- | --- | --- |
| `/api/auth/google` | `POST` | 公開 | Google OAuth 登入並核發 JWT |
| `/api/user/cups` | `GET` | User JWT | 獲取當前持有的環保杯與剩餘天數 |
| `/api/qrcode/scan` | `POST` | User JWT | 掃描機台 QR Code 並推送 UUID 至 ESP32 |
| `/api/store/dashboard` | `GET` | Store JWT | 門市庫存與今日借還統計 |
| `/api/admin/stats/global` | `GET` | Admin JWT | 系統全域統計與逾期追蹤 |

## 🛡️ 注意事項與最佳實踐

1. **資料庫遷移：** 預設採用 SQLite 僅供開發與展示使用。投入正式生產環境前，請修改 `server/config.py` 中的 `DATABASE_URL` 遷移至 PostgreSQL 以確保資料一致性。
2. **斷線重連機制：** 由於硬體設備依賴 WebSocket，ESP32 韌體內已實作心跳包 (Ping/Pong) 檢測與自動重連邏輯，請勿輕易移除。

---

*文件版本：v5.1 | 專案維護團隊：Eco-Cup Makerthon Team*

```

```
