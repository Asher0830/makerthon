import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Store, Cup
from auth import get_password_hash
import random

def populate():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Real Taipei coordinates (lat*10000, lng*100000 for precision)
    real_stores = [
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
        existing = db.query(Store).filter(Store.store_id == s_data["id"]).first()
        if not existing:
            new_store = Store(
                store_id=s_data["id"],
                name=s_data["name"],
                real_local=s_data["loc"],
                latitude=s_data["lat"],
                longitude=s_data["lng"],
                password_hash=pw_hash,
                cups_in_stock=random.randint(20, 50)
            )
            db.add(new_store)
            print(f"Added store: {new_store.name}")
        else:
            print(f"Updating store: {s_data['id']}")
            existing.real_local = s_data["loc"]
            existing.latitude = s_data["lat"]
            existing.longitude = s_data["lng"]
            
    db.commit()
    db.close()
    print("Coordinates update finished!")

if __name__ == "__main__":
    populate()
