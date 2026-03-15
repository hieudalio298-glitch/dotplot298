"""
Script to enrich stocks table with sector data from stock_symbols table.
Also re-fetches prices for ALL symbols.
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def enrich_sectors():
    """Copy icb_name2 from stock_symbols to stocks.sector by matching symbol."""
    print("Fetching stock_symbols...")
    
    # Fetch all stock_symbols with icb_name2
    all_symbols = []
    offset = 0
    while True:
        resp = supabase.table("stock_symbols").select("symbol, icb_name2").range(offset, offset + 999).execute()
        if not resp.data:
            break
        all_symbols.extend(resp.data)
        if len(resp.data) < 1000:
            break
        offset += 1000
    
    print(f"Got {len(all_symbols)} symbols from stock_symbols")
    
    # Build symbol -> sector map
    sector_map = {}
    for row in all_symbols:
        sym = row.get("symbol")
        sector = row.get("icb_name2")
        if sym and sector and sector != "N/A":
            sector_map[sym] = sector
    
    print(f"Found {len(sector_map)} symbols with valid sector data")
    
    # Fetch all stocks
    all_stocks = []
    offset = 0
    while True:
        resp = supabase.table("stocks").select("id, symbol, sector").range(offset, offset + 999).execute()
        if not resp.data:
            break
        all_stocks.extend(resp.data)
        if len(resp.data) < 1000:
            break
        offset += 1000
    
    print(f"Got {len(all_stocks)} stocks from stocks table")
    
    # Update sectors
    updated = 0
    skipped = 0
    for stock in all_stocks:
        sym = stock["symbol"]
        new_sector = sector_map.get(sym)
        if new_sector and stock.get("sector") != new_sector:
            try:
                supabase.table("stocks").update({"sector": new_sector}).eq("id", stock["id"]).execute()
                updated += 1
                if updated % 100 == 0:
                    print(f"  Updated {updated} sectors so far...")
            except Exception as e:
                print(f"  Error updating {sym}: {e}")
        else:
            skipped += 1
    
    print(f"Done! Updated {updated} sectors, skipped {skipped}")

def check_sectors():
    """Print unique sectors."""
    resp = supabase.table("stocks").select("sector").neq("sector", "null").execute()
    sectors = set()
    for row in resp.data:
        if row.get("sector"):
            sectors.add(row["sector"])
    print(f"\nUnique sectors ({len(sectors)}):")
    for s in sorted(sectors):
        print(f"  - {s}")

if __name__ == "__main__":
    enrich_sectors()
    check_sectors()
