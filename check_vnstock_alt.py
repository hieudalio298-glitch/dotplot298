try:
    from vnstock import Listing
    print("vnstock.Listing is available")
    df = Listing(source='vnd').all_symbols()
    print(f"Fetched {len(df)} symbols")
    print(df.columns.tolist())
except ImportError:
    print("vnstock.Listing is NOT available")
except Exception as e:
    print(f"Error: {e}")
