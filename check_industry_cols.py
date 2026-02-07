from vnstock_data import Finance
import pandas as pd
import sys

# Windows terminal UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def check_bank_sec(symbol):
    print(f"\n{'='*80}")
    print(f"COLUMNS ANALYSIS FOR: {symbol}")
    print(f"{'='*80}")
    
    finance = Finance(symbol=symbol, source='MAS')
    
    try:
        # Fetching Income Statement
        df = finance.income_statement(period='quarter', size=1)
        if df is not None and not df.empty:
            print(f"\n--- Income Statement Columns ({symbol}) ---")
            cols = [c for c in df.columns if c != 'period']
            for i, c in enumerate(cols):
                print(f"{i+1}. {c}")
        
        # Fetching Balance Sheet
        df_bs = finance.balance_sheet(period='quarter', size=1)
        if df_bs is not None and not df_bs.empty:
            print(f"\n--- Balance Sheet Columns ({symbol}) ---")
            cols = [c for c in df_bs.columns if c != 'period']
            for i, c in enumerate(cols[:200]): # Show first 50
                print(f"{i+1}. {c}")
        # Fetching Cashflow        
        df_cf = finance.cash_flow(period='quarter', size=1)
        if df_cf is not None and not df_cf.empty:
            print(f"\n--- Cashflow Columns ({symbol}) ---")
            cols = [c for c in df_cf.columns if c != 'period']
            for i, c in enumerate(cols[:200]): # Show first 50
                print(f"{i+1}. {c}")        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_bank_sec('PTI') # Bank
