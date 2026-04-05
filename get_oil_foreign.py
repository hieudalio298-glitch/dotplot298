import requests
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib
import sys
import shutil

sys.stdout.reconfigure(encoding='utf-8')
matplotlib.rcParams['font.family'] = 'Segoe UI'

tickers = ["BSR", "PLX", "PVD", "PVS", "PVC", "PVB", "POS", "PTV", "PEQ", "GAS", "CNG", "PGD", "PGS", "PGC", "PVG", "POW"]

all_data = []

print("Bắt đầu lấy dữ liệu Giao dịch Khối ngoại từ CafeF...")

for ticker in tickers:
    url = f"https://s.cafef.vn/Ajax/PageNew/DataHistory/GiaoDichNN_KhopLenh.ashx?symbol={ticker}&StartDate=02/28/2026&EndDate=03/20/2026&PageIndex=1&PageSize=100"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()
        if 'Data' in data and data['Data'] and 'Data' in data['Data']:
            rows = data['Data']['Data']
            for row in rows:
                date_str = row.get('Ngay')
                # Khối lượng mua/bán
                kl_mua = float(row.get('KhoiLuongMua', 0) or 0)
                kl_ban = float(row.get('KhoiLuongBan', 0) or 0)
                # Giá trị mua/bán
                gt_mua = float(row.get('GiaTriMua', 0) or 0)
                gt_ban = float(row.get('GiaTriBan', 0) or 0)
                
                net_val = gt_mua - gt_ban  # Giá trị mua ròng
                net_vol = kl_mua - kl_ban  # Khối lượng mua ròng
                
                # Nếu không có Giá trị, ta dùng khối lượng (quy đổi) hoặc cứ lấy tỷ lệ
                # Giá trị ở CafeF thường là VNĐ trực tiếp. Chuyển sang Tỷ VNĐ
                net_val_billion = net_val / 1e9
                
                all_data.append({
                    'Date': date_str,
                    'Ticker': ticker,
                    'NetValBuy': net_val_billion,
                    'NetVolBuy': net_vol
                })
    except Exception as e:
        print(f"Error for {ticker}: {e}")

if all_data:
    df = pd.DataFrame(all_data)
    df['DateSort'] = pd.to_datetime(df['Date'], format='%d/%m/%Y')
    
    # Ở một số ngày, nếu chứng khoán không có giao dịch ngoại, nó sễ thiếu.
    pivot_df = df.pivot(index='Date', columns='Ticker', values='NetValBuy')
    
    # Sort index by Date
    dates_sorted = df[['Date', 'DateSort']].drop_duplicates().sort_values('DateSort')['Date']
    pivot_df = pivot_df.reindex(dates_sorted)
    
    # Điền 0 cho những ngày không có giao dịch khối ngoại
    pivot_df = pivot_df.fillna(0)
    
    pivot_df.to_csv('oil_foreign_net_buy.csv')
    
    # Vẽ Biểu đồ Heatmap
    plt.figure(figsize=(16, 12))
    
    # Mua ròng -> Xanh (Dương), Bán ròng -> Đỏ (Âm)
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    
    # Tính Vmax, Vmin để biểu đồ không bị nhiễu bởi các outlier cực lớn
    vmax = pivot_df.max().max()
    vmin = pivot_df.min().min()
    
    # Cắt giới hạn tối đa/tối thiểu (vd +- 50 tỷ) để màu sắc các mã nhỏ hiển thị rõ hơn
    limit = max(abs(vmax), abs(vmin))
    limit = min(limit, 100) # Capping at 100 bil VND
    
    sns.heatmap(pivot_df, annot=True, fmt=".1f", cmap=cmap, center=0, vmin=-limit, vmax=limit,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Mua ròng/Bán ròng Khối Ngoại (Tỷ VNĐ)"})
    
    plt.title('Bảng nhiệt (Heatmap) Giá trị Mua/Bán Ròng Khối Ngoại (Tỷ VNĐ) Nhóm Dầu Khí\nTừ 28/02/2026 đến 19/03/2026', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Ngày Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    
    output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_foreign.png'
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    
    shutil.copy(output_path, 'heatmap_foreign.png')
    
    print("SUCCESS")
else:
    print("FAILED: No data fetched")
