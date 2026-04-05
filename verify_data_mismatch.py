import os
import sys
from vnstock_data import Trading, config
from dotenv import load_dotenv
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def verify():
    target_date = '2026-03-20'
    print(f"--- VERIFYING DATA FOR {target_date} ---")
    
    # Try multiple sources for Foreign Trade
    sources = ['SSI', 'VND', 'CAFEF']
    for s in sources:
        print(f"\n[SOURCE: {s}]")
        try:
            t = Trading(source=s)
            # Some sources might use 'symbol' differently or require it
            # SSI often works well for VNINDEX
            f_df = t.foreign_trade(symbol='VNINDEX', start_date=target_date, end_date=target_date)
            if f_df is not None and not f_df.empty:
                net = (f_df['buy_value'].sum() - f_df['sell_value'].sum()) / 1e9
                print(f"  Foreign Net Value: {net:,.2f} Tỷ VNĐ")
                print(f"  Buy: {f_df['buy_value'].sum()/1e9:,.2f} | Sell: {f_df['sell_value'].sum()/1e9:,.2f}")
            else:
                print("  Foreign: No Data")
                
            p_df = t.prop_trade(symbol='VNINDEX', start_date=target_date, end_date=target_date)
            if p_df is not None and not p_df.empty:
                net = (p_df['buy_value'].sum() - p_df['sell_value'].sum()) / 1e9
                print(f"  Prop Net Value: {net:,.2f} Tỷ VNĐ")
                print(f"  Buy: {p_df['buy_value'].sum()/1e9:,.2f} | Sell: {p_df['sell_value'].sum()/1e9:,.2f}")
            else:
                print("  Prop: No Data")
        except Exception as e:
            print(f"  Error with source {s}: {e}")

if __name__ == "__main__":
    verify()
