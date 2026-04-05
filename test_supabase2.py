import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    print("Checking income_statement...")
    res = supabase.table('financial_statements')\
        .select('*')\
        .eq('statement_type', 'income_statement')\
        .eq('period_type', 'quarter')\
        .limit(2).execute()
        
    for r in res.data:
        print("Symbol:", r['symbol'], "Updated:", r['updated_at'])
        data = r['data']
        if isinstance(data, list) and len(data) > 0:
            print("Row 0 keys:", data[0].keys())
            print("Row 0 sample:")
            for k, v in data[0].items():
                print(f"  {k}: {v}")
except Exception as e:
    print("Error:", e)
