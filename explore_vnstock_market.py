import os
import sys
from vnstock_data import TopStock, config, Trading
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def explore():
    target_date = '2026-03-20'
    print(f"--- EXPLORING VNSTOCK FOR {target_date} ---")
    
    # Try TopStock
    print("\n[TopStock methods]")
    ts = TopStock()
    methods = [m for m in dir(ts) if not m.startswith('_')]
    print(methods)
    
    for m in methods:
        try:
            print(f"\nCalling TopStock().{m}...")
            # Some methods might not take 'date' as an argument
            df = getattr(ts, m)()
            if df is not None:
                print(f"  Shape: {df.shape}")
                print(df.head(2))
        except Exception as e:
            print(f"  Error calling {m}: {e}")

if __name__ == "__main__":
    explore()
