import os
import sys
import io
import json
from supabase import create_client, Client

# Set stdout to handle UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase = create_client(url, key)

SYMBOL = "VND"
# VND might not have 2025 data yet if it's early 2026? 
# Or maybe it does. Let's check 2023 or 2024 to be safe and see structure.
YEAR = 2023 
QUARTER = 4

print(f"Fetching Financial Data for {SYMBOL} Q{QUARTER}/{YEAR}...")

def fetch_and_print(table, type_col, type_val):
    print(f"\n--- {type_val} ---")
    try:
        # Fetch data for the symbol and type
        res = supabase.table(table).select("data").eq("symbol", SYMBOL).eq(type_col, type_val).eq("period_type", "quarter").execute()
        
        if res.data:
            all_rows = []
            for r in res.data:
                if isinstance(r['data'], list):
                    all_rows.extend(r['data'])
                else:
                    all_rows.append(r['data'])
            
            target = None
            for row in all_rows:
                r_year = row.get('year') or row.get('Year') or row.get('Năm') or row.get('report_year')
                r_quarter = row.get('quarter') or row.get('Quarter') or row.get('Quý') or row.get('report_quarter')
                
                if str(r_year) == str(YEAR) and str(r_quarter) == str(QUARTER):
                    target = row
                    break
            
            if target:
                print(f"Keys ({len(target.keys())}):")
                keys = list(target.keys())
                keys.sort()
                for k in keys:
                     print(f"'{k}'")
            else:
                print(f"No data found for Q{QUARTER}/{YEAR}.")
        else:
            print("No data found in database.")
            
    except Exception as e:
        print(f"Error: {e}")

fetch_and_print("financial_statements", "statement_type", "income_statement")
fetch_and_print("financial_statements", "statement_type", "balance_sheet")
