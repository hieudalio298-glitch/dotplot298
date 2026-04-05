# -*- coding: utf-8 -*-
"""
Bubble Chart VNIndex – % Thay đổi & Vốn hóa Thị trường (Realtime)
Dùng vnstock_data: price_history (VCI) + overview (VCI)
"""

import sys
import time
import pandas as pd
import plotly.express as px
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

try:
    import vnstock 
    from vnstock_data import Listing, Company, Trading as TradingPremium
except ImportError:
    print("Cài đặt: pip install vnstock_data vnstock")
    sys.exit(1)

sys.stdout.reconfigure(encoding='utf-8')

# Ngày giao dịch gần nhất (trừ cuối tuần)
today = datetime.now()
if today.weekday() == 6:  # Chủ nhật
    last_trading = today - timedelta(days=2)
elif today.weekday() == 5:  # Thứ 7
    last_trading = today - timedelta(days=1)
else:
    last_trading = today

# Khoảng thời gian lấy dữ liệu (45 ngày để cover 1 tháng giao dịch thực tế khoảng 22 phiên)
START_DATE_FETCH = (last_trading - timedelta(days=45)).strftime('%Y-%m-%d')
END_DATE_FETCH = (last_trading + timedelta(days=1)).strftime('%Y-%m-%d')
print(f"Khoảng thời gian tham chiếu: {START_DATE_FETCH} -> {END_DATE_FETCH}", flush=True)


def get_all_symbols():
    """Lấy danh sách mã từ tất cả sàn: HOSE, HNX, UPCOM."""
    ls = Listing(source='vnd')
    all_syms = ls.all_symbols()
    # Lấy cả 3 sàn
    valid_exchanges = ['HOSE', 'HNX', 'UPCOM']
    if 'exchange' in all_syms.columns:
        filtered = all_syms[all_syms['exchange'].isin(valid_exchanges)]
    else:
        filtered = all_syms
    return filtered[['symbol', 'exchange']].copy()


def fetch_price_and_cap(symbol, realtime_row=None):
    """Lấy giá, % thay đổi (ngày và tuần), vốn hóa, volume, value từ TradingPremium (VCI) + realtime_row."""
    try:
        t = TradingPremium(symbol=symbol, source='VCI')
        df = t.price_history(start=START_DATE_FETCH, end=END_DATE_FETCH)
        
        # Nếu có dữ liệu realtime, bổ sung hoặc ghi đè vào history
        if realtime_row is not None:
            rt_price = realtime_row.get('match_match_price', 0)
            ref_price = realtime_row.get('match_reference_price', 0)
            rt_date = realtime_row.get('listing_trading_date', datetime.now().strftime('%Y-%m-%d'))
            
            if rt_price and rt_price > 0:
                # Tính % thay đổi từ giá tham chiếu nếu có
                rt_change_pct = 0
                if ref_price > 0:
                    rt_change_pct = (rt_price - ref_price) / ref_price
                
                new_row = {
                    'trading_date': str(rt_date)[:10],
                    'close': rt_price,
                    'percent_price_change': rt_change_pct,
                    'market_cap': realtime_row.get('listing_listed_share', 0) * rt_price,
                    'total_volume': realtime_row.get('match_accumulated_volume', 0),
                    'total_value': realtime_row.get('match_accumulated_value', 0)
                }
                rt_df = pd.DataFrame([new_row])
                
                if df.empty:
                    df = rt_df
                else:
                    if 'trading_date' in df.columns:
                        df['trading_date'] = df['trading_date'].astype(str).str[:10]
                        rt_date_str = str(new_row['trading_date'])[:10]
                        if rt_date_str in df['trading_date'].values:
                            for col in new_row:
                                df.loc[df['trading_date'] == rt_date_str, col] = new_row[col]
                        else:
                            df = pd.concat([df, rt_df], ignore_index=True)
                    else:
                        df = pd.concat([df, rt_df], ignore_index=True)

        if not df.empty:
            if 'trading_date' in df.columns:
                df = df.sort_values('trading_date', ascending=True)
            
            row_latest = df.iloc[-1]
            close_latest = row_latest.get('close', 0)
            
            # Tính % thay đổi ngày (ưu tiên board, nếu 0 thì tính tay từ history)
            daily_change = row_latest.get('percent_price_change', 0)
            if daily_change == 0 and len(df) >= 2:
                close_prev = df.iloc[-2].get('close', 0)
                if close_prev > 0:
                    daily_change = (close_latest - close_prev) / close_prev

            # 1 week change (5 sessions before)
            change_1w = 0
            if len(df) >= 6:
                close_old = df.iloc[-6].get('close', 0)
                if close_old > 0:
                    change_1w = ((close_latest - close_old) / close_old) * 100
            # 1 month change
            change_1m = 0
            if len(df) >= 23:
                close_old_m = df.iloc[-23].get('close', 0)
                if close_old_m > 0:
                    change_1m = ((close_latest - close_old_m) / close_old_m) * 100
            elif len(df) >= 2:
                close_old_m = df.iloc[0].get('close', 0)
                if close_old_m > 0:
                    change_1m = ((close_latest - close_old_m) / close_old_m) * 100

            return {
                'symbol': symbol,
                'close': close_latest,
                'change_rate': row_latest.get('percent_price_change', 0) * 100,
                'change_rate_1w': change_1w,
                'change_rate_1m': change_1m,
                'market_cap': row_latest.get('market_cap', 0),
                'total_volume': row_latest.get('total_volume', 0),
                'total_value': row_latest.get('total_value', 0),
                'trading_date': row_latest.get('trading_date', '')
            }
    except Exception as e:
        pass
    return None


