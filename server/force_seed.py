import sqlite3
import uuid
import random

def force_seed_bounties():
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    # 1. Ensure Stores exist with proper names and IDs
    stores = [
        ('S001', '5X嵐 台北信義店', 250355, 1215661),
        ('S002', '可X不可 台北中山店', 250523, 1215206),
        ('S003', '7-X1 台北八德店', 250485, 1215501),
        ('S004', '星X克 台北忠孝店', 250412, 1215433),
        ('S005', '迷X夏 台北站前店', 250462, 1215175),
        ('S006', '5X嵐 台北公館店', 250131, 1215364),
        ('S007', '清X福全 台北民生店', 250585, 1215401),
        ('S008', '麻X茶坊 台北內湖店', 250805, 1215678),
        ('S009', '龜X 台北西門店', 250428, 1215082),
        ('S010', '珍X丹 台北南港店', 250521, 1216069),
        ('S011', '路X莎 台北松山店', 250512, 1215609),
        ('S012', 'cXma 台北大安店', 250332, 1215427),
        ('S013', '康X龍 台北板橋店', 250132, 1214627),
        ('S014', '萬X 台北天母店', 251160, 1215284),
        ('S015', '一X 台北北投店', 251375, 1215061)
    ]
    
    cur.execute("DELETE FROM stores")
    for s in stores:
        cur.execute("INSERT INTO stores (store_id, name, latitude, longitude, password_hash) VALUES (?, ?, ?, ?, ?)", 
                    (s[0], s[1], s[2], s[3], 'hash'))
    
    # 2. Clear old bounties
    cur.execute("DELETE FROM bounties")
    
    # 3. Add one bounty for EVERY store
    for s in stores:
        cur.execute("""
            INSERT INTO bounties (bounty_id, title, type, from_store_id, to_store_id, cup_count, reward_points, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), f"配送任務: {s[1]}", "collect", s[0], "HUB_001", 30, random.randint(150, 450), "open"))
    
    conn.commit()
    conn.close()
    print("✅ 全城 15 家門市配送任務已同步佈署！")

if __name__ == "__main__":
    force_seed_bounties()
