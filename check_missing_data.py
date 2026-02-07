from supabase import create_client
import logging

url='https://utqmpdmbkubhzuccqeyf.supabase.co'
key='sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is'
supabase = create_client(url, key)

def get_all_symbols():
    all_s = []
    offset = 0
    while True:
        res = supabase.table('stock_symbols').select('symbol').range(offset, offset+999).execute()
        all_s.extend([x['symbol'] for x in res.data])
        if len(res.data) < 1000:
            break
        offset += 1000
    return all_s

def get_symbols_with_data():
    all_data_s = set()
    offset = 0
    while True:
        res = supabase.table('financial_statements').select('symbol').range(offset, offset+999).execute()
        all_data_s.update([x['symbol'] for x in res.data])
        if len(res.data) < 1000:
            break
        offset += 1000
    return all_data_s

print("Analyzing database...")
all_list = get_all_symbols()
data_set = get_symbols_with_data()

missing = [s for s in all_list if s not in data_set]

print(f"Total Symbols in 'stock_symbols': {len(all_list)}")
print(f"Symbols with at least one record in 'financial_statements': {len(data_set)}")
print(f"Symbols missing financial data: {len(missing)}")

if missing:
    print("\nFirst 100 Missing Symbols:")
    # Print in grid for readability
    for i in range(0, min(len(missing), 100), 10):
        print(", ".join(missing[i:i+10]))
    
    if len(missing) > 100:
        print(f"... and {len(missing) - 100} more.")
else:
    print("Great! All symbols have financial data.")
