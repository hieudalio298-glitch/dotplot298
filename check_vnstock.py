try:
    from vnstock_data import Listing
    print("vnstock_data is available")
    df = Listing(source='vnd').all_symbols()
    print(f"Fetched {len(df)} symbols")
    print(df.columns.tolist())
except ImportError:
    print("vnstock_data is NOT available")
except Exception as e:
    print(f"Error: {e}")
