from vnstock_data import Trading
import pandas as pd
import sys
import traceback

sys.stdout.reconfigure(encoding='utf-8')

def test_vnindex():
    symbol = 'VNINDEX'
    source = 'vci'
    START_DATE = '2026-03-11'
    END_DATE = '2026-03-20'
    
    print(f"Running:\nTrading(symbol='{symbol}', source='{source}').foreign_trade(start='{START_DATE}', end='{END_DATE}')\n")
    try:
        trading = Trading(symbol=symbol, source=source)
        df = trading.foreign_trade(start=START_DATE, end=END_DATE)
        
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', 1000)
        
        if df is not None and not df.empty:
            print("Data retrieved:")
            print(df)
        else:
            print("No data returned or empty DataFrame.")
            
    except Exception as e:
        print(f"Error encountered: {repr(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    test_vnindex()
