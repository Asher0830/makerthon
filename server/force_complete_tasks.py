import sqlite3
import os

db_path = 'database.db'
if not os.path.exists(db_path):
    print(f"找不到資料庫: {db_path}")
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # 找出所有進行中的任務並強行完成
    c.execute("UPDATE bounties SET status='completed' WHERE status IN ('taken', 'shipping')")
    count = c.rowcount
    conn.commit()
    conn.close()
    print(f"成功！已從後台強制結束 {count} 個進行中的懸賞任務。")
