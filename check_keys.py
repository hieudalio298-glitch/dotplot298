import sys
import io
from supabase import create_client
import json

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase = create_client(url, key)

res = supabase.table('financial_statements').select('data').eq('symbol', 'HPG').eq('statement_type', 'income_statement').eq('period_type', 'year').execute()
if res.data and len(res.data) > 0:
    data_list = res.data[0]['data']
    if data_list and len(data_list) > 0:
        first_row = data_list[0]
        print("Keys in financial_ratios:")
        for k in sorted(first_row.keys()):
            print(f"- {k}")
    else:
        print("No inner data list found")
else:
    print("No rows found")
