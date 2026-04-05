import pandas as pd
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]

results = []
for ticker in tickers:
    try:
        from vnstock import Vnstock
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.quote.history(start='2025-02-28', end='2026-03-20')
        
        if df is not None and not df.empty:
            df['time'] = pd.to_datetime(df['time'])
            
            # Filter from 2025-02-28 onwards to get the exact start date
            df = df[df['time'] >= '2025-02-28'].sort_values('time')
            
            if not df.empty:
                start_row = df.iloc[0]
                end_row = df.iloc[-1]
                start_date_str = start_row['time'].strftime('%d/%m/%Y')
                end_date_str = end_row['time'].strftime('%d/%m/%Y')
                
                start_price = float(start_row['close'])
                end_price = float(end_row['close'])
                
                pct_change = ((end_price - start_price) / start_price) * 100
                
                results.append({
                    'Mã CP': ticker,
                    'Ngày bắt đầu': start_date_str,
                    'Giá bắt đầu': start_price,
                    'Ngày kết thúc': end_date_str,
                    'Giá kết thúc': end_price,
                    'Thay đổi (%)': pct_change
                })
            else:
                print(f"No valid date range for {ticker}")
        else:
            print(f"Empty data for {ticker}")
    except Exception as e:
        print(f"Error processing {ticker}: {e}")

if results:
    res_df = pd.DataFrame(results)
    res_df = res_df.sort_values('Thay đổi (%)', ascending=False)
    res_df.to_csv('oil_stats.csv', index=False, encoding='utf-8')
    print("----- RESULT SAVED TO CSV -----")
else:
    print("FAILED to get any data")
