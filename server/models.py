# ==============================================================================
# ORM 模型 — 對應資料庫四張表
# ==============================================================================

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


def _utcnow():
    return datetime.now(timezone.utc)


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
    created_at = Column(DateTime, default=_utcnow)

    records = relationship("Record", back_populates="user", lazy="dynamic")


class Store(Base):
    __tablename__ = "stores"

    store_id = Column(String, primary_key=True)
    name = Column(String, nullable=False, default="")
    real_local = Column(Text, default="")
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
