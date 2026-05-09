# ==============================================================================
# Router: QR Code 掃描 + ESP32 WebSocket (/api/qrcode, /ws/scanner)
# ==============================================================================

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

# 台北時區 (GMT+8)
TAIPEI_TZ = timezone(timedelta(hours=8))

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Cup, Record, User, Store
from schemas import QRCodeScanRequest, QRCodeScanResponse
from auth import get_current_user_id
from websocket.scanner import scanner_manager
from utils.logger import log_event
from config import MAX_BORROW_LIMIT, BORROW_DAYS_LIMIT

logger = logging.getLogger("qrcode_router")

router = APIRouter(tags=["QR Code / ESP32"])


# ── QR Code 掃描 → 推送 UUID 給對應掃杯器 ────────────────────────────────────

@router.post("/api/qrcode/scan", response_model=QRCodeScanResponse)
async def qrcode_scan(
    req: QRCodeScanRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    前端掃描 QR Code 後呼叫此 API，
    將使用者 UUID 推送至對應 ESP32 掃杯器。
    """
    # 取得資料庫 session
    db = SessionLocal()
    try:
        # 1. 優先根據 store_id 去資料庫查尋該店真正綁定的 scanner_id
        store = db.query(Store).filter(Store.store_id == req.store_id).first()
        
        # 如果資料庫有設定，就用資料庫的；否則才用網址傳過來的
        target_sid = (store.scanner_id or req.scanner_id).upper() if store else req.scanner_id.upper()
        
        if not scanner_manager.is_connected(target_sid):
            online_scanners = scanner_manager.connected_scanners
            logger.warning(f"❌ 轉發失敗：該店綁定的掃杯器 [{target_sid}] 不在線。目前在線：{online_scanners}")
            raise HTTPException(
                status_code=404,
                detail=f"掃杯器 [{target_sid}] 未連線。目前在線：{online_scanners}",
            )
        
        pushed = await scanner_manager.send_to_scanner(target_sid, {
            "action": "bind_uuid",
            "uuid": user_id,
            "store_id": req.store_id,
        })

        if not pushed:
            raise HTTPException(status_code=500, detail="推送失敗，掃杯器連線異常")

        return QRCodeScanResponse(
            status="pushed",
            message="UUID 已推送至掃杯器",
            scanner_id=target_sid,
        )
    finally:
        db.close()


# ── ESP32 WebSocket 長連線 ────────────────────────────────────────────────────

@router.websocket("/ws/scanner/{scanner_id}")
async def scanner_websocket(websocket: WebSocket, scanner_id: str):
    sid = scanner_id.upper()
    await scanner_manager.connect(sid, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            logger.info(f"[{scanner_id}] 接收: {raw}")

            try:
                result = await _process_scanner_data(raw, scanner_id)
                await websocket.send_text(json.dumps(result))
            except Exception as e:
                logger.error(f"[{scanner_id}] 處理失敗: {e}")
                await websocket.send_text(
                    json.dumps({"status": "error", "message": str(e)})
                )

    except WebSocketDisconnect:
        scanner_manager.disconnect(scanner_id)
    except Exception as e:
        logger.error(f"[{scanner_id}] WebSocket 異常: {e}")
        scanner_manager.disconnect(scanner_id)


async def _process_scanner_data(raw: str, scanner_id: str) -> dict:
    """
    解析 ESP32 上報的字串並更新資料庫。
    格式："{cup_id},{uuid},{status_code}"
    """
    sid = scanner_id.upper()
    parts = raw.strip().split(",")
    if len(parts) != 3:
        return {"status": "error", "message": "格式錯誤，需為: cup_id,uuid,status_code"}

    cup_id, user_uuid, status_code = parts[0], parts[1], parts[2]

    if len(status_code) < 6:
        return {"status": "error", "message": "status_code 長度不足 6 碼"}

    action_code = status_code[:2]  # 11=借出, 00=歸還
    store_code = status_code[2:]   # 四碼店號

    # 使用同步 session（WebSocket handler 中）
    db = SessionLocal()
    try:
        if action_code == "11":
            return _handle_borrow(db, cup_id, user_uuid, store_code)
        elif action_code == "00":
            return _handle_return(db, cup_id, user_uuid, store_code)
        else:
            return {"status": "error", "message": f"未知的動作碼: {action_code}"}
    finally:
        db.close()


def _handle_borrow(db: Session, cup_id: str, user_uuid: str, store_code: str) -> dict:
    """處理借出邏輯。"""
    # 1. 檢查使用者
    user = db.query(User).filter(User.uuid == user_uuid).first()
    if not user:
        return {"status": "error", "message": f"找不到使用者: {user_uuid}"}

    # 2. 檢查使用者狀態
    if user.is_suspended == 1:
        return {"status": "error", "message": "帳號已被停權，請先歸還逾期杯子或聯繫客服"}

    # 檢查借杯上限
    if user.current_borrow_count >= MAX_BORROW_LIMIT:
        return {"status": "error", "message": f"已達借杯上限 ({MAX_BORROW_LIMIT})"}

    # 3. 檢查杯子
    cup = db.query(Cup).filter(Cup.cup_id == cup_id).first()
    if not cup:
        return {"status": "error", "message": f"找不到杯子: {cup_id}"}
    if cup.state == "borrowed":
        return {"status": "error", "message": f"杯子 [{cup_id}] 已被借出"}

    now = datetime.now(TAIPEI_TZ)

    # 4. 更新杯子狀態
    cup.state = "borrowed"
    cup.holder_uuid = user_uuid
    cup.store_id = None  # 離開店家

    # 5. 建立借出紀錄
    record = Record(
        serial_num=str(uuid.uuid4()),
        uuid=user_uuid,
        cup_id=cup_id,
        store_id=store_code,
        borrow_store_id=store_code,
        borrow_time=now,
        due_date=now + timedelta(days=BORROW_DAYS_LIMIT),
        state="ongoing",
    )
    db.add(record)

    # 6. 更新使用者計數
    user.current_borrow_count += 1
    user.total_borrow_count += 1

    # 7. 更新店家庫存
    store = db.query(Store).filter(Store.store_id == store_code).first()
    if store and store.cups_in_stock > 0:
        store.cups_in_stock -= 1

    # 8. 記錄日誌
    log_event(db, "BORROW", f"借出杯子: {cup_id}", f"使用者: {user_uuid}, 門市: {store_code}", operator_id=user_uuid)

    db.commit()

    return {
        "status": "ok",
        "action": "borrowed",
        "cup_id": cup_id,
        "user_uuid": user_uuid,
        "store": store_code,
    }


def _handle_return(db: Session, cup_id: str, user_uuid: str, store_code: str) -> dict:
    """處理歸還邏輯。"""
    now = datetime.now(TAIPEI_TZ)

    # 1. 找到該杯子目前進行中的借出紀錄 (不強求傳入的 user_uuid 匹配，以杯子狀態為準)
    record = (
        db.query(Record)
        .filter(
            Record.cup_id == cup_id,
            Record.state.in_(["ongoing", "overdue"]),
        )
        .first()
    )
    if not record:
        return {"status": "error", "message": f"找不到杯子 [{cup_id}] 的進行中借用紀錄"}
    
    target_user_uuid = record.uuid # 從紀錄中取得實際借用者 ID

    # 2. 更新紀錄
    record.return_store_id = store_code
    record.return_time = now
    record.state = "returned"

    # 3. 更新杯子狀態
    cup = db.query(Cup).filter(Cup.cup_id == cup_id).first()
    if cup:
        cup.state = "in_stock"
        cup.holder_uuid = None
        cup.store_id = store_code

    # 4. 更新使用者計數與點數
    user = db.query(User).filter(User.uuid == target_user_uuid).first()
    if user:
        if user.current_borrow_count > 0:
            user.current_borrow_count -= 1
        # 獎勵點數：歸還成功給 10 點
        user.points += 10

    # 5. 更新店家庫存
    store = db.query(Store).filter(Store.store_id == store_code).first()
    if store:
        store.cups_in_stock += 1

    # 6. 記錄日誌
    log_event(db, "RETURN", f"歸還杯子: {cup_id}", f"使用者: {target_user_uuid}, 門市: {store_code}", operator_id=store_code)

    db.commit()

    return {
        "status": "ok",
        "action": "returned",
        "cup_id": cup_id,
        "user_uuid": user_uuid,
        "store": store_code,
    }
