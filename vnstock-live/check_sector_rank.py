import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Find VCB sector
    vcb_resp = supabase.table("stocks").select("sector").eq("symbol", "VCB").execute()
    sector = vcb_resp.data[0]["sector"] if vcb_resp.data else None
    print(f"VCB Sector: {sector}")
    
    if not sector:
        print("VCB HAS NO SECTOR ASSIGNED!")
        return

    # 2. Get all stocks in this sector
    stocks_resp = supabase.table("stocks").select("id, symbol").eq("sector", sector).execute()
    stock_ids = [s["id"] for s in stocks_resp.data]
    symbol_map = {s["id"]: s["symbol"] for s in stocks_resp.data}
    
    # 3. Get prices for these stocks and sort by volume
    prices_resp = supabase.table("latest_prices").select("stock_id, volume").in_("stock_id", stock_ids).execute()
    
    sorted_prices = sorted(prices_resp.data, key=lambda x: x.get("volume") or 0, reverse=True)
    
    print(f"\nTop 15 stocks in '{sector}' by volume:")
    for i, p in enumerate(sorted_prices[:15]):
        symbol = symbol_map.get(p["stock_id"], "???")
        vol = p.get("volume", 0)
        marker = " <--- VCB" if symbol == "VCB" else ""
        print(f"{i+1}. {symbol}: {vol:,}{marker}")

if __name__ == "__main__":
    main()
