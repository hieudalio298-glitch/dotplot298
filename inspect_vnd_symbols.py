try:
    from vnstock_data import Listing
    listing = Listing(source='vnd')
    df = listing.all_symbols()
    print("Columns:", df.columns.tolist())
    print("First row:", df.iloc[0].to_dict())
except Exception as e:
    print(f"Error: {e}")
