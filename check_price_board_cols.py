from vnstock_data import Trading
import pandas as pd

def check_board(source):
    print(f"\n--- Source: {source} ---")
    try:
        t = Trading(source=source, symbol='VNM')
        df = t.price_board(symbols_list=['VNM', 'TCB'], get_all=False)
        print(f"Standard Columns ({source}):")
        print(list(df.columns))
        
        df_all = t.price_board(symbols_list=['VNM', 'TCB'], get_all=True)
        print(f"All Columns ({source}):")
        print(list(df_all.columns))
    except Exception as e:
        print(f"Error for {source}: {e}")

if __name__ == "__main__":
    check_board('vci')
    check_board('kbs')
