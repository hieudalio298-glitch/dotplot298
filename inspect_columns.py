from vnstock_data import Trading, TopStock, Listing
import pandas as pd

t = Trading()
ts = TopStock()

# Check Trading.foreign_trade
print("\n--- Foreign Trade ---")
try:
    df_f = t.foreign_trade(symbol='VN30', start_date='2026-03-10', end_date='2026-03-20')
    if df_f is not None and not df_f.empty:
        if isinstance(df_f.columns[0], tuple):
             df_f.columns = ['_'.join(col).strip() for col in df_f.columns.values]
        print(df_f.head())
        print(df_f.columns.tolist())
    else:
        print("Empty Foreign Trade")
except Exception as e:
    print(f"Error: {e}")

# Check Trading.prop_trade
print("\n--- Prop Trade ---")
try:
    df_p = t.prop_trade(symbol='VN30', start_date='2026-03-10', end_date='2026-03-20')
    if df_p is not None and not df_p.empty:
        if isinstance(df_p.columns[0], tuple):
             df_p.columns = ['_'.join(col).strip() for col in df_p.columns.values]
        print(df_p.head())
        print(df_p.columns.tolist())
    else:
        print("Empty Prop Trade")
except Exception as e:
    print(f"Error: {e}")

# Check TopStock.foreign_buy
print("\n--- Top Foreign Buy ---")
try:
    df_top_f = ts.foreign_buy(listing_group='HOSE')
    if df_top_f is not None and not df_top_f.empty:
        print(df_top_f.head())
        print(df_top_f.columns.tolist())
    else:
        print("Empty Top Foreign Buy")
except Exception as e:
    print(f"Error: {e}")
