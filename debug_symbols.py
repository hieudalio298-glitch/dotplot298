from vnstock_data import Listing, Trading
ls = Listing(source='vnd')
df = ls.all_symbols()
syms = df['symbol'].iloc[:20].tolist()
t = Trading(source='VCI')
print(f"Testing first 20 symbols: {syms}")
for s in syms:
    try:
        print(f"Fetching {s}...", end=' ')
        res = t.price_history(s, start='2026-02-01', end='2026-03-24')
        if res is not None:
            print(f"Found {len(res)} rows")
        else:
            print("None")
    except Exception as e:
        print(f"ERROR: {e}")
