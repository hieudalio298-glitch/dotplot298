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
all_growth = []

print("Bắt đầu lấy dữ liệu Tăng trưởng Báo cáo KQKD...")
for ticker in tickers:
    try:
        stock = Vnstock().stock(symbol=ticker, source='VCI')
        df = stock.finance.income_statement(period='quarter')
        
        if df is None or df.empty:
            continue
            
        req_cols = ['yearReport', 'lengthReport', 'Revenue YoY (%)', 'Attribute to parent company YoY (%)']
        missing = [c for c in req_cols if c not in df.columns]
        if missing:
            continue
            
        df_filtered = df[req_cols].copy()
        df_filtered.columns = ['year', 'quarter', 'rev_growth', 'pat_growth']
        df_filtered['ticker'] = ticker
        
        df_filtered = df_filtered[(df_filtered['year'] >= 2020) & (df_filtered['year'] <= 2025)]
        df_filtered = df_filtered.dropna(subset=['year', 'quarter'])
        df_filtered['Quarter'] = 'Q' + df_filtered['quarter'].astype(int).astype(str) + '.' + df_filtered['year'].astype(int).astype(str)
        
        for _, row in df_filtered.iterrows():
            rev_val = row['rev_growth']
            pat_val = row['pat_growth']
            
            all_growth.append({
                'Quarter': row['Quarter'],
                'MetaSort': (int(row['year']) * 10 + int(row['quarter'])),
                'Ticker': ticker,
                'RevGrowth': float(rev_val) * 100 if pd.notna(rev_val) else np.nan, # usually vnstock returns decimals for YoY, so * 100
                'PatGrowth': float(pat_val) * 100 if pd.notna(pat_val) else np.nan
            })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

if all_growth:
    df_all = pd.DataFrame(all_growth)
    quarters = df_all[['Quarter', 'MetaSort']].drop_duplicates().sort_values('MetaSort')['Quarter']
    
    # 1. Pivot for Revenue Growth
    pivot_rev = df_all.pivot(index='Quarter', columns='Ticker', values='RevGrowth').reindex(quarters)
    pivot_rev.to_csv('oil_rev_growth.csv')
    
    # 2. Pivot for PAT Growth
    pivot_pat = df_all.pivot(index='Quarter', columns='Ticker', values='PatGrowth').reindex(quarters)
    pivot_pat.to_csv('oil_pat_growth.csv')
    
    # MD Tables (internal tracking)
    md_rev = pivot_rev.round(1).astype(str) + '%'
    md_rev = md_rev.replace('nan%', '-')
    
    md_pat = pivot_pat.round(1).astype(str) + '%'
    md_pat = md_pat.replace('nan%', '-')
    
    # Draw Heatmap 1: Revenue Growth
    plt.figure(figsize=(16, 12))
    cmap_rev = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    sns.heatmap(pivot_rev, annot=True, fmt=".1f", cmap=cmap_rev, center=0, vmin=-50, vmax=100,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Tăng trưởng Doanh thu (%)"})
    plt.title('Bảng nhiệt (Heatmap) Tăng trưởng Doanh Thu (YoY) Ngành Dầu Khí (Q1/2020 - Q4/2025)', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Các Quý Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    output_rev = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_rev_growth.png'
    plt.tight_layout()
    plt.savefig(output_rev, dpi=300, bbox_inches='tight')
    shutil.copy(output_rev, 'heatmap_rev_growth.png')
    
    # Draw Heatmap 2: PAT Growth
    plt.figure(figsize=(16, 12))
    cmap_pat = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    # PAT growth can be extreme (e.g. +1000% or -500%), so we set robust vmin vmax
    sns.heatmap(pivot_pat, annot=True, fmt=".0f", cmap=cmap_pat, center=0, vmin=-100, vmax=300,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Tăng trưởng Lợi nhuận (%)"})
    plt.title('Bảng nhiệt (Heatmap) Tăng trưởng Lợi Nhuận Sau Thuế (YoY) Ngành Dầu Khí (Q1/2020 - Q4/2025)', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Các Quý Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    output_pat = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_pat_growth.png'
    plt.tight_layout()
    plt.savefig(output_pat, dpi=300, bbox_inches='tight')
    shutil.copy(output_pat, 'heatmap_pat_growth.png')
    
    print("SUCCESS")
else:
    print("FAILED")
