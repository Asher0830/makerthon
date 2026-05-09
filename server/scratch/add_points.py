from database import SessionLocal
from models import User
import sys

def add_points(identifier, amount):
    db = SessionLocal()
    try:
        user = db.query(User).filter((User.name == identifier) | (User.email == identifier)).first()
        if user:
            user.points += amount
            db.commit()
            print(f"✅ Success! User '{user.name}' ({user.email}) now has {user.points} points.")
        else:
            print(f"❌ User '{identifier}' not found.")
    except Exception as e:
        print(f"⚠️ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_points("Test User", 420)
