import pandas as pd
from vnstock import Vnstock
import warnings
warnings.filterwarnings('ignore')

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]

all_data = []
for ticker in tickers:
    try:
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.quote.history(start='2026-02-25', end='2026-03-20')
        if df is not None and not df.empty:
            df['time'] = pd.to_datetime(df['time'])
            df = df.sort_values('time')
            df['Change %'] = df['close'].pct_change() * 100
            
            df = df[df['time'] >= '2026-02-28']
            
            for _, row in df.iterrows():
                all_data.append({
                    'Ngày': row['time'].strftime('%d/%m/%Y'),
                    'Mã CP': ticker,
                    'Change %': row['Change %']
                })
    except Exception as e:
        pass

if all_data:
    df_all = pd.DataFrame(all_data)
    pivot_df = df_all.pivot(index='Ngày', columns='Mã CP', values='Change %').round(2)
    pivot_df.to_csv('oil_daily.csv')
    print("SUCCESS")
else:
    print("FAILED")
