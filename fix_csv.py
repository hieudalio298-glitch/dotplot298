import pandas as pd
from vnstock_data import Company
import time

df = pd.read_csv('market_data_cache.csv')
missing_syms = df[df['sector'] == 'Khác']['symbol'].tolist()

print(f"Missing {len(missing_syms)} sectors: {missing_syms}")

for sym in missing_syms:
    try:
        cp = Company(symbol=sym, source='VCI')
        ov = cp.overview()
        if not ov.empty:
            sector = ov.iloc[0].get('icb_name2', 'Khác')
            df.loc[df['symbol'] == sym, 'sector'] = sector
            print(f"Updated {sym} -> {sector}")
        time.sleep(1) # Chờ 1 giây để tránh rate limit
    except Exception as e:
        print(f"Lỗi {sym}: {e}")

df.to_csv('market_data_cache.csv', index=False)
print("Saved market_data_cache.csv")
