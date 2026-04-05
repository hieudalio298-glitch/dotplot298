from vnstock_data import Trading
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_price_history():
    # Set display options to see everything
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 1000)
    
    # Try VNINDEX first since it represents the market
    symbol = 'VNINDEX'
    source = 'VCI'
    
    print(f"Testing Trading(symbol='{symbol}', source='{source}').price_history(start='2026-03-11', end='2026-03-20', resolution='1D', get_all=True)")
    
    try:
        trading = Trading(symbol=symbol, source=source)
        # We pass get_all=True to include foreign trade columns if they exist
        df = trading.price_history(start='2026-03-11', end='2026-03-20', resolution='1D', get_all=True)
        
        print(f"\n--- Data returned ---")
        if df is not None and not df.empty:
            print(f"Shape: {df.shape}")
            print("Columns:", list(df.columns))
            
            # Print the specific columns related to foreign or proprietary trading if they exist
            fr_cols = [c for c in df.columns if 'fr' in c.lower() or 'foreign' in c.lower()]
            prop_cols = [c for c in df.columns if 'prop' in c.lower()]
            
            display_cols = ['trading_date']
            if fr_cols: display_cols.extend(fr_cols)
            if prop_cols: display_cols.extend(prop_cols)
            
            if len(display_cols) > 1:
                print("\nForeign/Prop Trade columns extracted:")
                print(df[display_cols])
            else:
                print("\nFull Data (no specific foreign/prop columns found):")
                print(df.head(5))
        else:
            print("Returned empty DataFrame or None.")
            
    except Exception as e:
        print(f"Error accessing price_history for {symbol}: {e}")

if __name__ == "__main__":
    test_price_history()
