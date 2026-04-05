# -*- coding: utf-8 -*-
"""
Biểu đồ giá cổ phiếu PVT - Tổng Công ty Cổ phần Vận tải Dầu khí
"""
import sys
import warnings
warnings.filterwarnings('ignore')
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
from matplotlib.dates import DateFormatter, WeekdayLocator, MO
from datetime import datetime, timedelta
import numpy as np

# ──────────────────────────────────────────────
# 1. Lấy dữ liệu
# ──────────────────────────────────────────────
SYMBOL = 'PVT'
END_DATE = datetime.now().strftime('%Y-%m-%d')
START_DATE = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')

print(f"Đang lấy dữ liệu {SYMBOL} từ {START_DATE} đến {END_DATE}...")

try:
    from vnstock import Vnstock
    stock = Vnstock().stock(symbol=SYMBOL, source='VCI')
    df = stock.quote.history(start=START_DATE, end=END_DATE)
    df['time'] = pd.to_datetime(df['time'])
    df = df.sort_values('time').reset_index(drop=True)
    print(f"✓ Lấy được {len(df)} phiên giao dịch")
except Exception as e:
    print(f"Lỗi vnstock v3: {e}")
    try:
        from vnstock_data import Trading
        trading = Trading(symbol=SYMBOL, source='VCI')
        df = trading.price_history(start=START_DATE, end=END_DATE, resolution='1D', get_all=True)
        # Standardize column names
        df.columns = [c.lower() for c in df.columns]
        if 'trading_date' in df.columns:
            df = df.rename(columns={'trading_date': 'time'})
        df['time'] = pd.to_datetime(df['time'])
        df = df.sort_values('time').reset_index(drop=True)
        print(f"✓ Lấy được {len(df)} phiên giao dịch (vnstock_data)")
    except Exception as e2:
        print(f"Lỗi vnstock_data: {e2}")
        sys.exit(1)

# ──────────────────────────────────────────────
# 2. Tính toán chỉ báo kỹ thuật
# ──────────────────────────────────────────────
df['MA10'] = df['close'].rolling(10).mean()
df['MA20'] = df['close'].rolling(20).mean()
df['MA50'] = df['close'].rolling(50).mean()
df['pct_change'] = df['close'].pct_change() * 100

# Màu nến: xanh = tăng, đỏ = giảm
df['color'] = np.where(df['close'] >= df['open'], '#00c49a', '#ff4d4f')
df['body_bottom'] = np.where(df['close'] >= df['open'], df['open'], df['close'])
df['body_top'] = np.where(df['close'] >= df['open'], df['close'], df['open'])

# ──────────────────────────────────────────────
# 3. Vẽ biểu đồ
# ──────────────────────────────────────────────
plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
plt.rcParams['axes.facecolor'] = '#0d1117'
plt.rcParams['figure.facecolor'] = '#0d1117'
plt.rcParams['axes.edgecolor'] = '#30363d'
plt.rcParams['grid.color'] = '#21262d'
plt.rcParams['text.color'] = '#e6edf3'
plt.rcParams['xtick.color'] = '#8b949e'
plt.rcParams['ytick.color'] = '#8b949e'

fig = plt.figure(figsize=(16, 10))
fig.suptitle(
    f'PVT – Tổng Công ty CP Vận tải Dầu khí\n'
    f'Dữ liệu từ {df["time"].min().strftime("%d/%m/%Y")} đến {df["time"].max().strftime("%d/%m/%Y")}',
    color='#e6edf3', fontsize=14, fontweight='bold', y=0.98
)

gs = gridspec.GridSpec(3, 1, height_ratios=[3, 1, 1], hspace=0.06)

# ─── Panel 1: Candlestick + MA ───
ax1 = fig.add_subplot(gs[0])
ax1.set_facecolor('#0d1117')

# Vẽ nến (candlestick)
bar_width = 0.6
for idx, row in df.iterrows():
    x = idx
    # Bóng nến (high-low)
    ax1.plot([x, x], [row['low'], row['high']], color=row['color'], linewidth=0.8, zorder=2)
    # Thân nến
    ax1.bar(x, row['body_top'] - row['body_bottom'], bottom=row['body_bottom'],
            color=row['color'], width=bar_width, zorder=3, alpha=0.9)

# Đường MA
if df['MA10'].notna().any():
    ax1.plot(df.index, df['MA10'], color='#f6c90e', linewidth=1.2, label='MA10', zorder=4, alpha=0.9)
