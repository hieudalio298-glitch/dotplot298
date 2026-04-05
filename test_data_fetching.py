from vnstock_data import Market, Trading, TopStock
import pandas as pd

# Test foreign trade
try:
    print("Fetching Foreign Trade...")
    df_foreign = Trading().foreign_trade(symbol='VN30', start_date='2026-03-01', end_date='2026-03-20')
    print(df_foreign.head())
except Exception as e:
    print(f"Foreign Trade Error: {e}")

# Test prop trade
try:
    print("\nFetching Prop Trade...")
    df_prop = Trading().prop_trade(symbol='VN30', start_date='2026-03-01', end_date='2026-03-20')
    print(df_prop.head())
except Exception as e:
    print(f"Prop Trade Error: {e}")

# Test Top Foreign Buy
try:
    print("\nFetching Top Foreign Buy...")
    df_top_foreign = TopStock().foreign_buy(listing_group='HOSE')
    print(df_top_foreign.head())
except Exception as e:
    print(f"Top Foreign Buy Error: {e}")
