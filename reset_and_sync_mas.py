from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import logging

logging.basicConfig(level=logging.INFO)

def clear_and_sync_all():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    
    print("!!! WARNING: Starting database reset to switch to MAS source !!!")
    
    try:
        # Get all symbols to delete in batches
        res = fetcher.supabase.table('stock_symbols').select('symbol').execute()
        all_symbols = [item['symbol'] for item in res.data]
        
        # 1. Clear old financial data in batches to avoid timeout
        batch_size = 50
        print(f"1/3: Clearing financial_statements for {len(all_symbols)} symbols in batches...")
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            fetcher.supabase.table('financial_statements').delete().in_('symbol', batch).execute()
            if i % 200 == 0: print(f"   Cleared {i} symbols...")

        print(f"2/3: Clearing financial_ratios in batches...")
        for i in range(0, len(all_symbols), batch_size):
            batch = all_symbols[i:i+batch_size]
            fetcher.supabase.table('financial_ratios').delete().in_('symbol', batch).execute()
        
        # 2. Reset update status
        print("3/3: Resetting update status for all symbols...")
        fetcher.supabase.table('stock_symbols').update({'last_updated_at': None}).neq('symbol', '').execute()
        
        print("OK: Database cleaned and status reset.")
        
        # 3. Update symbol list
        print("\n--- Updating stock symbol list from VCI ---")
        fetcher.sync_stock_symbols()
        
        print("\n=== Starting fresh sync from MAS source (All Symbols) ===")
        fetcher.run()
        
    except Exception as e:
        print(f"Error during reset: {e}")

if __name__ == "__main__":
    clear_and_sync_all()
