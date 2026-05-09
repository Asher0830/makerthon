import random
import string
from database import SessionLocal
from models import Store, Cup

def add_random_cups(count=50):
    db = SessionLocal()
    try:
        print(f"🚀 Generating {count} random cups...")
        
        # 1. Get all store IDs
        stores = db.query(Store).all()
        if not stores:
            print("❌ No stores found. Please create stores first.")
            return
            
        store_ids = [s.store_id for s in stores]
        
        added_count = 0
        for i in range(count):
            # Generate a random cup ID
            random_suffix = ''.join(random.choices(string.digits, k=5))
            cup_id = f"CUP_{random_suffix}"
            
            # Check if cup_id already exists
            if db.query(Cup).filter(Cup.cup_id == cup_id).first():
                continue
                
            # Randomly assign to a store
            assigned_store_id = random.choice(store_ids)
            
            new_cup = Cup(
                cup_id=cup_id,
                state="in_stock",
                store_id=assigned_store_id
            )
            db.add(new_cup)
            
            # Update store's cached count
            target_store = db.query(Store).filter(Store.store_id == assigned_store_id).first()
            if target_store:
                target_store.cups_in_stock += 1
                
            added_count += 1
            
        db.commit()
        print(f"✅ Successfully added {added_count} new cups distributed across {len(stores)} stores.")
        
    except Exception as e:
        print(f"⚠️ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_random_cups(80) # Let's add 80 cups
