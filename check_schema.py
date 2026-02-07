from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

def check():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    res = fetcher.supabase.table('stock_symbols').select('*').limit(1).execute()
    print(json.dumps(res.data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    check()
