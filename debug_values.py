import sys
import io
from supabase import create_client
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase = create_client(url, key)

symbol = 'HPG'
period = 'year'

print(f"--- Debugging {symbol} ({period}) ---")

# Check Income Statement
res = supabase.table('financial_statements').select('data').eq('symbol', symbol).eq('statement_type', 'income_statement').eq('period_type', period).execute()
if res.data:
    for row in res.data:
        inner_data = row['data']
        if isinstance(inner_data, list):
            print(f"Found {len(inner_data)} records in one row")
            for d in inner_data:
                year = d.get('Năm') or d.get('year') or d.get('Year')
                if year == 2024 or year == '2024':
                    print(f"Year 2024 Data Sample:")
                    # Look for revenue-like keys
                    for k, v in d.items():
                        if 'doanh thu' in k.lower():
                            print(f"  - {k}: {v} (Type: {type(v)})")
        else:
            print("inner_data is not a list")
else:
    print("No data found for income_statement")
