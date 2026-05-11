import sqlite3
import uuid
from datetime import datetime, timedelta

def simulate_borrowing(count=15):
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    print(f"🔄 開始模擬 {count} 個杯子借用中...")

    # 1. 取得所有使用者與店家
    cur.execute("SELECT uuid FROM users")
    users = [u[0] for u in cur.fetchall()]
    
    cur.execute("SELECT store_id FROM stores")
    stores = [s[0] for s in cur.fetchall()]

    if not users or not stores:
        print("❌ 缺少使用者或店家資料")
        return

    for _ in range(count):
        u_uuid = random_choice(users)
        s_id = random_choice(stores)
        
        # 找一個該店家在庫的杯子
        cur.execute("SELECT cup_id FROM cups WHERE store_id = ? AND state = 'in_stock' LIMIT 1", (s_id,))
        res = cur.fetchone()
        
        if res:
            c_id = res[0]
            now = datetime.now()
            due = now + timedelta(days=3)
            
            # A. 更新杯子狀態
            cur.execute("UPDATE cups SET state = 'borrowed', holder_uuid = ?, store_id = NULL WHERE cup_id = ?", (u_uuid, c_id))
            
            # B. 建立進行中紀錄
            cur.execute("""
                INSERT INTO records (serial_num, uuid, cup_id, borrow_store_id, borrow_time, due_date, state)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), u_uuid, c_id, s_id, now, due, "ongoing"))
            
            # C. 更新使用者當前借用數
            cur.execute("UPDATE users SET current_borrow_count = current_borrow_count + 1 WHERE uuid = ?", (u_uuid,))
            
            # D. 更新店家庫存數
            cur.execute("UPDATE stores SET cups_in_stock = cups_in_stock - 1 WHERE store_id = ?", (s_id,))
            
            print(f"🥤 杯子 {c_id} 已由使用者借出 (從店家 {s_id})")

    conn.commit()
    conn.close()
    print(f"✅ 模擬完成！現在有 {count} 個杯子正在外面旅行中。")

def random_choice(arr):
    import random
    return random.choice(arr)

if __name__ == "__main__":
    simulate_borrowing(20) # 預設生 20 個借用中的案例
