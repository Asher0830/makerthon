import random
import string
from database import SessionLocal
from models import Store, Cup

def add_massive_cups(count=5000):
    db = SessionLocal()
    try:
        print(f"🚀 Generating {count} cups (Bulk Mode)...")
        
        # 1. Get all store IDs
        stores = db.query(Store).all()
        if not stores:
            print("❌ No stores found.")
            return
        store_map = {s.store_id: s for s in stores}
        store_ids = list(store_map.keys())
        
        # 2. Get existing cup IDs to avoid collisions
        existing_ids = set(c[0] for c in db.query(Cup.cup_id).all())
        
        new_cups = []
        added_count = 0
        
        # Track stock updates locally first to avoid 5000 DB updates
        stock_updates = {sid: 0 for sid in store_ids}
        
        while added_count < count:
            # Random 7-digit ID for more entropy
            random_suffix = ''.join(random.choices(string.digits, k=7))
            cup_id = f"CUP_{random_suffix}"
            
            if cup_id in existing_ids:
                continue
            
            existing_ids.add(cup_id)
            sid = random.choice(store_ids)
            
            new_cups.append(Cup(
                cup_id=cup_id,
                state="in_stock",
                store_id=sid
            ))
            stock_updates[sid] += 1
            added_count += 1
            
            # Periodic flush to memory management
            if len(new_cups) >= 1000:
                db.add_all(new_cups)
                new_cups = []
                print(f"...progress: {added_count}/{count}")

        # Final flush
        if new_cups:
            db.add_all(new_cups)
            
        # Update stores
        for sid, inc in stock_updates.items():
            store_map[sid].cups_in_stock += inc
            
        db.commit()
        print(f"✅ Success! Added {added_count} cups efficiently.")
        
    except Exception as e:
        print(f"⚠️ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_massive_cups(5000)
