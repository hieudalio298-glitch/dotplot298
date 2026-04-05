import requests
from bs4 import BeautifulSoup
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

print("Bắt đầu lấy dữ liệu Giao dịch Khối ngoại từ CafeF bằng BeautifulSoup...")

for ticker in tickers:
    url = f"https://s.cafef.vn/Ajax/PageNew/DataHistory/GiaoDichNN_KhopLenh.ashx?symbol={ticker}&StartDate=02/28/2026&EndDate=03/20/2026&PageIndex=1&PageSize=100"
    try:
        res = requests.get(url, timeout=15)
        soup = BeautifulSoup(res.content, 'html.parser')
        
        rows = soup.find_all('tr')
        for row in rows:
            tds = row.find_all('td')
            if not tds or len(tds) < 7:
                continue
            
            date_str = tds[0].text.strip()
            
            if '/' not in date_str:
                continue
                
            def parse_num(txt):
                txt = txt.strip().replace(',', '').replace('.', '')
                try:
                    return float(txt)
                except:
                    return 0.0

            net_vol = parse_num(tds[3].text)
            net_val = parse_num(tds[6].text) 
            
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
    df['DateSort'] = pd.to_datetime(df['Date'], format='%d/%m/%Y', errors='coerce')
    df = df.dropna(subset=['DateSort'])
    
    pivot_df = df.pivot_table(index='Date', columns='Ticker', values='NetValBuy', aggfunc='sum')
    
    dates_sorted = df[['Date', 'DateSort']].drop_duplicates().sort_values('DateSort')['Date']
    pivot_df = pivot_df.reindex(dates_sorted)
    
    pivot_df = pivot_df.fillna(0)
    pivot_df.to_csv('oil_foreign_net_buy.csv')
    
    plt.figure(figsize=(16, 12))
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    
    vmax = pivot_df.max().max()
    vmin = pivot_df.min().min()
    limit = max(abs(vmax), abs(vmin))
    limit = min(limit, 100)
    if limit == 0:
        limit = 1
        
    sns.heatmap(pivot_df, annot=True, fmt=".2f", cmap=cmap, center=0, vmin=-limit, vmax=limit,
                linewidths=1, cbar_kws={"shrink": .8, "label": "Mua ròng/Bán ròng (Tỷ VNĐ)"})
    
    plt.title('Bảng nhiệt Giá trị Mua/Bán Ròng Khối Ngoại (Tỷ VNĐ) Nhóm Dầu Khí\nTừ 28/02/2026 đến 19/03/2026', fontsize=18, pad=20, fontweight='bold')
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
    print("FAILED")
