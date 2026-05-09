# ==============================================================================
# WebSocket 連線池管理 — ESP32 掃杯器
# ==============================================================================

from fastapi import WebSocket
from typing import Dict, Optional
import json
import logging

logger = logging.getLogger("scanner_ws")


class ScannerConnectionManager:
    """
    管理所有 ESP32 掃杯器的 WebSocket 連線。
    key = scanner_id, value = WebSocket 物件。
    """

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, scanner_id: str, websocket: WebSocket):
        """接受連線並註冊掃杯器。"""
        await websocket.accept()
        self._connections[scanner_id] = websocket
        logger.info(f"✅ 掃杯器 [{scanner_id}] 已連線，目前連線數: {len(self._connections)}")

    def disconnect(self, scanner_id: str):
        """移除斷線的掃杯器。"""
        self._connections.pop(scanner_id, None)
        logger.info(f"❌ 掃杯器 [{scanner_id}] 已斷線，目前連線數: {len(self._connections)}")

    def is_connected(self, scanner_id: str) -> bool:
        """檢查掃杯器是否在線。"""
        return scanner_id in self._connections

    def get_websocket(self, scanner_id: str) -> Optional[WebSocket]:
        """取得指定掃杯器的 WebSocket。"""
        return self._connections.get(scanner_id)

    async def send_to_scanner(self, scanner_id: str, data: dict) -> bool:
        """
        向指定掃杯器推送資料。
        回傳 True 表示成功，False 表示掃杯器未連線或傳送失敗。
        """
        ws = self._connections.get(scanner_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(data))
            return True
        except Exception as e:
            logger.error(f"推送至 [{scanner_id}] 失敗: {e}")
            self.disconnect(scanner_id)
            return False

    @property
    def connected_scanners(self) -> list:
        return list(self._connections.keys())


# 全域單例
scanner_manager = ScannerConnectionManager()
