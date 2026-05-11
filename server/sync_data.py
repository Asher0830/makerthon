import sqlite3
import uuid
import random
from datetime import datetime, timedelta

def sync_and_seed():
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    print("🚀 開始數據大同步...")

    # 1. 為每個使用者生一點歷史紀錄 (如果紀錄太少)
    cur.execute("SELECT uuid, name FROM users")
    users = cur.fetchall()
    
    cur.execute("SELECT store_id FROM stores")
    stores = [s[0] for s in cur.fetchall()]
    
    if not stores:
        print("❌ 找不到店家資料，無法生成紀錄")
        return

    for u_uuid, u_name in users:
        # 檢查歷史紀錄數量
        cur.execute("SELECT COUNT(*) FROM records WHERE uuid = ?", (u_uuid,))
        count = cur.fetchone()[0]
        
        if count < 5:  # 如果紀錄少於 5 筆，就補一點
            to_add = random.randint(3, 7)
            print(f"📦 為使用者 {u_name} 補充 {to_add} 筆歷史紀錄...")
            for _ in range(to_add):
                b_store = random.choice(stores)
                r_store = random.choice(stores)
                b_time = datetime.now() - timedelta(days=random.randint(5, 30))
                r_time = b_time + timedelta(days=random.randint(1, 3))
                
                cur.execute("""
                    INSERT INTO records (serial_num, uuid, cup_id, borrow_store_id, return_store_id, borrow_time, return_time, state)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), u_uuid, f"EC-SEED-{uuid.uuid4().hex[:6].upper()}", b_store, r_store, b_time, r_time, "returned"))
            
            # 更新使用者的累計次數
            cur.execute("UPDATE users SET total_borrow_count = total_borrow_count + ? WHERE uuid = ?", (to_add, u_uuid))

    # 2. 同步店家庫存 (店家庫存要對上杯子總數)
    print("⚖️ 正在校準店家庫存數據...")
    # 先把所有店家的庫存歸零，重新計算
    cur.execute("UPDATE stores SET cups_in_stock = 0")
    
    # 統計 cups 表中，狀態為 in_stock 且有 store_id 的杯子
    cur.execute("""
        SELECT store_id, COUNT(*) 
        FROM cups 
        WHERE state = 'in_stock' AND store_id IS NOT NULL 
        GROUP BY store_id
    """)
    stock_counts = cur.fetchall()
    
    for s_id, count in stock_counts:
        cur.execute("UPDATE stores SET cups_in_stock = ? WHERE store_id = ?", (count, s_id))
        print(f"🏠 店家 {s_id} 庫存已校準為: {count}")

    conn.commit()
    conn.close()
    print("✅ 數據大同步完成！現在所有人的歷史紀錄都滿滿的，店家庫存也絕對精準了。")

if __name__ == "__main__":
    sync_and_seed()
