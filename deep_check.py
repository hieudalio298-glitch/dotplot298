# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

supabase_url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
supabase_key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

supabase = create_client(supabase_url, supabase_key)

# Get total count
total = supabase.table('stock_symbols').select('symbol', count='exact').execute()
print(f"Total symbols: {total.count}")
print()

# Get all symbols
all_result = supabase.table('stock_symbols').select('symbol').order('symbol').execute()
all_symbols = [s['symbol'] for s in all_result.data]

print(f"Actually loaded: {len(all_symbols)} symbols")
print(f"Range: {all_symbols[0]} to {all_symbols[-1]}")
print()

# Check for SSI specifically
print("Searching for SSI in different ways:")
ssi_exact = supabase.table('stock_symbols').select('*').eq('symbol', 'SSI').execute()
print(f"1. Exact match (symbol = 'SSI'): {len(ssi_exact.data)} results")

ssi_like = supabase.table('stock_symbols').select('*').ilike('symbol', '%SSI%').execute()
print(f"2. LIKE search (symbol LIKE '%SSI%'): {len(ssi_like.data)} results")
if ssi_like.data:
    print(f"   Found: {[s['symbol'] for s in ssi_like.data]}")

# Check symbols around position 500-700
print(f"\nSymbols at positions 495-505:")
for i in range(495, min(505, len(all_symbols))):
    print(f"  {i+1}. {all_symbols[i]}")

print(f"\nSymbols at positions 660-670:")
for i in range(660, min(670, len(all_symbols))):
    print(f"  {i+1}. {all_symbols[i]}")
