import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def debug_labels():
    url = os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("Missing credentials")
        return

    supabase = create_client(url, key)
    
    # Fetch all tenor labels (using a large limit to be safe, though a distinct query would be better if supported easily)
    # Since Supabase-py doesn't have a simple distinct(), we fetch plenty and set() in python
    data = supabase.table('interbank_rates').select('tenor_label').limit(2000).execute().data
    
    labels = set([d['tenor_label'] for d in data])
    print(f"Unique Tenor Labels Found ({len(data)} records sampled):")
    for l in labels:
        print(f"'{l}'")

if __name__ == "__main__":
    debug_labels()
