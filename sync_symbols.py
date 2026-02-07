from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY

def main():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    fetcher.sync_stock_symbols()

if __name__ == "__main__":
    main()
