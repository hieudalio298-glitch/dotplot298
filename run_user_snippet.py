from vnstock_data import Trading
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def run_user_snippet():
    print("--- Running User Snippet (MSN, VCI) ---")
    try:
        trading = Trading(symbol='MSN', source='vci')
        START_DATE = '2024-08-01'
        END_DATE = '2024-08-16'
        
        print(f"Fetching data from {START_DATE} to {END_DATE}...")
        
        print("\n[Foreign Trade]")
        df_f = trading.foreign_trade(start=START_DATE, end=END_DATE)
        print(df_f)
        
        print("\n[Proprietary Trade]")
        df_p = trading.prop_trade(start=START_DATE, end=END_DATE)
        print(df_p)
        
        print("\n[Summary]")
        df_s = trading.summary(start=START_DATE, end=END_DATE)
        print(df_s)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_user_snippet()
