# 🌿 Green Express (Eco-Cup) Management System - v5.0

這是一個專為減塑環保設計的「循環杯借用管理系統」。結合了 **FastAPI 後端**、**React 行動端網頁** 以及 **ESP32 硬體掃描器**，實現自動化的借還杯體驗。

---

## 🌟 核心功能
### 👥 用戶端 (Mobile Web)
- **快速註冊/登入**：支援 Email 驗證與 JWT 安全認證。
- **新手大禮包**：註冊即自動贈送 1,000 小樹點與 5 筆隨機歷史紀錄（2 筆借用中、3 筆已歸還）。
- **借杯儀表板**：實時查看手邊持有的杯子、到期日與累積點數。
- **樹靈養成遊戲**：消耗點數孵化「樹靈」，增加用戶黏著度。

### 🏪 店家管理後台 (Store Admin)
- **實時庫存監控**：掌握店內可用杯子數量。
- **借還數據分析**：查看每日借出與歸還統計。
- **逾期追蹤**：監控從本店借出但未如期歸還的杯子。

### 🤖 硬體端 (ESP32 Scanner)
- **自動化借還**：透過 WebSocket 與伺服器連線，實現「嗶一聲」即完成借還手續。
- **離線自動重連**：強大的心跳包機制，確保網路不穩時能自動恢復連線。

---

## 🛠️ 技術架構
- **Backend**: FastAPI (Python 3.14+), SQLAlchemy (ORM), SQLite (Database).
- **Frontend**: Vite + React, Lucide Icons, Vanilla CSS (Premium Glassmorphism Design).
- **Hardware**: ESP32, Arduino C++, WebSockets (SSL support).
- **Security**: Bcrypt password hashing, JWT Authentication.

---

## 📊 資料庫表結構 (Schema)
系統主要包含四張核心表：
1. `users`: 儲存用戶資料、點數、借杯計數與狀態。
2. `stores`: 儲存門市資訊、庫存數量、經緯度。
3. `cups`: 儲存杯子 ID、目前所在門市、目前持有者。
4. `records`: 儲存每一筆借還紀錄的流水帳（含借出時間、歸還時間、押金狀態）。

---

## 🔗 主要 API 路由
| 路由 | 方法 | 描述 |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | 用戶註冊 (觸發新手大禮包) |
| `/api/auth/login` | `POST` | 用戶登入 |
| `/api/user/stats` | `GET` | 獲取用戶點數與借用統計 |
| `/api/user/cups` | `GET` | 列出目前持有中的杯子 |
| `/api/store/dashboard` | `GET` | 店家後台首頁數據 |
| `/ws/scanner/{id}` | `WS` | 掃描器 WebSocket 連線 |

---

## 📦 快速開始與環境變數

### 1. 後端環境設定
在 `server` 目錄下：
```bash
# 安裝依賴
pip install -r requirements.txt

# 啟動伺服器
python main.py
```
- **開發者模式**：預設開啟 `reload=True`。
- **超級管理員**：`admin / admin1234`。

### 2. 前端開發
在 `web/eco-cup-app` 目錄下：
```bash
npm install
npm run dev
```

### 3. 硬體燒錄
- 硬體清單：ESP32-DevKitC, QR Code 掃描模組 (TTL)。
- 連接方式：掃描器 RX/TX 接 ESP32 UART2 (GPIO 16/17)。
- 修改 `esp32.ino` 中的 `WS_URL` 為您的伺服器網址。

---

## 🛡️ v5.0 安全與性能優化
- **WebSocket 心跳協定**：伺服器設有 20 秒 Ping/Pong 逾期機制。
- **外鍵約束保護**：確保所有借用紀錄必須對應有效的杯子與門市 ID。
- **點數防作弊**：後端嚴格校驗每個帳號的點數流水。

---
## 📄 授權說明
本專案為 Eco-Cup 團隊開發，僅供測試與教學使用。

*Last Updated: 2026-05-11 by Antigravity AI*
