from vnstock_data import Listing, Trading
import time
import pandas as pd
import sys
import io

# Setup output
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. Get symbols
print("Getting symbols...")
ls = Listing(source='vnd')
df = ls.all_symbols()
syms = df['symbol'].iloc[:10].tolist()

# 2. Try various sources for Trading
sources = ['VCI', 'vnd', 'tcbs', 'ssi']
for src in sources:
    print(f"Trying source: {src}")
    try:
        t = Trading(source=src)
        print(f"  Source {src} initialized!")
        for s in syms:
            try:
                print(f"    Fetching {s}:", end=' ', flush=True)
                h = t.price_history(s, start='2026-03-01', end='2026-03-24')
                print(f"{len(h)} rows")
                break # Just test one
            except Exception as e:
                print(f"Error for {s}: {e}")
    except Exception as e:
        print(f"  Failed to initialize {src}: {e}")
