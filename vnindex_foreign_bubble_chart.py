# -*- coding: utf-8 -*-
"""
Bubble Chart Khối ngoại Top 200 Vốn hóa
Dữ liệu: Vốn hóa/Ngành (VCI) + Khối ngoại (VNDirect API)
"""

import sys
import time
import pandas as pd
import requests
import plotly.graph_objects as go
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import vnstock
    from vnstock_data import Listing, Company, Trading as TradingPremium
except ImportError:
    print("Cài đặt: pip install vnstock_data vnstock")
    sys.exit(1)

sys.stdout.reconfigure(encoding='utf-8')

# 1. Cấu hình màu sắc ngành
SECTOR_COLORS = {
    'Ngân hàng': '#1f77b4', 'Bất động sản': '#ff7f0e', 'Tài nguyên Cơ bản': '#2ca02c',
    'Dịch vụ Tài chính': '#d62728', 'Xây dựng và Vật liệu': '#9467bd', 'Hóa chất': '#8c564b',
    'Hàng & Dịch vụ Công nghiệp': '#e377c2', 'Thực phẩm và Đồ uống': '#7f7f7f',
    'Bán lẻ': '#bcbd22', 'Dầu khí': '#17becf', 'Tiện ích': '#1a55FF', 'Viễn thông': '#FF551a',
    'Y tế': '#55FF1a', 'Công nghệ Thông tin': '#FF1a55', 'Hàng cá nhân & Gia dụng': '#1aFF55',
    'Du lịch và Giải trí': '#551aFF', 'Bảo hiểm': '#FFFF55', 'Ô tô và phụ tùng': '#55FFFF',
    'Khác': '#808080'
}

def get_top_200_cap():
    """Lấy danh sách 200 mã vốn hóa cao nhất."""
    print("[1/4] Đang lấy danh sách Top 200 vốn hóa...", flush=True)
    ls = Listing(source='vnd')
    all_syms = ls.all_symbols()
    
    import re
    stock_symbols = [s for s in all_syms['symbol'].tolist() if re.match(r'^[A-Z]{3}$', s)]
    
    trading_free = vnstock.Trading(source='VCI')
    raw_board = []
    batch_size = 50
    for i in range(0, len(stock_symbols), batch_size):
        batch = stock_symbols[i : i + batch_size]
        try:
            df_b = trading_free.price_board(batch)
            if df_b is not None and not df_b.empty:
                df_b.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_b.columns.values]
                raw_board.append(df_b)
            time.sleep(0.1)
        except:
            for s in batch:
                try:
                    df_s = trading_free.price_board([s])
                    if df_s is not None and not df_s.empty:
                        df_s.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_s.columns.values]
                        raw_board.append(df_s)
                except: pass
                time.sleep(0.1)
    
    if not raw_board: return pd.DataFrame()
    
    df_board = pd.concat(raw_board, ignore_index=True)
    sym_col = 'listing_symbol' if 'listing_symbol' in df_board.columns else 'symbol'
    price_col = 'match_match_price' if 'match_match_price' in df_board.columns else 'match_price'
    share_col = 'listing_listed_share' if 'listing_listed_share' in df_board.columns else 'listed_share'
    
    # Một số mã có thể không có giá hoặc listed_share
    df_board = df_board.dropna(subset=[sym_col, price_col, share_col])
    df_board['market_cap'] = df_board[price_col] * df_board[share_col]
    
    top_200 = df_board.sort_values(by='market_cap', ascending=False).head(200)
    return top_200[[sym_col, 'market_cap']].rename(columns={sym_col: 'symbol'})

def fetch_foreign_vnd(symbols):
    """Lấy Net Value khối ngoại từ VNDirect API cho danh sách mã."""
    print("[2/4] Đang lấy dữ liệu khối ngoại từ VNDirect...", flush=True)
    query = f"code:{','.join(symbols)}"
    url = f"https://api-finfo.vndirect.com.vn/v4/foreigns?q={query}&sort=tradingDate&size=1000&fields=netVal,tradingDate,code"
    
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            data = r.json().get('data', [])
            df = pd.DataFrame(data)
            if not df.empty:
                # Lấy bản ghi mới nhất cho mỗi mã
                df = df.sort_values('tradingDate', ascending=False).drop_duplicates('code')
                return df[['code', 'netVal', 'tradingDate']].rename(columns={'code': 'symbol'})
    except Exception as e:
        print(f"Lỗi API VNDirect: {e}")
    return pd.DataFrame()