def fetch_sector(symbol):
    """Lấy ngành từ overview (VCI)."""
    try:
        cp = Company(symbol=symbol, source='VCI')
        ov = cp.overview()
        if not ov.empty:
            return {
                'symbol': symbol,
                'sector': ov.iloc[0].get('icb_name2', 'Khác')
            }
    except:
        pass
    return None


def get_market_data():
    """Lấy toàn bộ dữ liệu cho bubble chart theo cách tối ưu."""
    import os
    cache_file = 'market_data_cache.csv'
    
    if os.path.exists(cache_file):
        mod_time = datetime.fromtimestamp(os.path.getmtime(cache_file))
        if (datetime.now() - mod_time).total_seconds() < 300:
            print("[INFO] Đang tải dữ liệu từ CACHE (cập nhật <5 phút)...", flush=True)
            df_cache = pd.read_csv(cache_file)
            return df_cache

    print("[1/4] Lấy danh sách mã (HOSE + HNX + UPCOM)...", flush=True)
    sym_df = get_all_symbols()
    all_symbols = sym_df['symbol'].tolist()
    
    import re
    stock_symbols = [s for s in all_symbols if re.match(r'^[A-Z]{3}$', s)]
    print(f"  -> Tổng số mã: {len(all_symbols)}, mã cổ phiếu hợp lệ: {len(stock_symbols)}", flush=True)

    print("[2/4] Lấy bảng giá Realtime & Lọc thanh khoản (Price Board, VCI)...", flush=True)
    realtime_map = {}
    batch_size = 50
    # Sử dụng vnstock (Free) cho price_board
    trading_free = vnstock.Trading(source='VCI')
    for i in range(0, len(stock_symbols), batch_size):
        batch = stock_symbols[i : i + batch_size]
        try:
            df_batch = trading_free.price_board(batch)
            if df_batch is not None and not df_batch.empty:
                df_batch.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_batch.columns.values]
                sym_col = 'listing_symbol' if 'listing_symbol' in df_batch.columns else 'symbol'
                if sym_col in df_batch.columns:
                    batch_dict = df_batch.set_index(sym_col).to_dict('index')
                    realtime_map.update(batch_dict)
            time.sleep(0.1)
        except:
            # Nếu batch 50 lỗi, thử từng mã trong batch đó
            for s in batch:
                try:
                    df_s = trading_free.price_board([s])
                    if df_s is not None and not df_s.empty:
                        df_s.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_s.columns.values]
                        sym_col = 'listing_symbol' if 'listing_symbol' in df_s.columns else 'symbol'
                        if sym_col in df_s.columns:
                            realtime_map.update(df_s.set_index(sym_col).to_dict('index'))
                    time.sleep(0.1)
                except:
                    pass
    
    # Lọc các mã có thanh khoản > 10.000 từ realtime_map
    liquid_symbols = []
    for s, data in realtime_map.items():
        vol = data.get('match_accumulated_volume', 0)
        if vol > 10_000:
            liquid_symbols.append(s)
    
    print(f"  -> Lấy được {len(realtime_map)} mã từ bảng điện. Có {len(liquid_symbols)} mã thanh khoản > 10K.", flush=True)

    print(f"[3/4] Đang lấy Lịch sử Giá & Vốn hóa cho {len(liquid_symbols)} mã...", flush=True)
    price_results = []

    def _fetch_price(sym):
        time.sleep(2.0)
        rt_row = realtime_map.get(sym)
        return fetch_price_and_cap(sym, realtime_row=rt_row)

    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(_fetch_price, s): s for s in liquid_symbols}
        for f in as_completed(futs):
            r = f.result()
            if r:
                price_results.append(r)

    if not price_results:
        print("Không lấy được dữ liệu giá.", flush=True)
        return pd.DataFrame()

    df_price = pd.DataFrame(price_results)
    
    print(f"[4/4] Đang lấy thông tin Ngành cho {len(df_price)} mã tiêu biểu...", flush=True)
    ok_symbols = df_price['symbol'].tolist()
    sector_results = []

    def _fetch_sector(sym):
        time.sleep(2.0)
        return fetch_sector(sym)

    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(_fetch_sector, s): s for s in ok_symbols}
        for f in as_completed(futs):
            r = f.result()
            if r:
                sector_results.append(r)

    if sector_results:
        df_sector = pd.DataFrame(sector_results)
        df = pd.merge(df_price, df_sector, on='symbol', how='left')
    else:
        df = df_price.copy()
        df['sector'] = 'Khác'

    df['sector'] = df['sector'].fillna('Khác')
    df['market_cap_nghinh_ty'] = (df['market_cap'] / 1e12).round(2)
    df['change_rate'] = df['change_rate'].round(2)
    df['change_rate_1w'] = df['change_rate_1w'].round(2)
    df['change_rate_1m'] = df['change_rate_1m'].round(2)

    df = df.sort_values(by=['sector', 'market_cap'], ascending=[True, False])
    df['x_index'] = range(len(df))

    df.to_csv(cache_file, index=False)
    return df