if df['MA20'].notna().any():
    ax1.plot(df.index, df['MA20'], color='#58a6ff', linewidth=1.2, label='MA20', zorder=4, alpha=0.9)
if df['MA50'].notna().any():
    ax1.plot(df.index, df['MA50'], color='#ff7f50', linewidth=1.2, label='MA50', zorder=4, alpha=0.9)

# Giá hiện tại
last_price = df['close'].iloc[-1]
last_idx   = df.index[-1]
ax1.axhline(y=last_price, color='#ffffff', linewidth=0.6, linestyle='--', alpha=0.4, zorder=1)
ax1.annotate(f'{last_price:,.0f}',
             xy=(last_idx, last_price), xycoords='data',
             xytext=(10, 0), textcoords='offset points',
             color='#ffffff', fontsize=9, fontweight='bold',
             bbox=dict(boxstyle='round,pad=0.3', facecolor='#1f6feb', alpha=0.85, edgecolor='none'))

ax1.set_ylabel('Giá (VNĐ)', color='#8b949e', fontsize=9)
ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x:,.0f}'))
ax1.set_xlim(-1, len(df))
ax1.grid(axis='y', linestyle='--', alpha=0.3)
ax1.tick_params(axis='x', which='both', bottom=False, labelbottom=False)
ax1.legend(loc='upper left', facecolor='#161b22', edgecolor='#30363d',
           labelcolor='#e6edf3', fontsize=8)

# Annotation thay đổi %
first_close = df['close'].iloc[0]
total_pct = (last_price / first_close - 1) * 100
color_txt = '#00c49a' if total_pct >= 0 else '#ff4d4f'
arrow = '▲' if total_pct >= 0 else '▼'
ax1.text(0.99, 0.97,
         f'{arrow} {total_pct:+.1f}% ({int(90)} ngày)',
         transform=ax1.transAxes, color=color_txt,
         fontsize=10, fontweight='bold', ha='right', va='top',
         bbox=dict(boxstyle='round,pad=0.4', facecolor='#161b22', alpha=0.9, edgecolor='none'))

# ─── Panel 2: Volume ───
ax2 = fig.add_subplot(gs[1], sharex=ax1)
ax2.set_facecolor('#0d1117')

vol_colors = df['color'].values
ax2.bar(df.index, df['volume'], color=vol_colors, width=bar_width, alpha=0.7, zorder=2)

# MA Volume
vol_ma = df['volume'].rolling(10).mean()
ax2.plot(df.index, vol_ma, color='#f6c90e', linewidth=1.0, alpha=0.8, zorder=3)

ax2.set_ylabel('KLGD', color='#8b949e', fontsize=9)
ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x/1e6:.1f}M' if x >= 1e6 else f'{x/1e3:.0f}K'))
ax2.grid(axis='y', linestyle='--', alpha=0.3)
ax2.tick_params(axis='x', which='both', bottom=False, labelbottom=False)

# ─── Panel 3: % Thay đổi ───
ax3 = fig.add_subplot(gs[2], sharex=ax1)
ax3.set_facecolor('#0d1117')

pct = df['pct_change'].fillna(0)
bar_colors = ['#00c49a' if v >= 0 else '#ff4d4f' for v in pct]
ax3.bar(df.index, pct, color=bar_colors, width=bar_width, alpha=0.8, zorder=2)
ax3.axhline(0, color='#30363d', linewidth=0.8, zorder=1)
ax3.set_ylabel('% Ngày', color='#8b949e', fontsize=9)
ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x:.1f}%'))
ax3.grid(axis='y', linestyle='--', alpha=0.3)

# Trục X: hiển thị nhãn ngày
tick_step = max(1, len(df) // 12)
tick_positions = list(range(0, len(df), tick_step))
tick_labels = [df['time'].iloc[i].strftime('%d/%m') for i in tick_positions]
ax3.set_xticks(tick_positions)
ax3.set_xticklabels(tick_labels, rotation=30, ha='right', fontsize=8)

# Watermark
fig.text(0.5, 0.01, 'Dữ liệu: VCI / vnstock  |  Được tạo lúc ' + datetime.now().strftime('%d/%m/%Y %H:%M'),
         ha='center', color='#484f58', fontsize=7)

# ──────────────────────────────────────────────
# 4. Lưu & hiển thị
# ──────────────────────────────────────────────
output_file = 'pvt_price_chart.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight',
            facecolor='#0d1117', edgecolor='none')
print(f"✓ Đã lưu biểu đồ: {output_file}")
plt.show()
