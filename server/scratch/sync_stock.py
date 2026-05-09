from database import SessionLocal
from models import Store, Cup
from sqlalchemy import func

def sync_store_stock():
    db = SessionLocal()
    try:
        print("🔍 Starting synchronization of store stock counts...")
        
        # 1. Get all stores
        stores = db.query(Store).all()
        
        for store in stores:
            # 2. Count actual cups assigned to this store that are 'in_stock'
            actual_count = db.query(Cup).filter(
                Cup.store_id == store.store_id,
                Cup.state == "in_stock"
            ).count()
            
            if store.cups_in_stock != actual_count:
                print(f"📍 Store {store.store_id} ({store.name}): {store.cups_in_stock} -> {actual_count}")
                store.cups_in_stock = actual_count
            else:
                print(f"✅ Store {store.store_id} is already in sync ({actual_count})")
        
        db.commit()
        print("\n✨ Synchronization complete! All store stock counts have been corrected.")
        
    except Exception as e:
        print(f"⚠️ Error during sync: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sync_store_stock()
