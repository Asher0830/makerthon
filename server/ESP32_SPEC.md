# IoT 環保杯租借系統 - ESP32 掃杯器通訊規格 (v1.0)

本文件提供給 ESP32 開發工程師，說明掃杯器機台如何與後端伺服器進行即時通訊。

## 1. 系統架構與通訊協定

- **通訊協定**：WebSocket (WS)
- **傳輸資料格式**：JSON (Server -> ESP32) 與 CSV 字串 (ESP32 -> Server)
- **網路環境**：ESP32 需與 Server 位於同一個區域網路，或確保可連線至 Server IP。

---

## 2. WebSocket 連線建立

ESP32 開機並連上 Wi-Fi 後，需主動對伺服器發起 WebSocket 連線。

- **URL 格式**：ws://192.168.137.1:8000/ws/scanner/ESP32_001

  *(註：`ESP32_001` 為該台機器的唯一識別碼，需寫死或設定在 ESP32 內)*

> **⚠️ 開發要求**：
> ESP32 程式端必須實作「斷線自動重連」機制。如果在 `loop()` 中偵測到 WebSocket 斷開，請等待幾秒後自動嘗試重新連線。

---

## 3. 借杯流程 (Borrow)

借杯需要綁定使用者的帳號，因此流程為「後端先下發使用者 UUID -> ESP32 掃描杯子 RFID -> ESP32 回傳資料給後端」。

### Step 3.1 接收使用者 UUID
當使用者用手機掃描貼在機台上的 QR Code 後，伺服器會主動透過 WebSocket 推送以下 JSON 訊息給 ESP32：

```json
{
  "action": "bind_uuid",
  "uuid": "8b7e2c9a-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "store_id": "S001"
}
```
**ESP32 處理邏輯**：
收到此 JSON 後，請將 `uuid` 儲存於變數中，並可發出「嗶」一聲或亮起提示燈，表示「已準備好，請放置杯子」。
*(建議：設定 30 秒的 Timeout，若超時未感應到杯子，則清空該 `uuid`)*

### Step 3.2 掃描 RFID 並上報
使用者將環保杯放上 RFID 掃描區，ESP32 讀取到杯子碼（例如 `CUP_ABC123`），接著將資料組合為逗號分隔的字串，傳送給伺服器。

- **傳送格式**：`"{杯子碼},{使用者UUID},{狀態碼}"`
- **狀態碼規則**：前兩碼固定為 `11` (代表借出)，後接四碼店家代號 (如 `S001`)。
- **傳送範例**：
  ```text
  CUP_ABC123,8b7e2c9a-xxxx-xxxx-xxxx-xxxxxxxxxxxx,11S001
  ```

---

## 4. 還杯流程 (Return)

還杯**不需要**使用者的手機操作，只要使用者將杯子放上機台，直接讀取即可。

### Step 4.1 掃描 RFID 並上報
ESP32 直接讀取 RFID，並將 UUID 留空，傳送給伺服器。

- **狀態碼規則**：前兩碼固定為 `00` (代表歸還)，後接四碼店家代號。
- **傳送範例**：
  ```text
  CUP_ABC123,,00S001
  ```

---

## 5. 伺服器處理結果回應 (Server -> ESP32)

不論是借出還是歸還，當 ESP32 傳送資料後，伺服器處理完資料庫邏輯，會立刻透過同一個 WebSocket 回傳 JSON 結果。ESP32 需根據此結果控制機台燈號或蜂鳴器（例如：成功亮綠燈/逼長音，失敗亮紅燈/逼兩短音）。

### 🟢 成功回應 (Success)
```json
{
  "status": "ok",
  "action": "borrowed",  // 或是 "returned"
  "cup_id": "CUP_ABC123",
  "user_uuid": "...",
  "store": "S001"
}
```

### 🔴 失敗回應 (Error)
（例如：使用者借杯達上限、杯子不存在、資料格式錯誤等）
```json
{
  "status": "error",
  "message": "已達借杯上限 (5)"
}
```

---

## 6. Arduino 建議開發套件
- **WebSocket 客戶端**：建議使用 `Links2004/arduinoWebSockets` 函式庫。
- **JSON 解析**：建議使用 `bblanchon/ArduinoJson` 函式庫。
