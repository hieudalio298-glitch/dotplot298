import vnstock
import json

symbols = ['VCB', 'FPT', 'VIC']
try:
    df = vnstock.Trading(source='VCI').price_board(symbols)
    if df is not None and not df.empty:
        print("Price Board Data:")
        print(df.head())
        # Print list of columns
        print("\nColumns:", df.columns.tolist())
    else:
        print("Price board returned empty or None.")
except Exception as e:
    print(f"Error fetching price board: {e}")
