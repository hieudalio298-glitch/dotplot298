from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import logging

# Configure logging to see output
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    print("Fetching financials for NTL...")
    
    # Process just NTL
    success = fetcher.process_symbol_safely('NTL')
    
    if success:
        print("Successfully updated NTL financials.")
    else:
        print("Failed to update NTL financials.")
