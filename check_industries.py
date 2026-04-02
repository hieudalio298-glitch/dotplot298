import os
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client, Client
import pandas as pd

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def check_industries():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Fetch all records to get distinct industries (Supabase select unique is tricky, so fetch distinct via pandas)
    print("Fetching industries...")
    response = supabase.table('stock_symbols').select('icb_name2').execute()
    
    df = pd.DataFrame(response.data)
    if not df.empty:
        industries = sorted(df['icb_name2'].dropna().unique())
        print(f"\nDistinct Industries ({len(industries)}):")
        for ind in industries:
            print(f"- {ind}")
            
if __name__ == "__main__":
    check_industries()
