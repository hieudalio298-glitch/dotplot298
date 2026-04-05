# -*- coding: utf-8 -*-
from vnstock_data import Listing, Trading
import pandas as pd
import time
import re
from datetime import datetime, timedelta

def calc_rsi(prices, period=14):
    if len(prices) < period + 1: return None
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs)).iloc[-1]

def main():
    print("Market Breath RSI Oversold - Started", flush=True)
    
    # 1. Listing
    ls = Listing(source='vnd')
    df_syms = ls.all_symbols()
    df_syms['symbol'] = df_syms['symbol'].astype(str).str.strip()
    valid_symbols = [s for s in df_syms['symbol'] if re.match(r'^[A-Z]{3}$', s)]
    print(f"Total valid symbols: {len(valid_symbols)}", flush=True)

    # 2. Trading
    # Try sources until one works
    trading = None
    for src in ['tcbs', 'vnd', 'VCI', 'SSI']:
        try:
            print(f"Trying source {src}...", end=' ', flush=True)
            t = Trading(source=src)
            # Test one fetch
            t.price_history('SSI', start='2026-03-01', end='2026-03-24')
            trading = t
            print("Success!", flush=True)
            break
        except Exception as e:
            print(f"Failed: {e}", flush=True)

    if not trading:
        print("Fatal: Could not initialize Trading source.")
        return

    # 3. Process
    results = []
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
    
    for i, symbol in enumerate(valid_symbols):
        try:
            df = trading.price_history(symbol=symbol, start=start_date, end=end_date)
            if df is not None and not df.empty and len(df) > 15:
                # Get close column
                close_col = 'close' if 'close' in df.columns else (df.columns[-2] if len(df.columns) > 1 else df.columns[0])
                rsi = calc_rsi(df[close_col].astype(float))
                if rsi is not None and rsi < 30:
                    results.append({'symbol': symbol, 'rsi': round(rsi, 2), 'price': df[close_col].iloc[-1]})
        except Exception:
            pass
        
        if (i+1) % 100 == 0:
            print(f"Progress: {i+1}/{len(valid_symbols)} | Oversold: {len(results)}", flush=True)
        
        time.sleep(0.21)

    print(f"\nFound {len(results)} oversold symbols.", flush=True)
    if results:
        res_df = pd.DataFrame(results).sort_values('rsi')
        print(res_df.to_string(index=False), flush=True)
        res_df.to_csv('rsi_oversold_v3.csv', index=False, encoding='utf-8-sig')

if __name__ == "__main__":
    main()
