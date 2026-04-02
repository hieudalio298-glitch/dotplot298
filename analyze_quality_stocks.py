# -*- coding: utf-8 -*-
"""
File: analyze_quality_stocks.py
Mo ta: Tim cac doanh nghiep chat luong cao: ROIC cao, ROE cao va On dinh
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

def analyze_quality():
    print("Reading long panel data (2015-2024)...")
    try:
        df = pd.read_csv('panel_roic_long_2015_2024.csv')
    except:
        print("Error: Khong tim thay file panel_roic_long_2015_2024.csv. Vui long chay get_financial_nopat.py truoc.")
        return

    # 1. Tinh toan cac chi so thong ke cho tung ma
    # Group by symbol de tinh Mean va Std cho ROIC va ROE
    stats = df.groupby('symbol').agg({
        'roic_pct': ['mean', 'std'],
        'roe_pct': ['mean', 'std'],
        'industry': 'first'
    })
    
    # Flatten columns
    stats.columns = ['roic_mean', 'roic_std', 'roe_mean', 'roe_std', 'industry']
    stats = stats.reset_index()

    # 2. Bo loc "Chat luong vang" (Quality Stocks)
    # Tieu chi:
    # - ROIC trung binh > 15% (Hieu qua van hanh tot)
    # - ROE trung binh > 20% (Hieu qua su dung von chu so huu tot)
    # - ROIC Std < 8% (On dinh - Da noi long de lay ca nhung ma nhu DGC nhung van phai on dinh tuong doi)
    # - ROE Std < 12%
    
    quality_mask = (
        (stats['roic_mean'] > 15) & 
        (stats['roe_mean'] > 20) & 
        (stats['roic_std'] < 8) & 
        (stats['roe_std'] < 12)
    )
    
    quality_stocks = stats[quality_mask].copy()
    
    # Tinh diem tong hop (Quality Score) de rank
    quality_stocks['quality_score'] = (quality_stocks['roic_mean'] + quality_stocks['roe_mean']) / 2
    quality_stocks = quality_stocks.sort_values('quality_score', ascending=False)
    
    print(f"Success: Found {len(quality_stocks)} high-quality stable stocks.")

    # --- VE BIEU DO ---
    # Chinh size bieu do nho di mot xiu theo yeu cau
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 12)) 
    
    # Lay tat ca cac ma vuot qua bo loc
    all_quality_symbols = quality_stocks['symbol'].tolist()
            
    # Lọc dữ liệu cho các mã được chọn
    plot_df = df[df['symbol'].isin(all_quality_symbols)].copy()

    # Tinh trung binh thi truong (Market Median) cho moi nam
    market_roic = df.groupby('year')['roic_pct'].median().reset_index()
    market_roe = df.groupby('year')['roe_pct'].median().reset_index()

    # Ve ROIC Time Series (Top Panel)
    sns.lineplot(data=plot_df, x='year', y='roic_pct', hue='symbol', marker='o', ax=ax1, linewidth=1.5, alpha=0.5, legend=False)
    # Ve duong TB thi truong ROIC
    ax1.plot(market_roic['year'], market_roic['roic_pct'], color='black', linewidth=4, linestyle='--', label='MARKET MEDIAN', zorder=20)
    
    ax1.set_title('ROIC Efficiency Trends - All 57 Quality Stocks vs Market', fontsize=14, fontweight='bold')
    ax1.set_ylabel('ROIC (%)')
    ax1.grid(True, alpha=0.2)
    # Dat legend sang ben phai
    ax1.legend(loc='upper left', bbox_to_anchor=(1, 1), ncol=2, fontsize=7, title='Symbols')
    
    # Ve ROE Time Series (Bottom Panel)
    sns.lineplot(data=plot_df, x='year', y='roe_pct', hue='symbol', marker='s', ax=ax2, linewidth=1.5, alpha=0.5, legend=False)
    # Ve duong TB thi truong ROE
    ax2.plot(market_roe['year'], market_roe['roe_pct'], color='black', linewidth=4, linestyle='--', label='MARKET MEDIAN', zorder=20)
    
    ax2.set_title('ROE Equity Returns Trends - All 57 Quality Stocks vs Market', fontsize=14, fontweight='bold')
    ax2.set_ylabel('ROE (%)')
    ax2.grid(True, alpha=0.2)
    ax2.legend(loc='upper left', bbox_to_anchor=(1, 1), ncol=2, fontsize=7, title='Symbols')

    plt.suptitle('FULL QUALITY STOCKS FLEET (2015-2024)\nFiltered: Avg ROIC > 15%, ROE > 20%, Stable', fontsize=16, fontweight='bold')
    
    plt.tight_layout(rect=[0, 0, 0.85, 0.95]) # Dành không gian cho legend bên phải
    plt.savefig('full_quality_fleet_analysis.png', dpi=300)
    print("Saved full chart to: full_quality_fleet_analysis.png")

    # In ra danh sach table
    print("\nTOP 20 QUALITY STOCKS (Sorted by Quality Score):")
    print("-" * 85)
    print(quality_stocks[['symbol', 'industry', 'roic_mean', 'roe_mean', 'roic_std', 'roe_std']].head(20).to_string(index=False))
    
    plt.show()

if __name__ == "__main__":
    analyze_quality()
