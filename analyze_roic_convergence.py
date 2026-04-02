# -*- coding: utf-8 -*-
"""
File: analyze_roic_convergence.py
Mo ta: Tim cac co phieu co ROIC duy tri cao, khong bi hoi tu (mean reversion)
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

import sys
import io

# Fix encoding cho Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def analyze_convergence():
    print("Reading panel data (2015-2024)...")
    try:
        df = pd.read_csv('panel_roic_wide_2015_2024.csv')
    except:
        print("❌ Khong tim thay file panel_roic_wide_2015_2024.csv. Vui long chay get_financial_nopat.py truoc.")
        return

    # Lay cac cot nam
    year_cols = [f'year_{y}' for y in range(2015, 2025)]
    
    # 1. Tinh Market Median theo tung nam (Hoi tu muc tieu)
    market_medians = df[year_cols].median()
    
    # 2. Tim cac co phieu "Kinh dien" (ROIC cao va on dinh)
    # Tinh Average ROIC va Standard Deviation
    df['avg_roic'] = df[year_cols].mean(axis=1)
    df['std_roic'] = df[year_cols].std(axis=1)
    
    # Dieu kien linh hoat hon: Avg > 15% va Std < 5% (on dinh)
    is_outperformer = (df['avg_roic'] > 0.15) & (df['std_roic'] < 0.05)
    outperformers = df[is_outperformer].copy()
    outperformers = outperformers.sort_values('avg_roic', ascending=False)
    
    print(f"Success: Found {len(outperformers)} symbols with high (avg > 15%) and stable (std < 5%) ROIC.")

    # --- VE BIEU DO ---
    plt.figure(figsize=(16, 10))
    
    # Background: Gray lines for everyone
    for i in range(min(150, len(df))):
        plt.plot(range(2015, 2025), df[year_cols].iloc[i] * 100, color='gray', alpha=0.08, linewidth=0.5)

    # Market Median
    plt.plot(range(2015, 2025), market_medians * 100, color='black', linewidth=4, 
             linestyle='--', label='MARKET MEDIAN', zorder=10)

    # Plot Top 8 + FPT (neu FPT ko nam trong top 8)
    top_list = outperformers.head(8)['symbol'].tolist()
    if 'FPT' not in top_list and 'FPT' in df['symbol'].values:
        top_list.append('FPT')
    
    selected_stocks = df[df['symbol'].isin(top_list)].copy()
    selected_stocks['final_val'] = selected_stocks[f'year_2024']
    selected_stocks = selected_stocks.sort_values('final_val', ascending=False)

    for i, (_, row) in enumerate(selected_stocks.iterrows()):
        values = row[year_cols].values * 100
        color = 'blue' if row['symbol'] == 'FPT' else None
        lw = 5 if row['symbol'] == 'FPT' else 3
        
        plt.plot(range(2015, 2025), values, marker='o', linewidth=lw, label=f"{row['symbol']}", color=color, zorder=15)
        plt.text(2024.1, values[-1], row['symbol'], fontsize=11, fontweight='bold', color=color if color else 'black')

    plt.title('Reliable High ROIC Stocks (Moat Analysis) 2015-2024\nFocus on Stability & Outperformance', fontsize=20, fontweight='bold')
    plt.ylabel('ROIC (%)', fontsize=14)
    plt.xlabel('Year', fontsize=14)
    plt.legend(title='Key Stocks', loc='upper left', bbox_to_anchor=(1, 1))
    plt.grid(True, linestyle=':', alpha=0.5)
    plt.ylim(0, 60)
    plt.tight_layout()
    
    plt.savefig('roic_convergence_outliers.png', dpi=300)
    print("✅ Da luu: roic_convergence_outliers.png")
    
    # In danh sach ra console
    print("\nTop 15 co phieu 'Moat' (Duy tri ROIC cao ben vung):")
    print("-" * 50)
    print(outperformers[['symbol', 'industry', 'avg_roic']].head(15).to_string(index=False))
    
    plt.show()

if __name__ == "__main__":
    analyze_convergence()
