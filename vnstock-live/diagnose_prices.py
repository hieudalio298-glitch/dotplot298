import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    symbols = ["HPG", "NKG", "HSG", "VCB"]
    print(f"--- CHECKING SYMBOLS: {symbols} ---")
    
    for symbol in symbols:
        resp = supabase.table("stocks").select("*").eq("symbol", symbol).execute()
        if resp.data:
            stock = resp.data[0]
            print(f"\nStock: {symbol} (ID: {stock['id']})")
            
            p_resp = supabase.table("latest_prices").select("*").eq("stock_id", stock["id"]).execute()
            if p_resp.data:
                price = p_resp.data[0]
                print(f"  Price: {price.get('price')}, Change: {price.get('change')}, Vol: {price.get('volume')}")
            else:
                print(f"  ❌ NO PRICE DATA in latest_prices")
        else:
            print(f"\n❌ Symbol {symbol} NOT FOUND in stocks table")

if __name__ == "__main__":
    main()
