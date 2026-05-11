import sqlite3

def super_sync():
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    print("🧹 開始超級同步修正...")

    # 1. 取得所有杯子 ID
    cur.execute("SELECT cup_id FROM cups")
    cups = [c[0] for c in cur.fetchall()]

    for c_id in cups:
        # 2. 針對每個杯子，找出它最新的一筆紀錄
        cur.execute("""
            SELECT uuid, state, return_store_id, borrow_store_id 
            FROM records 
            WHERE cup_id = ? 
            ORDER BY borrow_time DESC 
            LIMIT 1
        """, (c_id,))
        last_record = cur.fetchone()

        if last_record:
            u_uuid, r_state, r_store, b_store = last_record
            
            if r_state in ['ongoing', 'overdue']:
                # 應該是借用中
                cur.execute("UPDATE cups SET state = 'borrowed', holder_uuid = ?, store_id = NULL WHERE cup_id = ?", (u_uuid, c_id))
            else:
                # 應該是歸還了，回歸店家庫存
                final_store = r_store if r_store else b_store
                cur.execute("UPDATE cups SET state = 'in_stock', holder_uuid = NULL, store_id = ? WHERE cup_id = ?", (final_store, c_id))

    # 3. 最後再校準一次店家的數字
    cur.execute("UPDATE stores SET cups_in_stock = 0")
    cur.execute("SELECT store_id, COUNT(*) FROM cups WHERE state = 'in_stock' AND store_id IS NOT NULL GROUP BY store_id")
    for s_id, count in cur.fetchall():
        cur.execute("UPDATE stores SET cups_in_stock = ? WHERE store_id = ?", (count, s_id))

    conn.commit()
    conn.close()
    print("✨ 所有杯子狀態與店家庫存已完全同步！")

if __name__ == "__main__":
    super_sync()
