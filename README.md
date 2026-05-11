# 🌿 Green Express (Eco-Cup) Management System - v5.0

這是一個專為減塑環保設計的「循環杯借用管理系統」。結合了 **FastAPI 後端**、**React 行動端網頁** 以及 **ESP32 硬體掃描器**，實現自動化的借還杯體驗。

## 🚀 v5.0 版本更新亮點
- **新手大禮包 (Onboarding Rewards)**：註冊即贈送 1,000 小樹點與 5 筆隨機借還紀錄，提升用戶初次使用體驗。
- **WebSocket 穩定化**：優化 ESP32 與伺服器間的連線心跳機制，解決 Ping Timeout 斷線問題。
- **數據強一致性**：實作 `super_sync` 與歸還邏輯修正，確保手機端 UI 與後端庫存 100% 同步。
- **精美彈窗系統**：全新的歡迎介面與多國語言 (i18n) 支援。

## 🛠️ 技術架構
- **Backend**: Python 3.14+ / FastAPI / SQLAlchemy (SQLite) / Uvicorn
- **Frontend**: React / Vite / TailwindCSS / Lucide Icons
- **Hardware**: ESP32 / WebSocket Client / QR Code Scanner
- **DevOps**: Cloudflare Tunnel (用於外網穿透)

## 📦 快速開始

### 1. 後端伺服器 (Server)
```bash
cd server
pip install -r requirements.txt
python main.py
```
- API 地址：`http://localhost:8000`
- 管理後台：`admin / admin1234`
- 店家密碼：`S001 - S015 / password123`

### 2. 前端網頁 (Web)
```bash
cd web/eco-cup-app
npm install
npm run dev
```

### 3. 硬體端 (ESP32)
- 使用 Arduino IDE 開啟 `esp32/esp32.ino`。
- 修改 `ssid`, `password` 與 `WS_URL`。
- 燒錄至 ESP32 開發板。

## 📂 目錄結構
- `/server`: API 原始碼、模型定義與排程任務。
- `/web`: React 前端專案。
- `/esp32`: 硬體韌體原始碼。
- `/docs`: 設計文檔與資料庫 Schema。

## 🛡️ 安全性說明
- 密碼採用 `bcrypt` 加密儲存。
- 認證採用 JWT Token (有效期 30 天)。
- 支援 HTTPS (經由 Cloudflare)。

---
*Powered by Antigravity AI*
