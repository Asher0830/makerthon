import sys
import os
import uuid
import random
import string
from datetime import datetime, timedelta, timezone

# Ensure we can import from parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Store, Cup, User, Record
from auth import get_password_hash

def gen_cup_id():
    # Similar style: CUP_ + 8 hex/chars
    return f"CUP_{''.join(random.choices(string.hexdigits.upper(), k=8))}"

def mega_populate():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print("⚡ Starting MEGA overhaul...")
        
        # 1. CLEAN EVERYTHING EXCEPT USERS
        print("🏪 Clearing records and cups for fresh start...")
        db.query(Record).delete()
        db.query(Cup).delete()
        db.flush()
        
        print("🏪 Filtering stores...")
        keep_ids = ["S001", "S002", "S003"]
        db.query(Store).filter(~Store.store_id.in_(keep_ids)).delete(synchronize_session=False)
        
        # Ensure S001-S015 exist and are correct (De-identified)
        legacy_stores = [
            {"id": "S001", "name": "5X嵐 台北信義店", "loc": "台北市信義區松壽路 X 號", "lat": 250355, "lng": 1215661},
            {"id": "S002", "name": "可X不可 台北中山店", "loc": "台北市中山區南京西路 X 號", "lat": 250523, "lng": 1215206},
            {"id": "S003", "name": "7-X1 台北八德店", "loc": "台北市松山區八德路三段 X 號", "lat": 250485, "lng": 1215501},
            {"id": "S004", "name": "星X克 台北忠孝店", "loc": "台北市大安區忠孝東路四段 X 號", "lat": 250412, "lng": 1215433},
            {"id": "S005", "name": "迷X夏 台北站前店", "loc": "台北市中正區忠孝西路一段 X 號", "lat": 250462, "lng": 1215175},
            {"id": "S006", "name": "5X嵐 台北公館店", "loc": "台北市中正區羅斯福路四段 X 號", "lat": 250131, "lng": 1215364},
            {"id": "S007", "name": "清X福全 台北民生店", "loc": "台北市松山區民生東路三段 X 號", "lat": 250585, "lng": 1215401},
            {"id": "S008", "name": "麻X茶坊 台北內湖店", "loc": "台北市內湖區瑞光路 X 號", "lat": 250805, "lng": 1215678},
            {"id": "S009", "name": "龜X 台北西門店", "loc": "台北市萬華區成都路 X 號", "lat": 250428, "lng": 1215082},
            {"id": "S010", "name": "珍X丹 台北南港店", "loc": "台北市南港區忠孝東路七段 X 號", "lat": 250521, "lng": 1216069},
            {"id": "S011", "name": "路X莎 台北松山店", "loc": "台北市松山區南京東路五段 X 號", "lat": 250512, "lng": 1215609},
            {"id": "S012", "name": "cXma 台北大安店", "loc": "台北市大安區信義路四段 X 號", "lat": 250332, "lng": 1215427},
            {"id": "S013", "name": "康X龍 台北板橋店", "loc": "新北市板橋區縣民大道二段 X 號", "lat": 250132, "lng": 1214627},
            {"id": "S014", "name": "萬X 台北天母店", "loc": "台北市士林區中山北路六段 X 號", "lat": 251160, "lng": 1215284},
            {"id": "S015", "name": "一X 台北北投店", "loc": "台北市北投區中山路 X 號", "lat": 251375, "lng": 1215061},
        ]
        
        keep_ids = [s["id"] for s in legacy_stores]
        pw_hash = get_password_hash("1111")
        for s_data in legacy_stores:
            s = db.query(Store).filter(Store.store_id == s_data["id"]).first()
            if not s:
                s = Store(
                    store_id=s_data["id"],
                    name=s_data["name"],
                    real_local=s_data["loc"],
                    latitude=s_data["lat"],
                    longitude=s_data["lng"],
                    password_hash=pw_hash,
                    scanner_id=f"ESP32_{s_data['id'][-3:]}",
                    cups_in_stock=0
                )
                db.add(s)
            else:
                s.name = s_data["name"]
                s.real_local = s_data["loc"]
                s.latitude = s_data["lat"]
                s.longitude = s_data["lng"]
                s.scanner_id = f"ESP32_{s_data['id'][-3:]}"
        db.flush()
        print(f"✅ Stores expanded to {len(keep_ids)}. Ready.")

        # 2. 10,000 CUPS
        print("🚀 Generating 10,000 cups...")
        db.query(Cup).filter(Cup.holder_uuid == None).delete() # Clear unassigned cups
        
        existing_ids = set(c[0] for c in db.query(Cup.cup_id).all())
        new_cups = []
        
        # Mandatory cup
        special_id = "CUP_9AAB8324"
        if special_id not in existing_ids:
            new_cups.append(Cup(cup_id=special_id, state="in_stock", store_id="S001"))
            existing_ids.add(special_id)
            
        while len(new_cups) < 10000:
            cid = gen_cup_id()
            if cid in existing_ids: continue
            existing_ids.add(cid)
            new_cups.append(Cup(
                cup_id=cid,
                state="in_stock",
                store_id=random.choice(keep_ids)
            ))
            if len(new_cups) % 2000 == 0:
                db.add_all(new_cups[-2000:])
                print(f"...{len(new_cups)} cups added")
        
        if new_cups:
            db.add_all(new_cups)
        db.flush()

        # 3. USER ACTIVITY OVERHAUL
        print("👥 Overhauling user activity...")
        users = db.query(User).all()
        now = datetime.now(timezone.utc)
        
        for u in users:
            # Clear existing for this user
            db.query(Record).filter(Record.uuid == u.uuid).delete()
            db.query(Cup).filter(Cup.holder_uuid == u.uuid).delete()
            
            u.current_borrow_count = 0
            u.total_borrow_count = 0
            
            # Ongoing: 1-2 cups
            num_ongoing = random.randint(1, 2)
            for _ in range(num_ongoing):
                # Pick an available cup
                cup = db.query(Cup).filter(Cup.state == "in_stock").first()
                if not cup: break
                
                cup.state = "borrowed"
                cup.holder_uuid = u.uuid
                cup.store_id = None
                
                rec = Record(
                    serial_num=str(uuid.uuid4()),
                    uuid=u.uuid,
                    cup_id=cup.cup_id,
                    borrow_store_id=random.choice(keep_ids),
                    borrow_time=now - timedelta(days=random.randint(0, 2)),
                    due_date=now + timedelta(days=random.randint(2, 5)),
                    state="ongoing"
                )
                db.add(rec)
                u.current_borrow_count += 1
                u.total_borrow_count += 1
            
            # History: 0-20 cups
            num_history = random.randint(0, 20)
            for _ in range(num_history):
                # We need more cups for history, we'll create dedicated history cups to avoid exhausting stock
                hist_cup_id = gen_cup_id()
                # Ensure no conflict
                while db.query(Cup).filter(Cup.cup_id == hist_cup_id).first():
                    hist_cup_id = gen_cup_id()
                
                # History cups are back in stock
                h_cup = Cup(cup_id=hist_cup_id, state="in_stock", store_id=random.choice(keep_ids))
                db.add(h_cup)
                
                b_days = random.randint(10, 100)
                r_days = b_days - random.randint(1, 5)
                
                rec = Record(
                    serial_num=str(uuid.uuid4()),
                    uuid=u.uuid,
                    cup_id=hist_cup_id,
                    borrow_store_id=random.choice(keep_ids),
                    borrow_time=now - timedelta(days=b_days),
                    return_store_id=random.choice(keep_ids),
                    return_time=now - timedelta(days=r_days),
                    due_date=now - timedelta(days=b_days - 7),
                    state="returned"
                )
                db.add(rec)
                u.total_borrow_count += 1

        # 4. Sync Stock count
        for sid in keep_ids:
            count = db.query(Cup).filter(Cup.store_id == sid, Cup.state == "in_stock").count()
            s = db.query(Store).filter(Store.store_id == sid).first()
            s.cups_in_stock = count

        db.commit()
        print("✨ MEGA overhaul finished!")
        print(f"Final Counts: Stores: {db.query(Store).count()}, Cups: {db.query(Cup).count()}, Records: {db.query(Record).count()}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    mega_populate()
