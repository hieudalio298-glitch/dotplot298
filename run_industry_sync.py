from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import sys

# Set encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def run_sync():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    # Start with 5 symbols to test database columns
    fetcher.sync_industry_details(limit=5)

if __name__ == "__main__":
    run_sync()
