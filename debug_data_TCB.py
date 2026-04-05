import json
import logging
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def debug_data(symbol="TCB"):
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    response = supabase.table('financial_ratios').select('data').eq('symbol', symbol).eq('period_type', 'quarter').execute()
    
    if response.data:
        data = response.data[0]['data']
        with open('debug_tcb_data.json', 'w', encoding='utf-8') as f:
            json.dump(data[:10], f, indent=2, ensure_ascii=False)
        print("Data written to debug_tcb_data.json")
    else:
        print(f"No data found for {symbol}")

if __name__ == "__main__":
    debug_data("TCB")
