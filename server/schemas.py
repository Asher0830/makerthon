# ==============================================================================
# Pydantic Schemas — API 請求與回應格式
# ==============================================================================

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    uuid: str
    email: str
    name: str

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class UserRegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    uuid: str
    email: str
    name: str


# ── User ──────────────────────────────────────────────────────────────────────

class UserInfoResponse(BaseModel):
    uuid: str
    email: str
    name: str
    current_borrow_count: int
    total_borrow_count: int
    points: int
    created_at: Optional[datetime] = None

class CupHoldingItem(BaseModel):
    cup_id: str
    borrow_store_id: Optional[str] = None
    borrow_store_name: Optional[str] = None
    borrow_time: Optional[datetime] = None
    due_date: Optional[datetime] = None
    days_remaining: int
    is_overdue: bool

class UserCupsResponse(BaseModel):
    current_count: int
    cups: List[CupHoldingItem]

class RecordItem(BaseModel):
    serial_num: str
    cup_id: str
    borrow_store_id: Optional[str] = None
    borrow_store_name: Optional[str] = None
    borrow_time: Optional[datetime] = None
    return_store_id: Optional[str] = None
    return_store_name: Optional[str] = None
    return_time: Optional[datetime] = None
    due_date: Optional[datetime] = None
    state: str

class UserHistoryResponse(BaseModel):
    total: int
    page: int
    per_page: int
    records: List[RecordItem]

class UserStatsResponse(BaseModel):
    current_borrow_count: int
    total_borrow_count: int
    points: int


# ── QR Code ───────────────────────────────────────────────────────────────────

class QRCodeScanRequest(BaseModel):
    scanner_id: str
    store_id: str

class QRCodeScanResponse(BaseModel):
    status: str
    message: str
    scanner_id: str


# ── Store Admin ───────────────────────────────────────────────────────────────

class StoreLoginRequest(BaseModel):
    store_id: str
    password: str

class StoreLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    store_id: str
    store_name: str

class StoreChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class StoreDashboardResponse(BaseModel):
    store_id: str
    today_borrowed: int
    today_returned: int
    in_stock: int
    overdue_unreturned: int

class StoreRecordItem(BaseModel):
    serial_num: str
    uuid: str
    cup_id: str
    borrow_time: Optional[datetime] = None
    return_time: Optional[datetime] = None
    state: str

class StoreRecordsResponse(BaseModel):
    total: int
    page: int
    per_page: int
    records: List[StoreRecordItem]

class StoreCupItem(BaseModel):
    cup_id: str
    state: str
    holder_uuid: Optional[str] = None
    last_updated: Optional[datetime] = None

class StoreCupsStockResponse(BaseModel):
    total: int
    cups: List[StoreCupItem]


# ── Super Admin ───────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AdminGlobalStatsResponse(BaseModel):
    total_users: int
    total_cups: int
    cups_in_stock: int
    cups_borrowed: int
    overdue_count: int
    today_borrow: int
    today_return: int

class AdminOverdueRecordItem(BaseModel):
    serial_num: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    cup_id: str
    borrow_store_name: Optional[str] = None
    borrow_time: Optional[datetime] = None
    due_date: Optional[datetime] = None
    state: str
    is_suspended: int
    user_uuid: str

class AdminOverdueListResponse(BaseModel):
    total: int
    overdue_records: List[AdminOverdueRecordItem]

# ── Admin CRUD Schemas ────────────────────────────────────────────────────────

class StoreCreateRequest(BaseModel):
    store_id: str
    name: str
    real_local: Optional[str] = ""
    password: Optional[str] = "1111"
    scanner_id: Optional[str] = None

class StoreUpdateRequest(BaseModel):
    name: Optional[str] = None
    real_local: Optional[str] = None
    scanner_id: Optional[str] = None

class CupCreateRequest(BaseModel):
    cup_id: str
    store_id: str

class CupUpdateRequest(BaseModel):
    state: Optional[str] = None
    store_id: Optional[str] = None
    holder_uuid: Optional[str] = None

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

class UserSuspensionRequest(BaseModel):
    is_suspended: int  # 0 or 1

class AdminLogItem(BaseModel):
    id: int
    timestamp: datetime
    level: str
    category: str
    event: str
    details: str
    operator_id: Optional[str] = None

class AdminLogListResponse(BaseModel):
    total: int
    logs: List[AdminLogItem]
