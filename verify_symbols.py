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
test_symbols = ['VND', 'SSI', 'VCB', 'VPB', 'HCM', 'HPG', 'VNM']

print("Checking symbols in stock_symbols table:")
print("=" * 70)

for symbol in test_symbols:
    result = supabase.table('stock_symbols').select('*').eq('symbol', symbol).execute()
    if result.data:
        data = result.data[0]
        print(f"[FOUND] {symbol}")
        print(f"  Company: {data.get('company_name', 'N/A')}")
        print(f"  Industry: {data.get('icb_name2', 'N/A')}")
        print(f"  All fields: {list(data.keys())}")
    else:
        print(f"[NOT FOUND] {symbol}")
    print("-" * 70)

# Check total count
total = supabase.table('stock_symbols').select('symbol', count='exact').execute()
print(f"\nTotal symbols in database: {total.count}")

# Check if there's a different table name
print("\n" + "=" * 70)
print("Checking all tables in database...")
try:
    # Try to list tables (this might not work with all permissions)
    tables_result = supabase.table('information_schema.tables').select('table_name').execute()
    print(f"Found tables: {tables_result.data}")
except Exception as e:
    print(f"Could not list tables: {e}")
