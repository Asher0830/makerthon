import random
import uuid
import string
from datetime import datetime, timedelta, timezone
from database import SessionLocal
from models import User, Cup, Record, Store
from auth import get_password_hash

def generate_test_users_and_borrows(user_count=10):
    db = SessionLocal()
    try:
        print(f"👥 Generating {user_count} test users...")
        
        # 1. Get all stores and cups
        stores = db.query(Store).all()
        available_cups = db.query(Cup).filter(Cup.state == "in_stock").all()
        
        if not stores or not available_cups:
            print("❌ Need stores and in_stock cups to continue.")
            return

        store_ids = [s.store_id for s in stores]
        random.shuffle(available_cups)
        
        # 2. Create Users
        password_hash = get_password_hash("password123")
        
        new_users = []
        for i in range(user_count):
            name = f"Test User {i+1}"
            email = f"testuser{i+1}@example.com"
            
            # Check if exists
            if db.query(User).filter(User.email == email).first():
                continue
                
            user = User(
                email=email,
                password_hash=password_hash,
                name=name,
                points=random.randint(0, 100)
            )
            new_users.append(user)
        
        db.add_all(new_users)
        db.commit() # Commit to get UUIDs
        
        print(f"✅ Created {len(new_users)} users. Now assigning cups...")
        
        # 3. Assign Cups
        now = datetime.now(timezone.utc)
        borrow_count = 0
        
        for user in new_users:
            # Each user borrows 1 to 3 cups
            num_to_borrow = random.randint(1, 3)
            
            for _ in range(num_to_borrow):
                if not available_cups:
                    break
                
                cup = available_cups.pop()
                borrow_store_id = random.choice(store_ids)
                
                # Update Cup
                cup.state = "borrowed"
                cup.holder_uuid = user.uuid
                cup.store_id = None
                
                # Create Record
                record = Record(
                    serial_num=str(uuid.uuid4()),
                    uuid=user.uuid,
                    cup_id=cup.cup_id,
                    borrow_store_id=borrow_store_id,
                    borrow_time=now - timedelta(days=random.randint(0, 5)), # Random past borrow time
                    due_date=now + timedelta(days=random.randint(2, 7)),
                    state="ongoing"
                )
                db.add(record)
                
                # Update User
                user.current_borrow_count += 1
                user.total_borrow_count += 1
                
                # Update Store stock count (cached)
                store = next(s for s in stores if s.store_id == borrow_store_id)
                if store.cups_in_stock > 0:
                    store.cups_in_stock -= 1
                    
                borrow_count += 1
        
        db.commit()
        print(f"✨ Successfully created users and {borrow_count} borrow transactions.")
        
    except Exception as e:
        print(f"⚠️ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_test_users_and_borrows(10)
