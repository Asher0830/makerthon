import sqlite3
import bcrypt

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def reset_passwords():
    conn = sqlite3.connect('server/database.db')
    cur = conn.cursor()
    
    # 這裡設定您想要的統一密碼
    new_password = "password123"
    hashed_password = get_password_hash(new_password)
    
    cur.execute("UPDATE stores SET password_hash = ?", (hashed_password,))
    conn.commit()
    conn.close()
    print(f"✅ 所有店家密碼已重設為: {new_password}")

if __name__ == "__main__":
    reset_passwords()
