import vnstock
import pandas as pd
import re

try:
    from vnstock_data import Listing, Trading
except ImportError:
    import sys
    sys.exit(1)

ls = Listing(source='vnd')
all_syms = ls.all_symbols()
stock_symbols = [s for s in all_syms['symbol'].tolist() if re.match(r'^[A-Z]{3}$', s)]

print(f"Total stocks: {len(stock_symbols)}")
batch = stock_symbols[:50]
print(f"Testing batch of 50: {batch}")

try:
    df = vnstock.Trading(source='SSI').price_board(batch)
    if df is not None and not df.empty:
        print(f"Success (SSI)! Got {len(df)} rows.")
        # Flatten and check columns
        print(f"Columns: {df.columns.tolist()[:10]}")
    else:
        print("Failed (SSI): No data returned for batch.")
except Exception as e:
    print(f"Error (SSI): {e}")
