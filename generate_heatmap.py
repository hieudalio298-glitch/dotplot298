import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import numpy as np
import matplotlib

# Set font for Vietnamese display
matplotlib.rcParams['font.family'] = 'Segoe UI'

try:
    df = pd.read_csv('oil_daily.csv')
    df.set_index('Ngày', inplace=True)

    # Convert to numeric, replacing any non-parsable things with NaN
    df = df.apply(pd.to_numeric, errors='coerce')

    # Config figure size and heatmap
    plt.figure(figsize=(16, 12))
    
    # Red to Green colormap
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)

    sns.heatmap(df, annot=True, fmt=".1f", cmap=cmap, center=0, 
                linewidths=1, cbar_kws={"shrink": .8, "label": "Biến động (%)"})

    plt.title('Bảng nhiệt (Heatmap) Biến động Giá Nhật Báo Cổ Phiếu Dầu Khí Kể từ 28/02/2026', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Ngày Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')

    plt.xticks(rotation=0, fontsize=12)
    plt.yticks(rotation=0, fontsize=12)

    output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_oil.png'
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
