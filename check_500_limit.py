# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

# Supabase credentials
supabase_url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
supabase_key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

supabase = create_client(supabase_url, supabase_key)

# Get first 500 symbols (what frontend loads initially)
result = supabase.table('stock_symbols').select('symbol').order('symbol').limit(500).execute()

symbols_500 = [s['symbol'] for s in result.data]

print(f"First 500 symbols range: {symbols_500[0]} to {symbols_500[-1]}")
print()

# Check if symbols starting with O, S, V are in first 500
test_prefixes = ['O', 'S', 'V', 'H', 'P']
for prefix in test_prefixes:
    matching = [s for s in symbols_500 if s.startswith(prefix)]
    print(f"Symbols starting with '{prefix}' in first 500: {len(matching)}")
    if matching:
        print(f"  Examples: {matching[:5]}")
    else:
        print(f"  ❌ NONE FOUND - This is why search fails!")
    print()

# Find where SSI, VND, VCB, VPB would be
all_result = supabase.table('stock_symbols').select('symbol').order('symbol').execute()
all_symbols = [s['symbol'] for s in all_result.data]

print("=" * 70)
print("Position of important symbols in full list:")
for sym in ['SSI', 'VND', 'VCB', 'VPB', 'HCM', 'OPC', 'OCB']:
    if sym in all_symbols:
        idx = all_symbols.index(sym)
        print(f"{sym}: position {idx + 1} / {len(all_symbols)}")
        if idx >= 500:
            print(f"  ⚠️  OUTSIDE first 500 - won't be searchable!")
    else:
        print(f"{sym}: NOT FOUND in database")
