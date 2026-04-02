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

# Check for specific symbols
test_symbols = ['SSI', 'HCM', 'VNM', 'HPG', 'VCB', 'FPT']

print("Checking symbols in database...")
print("-" * 50)

for symbol in test_symbols:
    result = supabase.table('stock_symbols').select('symbol, company_name').eq('symbol', symbol).execute()
    if result.data:
        print(f"[OK] {symbol}: {result.data[0]['company_name']}")
    else:
        print(f"[NOT FOUND] {symbol}")

print("-" * 50)

# Get total count
total = supabase.table('stock_symbols').select('symbol', count='exact').execute()
print(f"\nTotal symbols in database: {total.count}")

# Get first 10 symbols
first_10 = supabase.table('stock_symbols').select('symbol, company_name').limit(10).execute()
print(f"\nFirst 10 symbols:")
for s in first_10.data:
    print(f"  - {s['symbol']}: {s['company_name']}")
