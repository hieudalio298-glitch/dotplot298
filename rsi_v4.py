# -*- coding: utf-8 -*-
from vnstock_data import Listing, Trading
import pandas as pd
import time
import re
import sys
import io
from datetime import datetime, timedelta

# Fix encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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
    print("Market Breadth RSI Oversold (Market Scanner) - Started", flush=True)
    
    # 1. Get all symbols
    ls = Listing(source='vnd')
    df_syms = ls.all_symbols()
    df_syms['symbol'] = df_syms['symbol'].astype(str).str.strip()
    # Filter for standard 3-letter symbols
    all_symbols = [s for s in df_syms['symbol'] if re.match(r'^[A-Z]{3}$', s)]
    print(f"Total symbols to scan: {len(all_symbols)}", flush=True)

    results = []
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
    
    errors = 0
    start_time = time.time()

    for i, symbol in enumerate(all_symbols):
        try:
            # For VCI, we must initialize per symbol because get_asset_type is called in __init__
            # and price_history uses self.symbol
            t = Trading(source='VCI', symbol=symbol)
            df = t.price_history(start=start_date, end=end_date)
            
            if df is not None and not df.empty and len(df) > 15:
                # Find close column
                cols = df.columns.tolist()
                close_col = 'close' if 'close' in cols else ('close_price' if 'close_price' in cols else cols[-1])
                
                rsi = calc_rsi(df[close_col].astype(float))
                if rsi is not None and rsi < 30:
                    results.append({
                        'symbol': symbol,
                        'rsi': round(rsi, 2),
                        'price': df[close_col].iloc[-1],
                        'last_update': df['trading_date'].iloc[-1].strftime('%Y-%m-%d') if 'trading_date' in df.columns else 'N/A'
                    })
        except Exception:
            errors += 1
        
        # Track progress
        if (i + 1) % 50 == 0:
            elapsed = time.time() - start_time
            eta = (elapsed / (i + 1)) * (len(all_symbols) - i - 1)
            print(f"[{i+1}/{len(all_symbols)}] Quá bán: {len(results)} | Lỗi: {errors} | ETA: {eta/60:.1f} phút", flush=True)
        
        # Rate limit control (300 req/min = 5 req/sec)
        # We make 1 API call per loop (price_history). Initialization is local.
        time.sleep(0.21)

    print(f"\nScanning finished in {(time.time() - start_time)/60:.1f} minutes.", flush=True)
    print(f"Found {len(results)} oversold symbols (RSI < 30).", flush=True)
    
    if results:
        res_df = pd.DataFrame(results).sort_values('rsi')
        print(res_df.to_string(index=False), flush=True)
        res_df.to_csv('rsi_oversold_results.csv', index=False, encoding='utf-8-sig')
        print("\nResults saved to 'rsi_oversold_results.csv'.", flush=True)

if __name__ == "__main__":
    main()
