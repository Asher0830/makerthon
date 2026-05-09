from database import SessionLocal
from models import User, Store, Cup, Record
from auth import get_password_hash
from datetime import datetime, timezone, timedelta
import uuid
import random

def gen_random_cup_id():
    # Generate a random 8-character alphanumeric ID
    return f"EC-{uuid.uuid4().hex[:8].upper()}"

def seed():
    db = SessionLocal()
    try:
        # 1. Get the user
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            test_user = User(
                uuid=str(uuid.uuid4()),
                email="test@example.com",
                password_hash=get_password_hash("password123"),
                name="測試帳號",
                current_borrow_count=0,
                total_borrow_count=0
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        # 2. Create de-identified stores
        stores_data = [
            {"id": "S_TAIPEI_01", "name": "台北合作門市 A", "loc": "台北市信義區"},
            {"id": "S_TAIPEI_02", "name": "永續生活館 002", "loc": "台北市中山區"},
            {"id": "S_TAICHUNG_01", "name": "台中示範店 B", "loc": "台中市西區"},
            {"id": "S_KAOHSIUNG_01", "name": "環保驛站 C", "loc": "高雄市鼓山區"},
            {"id": "S_TAIPEI_03", "name": "綠色角落 D", "loc": "台北市大安區"},
        ]
        
        for s in stores_data:
            store = db.query(Store).filter(Store.store_id == s["id"]).first()
            if not store:
                store = Store(
                    store_id=s["id"],
                    name=s["name"],
                    real_local=s["loc"],
                    password_hash=get_password_hash("1111"),
                    scanner_id=f"SCANNER_{s['id']}",
                    cups_in_stock=100
                )
                db.add(store)
        db.commit()

        # 3. Clear existing data for test user to avoid ID conflicts
        db.query(Record).filter(Record.uuid == test_user.uuid).delete()
        # Find all cups held by this user and reset them
        db.query(Cup).filter(Cup.holder_uuid == test_user.uuid).update({
            Cup.state: "in_stock", 
            Cup.holder_uuid: None, 
            Cup.store_id: "S_TAIPEI_01"
        })
        
        test_user.current_borrow_count = 0
        test_user.total_borrow_count = 0
        db.commit()

        now = datetime.now(timezone.utc)

        # 4. Create Random Cup IDs and Borrowed Records (Ongoing/Overdue)
        # We'll create 4 unreturned cups
        my_cups_info = [
            {"store": "S_TAIPEI_01", "days_ago": 1, "due_in": 6, "state": "ongoing"},
            {"store": "S_TAICHUNG_01", "days_ago": 6, "due_in": 1, "state": "ongoing"},
            {"store": "S_TAIPEI_03", "days_ago": 10, "due_in": -2, "state": "overdue"},
            {"store": "S_KAOHSIUNG_01", "days_ago": 0, "due_in": 7, "state": "ongoing"},
        ]

        for c_info in my_cups_info:
            c_id = gen_random_cup_id()
            cup = Cup(cup_id=c_id, state="borrowed", holder_uuid=test_user.uuid, store_id=None)
            db.add(cup)
            
            record = Record(
                serial_num=str(uuid.uuid4()),
                uuid=test_user.uuid,
                cup_id=c_id,
                borrow_store_id=c_info["store"],
                borrow_time=now - timedelta(days=c_info["days_ago"]),
                due_date=now + timedelta(days=c_info["due_in"]),
                state=c_info["state"]
            )
            db.add(record)
            test_user.current_borrow_count += 1
            test_user.total_borrow_count += 1

        # 5. Create History Data (Returned) - 10 records with random IDs
        for i in range(10):
            c_id = gen_random_cup_id()
            b_store = random.choice(stores_data)["id"]
            r_store = random.choice(stores_data)["id"]
            b_days = random.randint(15, 60)
            r_days = b_days - random.randint(2, 5)
            
            cup = Cup(cup_id=c_id, state="in_stock", store_id=r_store)
            db.add(cup)
            
            record = Record(
                serial_num=str(uuid.uuid4()),
                uuid=test_user.uuid,
                cup_id=c_id,
                borrow_store_id=b_store,
                borrow_time=now - timedelta(days=b_days),
                return_store_id=r_store,
                return_time=now - timedelta(days=r_days),
                due_date=now - timedelta(days=b_days - 7),
                state="returned"
            )
            db.add(record)
            test_user.total_borrow_count += 1

        db.commit()
        print("✅ Data seeded with Randomized Cup IDs and De-identified Store Names.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
