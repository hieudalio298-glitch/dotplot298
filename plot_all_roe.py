# -*- coding: utf-8 -*-
"""
File: plot_all_roe.py
Mo ta: Ve bieu do ROE cho toan bo thi truong va theo tung nganh
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from get_financial_nopat import get_long_format_panel

def plot_market_roe_trends():
    """
    Ve bieu do xu huong ROE cua toan thi truong va theo nganh
    """
    print("🔄 Dang tai du lieu cho toan bo thi truong (2015-2024)...")
    
    # Lay du lieu LONG format cho 10 nam
    df = get_long_format_panel(start_year=2015, end_year=2024)
    
    if df.empty:
        print("❌ Khong co du lieu!")
        return

    # Dung cot roe_pct da duoc tinh san trong library
    # Tuy nhien de chac chan, ta kiem tra va format
    df['ROE (%)'] = df['roe_pct']

    # --- CHART 1: Distribution Boxplot ---
    plt.figure(figsize=(14, 7))
    sns.boxplot(data=df, x='year', y='ROE (%)', palette='magma', showfliers=False)
    plt.title('Distribution of ROE across all symbols (2015-2024)', fontsize=16, fontweight='bold')
    plt.ylabel('ROE (%)', fontsize=12)
    plt.xlabel('Year', fontsize=12)
    plt.grid(True, axis='y', alpha=0.3)
    plt.savefig('market_roe_distribution.png', dpi=300)
    print("✅ Da luu: market_roe_distribution.png")

    # --- CHART 2: Industry Evolution ---
    # Tinh trung binh theo nganh va nam
    industry_trend = df.groupby(['industry', 'year'])['ROE (%)'].median().reset_index()
    
    # Lay cac nganh co so luong ma lon (>10 symbols)
    symbol_per_industry = df.groupby('industry')['symbol'].nunique()
    major_industries = symbol_per_industry[symbol_per_industry >= 10].index.tolist()
    major_industries = [i for i in major_industries if i and i not in ['N/A', 'OTHER']]
    
    df_plot = industry_trend[industry_trend['industry'].isin(major_industries)]

    plt.figure(figsize=(18, 11))
    # Dung lineplot voi hue la industry
    ax = sns.lineplot(data=df_plot, x='year', y='ROE (%)', hue='industry', marker='o', linewidth=1.5, alpha=0.6, legend=False)
    
    # Ve rieng duong "Bat dong san" dam hon
    if 'Bất động sản' in major_industries:
        real_estate = industry_trend[industry_trend['industry'] == 'Bất động sản']
        plt.plot(real_estate['year'], real_estate['ROE (%)'], color='red', linewidth=6, 
                 marker='X', markersize=12, label='BẤT ĐỘNG SẢN', zorder=20)
        # Label cho Bat dong san
        if not real_estate[real_estate['year'] == 2024].empty:
            last_val = real_estate[real_estate['year'] == 2024]['ROE (%)'].iloc[0]
            plt.text(2024.1, last_val, 'BẤT ĐỘNG SẢN', color='red', fontweight='bold', va='center', fontsize=12)
    
    # Label cho cac nganh khac tai diem cuoi (Direct Labeling)
    for industry in major_industries:
        if industry == 'Bất động sản': continue
        industry_data = industry_trend[(industry_trend['industry'] == industry) & (industry_trend['year'] == 2024)]
        if not industry_data.empty:
            last_val = industry_data['ROE (%)'].iloc[0]
            # Tranh chong lap label don gian
            plt.text(2024.1, last_val, industry, va='center', fontsize=9, alpha=0.8)
    
    # Ve thêm duong trung bình toan thi truong
    market_median = df.groupby('year')['ROE (%)'].median().reset_index()
    plt.plot(market_median['year'], market_median['ROE (%)'], color='black', linewidth=4, 
             linestyle='--', label='MARKET MEDIAN', zorder=10)
    plt.text(2024.1, market_median[market_median['year'] == 2024]['ROE (%)'].iloc[0], 
             'MARKET MEDIAN', color='black', fontweight='bold', va='center', fontsize=10)

    plt.title('Median ROE Trend by Industry (2015-2024)\n(Direct Line Labeling for Readability)', fontsize=20, fontweight='bold')
    plt.ylabel('Median ROE (%)', fontsize=14)
    plt.xlabel('Year', fontsize=14)
    plt.xlim(2014.5, 2026.5)
    plt.grid(True, linestyle=':', alpha=0.4)
    plt.tight_layout()
    plt.savefig('industry_roe_trends.png', dpi=300)
    print("✅ Da luu: industry_roe_trends.png")
    
    plt.show()

if __name__ == "__main__":
    plot_market_roe_trends()
