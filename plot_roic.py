# -*- coding: utf-8 -*-
"""
File: plot_roic.py
Mo ta: Ve bieu do ROIC/ROE/ROA time series cho mot ma co phieu
"""

import sys
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from get_financial_nopat import get_financial_data

def plot_roic_series(symbol: str):
    """
    Ve bieu do time series cho cac chi so ROIC, ROE, ROA
    """
    print(f"Plotting data for: {symbol}...")
    
    # Lay du lieu yearly
    df = get_financial_data(symbol, period_type='year')
    
    if df.empty:
        print(f"❌ Khong tim thay du lieu cho ma {symbol}")
        return

    # Sap xep theo nam tang dan de ve bieu do
    df = df.sort_values('year')
    
    # Chuyen ratios sang %
    df['ROIC (%)'] = df['roic'] * 100
    df['ROE (%)'] = df['roe'] * 100
    df['ROA (%)'] = df['roa'] * 100

    # Thiet lap style cho bieu do
    sns.set_theme(style="whitegrid")
    plt.figure(figsize=(12, 6))
    
    # Ve cac duong
    sns.lineplot(data=df, x='year', y='ROIC (%)', marker='o', label='ROIC', linewidth=2.5, color='#2ecc71')
    sns.lineplot(data=df, x='year', y='ROE (%)', marker='s', label='ROE', linewidth=2, color='#e74c3c', linestyle='--')
    sns.lineplot(data=df, x='year', y='ROA (%)', marker='d', label='ROA', linewidth=2, color='#3498db', linestyle=':')

    # Custom bieu do
    plt.title(f'Performance Metrics Time Series - {symbol}', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Year', fontsize=12)
    plt.ylabel('Percentage (%)', fontsize=12)
    plt.legend(title='Metrics', frameon=True, shadow=True)
    plt.xticks(df['year'].unique())
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Them label gia tri tai cac diem ROIC
    for x, y in zip(df['year'], df['ROIC (%)']):
        if not pd.isna(y):
            plt.text(x, y + 0.5, f'{y:.1f}%', ha='center', va='bottom', fontsize=10, fontweight='bold', color='#27ae60')

    plt.tight_layout()
    
    # Luu file anh
    filename = f"roic_chart_{symbol}.png"
    plt.savefig(filename, dpi=300)
    print(f"✅ Da luu bieu do tai: {filename}")
    plt.show()

if __name__ == "__main__":
    import pandas as pd # Import o day de tranh loi neu chua co o tren
    
    # Mac dinh ve VNM neu khong co input
    symbol = sys.argv[1] if len(sys.argv) > 1 else 'VNM'
    plot_roic_series(symbol.upper())
