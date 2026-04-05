import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from supabase import create_client, Client
import json

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    print("Checking financial_ratios...")
    res = supabase.table('financial_ratios').select('symbol, data').limit(5).execute()
    print("Total rows returned:", len(res.data))
    if len(res.data) > 0:
        first_record = res.data[0]
        print("Symbol:", first_record.get('symbol'))
        data = first_record.get('data')
        print("Data fields:", data[0].keys() if isinstance(data, list) and len(data) > 0 else "Empty or not list")

    print("\nChecking financial_statements...")
    res2 = supabase.table('financial_statements').select('symbol, statement_type, period_type').limit(5).execute()
    print("Statement types available:", [r['statement_type'] for r in res2.data])

except Exception as e:
    print("Error querying database:", e)
