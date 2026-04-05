# -*- coding: utf-8 -*-
from vnstock_data import Trading
import pandas as pd
from datetime import datetime, timedelta
import sys

# Ensure UTF-8 output for Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def fetch_pvt_prices():
    symbol = 'PVT'
    source = 'VCI'
    
    # Get last 30 days
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    print(f"Fetching price history for {symbol} from {start_date} to {end_date}...")
    
    try:
        trading = Trading(symbol=symbol, source=source)
        df = trading.price_history(start=start_date, end=end_date, resolution='1D', get_all=True)
        
        if df is not None and not df.empty:
            # Reorder columns for readability if they exist
            cols = df.columns.tolist()
            preferred_order = ['trading_date', 'open', 'high', 'low', 'close', 'volume']
            existing_pref = [c for c in preferred_order if c in cols]
            remaining = [c for c in cols if c not in preferred_order]
            df = df[existing_pref + remaining]
            
            # Print last 10 sessions
            print("\nLast 10 trading sessions for PVT:")
            print(df.tail(10).to_string(index=False))
            
            # Save to CSV for the user if needed
            df.to_csv('pvt_price_history.csv', index=False)
            print(f"\nFull data saved to pvt_price_history.csv")
        else:
            print("No data found for PVT.")
            
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    fetch_pvt_prices()
