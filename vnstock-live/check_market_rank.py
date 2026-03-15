import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Get all stocks
    stocks_resp = supabase.table("stocks").select("id, symbol").execute()
    symbol_map = {s["id"]: s["symbol"] for s in stocks_resp.data}
    
    # 2. Get all prices
    prices_resp = supabase.table("latest_prices").select("stock_id, volume").execute()
    
    # 3. Sort by volume
    sorted_prices = sorted(prices_resp.data, key=lambda x: x.get("volume") or 0, reverse=True)
    
    print("Market-wide Top 15 stocks by volume:")
    for i, p in enumerate(sorted_prices[:15]):
        symbol = symbol_map.get(p["stock_id"], "???")
        vol = p.get("volume", 0)
        marker = " <--- VCB" if symbol == "VCB" else ""
        print(f"{i+1}. {symbol}: {vol:,}{marker}")

if __name__ == "__main__":
    main()
