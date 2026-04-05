import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib
from vnstock import Vnstock
import warnings
import sys
import numpy as np
import shutil

sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings('ignore')
matplotlib.rcParams['font.family'] = 'Segoe UI'

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]
all_pe = []

print("Bắt đầu lấy dữ liệu định giá P/E...")
for ticker in tickers:
    try:
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.finance.ratio(period='quarter')
        
        if isinstance(df.columns, pd.MultiIndex):
            if ('Chỉ tiêu định giá', 'P/E') in df.columns:
                df_filtered = df[[('Meta', 'yearReport'), ('Meta', 'lengthReport'), ('Chỉ tiêu định giá', 'P/E')]].copy()
                df_filtered.columns = ['year', 'quarter', 'pe']
            else:
                continue
        else:
            continue
            
        df_filtered['ticker'] = ticker
        df_filtered = df_filtered[(df_filtered['year'] >= 2020) & (df_filtered['year'] <= 2025)]
        df_filtered = df_filtered.dropna(subset=['year', 'quarter'])
        df_filtered['Quarter'] = 'Q' + df_filtered['quarter'].astype(int).astype(str) + '.' + df_filtered['year'].astype(int).astype(str)
        
        for _, row in df_filtered.iterrows():
            if pd.notna(row['pe']):
                all_pe.append({
                    'Quarter': row['Quarter'],
                    'MetaSort': (int(row['year']) * 10 + int(row['quarter'])),
                    'Ticker': ticker,
                    'PE': float(row['pe'])
                })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

if all_pe:
    df_all = pd.DataFrame(all_pe)
    
    # Tạo Pivot table
    pivot_df = df_all.pivot(index='Quarter', columns='Ticker', values='PE')
    quarters = df_all[['Quarter', 'MetaSort']].drop_duplicates().sort_values('MetaSort')['Quarter']
    pivot_df = pivot_df.reindex(quarters)
    pivot_df.to_csv('oil_pe_quarterly.csv')
    
    # Xóa giá trị P/E âm (vì P/E âm tức là doanh nghiệp lỗ, không có ý nghĩa định giá rẻ)
    # Gán bằng NaN để hiển thị khoảng trống
    pivot_df[pivot_df < 0] = np.nan
    
    # Tạo Markdown Table
    md_df = pivot_df.round(1).astype(str).replace('nan', '-')
    md = "| Quý | " + " | ".join(md_df.columns) + " |\n"
    md += "|---|" + "|".join(["---:"] * len(md_df.columns)) + "|\n"
    for idx, row in md_df.iterrows():
        md += f"| **{idx}** | " + " | ".join(row) + " |\n"
    
    with open(r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\pe_table.md', 'w', encoding='utf-8') as f:
        f.write(md)
        
    # Vẽ Heatmap
    plt.figure(figsize=(16, 12))
    
    # Pallette: Xanh (P/E thấp -> rẻ) đến Đỏ (P/E cao -> đắt)
    cmap = sns.diverging_palette(130, 10, as_cmap=True, s=85, l=45)
    
    sns.heatmap(pivot_df, annot=True, fmt=".1f", cmap=cmap, center=15, vmin=0, vmax=35,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Chỉ số P/E (Lần)"})
    
    plt.title('Bảng nhiệt (Heatmap) Định giá P/E Cổ Phiếu Dầu Khí (Q1/2020 - Q4/2025)', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Các Quý Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    
    output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_pe.png'
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    
    shutil.copy(output_path, 'heatmap_pe.png')
    
    print("SUCCESS")
else:
    print("FAILED")
