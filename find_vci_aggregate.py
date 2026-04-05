from vnstock_data import Listing, Trading
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def find_aggregate_symbols():
    print("--- Listing all VCI Symbols ---")
    try:
        lst = Listing(source='VCI')
        df_symbols = lst.all_symbols()
        print(f"Total symbols: {len(df_symbols)}")
        
        # Search for interesting symbols
        interesting = ['VNINDEX', 'VN30', 'HNX', 'UPCOM', 'HOSE', 'VNALL', 'VN100']
        found = df_symbols[df_symbols['symbol'].isin(interesting)]
        print("\nInteresting symbols found in Listing:")
        print(found)
        
        # Also check if they work in Trading
        for sym in found['symbol'].tolist():
            print(f"\nTesting Trading(symbol='{sym}', source='vci').trading_stats()...")
            try:
                t = Trading(symbol=sym, source='vci')
                df_stats = t.trading_stats(start='2026-03-20', end='2026-03-20')
                print(f"Success for {sym} stats!")
                print(df_stats)
            except Exception as e:
                print(f"Failed for {sym} stats: {e}")

            print(f"Testing Trading(symbol='{sym}', source='vci').foreign_trade()...")
            try:
                df_f = Trading(symbol=sym, source='vci').foreign_trade(start='2026-03-20', end='2026-03-20')
                print(f"Success for {sym} foreign!")
                print(df_f)
            except Exception as e:
                print(f"Failed for {sym} foreign: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_aggregate_symbols()
