import os
import sys
import vnstock
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

def explore_vnstock():
    print(f"--- EXPLORING VNSTOCK 3.4.2 ---")
    
    # Try the main Vnstock class
    try:
        v = vnstock.Vnstock()
        print("\nVnstock() methods:", [m for m in dir(v) if not m.startswith('_')])
        
        # Does it have a market?
        if hasattr(v, 'market'):
            print("\nv.market methods:", [m for m in dir(v.market) if not m.startswith('_')])
    except Exception as e:
        print(f"Error initializing Vnstock(): {e}")

    # Try Trading
    try:
        t = vnstock.Trading(source='VCI')
        print("\nTrading(source='VCI') methods:", [m for m in dir(t) if not m.startswith('_')])
    except Exception as e:
        print(f"Error initializing Trading(VCI): {e}")

    # Try Listing - maybe has market info?
    try:
        l = vnstock.Listing()
        print("\nListing() methods:", [m for m in dir(l) if not m.startswith('_')])
    except Exception as e:
        print(f"Error initializing Listing: {e}")

if __name__ == "__main__":
    explore_vnstock()
