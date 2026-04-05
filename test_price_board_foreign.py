from vnstock_data import Trading, Listing
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_price_board():
    lst = Listing(source='vci')
    df_vn100 = lst.symbols_by_group('VN100', to_df=True)
    if isinstance(df_vn100, pd.Series):
        symbols = df_vn100.tolist()
    else:
        symbols = df_vn100['symbol'].tolist()
    
    print(f"Fetching VCI price_board for {len(symbols)} symbols...")
    t = Trading(source='vci')
    
    try:
        df = t.price_board(symbols_list=symbols)
        pd.set_option('display.max_columns', None)
        print("Columns available:", list(df.columns))
        
        # Check if foreign cols exist
        f_cols = [c for c in df.columns if 'for' in c.lower() or 'fr' in c.lower() or 'ngoai' in c.lower() or 'room' in c.lower() or 'buy' in c.lower() or 'sell' in c.lower()]
        print("Potential Foreign/Prop columns:", f_cols)
        
        if len(f_cols) > 0:
             print("\nSample Data:")
             print(df[['symbol'] + f_cols].head(3))
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_price_board()
