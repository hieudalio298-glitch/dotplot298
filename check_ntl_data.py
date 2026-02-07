from supabase import create_client, Client

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
# Note: The key in the user's file is named "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
# This looks like a project reference or maybe a custom format? No, usually it's "eyJ...".
# Wait, "sb_publishable_..." is not a standard anon key format I recognize (JWT), but it might be specific to some Supabase integration.
# Let's try using it as the key.
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

supabase: Client = create_client(url, key)

def check_ntl_data():
    print("Checking data for NTL (Quarterly Income Statement)...")
    
    try:
        # Check financial_statements table
        response = supabase.table('financial_statements')\
            .select('*')\
            .eq('symbol', 'NTL')\
            .eq('period_type', 'quarter')\
            .execute()
        
        data = response.data
        
        if not data:
            print("No quarterly data found for NTL in 'financial_statements' table.")
        else:
            print(f"Found {len(data)} records for NTL (Quarterly).")
            for item in data:
                print(f"- ID: {item.get('id')}, Statement Type: {item.get('statement_type')}, Updated At: {item.get('updated_at')}")
                
        # Also check if it exists in 'financial_ratios' just in case
        response_ratios = supabase.table('financial_ratios')\
            .select('*')\
            .eq('symbol', 'NTL')\
            .eq('period_type', 'quarter')\
            .execute()
            
        data_ratios = response_ratios.data
        if not data_ratios:
             print("No quarterly data found for NTL in 'financial_ratios' table.")
        else:
             print(f"Found {len(data_ratios)} records for NTL (Quarterly Ratios).")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    check_ntl_data()