def fetch_sector_info(symbols):
    """Lấy thông tin ngành từ VCI."""
    print("[3/4] Đang lấy thông tin ngành cho Top 200...", flush=True)
    comp = Company(source='VCI')
    results = []
    
    def _fetch(s):
        try:
            time.sleep(1.0) # Rate limit
            ov = comp.overview(s)
            if not ov.empty:
                return {'symbol': s, 'sector': ov.iloc[0].get('industry', 'Khác')}
        except: pass
        return {'symbol': s, 'sector': 'Khác'}

    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = [ex.submit(_fetch, s) for s in symbols]
        for f in as_completed(futs):
            res = f.result()
            if res: results.append(res)
    return pd.DataFrame(results)

def main():
    df_cap = get_top_200_cap()
    if df_cap.empty:
        print("Không lấy được danh sách vốn hóa.")
        return

    top_symbols = df_cap['symbol'].tolist()
    
    # Lấy Khối ngoại
    df_foreign = fetch_foreign_vnd(top_symbols)
    
    # Lấy Ngành
    df_sector = fetch_sector_info(top_symbols)
    
    # Merge dữ liệu
    df = pd.merge(df_cap, df_sector, on='symbol', how='left')
    df = pd.merge(df, df_foreign, on='symbol', how='left')
    
    df['netVal'] = df['netVal'].fillna(0)
    df['sector'] = df['sector'].fillna('Khác')
    df['netVal_bil'] = (df['netVal'] / 1e9).round(2)
    df['cap_bil'] = (df['market_cap'] / 1e12).round(2)
    
    print(f"[4/4] Đang vẽ biểu đồ cho {len(df)} mã...", flush=True)
    
    # Xử lý tọa độ X cho Bubble Chart
    df = df.sort_values(['sector', 'market_cap'], ascending=[True, False])
    df['x_index'] = range(len(df))
    
    fig = go.Figure()
    
    for sector in sorted(df['sector'].unique()):
        sec_df = df[df['sector'] == sector]
        color = SECTOR_COLORS.get(sector, '#808080')
        
        # Norm size
        max_cap = df['market_cap'].max()
        sec_df['bubble_size'] = 10 + (sec_df['market_cap'] / max_cap) * 60
        
        fig.add_trace(go.Scatter(
            x=sec_df['x_index'],
            y=sec_df['netVal_bil'],
            mode='markers+text',
            name=sector,
            text=sec_df['symbol'] if len(sec_df) < 10 else '', 
            textposition='top center',
            marker=dict(
                size=sec_df['bubble_size'],
                color=color,
                opacity=0.8,
                line=dict(width=1, color='white')
            ),
            hovertemplate=(
                "<b>%{text}</b><br>"
                "Ngành: " + sector + "<br>"
                "Giá trị ròng ngoại: %{y:,.2f} tỷ VNĐ<br>"
                "Vốn hóa: %{customdata:,.2f} nghìn tỷ VNĐ<extra></extra>"
            ),
            customdata=sec_df['cap_bil'],
            text=sec_df['symbol']
        ))

    fig.add_hline(y=0, line_dash="dash", line_color="gray")
    
    fig.update_layout(
        template='plotly_dark',
        title=f"<b>Bubble Chart Khối ngoại Top 200 Vốn hóa ({datetime.now().strftime('%d/%m/%Y')})</b>",
        xaxis=dict(title="", showticklabels=False, showgrid=False),
        yaxis=dict(title="Giá trị ròng khối ngoại (Tỷ VNĐ)", showgrid=True, gridcolor='rgba(255,255,255,0.1)'),
        legend=dict(orientation="h", yanchor="bottom", y=-0.2, xanchor="center", x=0.5),
        margin=dict(l=50, r=50, t=80, b=100)
    )

    output_file = "vnindex_foreign_bubble_chart.html"
    fig.write_html(output_file)
    print(f"--- THÀNH CÔNG! Đã lưu biểu đồ tại {output_file} ---", flush=True)
    fig.show()

if __name__ == "__main__":
    main()
