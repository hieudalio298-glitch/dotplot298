import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib
from vnstock import Vnstock
import warnings
import sys
import shutil

sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings('ignore')
matplotlib.rcParams['font.family'] = 'Segoe UI'

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]
all_gm = []

print("Bắt đầu lấy dữ liệu Biên lợi nhuận gộp...")
for ticker in tickers:
    try:
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.finance.ratio(period='quarter')
        
        if isinstance(df.columns, pd.MultiIndex):
            target_col = None
            for col in df.columns:
                if len(col) == 2 and 'gross profit margin' in str(col[1]).lower():
                    target_col = col
                    break
            
            if target_col is not None:
                df_filtered = df[[('Meta', 'yearReport'), ('Meta', 'lengthReport'), target_col]].copy()
                df_filtered.columns = ['year', 'quarter', 'gross_margin']
            else:
                continue
        else:
            continue
            
        df_filtered['ticker'] = ticker
        df_filtered = df_filtered[(df_filtered['year'] >= 2020) & (df_filtered['year'] <= 2025)]
        df_filtered = df_filtered.dropna(subset=['year', 'quarter'])
        df_filtered['Quarter'] = 'Q' + df_filtered['quarter'].astype(int).astype(str) + '.' + df_filtered['year'].astype(int).astype(str)
        
        for _, row in df_filtered.iterrows():
            if pd.notna(row['gross_margin']):
                all_gm.append({
                    'Quarter': row['Quarter'],
                    'MetaSort': (int(row['year']) * 10 + int(row['quarter'])),
                    'Ticker': ticker,
                    'GrossMargin': float(row['gross_margin']) * 100
                })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

if all_gm:
    df_all = pd.DataFrame(all_gm)
    
    pivot_df = df_all.pivot(index='Quarter', columns='Ticker', values='GrossMargin')
    quarters = df_all[['Quarter', 'MetaSort']].drop_duplicates().sort_values('MetaSort')['Quarter']
    pivot_df = pivot_df.reindex(quarters)
    pivot_df.to_csv('oil_gross_margin_quarterly.csv')
    
    md_df = pivot_df.round(1).astype(str).replace('nan', '-')
    md = "| Quý | " + " | ".join(md_df.columns) + " |\n"
    md += "|---|" + "|".join(["---:"] * len(md_df.columns)) + "|\n"
    for idx, row in md_df.iterrows():
        md += f"| **{idx}** | " + " | ".join(row) + " |\n"
    
    with open(r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\gm_table.md', 'w', encoding='utf-8') as f:
        f.write(md)
    
    plt.figure(figsize=(16, 12))
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    
    # Gross margin scale: normally 0 to 30%. vmin=-5, vmax=35
    sns.heatmap(pivot_df, annot=True, fmt=".1f", cmap=cmap, center=15, vmin=-5, vmax=35,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Biên lợi nhuận gộp (%)"})
    
    plt.title('Bảng nhiệt (Heatmap) Biên lợi nhuận gộp Cổ Phiếu Dầu Khí Kể từ Q1/2020 - Q4/2025', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Các Quý Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    
    output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_gross_margin.png'
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    
    shutil.copy(output_path, 'heatmap_gross_margin.png')
    print("SUCCESS")
else:
    print("FAILED")
