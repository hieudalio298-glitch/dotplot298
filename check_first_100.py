# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client

# Supabase credentials from src/supabaseClient.ts
supabase_url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
supabase_key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

# Create Supabase client
supabase = create_client(supabase_url, supabase_key)

# Get first 100 symbols ordered by symbol (same as frontend)
result = supabase.table('stock_symbols').select('symbol, company_name').order('symbol').limit(100).execute()

print(f"First 100 symbols (ordered by symbol):")
print("-" * 70)

# Check if SSI and HCM are in first 100
symbols_list = [s['symbol'] for s in result.data]
print(f"Total fetched: {len(symbols_list)}")
print(f"First 10: {symbols_list[:10]}")
print(f"Last 10: {symbols_list[-10:]}")
print()

if 'SSI' in symbols_list:
    idx = symbols_list.index('SSI')
    print(f"[OK] SSI is at position {idx + 1} in first 100")
else:
    print(f"[NOT FOUND] SSI is NOT in first 100 symbols")

if 'HCM' in symbols_list:
    idx = symbols_list.index('HCM')
    print(f"[OK] HCM is at position {idx + 1} in first 100")
else:
    print(f"[NOT FOUND] HCM is NOT in first 100 symbols")

# Test search functionality
print("\n" + "=" * 70)
print("Testing search for 'SSI':")
search_result = supabase.table('stock_symbols').select('symbol, company_name').ilike('symbol', '%SSI%').order('symbol').limit(100).execute()
print(f"Found {len(search_result.data)} results:")
for s in search_result.data[:10]:
    print(f"  - {s['symbol']}: {s['company_name']}")
