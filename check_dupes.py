from supabase import create_client
import json

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase = create_client(url, key)

symbol = 'HPG'
period = 'year'

res = supabase.table('financial_statements').select('id, data').eq('symbol', symbol).eq('statement_type', 'income_statement').eq('period_type', period).execute()
print(f"Total rows for {symbol} income year: {len(res.data)}")
if res.data:
    for i, row in enumerate(res.data):
        d_list = row['data']
        count = len(d_list) if isinstance(d_list, list) else 1
        print(f"Row {i} (id={row['id']}): {count} records")
