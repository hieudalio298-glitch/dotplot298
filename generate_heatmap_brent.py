import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import yfinance as yf
import matplotlib
import os

# Set font for Vietnamese display
matplotlib.rcParams['font.family'] = 'Segoe UI'

base_path = r'c:\Users\Lenovo\dotplot\stockplot\oil_daily.csv'
output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_oil_brent.png'

try:
    # 1. Lấy dữ liệu Dầu Brent bằng yfinance
    print("Fetching Brent Crude Oil Data...")
    brent = yf.download('BZ=F', start='2026-02-25', end='2026-03-20', progress=False)
    
    if brent.empty:
        print("Không có dữ liệu Brent từ yfinance")
        brent_dict = {}
    else:
        if isinstance(brent.columns, pd.MultiIndex):
            # Lấy cột giá Đóng cửa 'Close'
            brent_close = brent['Close']['BZ=F']
        else:
            brent_close = brent['Close']
            
        brent_df = pd.DataFrame(brent_close)
        brent_df.columns = ['close']
        brent_df.index.name = 'time'
        brent_df = brent_df.reset_index()
        
        # Tính pct_change() hàng ngày thay vì so với mốc đầu.
        brent_df['Change %'] = brent_df['close'].pct_change() * 100
        
        brent_df = brent_df[brent_df['time'] >= '2026-02-28']
        brent_df['Ngày'] = brent_df['time'].dt.strftime('%d/%m/%Y')
        brent_dict = dict(zip(brent_df['Ngày'], brent_df['Change %']))
        print("Fetch Brent Data done")

    # 2. Đọc file CSV biến động dầu khí
    df = pd.read_csv(base_path)
    df.set_index('Ngày', inplace=True)
    df = df.apply(pd.to_numeric, errors='coerce')

    # 3. Nối cột Dầu Brent vào DataFrame
    brent_series = pd.Series(brent_dict, name='O.BRENT')
    df = df.join(brent_series, how='left')
    
    # Fill NaN just in case there are days stock market traded but Brent didn't (very rare but possible padding)
    
    # 4. Vẽ Heatmap mới
    plt.figure(figsize=(16, 12))
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    
    # Sắp xếp 'O.BRENT' ở cột đầu tiên
    cols = ['O.BRENT'] + [c for c in df.columns if c != 'O.BRENT']
    df = df[cols]

    sns.heatmap(df, annot=True, fmt=".1f", cmap=cmap, center=0, 
                linewidths=1, cbar_kws={"shrink": .8, "label": "Biến động (%)"})

    plt.title('Bảng nhiệt Đối chiếu Biến động Giá Dầu Brent & Cổ Phiếu Dầu Khí Kể từ 28/02/2026', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Ngày Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Tài Sản (Cổ phiếu & Dầu thô Brent)', fontsize=14, fontweight='bold')

    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print("SUCCESS: Image generated at", output_path)

except Exception as e:
    print(f"FAILED: {e}")
