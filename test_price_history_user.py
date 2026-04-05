from vnstock_data import Trading
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_user_snippet():
    # Attempting with 'MSN' and 'vci' as per previous context
    symbol = 'MSN'
    source = 'vci'
    START_DATE = '2026-03-11'
    END_DATE = '2026-03-20'
    
    print(f"Running: Trading(symbol='{symbol}', source='{source}').price_history(start='{START_DATE}', end='{END_DATE}', resolution='1D')")
    try:
        trading = Trading(symbol=symbol, source=source)
        df = trading.price_history(start=START_DATE, end=END_DATE, resolution='1D')
        
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', 1000)
        
        if df is not None and not df.empty:
            print("\nData retrieved:")
            print(df)
            cols = list(df.columns)
            print("\nAvailable columns:", cols)
        else:
            print("\nNo data returned or empty DataFrame.")
            
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    run_user_snippet()
