import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
from providers.abo_market_watch import ABOMarketWatchProvider
from datetime import date

# Add parent directory to path to import providers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("❌ Error: Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(url, key)

def check_database():
    print("--- Database Check ---")
    try:
        # Check count
        response = supabase.table("interbank_rates").select("*", count="exact").execute()
        count = response.count
        print(f"[OK] Row count in 'interbank_rates': {count}")
        
        if count == 0:
            print("[WARN] Table is empty.")
            
        # Try a test insert to verify RLS
        print("\n--- RLS Permission Check ---")
        test_data = {
            "date": "1999-01-01",
            "tenor_label": "TEST",
            "rate": 0,
            "source": "TEST"
        }
        try:
            supabase.table("interbank_rates").insert(test_data).execute()
            print("[OK] Write permission CONFIRMED (Insert successful).")
            # Cleanup
            supabase.table("interbank_rates").delete().eq("date", "1999-01-01").eq("source", "TEST").execute()
            print("[OK] Delete permission CONFIRMED.")
        except Exception as e:
            print(f"[ERR] Write permission FAILED: {e}")
            print("=> CAUSE: You likely haven't run the SQL migration '20240209_allow_anon_interbank.sql' yet.")

    except Exception as e:
        print(f"[ERR] Database connection failed: {e}")

def check_provider():
    print("\n--- Provider Check ---")
    try:
        provider = ABOMarketWatchProvider()
        data = provider.fetch(date.today())
        print(f"[OK] Fetched {len(data)} records from ABO.")
        if data:
            print("Sample data:", data[0])
    except Exception as e:
        print(f"[ERR] Provider fetch failed: {e}")

if __name__ == "__main__":
    check_database()
    check_provider()
