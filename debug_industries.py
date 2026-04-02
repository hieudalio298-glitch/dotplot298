
import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_industries():
    # Fetch symbols and their industries from stock_symbols
    res = supabase.table('stock_symbols').select('symbol, icb_name2').execute()
    df = pd.DataFrame(res.data)
    
    na_symbols = df[df['icb_name2'] == 'N/A']['symbol'].tolist()
    other_symbols = df[df['icb_name2'] == 'OTHER']['symbol'].tolist()
    unknown_symbols = df[df['icb_name2'] == 'Unknown']['symbol'].tolist()
    null_symbols = df[df['icb_name2'].isna()]['symbol'].tolist()
    
    print("\n--- GROUP: N/A (Industry Not Found) ---")
    print(f"Số lượng: {len(na_symbols)}")
    print(na_symbols[:50], "..." if len(na_symbols) > 50 else "")
    
    print("\n--- NHÓM OTHER (Ngành khác hoặc dữ liệu lạ) ---")
    print(f"Số lượng: {len(other_symbols)}")
    print(other_symbols[:50], "..." if len(other_symbols) > 50 else "")

    print("\n--- NHÓM Unknown (Chưa xác định) ---")
    print(f"Số lượng: {len(unknown_symbols)}")
    print(unknown_symbols[:50], "..." if len(unknown_symbols) > 50 else "")

if __name__ == "__main__":
    check_industries()
