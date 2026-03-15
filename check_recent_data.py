
import os
from supabase import create_client, Client
import pandas as pd

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def check_recent_data():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Check for data updated in the last hour
        one_hour_ago = (pd.Timestamp.now() - pd.Timedelta(hours=1)).isoformat()
        
        print(f"Checking for data updated since {one_hour_ago}...")
        
        response = supabase.table('financial_statements') \
            .select('symbol, statement_type, period_type, updated_at') \
            .gt('updated_at', one_hour_ago) \
            .limit(10) \
            .execute()
            
        if response.data:
            print(f"Found {len(response.data)} recently updated records (showing first 5):")
            for item in response.data[:5]:
                print(item)
            print("\nData verification SUCCESS: Recent updates found.")
        else:
            print("WARNING: No data found updated in the last hour.")

    except Exception as e:
        print(f"Error verifying data: {e}")

if __name__ == "__main__":
    check_recent_data()
