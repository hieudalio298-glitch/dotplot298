import os
import math
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Check Stocks
    print("--- CHECKING STOCKS ---")
    resp = supabase.table("stocks").select("*").eq("symbol", "VCB").execute()
    if resp.data:
        row = resp.data[0]
        print(f"FOUND: VCB exists in 'stocks' table. ID: {row['id']}, Symbol: {row['symbol']}")
    else:
        print("NOT FOUND: VCB NOT FOUND in 'stocks' table")
        
    # Check Latest Prices
    print("\n--- CHECKING LATEST_PRICES ---")
    if resp.data:
        stock_id = resp.data[0]["id"]
        p_resp = supabase.table("latest_prices").select("*").eq("stock_id", stock_id).execute()
        if p_resp.data:
            print(f"FOUND: Price data found for VCB (ID: {stock_id}): {p_resp.data[0]}")
        else:
            print(f"NOT FOUND: NO PRICE DATA found for VCB (ID: {stock_id}) in 'latest_prices'")
            
    # Check total stocks count
    total = supabase.table("stocks").select("count", count="exact").execute()
    print(f"\nTotal stocks: {total.count}")

if __name__ == "__main__":
    main()
