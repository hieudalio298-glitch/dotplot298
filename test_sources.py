from vnstock_data import Trading, config
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
config.api_key = "vnstock_e45db2c59a9e33e9f9237e432de75a1d"

t = Trading()
sources = ['SSI', 'VCI', 'KBS', 'VND', 'MAS']

for s in sources:
    print(f"\nTrying source: {s}")
    try:
        t_src = Trading(source=s)
        df = t_src.foreign_trade(symbol='VN30', start_date='2026-03-10', end_date='2026-03-20')
        if df is not None and not df.empty:
            print(f"Success with {s}!")
            print(df.head())
            break
        else:
            print(f"Empty from {s}")
    except Exception as e:
        print(f"Error with {s}: {e}")
