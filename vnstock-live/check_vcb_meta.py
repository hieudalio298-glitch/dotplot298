import os
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    resp = supabase.table("stocks").select("*").eq("symbol", "VCB").execute()
    if resp.data:
        row = resp.data[0]
        print(f"Metadata for VCB:")
        print(f"Symbol: {row.get('symbol')}")
        print(f"Exchange: {row.get('exchange')}")
        print(f"Sector: {row.get('sector')}")
    else:
        print("VCB not found.")

if __name__ == "__main__":
    main()
