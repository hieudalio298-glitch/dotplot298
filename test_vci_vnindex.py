import vnstock
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_vci_vnindex():
    print("Testing Vnstock(source='VCI', symbol='VNINDEX')")
    try:
        v = vnstock.Vnstock()
        # Try Quote
        print("\n--- Quote History ---")
        df_hist = v.stock(symbol='VNINDEX', source='VCI').quote.history(start='2026-03-20', end='2026-03-21')
        print(df_hist.head())
        
        # Try Trading - check if it exists for VNINDEX
        print("\n--- Trading Stats ---")
        try:
            # Note: v.stock(...).trading might not have the methods if they are not in VCI explorer
            t = v.stock(symbol='VNINDEX', source='VCI').trading
            print("Trading methods available:", [m for m in dir(t) if not m.startswith('_')])
            
            # Try foreign_trade
            if hasattr(t, 'foreign_trade'):
                print("Calling foreign_trade...")
                df_f = t.foreign_trade(start='2026-03-20', end='2026-03-21')
                print(df_f)
            
            # Try prop_trade
            if hasattr(t, 'prop_trade'):
                print("Calling prop_trade...")
                df_p = t.prop_trade(start='2026-03-20', end='2026-03-21')
                print(df_p)
                
        except Exception as e:
            print(f"Trading error: {e}")

    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    test_vci_vnindex()
