import sqlite3

def give_all_users_points(points=1000):
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    # 更新所有人的 points 欄位
    cur.execute("UPDATE users SET points = points + ?", (points,))
    
    # 如果您是想「設為 1000 點」而不是「增加 1000 點」，可以改用下面的：
    # cur.execute("UPDATE users SET points = ?", (points,))
    
    conn.commit()
    count = cur.rowcount
    conn.close()
    print(f"💰 成功！已為 {count} 位使用者各發放了 {points} 點。")

if __name__ == "__main__":
    give_all_users_points(1000)
