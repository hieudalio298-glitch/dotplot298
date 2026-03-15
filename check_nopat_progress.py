
import os
from supabase import create_client, Client
import pandas as pd

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def check_progress():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Check for data updated in the last hour
        one_hour_ago = (pd.Timestamp.now() - pd.Timedelta(hours=1)).isoformat()
        
        print(f"Checking for NOPAT updated since {one_hour_ago}...")
        
        # Supabase API might not support count directly easily without a specific query, 
        # but we can select count
        response = supabase.table('financial_nopat') \
            .select('*', count='exact', head=True) \
            .gt('updated_at', one_hour_ago) \
            .execute()
            
        print(f"Total NOPAT records updated in last hour: {response.count}")
        
        # Get total symbols count for reference
        res_sym = supabase.table('stock_symbols').select('*', count='exact', head=True).execute()
        print(f"Total symbols in DB: {res_sym.count}")
        
        if res_sym.count > 0:
            print(f"Estimated progress (records, not symbols): N/A (One symbol has multiple records)")
            
    except Exception as e:
        print(f"Error checking progress: {e}")

if __name__ == "__main__":
    check_progress()
