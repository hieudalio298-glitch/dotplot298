import pandas as pd
from vnstock import Vnstock
import warnings
import sys

sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings('ignore')

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]

all_roe = []
print("Bắt đầu lấy dữ liệu ROE...")
for ticker in tickers:
    try:
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.finance.ratio(period='quarter')
        
        if isinstance(df.columns, pd.MultiIndex):
            # Lấy 3 cột: Năm, Quý, ROE
            df_filtered = df[[('Meta', 'yearReport'), ('Meta', 'lengthReport'), ('Chỉ tiêu khả năng sinh lợi', 'ROE (%)')]].copy()
            df_filtered.columns = ['year', 'quarter', 'roe']
        else:
            continue
            
        df_filtered['ticker'] = ticker
        
        # Lọc từ năm 2020 đến nay (2025)
        df_filtered = df_filtered[(df_filtered['year'] >= 2020) & (df_filtered['year'] <= 2025)]
        
        # Xóa các dòng rác nếu có
        df_filtered = df_filtered.dropna(subset=['year', 'quarter'])
        
        # Định dạng Quý: Q1.2020
        df_filtered['Quarter'] = 'Q' + df_filtered['quarter'].astype(int).astype(str) + '.' + df_filtered['year'].astype(int).astype(str)
        
        for _, row in df_filtered.iterrows():
            if pd.notna(row['roe']):
                all_roe.append({
                    'Quarter': row['Quarter'],
                    'MetaSort': (int(row['year']) * 10 + int(row['quarter'])),
                    'Ticker': ticker,
                    'ROE': row['roe']
                })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

if all_roe:
    df_all = pd.DataFrame(all_roe)
    # Pivot
    pivot_df = df_all.pivot(index='Quarter', columns='Ticker', values='ROE')
    
    # Sắp xếp lại thứ tự index theo trình tự thời gian
    quarters = df_all[['Quarter', 'MetaSort']].drop_duplicates().sort_values('MetaSort')['Quarter']
    pivot_df = pivot_df.reindex(quarters)
    
    pivot_df.to_csv('oil_roe_quarterly.csv')
    print("SUCCESS")
else:
    print("FAILED")
