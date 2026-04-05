import vnstock
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def brute_force_vci():
    v = vnstock.Vnstock()
    symbols = ['', 'HOSE', 'VNINDEX', 'VN30', 'HNX', 'UPCOM']
    
    for sym in symbols:
        print(f"\n--- Testing Symbol: '{sym}' ---")
        try:
            # Try trading_stats (this is what's in company.py)
            try:
                df = v.stock(symbol=sym, source='VCI').trading.price_board(symbols_list=[sym] if sym else ['VCI'])
                print(f"price_board for {sym} success")
            except:
                pass
                
            # Try history (this is what's in quote.py)
            try:
                df_hist = v.stock(symbol=sym, source='VCI').quote.history(start='2026-03-20', end='2026-03-20')
                print(f"history for {sym} success: {len(df_hist)} rows")
                # Check columns for foreign/prop
                print("Columns:", df_hist.columns.tolist())
            except Exception as e:
                print(f"history for {sym} failed: {e}")
                
        except Exception as e:
            print(f"Initialization with {sym} failed: {e}")

if __name__ == "__main__":
    brute_force_vci()
