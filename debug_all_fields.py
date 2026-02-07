import sys
import io
from supabase import create_client
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase = create_client(url, key)

symbol = 'HPG'
res = supabase.table('financial_statements').select('data').eq('symbol', symbol).eq('statement_type', 'income_statement').eq('period_type', 'year').execute()
if res.data:
    first_row = res.data[0]['data']
    if isinstance(first_row, list) and len(first_row) > 0:
        record = first_row[0]
        print(f"Sample record for {symbol}:")
        for k, v in record.items():
            print(f"- '{k}': {v} ({type(v)})")
