# ==============================================================================
# ORM 模型 — 對應資料庫四張表
# ==============================================================================

import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

def _utcnow():
    # 使用 GMT+8 (台北時間)
    return datetime.now(timezone(timedelta(hours=8)))


def _gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    uuid = Column(String, primary_key=True, default=_gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, default="")
    current_borrow_count = Column(Integer, default=0)
    total_borrow_count = Column(Integer, default=0)
    points = Column(Integer, default=0)
    is_suspended = Column(Integer, default=0)  # 0: Normal, 1: Suspended
    created_at = Column(DateTime, default=_utcnow)

    records = relationship("Record", back_populates="user", lazy="dynamic")


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(String, primary_key=True)
    name = Column(String, nullable=False, default="")
    real_local = Column(Text, default="")
    latitude = Column(Integer, nullable=True) # Stored as int (e.g. 250330 for 25.0330)
    longitude = Column(Integer, nullable=True)
    password_hash = Column(String, nullable=False)
    scanner_id = Column(String, unique=True, nullable=True)
    cups_in_stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)

    cups = relationship("Cup", back_populates="store", lazy="dynamic")


class Cup(Base):
    __tablename__ = "cups"

    cup_id = Column(String, primary_key=True)
    state = Column(String, nullable=False, default="in_stock")  # in_stock / borrowed
    store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    holder_uuid = Column(String, ForeignKey("users.uuid"), nullable=True)
    last_updated = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    store = relationship("Store", back_populates="cups")
    holder = relationship("User")


class Record(Base):
    __tablename__ = "records"

    serial_num = Column(String, primary_key=True, default=_gen_uuid)
    uuid = Column(String, ForeignKey("users.uuid"), nullable=False)
    cup_id = Column(String, ForeignKey("cups.cup_id"), nullable=False)
    store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    borrow_store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    borrow_time = Column(DateTime, nullable=True)
    return_store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    return_time = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    state = Column(String, nullable=False, default="ongoing")  # ongoing / returned / overdue

    user = relationship("User", back_populates="records")
    cup = relationship("Cup")
    borrow_store = relationship("Store", foreign_keys=[borrow_store_id])
    return_store = relationship("Store", foreign_keys=[return_store_id])


class Bounty(Base):
    __tablename__ = "bounties"

    bounty_id = Column(String, primary_key=True, default=_gen_uuid)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # collect (收杯), distribute (分發)
    from_store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    to_store_id = Column(String, ForeignKey("stores.store_id"), nullable=True)
    cup_count = Column(Integer, default=0)
    reward_points = Column(Integer, default=0)
    status = Column(String, default="open")  # open / taken / completed
    worker_uuid = Column(String, ForeignKey("users.uuid"), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    completed_at = Column(DateTime, nullable=True)

    worker = relationship("User")
    from_store = relationship("Store", foreign_keys=[from_store_id])
    to_store = relationship("Store", foreign_keys=[to_store_id])


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=_utcnow)
    level = Column(String, default="INFO")  # INFO / WARNING / ERROR
    category = Column(String)  # AUTH / BORROW / RETURN / ADMIN
    event = Column(String)
    details = Column(Text)
    operator_id = Column(String, nullable=True)  # UUID or store_id or "ADMIN"