def create_bubble_chart(df):
    """Tạo Plotly 2D Bubble Chart với bubble hình cầu 3D và màu sắc riêng biệt."""
    import plotly.graph_objects as go
    import numpy as np

    # Bảng 25 màu riêng biệt, rõ ràng trên nền đen
    SECTOR_COLORS = {
        'Ngân hàng':            '#FF6B6B',
        'Bất động sản':         '#4ECDC4',
        'Thép':                 '#FFD93D',
        'Dầu khí':              '#FF8C42',
        'Chứng khoán':          '#6BCB77',
        'Bảo hiểm':             '#9B59B6',
        'Thực phẩm & Đồ uống':  '#3498DB',
        'Xây dựng & Vật liệu':  '#E67E22',
        'Công nghệ Thông tin':   '#1ABC9C',
        'Điện, nước & xăng dầu khí đốt': '#F39C12',
        'Hóa chất':             '#E74C3C',
        'Hàng & Dịch vụ Công nghiệp': '#2ECC71',
        'Ô tô & linh kiện phụ tùng': '#D35400',
        'Viễn thông':           '#8E44AD',
        'Y tế':                 '#00CED1',
        'Du lịch & Giải trí':   '#FF69B4',
        'Tài nguyên Cơ bản':    '#FFA07A',
        'Truyền thông':         '#7B68EE',
        'Hàng cá nhân & Gia dụng': '#20B2AA',
        'Bán lẻ':               '#DDA0DD',
        'Dịch vụ Tài chính':    '#00FA9A',
        'Vận tải':              '#CD853F',
        'Khác':                 '#808080',
        'Phần mềm & Dịch vụ Máy tính': '#00BFFF',
        'Thiết bị & Linh kiện Điện': '#DAA520',
    }

    extra_colors = ['#FF1493', '#00FF7F', '#BA55D3', '#FF4500', '#7FFF00',
                    '#DC143C', '#00CED1', '#FF00FF', '#ADFF2F', '#FF6347']
    color_idx = 0
    for s in df['sector'].unique():
        if s not in SECTOR_COLORS:
            SECTOR_COLORS[s] = extra_colors[color_idx % len(extra_colors)]
            color_idx += 1

    # Nhãn blue-chip
    top_labels = [
        'VCB', 'VIC', 'VNM', 'HPG', 'FPT', 'MSN', 'MWG', 'SSI', 'GAS',
        'VHM', 'TCB', 'ACB', 'BID', 'VPB', 'MBB', 'GVR', 'SAB', 'DGC',
        'VRE', 'HDB', 'STB', 'TPB', 'CTG', 'SHB', 'LPB', 'PDR', 'NVL'
    ]
    df['label'] = df['symbol'].apply(lambda x: x if x in top_labels else '')

    # Tính size bubble (normalize vốn hóa → pixel size)
    max_cap = df['market_cap_nghinh_ty'].max()
    min_size, max_size = 8, 70
    df['bubble_size'] = min_size + (df['market_cap_nghinh_ty'] / max_cap) * (max_size - min_size)

    fig = go.Figure()

    # Vẽ từng ngành riêng biệt → mỗi ngành 1 trace (màu riêng + legend)
    for sector in sorted(df['sector'].unique()):
        sector_df = df[df['sector'] == sector]
        base_color = SECTOR_COLORS.get(sector, '#808080')

        fig.add_trace(go.Scatter(
            x=sector_df['x_index'],
            y=sector_df['change_rate'],
            mode='markers+text',
            name=sector,
            text=sector_df['label'],
            textposition='top center',
            textfont=dict(color='white', size=10),
            customdata=np.column_stack([
                sector_df['sector'], sector_df['close'], sector_df['market_cap_nghinh_ty'], 
                sector_df['symbol'], sector_df['change_rate_1w'], sector_df['change_rate'],
                sector_df['change_rate_1m']
            ]),
            hovertemplate=(
                "<b>%{customdata[3]}</b><br>"
                "Ngành: %{customdata[0]}<br>"
                "Giá: %{customdata[1]:,.0f} đ<br>"
                "Thay đổi ngày: %{y:+.2f}%<br>"
                "Vốn hóa: %{customdata[2]:.2f} nghìn tỷ đ"
                "<extra></extra>"
            ),
            marker=dict(
                size=sector_df['bubble_size'],
                color=base_color,
                opacity=0.85,
                line=dict(width=1, color='rgba(255,255,255,0.3)'),
                # Gradient radial tạo hiệu ứng hình cầu 3D
                gradient=dict(
                    type='radial',
                    color='rgba(255,255,255,0.15)',  # Highlight trắng ở tâm
                ),
            ),
        ))

    # Đường ngang đỏ dash y=0
    fig.add_hline(y=0, line_dash="dash", line_color="#E74C3C", line_width=2)

    # Số lượng trace (ngành)
    num_sectors = len(df['sector'].unique())
    ht_daily = "<b>%{customdata[3]}</b><br>Ngành: %{customdata[0]}<br>Giá: %{customdata[1]:,.0f} đ<br>Thay đổi ngày: %{y:+.2f}%<br>Vốn hóa: %{customdata[2]:.2f} nghìn tỷ đ<extra></extra>"
    ht_weekly = "<b>%{customdata[3]}</b><br>Ngành: %{customdata[0]}<br>Giá: %{customdata[1]:,.0f} đ<br>Thay đổi tuần: %{y:+.2f}%<br>Vốn hóa: %{customdata[2]:.2f} nghìn tỷ đ<extra></extra>"
    ht_monthly = "<b>%{customdata[3]}</b><br>Ngành: %{customdata[0]}<br>Giá: %{customdata[1]:,.0f} đ<br>Thay đổi tháng: %{y:+.2f}%<br>Vốn hóa: %{customdata[2]:.2f} nghìn tỷ đ<extra></extra>"

    fig.update_layout(
        template='plotly_dark',
        plot_bgcolor='rgb(10, 10, 15)',
        paper_bgcolor='rgb(10, 10, 15)',
        title=dict(
            text=f"<b>Bubble Chart VNIndex – % Thay đổi & Vốn hóa ({df['trading_date'].max() if 'trading_date' in df.columns else last_trading.strftime('%Y-%m-%d')})</b>",
            font=dict(size=18),
        ),
        xaxis=dict(
            showgrid=True, gridcolor='rgba(255,255,255,0.05)',
            showticklabels=False, title="",
        ),
        yaxis=dict(
            showgrid=True, gridcolor='rgba(255,255,255,0.05)',
            range=[-15, 15], # Mặc định Daily +/- 15%
            title="Biến động (%)",
            ticksuffix="%",
        ),
        updatemenus=[
            dict(
                type="dropdown",
                direction="down",
                showactive=True,
                x=0.08,
                y=1.1,
                buttons=[
                    dict(
                        label="Daily Change",
                        method="update",
                        args=[{"y": [df[df['sector']==s]['change_rate'] for s in sorted(df['sector'].unique())],
                               "hovertemplate": [ht_daily] * num_sectors},
                              {"yaxis.title": "Daily Change (%)", "yaxis.range": [-15, 15]}]
                    ),
                    dict(
                        label="Weekly Change",
                        method="update",
                        args=[{"y": [df[df['sector']==s]['change_rate_1w'] for s in sorted(df['sector'].unique())],
                               "hovertemplate": [ht_weekly] * num_sectors},
                              {"yaxis.title": "Weekly Change (%)", "yaxis.range": [-30, 30]}]
                    ),
                    dict(
                        label="Monthly Change",
                        method="update",
                        args=[{"y": [df[df['sector']==s]['change_rate_1m'] for s in sorted(df['sector'].unique())],
                               "hovertemplate": [ht_monthly] * num_sectors},
                              {"yaxis.title": "Monthly Change (%)", "yaxis.range": [-50, 50]}]
                    ),
                ],
                bgcolor='rgb(30, 30, 40)',
                font=dict(color='white')
            )
        ],
        legend=dict(
            orientation="h", yanchor="bottom", y=-0.28,
            xanchor="center", x=0.5, title=None,
            font=dict(size=10),
        ),
        margin=dict(l=60, r=60, t=120, b=150),
        font=dict(family="Arial", color="#E0E0E0"),
    )

    # Ghi chú
    fig.add_annotation(
        text="Click legend to filter sectors. Bubble size = Market Cap.",
        xref="paper", yref="paper", x=0.5, y=-0.18,
        showarrow=False, font=dict(size=11, color="#7F8C8D"),
    )

    return fig


def main():
    df = get_market_data()
    if df.empty:
        print("Không có dữ liệu.", flush=True)
        return

    print(f"\nTổng: {len(df)} mã | Change range: [{df['change_rate'].min():.2f}%, {df['change_rate'].max():.2f}%]", flush=True)

    fig = create_bubble_chart(df)

    output = "vnindex_bubble_chart.html"
    fig.write_html(output)
    print(f"\n[DONE] Đã lưu biểu đồ tại '{output}'", flush=True)
    fig.show()


if __name__ == "__main__":
    main()
