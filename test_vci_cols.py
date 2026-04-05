from vnstock_data import Trading
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_cols():
    print("Testing MSN with VCI...")
    t = Trading(symbol='MSN', source='vci')
    df = t.foreign_trade(start='2026-03-20', end='2026-03-20')
    if df is not None and not df.empty:
         print("Foreign Cols:", list(df.columns))
         print("Foreign Data:", df.iloc[0].to_dict())
         
    df2 = t.prop_trade(start='2026-03-20', end='2026-03-20')
    if df2 is not None and not df2.empty:
         print("Prop Cols:", list(df2.columns))
         print("Prop Data:", df2.iloc[0].to_dict())

if __name__ == '__main__':
    test_cols()
