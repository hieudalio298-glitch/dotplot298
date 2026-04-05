import vnstock_data
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_vnstock_data_vci():
    print("Testing vnstock_data.Trading(source='VCI')")
    try:
        # Note: vnstock_data version 2.3.4
        t = vnstock_data.Trading(symbol='ACB', source='VCI')
        print("Methods:", [m for m in dir(t) if not m.startswith('_')])
        
        # Try a ticker first to see if it works
        print("\n--- Testing ACB (Ticker) ---")
        try:
            df_p = t.prop_trade(start='2026-03-20', end='2026-03-20')
            print("ACB Prop Trade Success")
            print(df_p.head())
        except Exception as e:
            print(f"ACB Prop Trade Failed: {e}")

        # Now try to find aggregate
        print("\n--- Testing 'VNINDEX' ---")
        try:
            t_idx = vnstock_data.Trading(symbol='VNINDEX', source='VCI')
            df_p_idx = t_idx.prop_trade(start='2026-03-20', end='2026-03-20')
            print("VNINDEX Prop Trade Success")
            print(df_p_idx)
        except Exception as e:
            print(f"VNINDEX Prop Trade Failed: {e}")

    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    test_vnstock_data_vci()
