import sys
import os
import uuid
import random
from datetime import datetime, timedelta, timezone

# Ensure we can import from parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Store, Cup, User, Record
from auth import get_password_hash

def gen_random_cup_id():
    return f"EC-{uuid.uuid4().hex[:8].upper()}"

def populate():
    # 0. Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("🛠️ Starting full restoration...")
        
        # 1. TEST USER: test@example.com
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if not test_user:
            test_user = User(
                email="test@example.com",
                password_hash=get_password_hash("1111"),
                name="環保小尖兵",
                points=120,
                total_borrow_count=14
            )
            db.add(test_user)
            db.flush()
        else:
            test_user.name = "環保小尖兵"
            test_user.points = 120
            test_user.total_borrow_count = 14
        
        # 2. STORES (Legacy + New)
        real_stores = [
            # Legacy stores (User's preferred names)
            {"id": "S001", "name": "XX嵐 台北信義店", "loc": "台北市信義區松壽路 12 號", "lat": 250355, "lng": 1215661},
            {"id": "S002", "name": "可X可 台北中山店", "loc": "台北市中山區南京西路 14 號", "lat": 250523, "lng": 1215206},
            {"id": "S003", "name": "7-XX 台北八德店", "loc": "台北市松山區八德路三段 10 號", "lat": 250485, "lng": 1215501},
            {"id": "S004", "name": "星巴克 台北忠孝店", "loc": "台北市大安區忠孝東路四段 1 號", "lat": 250412, "lng": 1215433},
            {"id": "S005", "name": "迷客夏 台北站前店", "loc": "台北市中正區忠孝西路一段 1 號", "lat": 250462, "lng": 1215175},
            
            # New real stores (S_TP_xxx)
            {"id": "S_TP_001", "name": "Eco-Cup 信義旗艦店", "loc": "台北市信義區松壽路 12 號", "lat": 250355, "lng": 1215661},
            {"id": "S_TP_002", "name": "Eco-Cup 中山概念店", "loc": "台北市中山區南京西路 14 號", "lat": 250523, "lng": 1215206},
            {"id": "S_TP_003", "name": "Eco-Cup 大安森活店", "loc": "台北市大安區新生南路二段 1 號", "lat": 250325, "lng": 1215354},
            {"id": "S_TP_004", "name": "Eco-Cup 松山文創店", "loc": "台北市信義區光復南路 133 號", "lat": 250438, "lng": 1215609},
            {"id": "S_TP_005", "name": "Eco-Cup 西門捷運店", "loc": "台北市萬華區成都路 32 號", "lat": 250428, "lng": 1215082},
            {"id": "S_TP_006", "name": "Eco-Cup 台北 101 店", "loc": "台北市信義區市府路 45 號", "lat": 250330, "lng": 1215646},
            {"id": "S_TP_007", "name": "Eco-Cup 台大水源店", "loc": "台北市中正區思源街 18 號", "lat": 250130, "lng": 1215282},
            {"id": "S_TP_008", "name": "Eco-Cup 誠品南西店", "loc": "台北市中山區南京西路 14 號 B1", "lat": 250524, "lng": 1215207},
            {"id": "S_TP_009", "name": "Eco-Cup 公館台大店", "loc": "台北市中正區羅斯福路四段 1 號", "lat": 250131, "lng": 1215364},
            {"id": "S_TP_010", "name": "Eco-Cup 南港車站店", "loc": "台北市南港區忠孝東路七段 369 號", "lat": 250521, "lng": 1216069},
            {"id": "S_TP_011", "name": "Eco-Cup 內湖科學店", "loc": "台北市內湖區瑞光路 583 號", "lat": 250805, "lng": 1215678},
            {"id": "S_TP_012", "name": "Eco-Cup 板橋府中店", "loc": "新北市板橋區縣民大道二段 7 號", "lat": 250132, "lng": 1214627},
            {"id": "S_TP_013", "name": "Eco-Cup 天母概念店", "loc": "台北市士林區中山北路六段 77 號", "lat": 251160, "lng": 1215284},
            {"id": "S_TP_014", "name": "Eco-Cup 松山機場店", "loc": "台北市松山區敦化北路 340-9 號", "lat": 250648, "lng": 1215517},
            {"id": "S_TP_015", "name": "Eco-Cup 北投溫泉店", "loc": "台北市北投區中山路 2 號", "lat": 251375, "lng": 1215061},
        ]
        
        pw_hash = get_password_hash("1111")
        for s_data in real_stores:
            s = db.query(Store).filter(Store.store_id == s_data["id"]).first()
            if not s:
                s = Store(
                    store_id=s_data["id"],
                    name=s_data["name"],
                    real_local=s_data["loc"],
                    latitude=s_data["lat"],
                    longitude=s_data["lng"],
                    password_hash=pw_hash,
                    cups_in_stock=random.randint(20, 50)
                )
                db.add(s)
            else:
                s.real_local = s_data["loc"]
                s.latitude = s_data["lat"]
                s.longitude = s_data["lng"]
        db.flush()

        # 3. TEST USER DATA (Records & Cups)
        db.query(Record).filter(Record.uuid == test_user.uuid).delete()
        db.query(Cup).filter(Cup.holder_uuid == test_user.uuid).delete()
        
        now = datetime.now(timezone.utc)
        
        # Ongoing / Overdue Cups
        my_cups_info = [
            {"store": "S_TP_001", "days_ago": 1, "due_in": 5, "state": "ongoing"},
            {"store": "S_TP_002", "days_ago": 6, "due_in": 1, "state": "ongoing"},
            {"store": "S_TP_003", "days_ago": 10, "due_in": -2, "state": "overdue"},
            {"store": "S_TP_004", "days_ago": 0, "due_in": 7, "state": "ongoing"},
        ]
        for c_info in my_cups_info:
            c_id = gen_random_cup_id()
            cup = Cup(cup_id=c_id, state="borrowed", holder_uuid=test_user.uuid)
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

        # History Data
        for i in range(10):
            c_id = gen_random_cup_id()
            b_store = random.choice(["S_TP_001", "S_TP_002", "S_TP_003"])
            r_store = random.choice(["S_TP_004", "S_TP_005"])
            b_days = random.randint(15, 30)
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

        db.commit()
        print("✅ Success: All data restored for test user and real stores.")
        
    except Exception as e:
        print(f"❌ Error during restoration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate()
