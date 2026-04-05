import vnstock
import pandas as pd
import sys
from datetime import datetime, timedelta

# Fix encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def explore():
    v = vnstock.Vnstock()
    l = vnstock.Listing()
    
    print("--- HOSE Symbols ---")
    try:
        hose = l.symbols_by_exchange('HOSE')
        print(f"Total HOSE: {len(hose)}")
        print(f"Columns: {hose.columns.tolist()}")
        # Check if 'industry' or something is hidden in other methods
    except Exception as e:
        print(f"Error HOSE: {e}")

    print("\n--- Try KBS price_board ---")
    try:
        t_kbs = vnstock.Trading(source='KBS')
        pb = t_kbs.price_board(symbols=['VCB', 'VIC', 'HPG'])
        print("KBS Success!")
        print(pb.head())
    except Exception as e:
        print(f"Error KBS: {e}")

    print("\n--- Try History (VCI) ---")
    try:
        t_vci = vnstock.Trading(source='VCI')
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        hist = t_vci.history(symbol='VCB', start_date=start_date, end_date=end_date)
        print("History Success!")
        print(hist.head())
    except Exception as e:
        print(f"Error History: {e}")

    print("\n--- Try Industry details ---")
    try:
        # Maybe Listing().symbols_by_industries?
        # But we need to know the industries first
        inds = l.industries_icb()
        print(inds.head())
    except Exception as e:
        print(f"Error Industries: {e}")

if __name__ == "__main__":
    explore()
