import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(
    os.getenv('VITE_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
)

# Check date range in database
result = supabase.table('interbank_rates').select('date').order('date', desc=False).limit(1).execute()
oldest = result.data[0]['date'] if result.data else 'No data'

result2 = supabase.table('interbank_rates').select('date').order('date', desc=True).limit(1).execute()
latest = result2.data[0]['date'] if result2.data else 'No data'

result3 = supabase.table('interbank_rates').select('date', count='exact').execute()
total = result3.count

print(f"Oldest date: {oldest}")
print(f"Latest date: {latest}")
print(f"Total records: {total}")

# Count unique dates
result4 = supabase.table('interbank_rates').select('date').execute()
unique_dates = len(set([r['date'] for r in result4.data]))
print(f"Unique dates: {unique_dates}")
