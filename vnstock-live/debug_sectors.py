import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Get all unique sectors directly
    stocks = supabase.table("stocks").select("sector").execute()
    all_sectors = [s["sector"] for s in stocks.data if s.get("sector")]
    unique_sectors = sorted(list(set(all_sectors)))
    
    print("Unique sectors in DB:")
    for s in unique_sectors:
        print(f"'{s}' (len: {len(s)})")
        
    # 2. Check VCB specifically
    vcb = supabase.table("stocks").select("sector").eq("symbol", "VCB").execute()
    if vcb.data:
        vcb_s = vcb.data[0]["sector"]
        print(f"\nVCB Sector in DB: '{vcb_s}' (len: {len(vcb_s)})")
        
    # 3. Check if 'Ngân hàng' is in unique_sectors
    if vcb_s in unique_sectors:
        print(f"\nMatch found: '{vcb_s}' is in the sectors list.")
    else:
        print(f"\nNO MATCH! '{vcb_s}' is NOT in the sectors list.")

if __name__ == "__main__":
    main()
