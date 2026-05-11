#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <WebSocketsClient.h> 
#include <ArduinoJson.h>      

// --- Wi-Fi 與 WebSocket 設定 ---
const char* ssid = "COM";        
const char* password = "02220222"; 
const char* WS_HOST = "api.as0830-nswer.me"; 
const int   WS_PORT = 443;                  
const char* WS_PATH = "/ws/scanner/ESP32_001"; 

WebSocketsClient webSocket;

// --- 腳位定義 (最新穩定配置) ---
#define RST_PIN         17  // RFID_RST
#define SS_PIN          5   // RFID_SDA(SS)
#define BTN_PIN         13   // 重置按鈕 (接 GPIO 4 與 GND)
#define LED_RED_PIN     25  // 紅燈
#define LED_GREEN_PIN   26  // 綠燈

MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- 系統狀態與變數 ---
String STORE_ID = "S001"; 
String currentUserID = ""; 

enum SystemState {
  IDLE_RETURN_MODE,   // 預設：還杯模式 (綠燈常亮)
  WAITING_CUP_BORROW  // 觸發：等待借杯 (紅燈閃爍)
};
SystemState currentState = IDLE_RETURN_MODE; 

// --- 按鈕與燈號控制變數 ---
unsigned long lastDebounceTime = 0;  
const unsigned long debounceDelay = 50; 
int buttonState = HIGH;               
int lastFlickerableState = HIGH;      

unsigned long borrowTimeoutTimer = 0; 
unsigned long lastBlinkTime = 0;
bool ledState = false; 

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP); 
  
  Serial.println("\n=================================");
  Serial.println("  IoT 掃杯器 (v4.0 無螢幕純淨版)");
  Serial.println("  依照 v1.0 規格書開發");
  Serial.println("=================================");
  
  connectToWiFi();
  
  // Cloudflare 必須使用加密連線 (WSS)
  webSocket.beginSSL(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // 規格書要求：斷線自動重連機制
  
  resetSystem(); 
}

void loop() {
  webSocket.loop();
  handleButton(); 
  handleLEDs();   
  handleRFID();   
  checkTimeout(); 
}

// === Wi-Fi 連線 ===
void connectToWiFi() {
  Serial.print("正在連接 Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[成功] Wi-Fi OK！ IP: " + WiFi.localIP().toString());
}

// === WebSocket 事件處理 (接收伺服器 JSON) ===
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] 🔴 與伺服器斷線！嘗試重連中...");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] 🟢 已成功連線至伺服器！");
      break;
    case WStype_TEXT:
      Serial.printf("[WS] 收到後端訊息: %s\n", payload);
      
      // 解析 JSON (使用 bblanchon/ArduinoJson)
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        // Step 3.1 收到借杯綁定指令
        if (doc.containsKey("action") && doc["action"] == "bind_uuid") {
          currentUserID = doc["uuid"].as<String>();
          if (doc.containsKey("store_id")) {
             STORE_ID = doc["store_id"].as<String>();
          }
          
          currentState = WAITING_CUP_BORROW;
          borrowTimeoutTimer = millis(); // 開始 30 秒倒數
          Serial.println("\n>>> [伺服器指令] 進入【借杯模式】 (紅燈閃爍)");
          Serial.println("綁定 UUID: " + currentUserID);
        }
        
        // 5. 收到伺服器處理結果
        else if (doc.containsKey("status")) {
          if (doc["status"] == "ok") {
             Serial.println("✅ 伺服器回報：交易成功！");
             // 這裡可以加入逼長音 (如果有接蜂鳴器的話)
          } else {
             Serial.printf("❌ 伺服器回報錯誤: %s\n", doc["message"].as<const char*>());
             // 這裡可以加入逼兩短音
          }
          // 收到結果後強制重置狀態為還杯模式
          resetSystem();
        }
      } else {
        Serial.println("[錯誤] JSON 解析失敗！");
      }
      break;
  }
}

// === 檢查借杯 Timeout (30秒) ===
void checkTimeout() {
  if (currentState == WAITING_CUP_BORROW) {
    if (millis() - borrowTimeoutTimer > 30000) { 
      Serial.println("\n[警告] 借杯等待超時 (30秒)！自動取消。");
      resetSystem();
    }
  }
}

// === 處理按鈕 (實體防呆：強制重置鍵) ===
void handleButton() {
  int reading = digitalRead(BTN_PIN);

  if (reading != lastFlickerableState) {
    lastDebounceTime = millis(); 
    lastFlickerableState = reading;
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != buttonState) {
      buttonState = reading;
      
      if (buttonState == LOW) {
         Serial.println("\n[按鈕觸發] 使用者強制取消 / 重置系統狀態！");
         resetSystem(); 
      }
    }
  }
}

// === 處理狀態燈號 ===
void handleLEDs() {
  if (millis() - lastBlinkTime > 300) {
    ledState = !ledState;
    lastBlinkTime = millis();
  }

  if (currentState == IDLE_RETURN_MODE) {
    // 預設：綠燈常亮
    digitalWrite(LED_RED_PIN, LOW); 
    digitalWrite(LED_GREEN_PIN, HIGH);
  } 
  else if (currentState == WAITING_CUP_BORROW) {
    // 借杯：紅燈閃爍
    digitalWrite(LED_RED_PIN, ledState); 
    digitalWrite(LED_GREEN_PIN, LOW);
  }
}

// === 處理 RFID 刷卡與發送 CSV ===
void handleRFID() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // 讀取卡號
  String cupID = "CUP_"; 
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    cupID += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    cupID += String(mfrc522.uid.uidByte[i], HEX);
  }
  cupID.toUpperCase();

  String payload = "";

  if (currentState == IDLE_RETURN_MODE) {
    // Step 4.1 還杯流程：{杯子碼},,{00+店家代號}
    Serial.println("\n-> [感應] 執行還杯: " + cupID);
    payload = cupID + ",,00" + STORE_ID;
  } 
  else if (currentState == WAITING_CUP_BORROW) {
    // Step 3.2 借杯流程：{杯子碼},{使用者UUID},{11+店家代號}
    Serial.println("\n-> [感應] 執行借杯: " + cupID);
    payload = cupID + "," + currentUserID + ",11" + STORE_ID;
  }

  // 傳送資料給伺服器
  Serial.println("[WebSocket 發送] " + payload);
  webSocket.sendTXT(payload);

  mfrc522.PICC_HaltA(); 
  
  // 傳送後稍微等待，防止重複感應
  delay(1000); 
  
  // 資料送出後，機台先主動切回綠燈還杯模式，等待伺服器回傳 JSON 確認結果
  resetSystem();
}

// === 重置回預設還杯狀態 ===
void resetSystem() {
  currentUserID = "";
  currentState = IDLE_RETURN_MODE; 
  Serial.println(">> [待機中] 系統已切換至【自動還杯模式】 (綠燈常亮)");
}