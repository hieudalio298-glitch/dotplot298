"""
Commodity Correlation Analysis: Sugar, Brent Oil, and Urea (2010 - 03/2026)
Data Sources:
  - Brent Oil & Sugar: Yahoo Finance (yfinance) - daily → monthly
  - Urea: World Bank (2010-2024) + Investing.com/UAN proxy (2025-2026)
"""

import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    os.environ['PYTHONIOENCODING'] = 'utf-8'

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
from matplotlib.lines import Line2D
import matplotlib.ticker as mticker
import yfinance as yf
import requests
import warnings
warnings.filterwarnings('ignore')


# ============================================================
# 1. DATA FETCHING
# ============================================================
def _extract_close(df_yf):
    """Extract Close prices from yfinance download, handling MultiIndex or flat columns."""
    if isinstance(df_yf.columns, pd.MultiIndex):
        # Try to get Close at level 0
        if 'Close' in df_yf.columns.get_level_values(0):
            series = df_yf['Close']
            if isinstance(series, pd.DataFrame):
                series = series.iloc[:, 0]
            return series
    if 'Close' in df_yf.columns:
        return df_yf['Close']
    # Fallback: first column
    return df_yf.iloc[:, 0]


def fetch_yfinance_data():
    """Fetch Brent Oil and Sugar from Yahoo Finance (daily → monthly)."""
    print("📥 Fetching Brent Oil (BZ=F) from Yahoo Finance...")
    brent_raw = yf.download('BZ=F', start='2010-01-01', end='2026-03-29', progress=False)
    brent = _extract_close(brent_raw)
    brent_monthly = brent.resample('MS').mean()
    brent_monthly.name = 'Brent_Oil'
    print(f"  ✅ Brent: {len(brent_monthly)} months ({brent_monthly.index[0].strftime('%Y-%m')} → {brent_monthly.index[-1].strftime('%Y-%m')})")
    
    print("📥 Fetching Sugar (SB=F) from Yahoo Finance...")
    sugar_raw = yf.download('SB=F', start='2010-01-01', end='2026-03-29', progress=False)
    sugar = _extract_close(sugar_raw)
    sugar_monthly = sugar.resample('MS').mean()
    sugar_monthly.name = 'Sugar'
    print(f"  ✅ Sugar: {len(sugar_monthly)} months ({sugar_monthly.index[0].strftime('%Y-%m')} → {sugar_monthly.index[-1].strftime('%Y-%m')})")
    
    return brent_monthly, sugar_monthly


def fetch_worldbank_urea():
    """Download World Bank data for Urea prices (monthly, 2010-2024)."""
    url = "https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Monthly.xlsx"
    
    cache_path = os.path.join(os.path.dirname(__file__), "worldbank_commodity_data.xlsx")
    
    if not os.path.exists(cache_path):
        print("📥 Downloading World Bank Commodity Data...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        with open(cache_path, 'wb') as f:
            f.write(response.content)
        print(f"  💾 Cached to: {cache_path}")
    else:
        print(f"📂 Using cached World Bank data: {cache_path}")
    
    # Parse the data - try first sheet
    xls = pd.ExcelFile(cache_path)
    target_sheet = xls.sheet_names[0]
    for s in xls.sheet_names:
        if 'monthly' in s.lower() and 'price' in s.lower():
            target_sheet = s
            break
    
    df_raw = pd.read_excel(cache_path, sheet_name=target_sheet, header=None)
    print(f"  📄 Sheet: {target_sheet}, Shape: {df_raw.shape}")
    
    # Find header row by searching for 'urea' in any row
    header_row = None
    urea_col = None
    for i in range(min(15, len(df_raw))):
        for j in range(df_raw.shape[1]):
            val = str(df_raw.iloc[i, j]).lower()
            if 'urea' in val:
                header_row = i
                urea_col = j
                print(f"  🎯 Found 'urea' at row {i}, col {j}: {df_raw.iloc[i, j]}")
                break
        if header_row is not None:
            break
    
    if header_row is None or urea_col is None:
        raise ValueError("Could not find Urea column in World Bank data")
    
    # Data starts 2 rows after header
    data_start = header_row + 2
    
    # Extract date and urea columns
    records = []
    for idx in range(data_start, len(df_raw)):
        d = df_raw.iloc[idx, 0]
        u = df_raw.iloc[idx, urea_col]
        
        d_str = str(d).strip().upper()
        try:
            if 'M' in d_str:
                parts = d_str.split('M')
                year, month = int(parts[0]), int(parts[1])
                ts = pd.Timestamp(year=year, month=month, day=1)
                val = pd.to_numeric(u, errors='coerce')
                if pd.notna(val) and ts.year >= 2010:
                    records.append((ts, val))
        except:
            pass
    
    urea_series = pd.Series(
        [r[1] for r in records],
        index=pd.DatetimeIndex([r[0] for r in records]),
        name='Urea'
    )
    urea_series = urea_series.sort_index()
    print(f"  ✅ Urea (World Bank): {len(urea_series)} months ({urea_series.index[0].strftime('%Y-%m')} → {urea_series.index[-1].strftime('%Y-%m')})")
    
    return urea_series


def extend_urea_with_proxy():
    """
    Use UAN (CVR Partners - major urea producer) stock as proxy
    to extend urea price data from Jan 2025 to Mar 2026.
    """
    print("📥 Fetching UAN (urea proxy) from Yahoo Finance...")
    uan_raw = yf.download('UAN', start='2024-01-01', end='2026-03-29', progress=False)
    uan = _extract_close(uan_raw)
    uan_monthly = uan.resample('MS').mean()
    print(f"  ✅ UAN proxy: {len(uan_monthly)} months")
    return uan_monthly


def load_all_data():
    """Load and combine all data sources."""
    
    # 1. Brent & Sugar from yfinance (2010 → 3/2026)
    brent, sugar = fetch_yfinance_data()
    
    # 2. Urea from World Bank (2010 → 12/2024)
    urea_wb = fetch_worldbank_urea()
    
    # 3. Extend urea with UAN proxy (2025 → 3/2026)
    uan_proxy = extend_urea_with_proxy()
    
    # Scale UAN to match Urea at overlap point (Dec 2024)
    overlap_start = '2024-06-01'
    overlap_end = '2024-12-01'
    
    urea_overlap = urea_wb.loc[overlap_start:overlap_end].mean()
    uan_overlap = uan_proxy.loc[overlap_start:overlap_end].mean()
    
    if pd.notna(urea_overlap) and pd.notna(uan_overlap) and uan_overlap != 0:
        scale_factor = urea_overlap / uan_overlap
        print(f"\n📊 UAN→Urea scale factor: {scale_factor:.2f} (based on overlap {overlap_start} to {overlap_end})")
        
        # Extend urea with scaled UAN for 2025+
        uan_extended = uan_proxy[uan_proxy.index > urea_wb.index[-1]] * scale_factor
        uan_extended.name = 'Urea'
        
        urea = pd.concat([urea_wb, uan_extended])
        print(f"  ✅ Extended Urea: {urea.index[0].strftime('%Y-%m')} → {urea.index[-1].strftime('%Y-%m')} ({len(urea)} months)")
        print(f"  ⚠️  Note: Data after 12/2024 is estimated from UAN stock proxy")
    else:
        urea = urea_wb
        print("  ⚠️  Could not extend Urea data")
    
    # Combine into DataFrame
    df = pd.DataFrame({
        'Brent_Oil': brent,
        'Sugar': sugar,
        'Urea': urea
    })
    
    # Filter from 2010
    df = df[df.index >= '2010-01-01']
    df = df.sort_index()
    
    # Forward fill small gaps
    df = df.ffill(limit=2)
    
    print(f"\n✅ Combined data: {len(df)} months ({df.index[0].strftime('%Y-%m')} → {df.index[-1].strftime('%Y-%m')})")
    print(f"\n📊 Summary:")
    print(df.describe().round(2))
    
    return df


# ============================================================
# 2. GEOPOLITICAL PHASES (Updated with Iran-US 2025-2026)
# ============================================================
GEOPOLITICAL_PHASES = [
    {
        'name': 'Mùa xuân Ả Rập\n(Arab Spring)',
        'start': '2011-01-01',
        'end': '2011-12-31',
        'color': '#FF6B6B',
        'alpha': 0.15,
    },
    {
        'name': 'Khủng hoảng\ngiá dầu\n(Oil Crash)',
        'start': '2014-06-01',
        'end': '2016-02-28',
        'color': '#4ECDC4',
        'alpha': 0.15,
    },
    {
        'name': 'Căng thẳng\nMỹ-Iran\n(JCPOA)',
        'start': '2018-05-01',
        'end': '2020-01-31',
        'color': '#FFE66D',
        'alpha': 0.15,
    },
    {
        'name': 'COVID-19',
        'start': '2020-02-01',
        'end': '2021-03-31',
        'color': '#A8E6CF',
        'alpha': 0.15,
    },
    {
        'name': 'Chiến tranh\nNga-Ukraine',
        'start': '2022-02-01',
        'end': '2022-12-31',
        'color': '#FF8A5C',
        'alpha': 0.15,
    },
    {
        'name': 'Xung đột\nIsrael-Hamas\n& Biển Đỏ',
        'start': '2023-10-01',
        'end': '2024-06-30',
        'color': '#C084FC',
        'alpha': 0.15,
    },
    {
        'name': '🔥 Chiến tranh\nIran vs Mỹ\n(2025-2026)',
        'start': '2025-06-01',
        'end': '2026-03-28',
        'color': '#FF0000',
        'alpha': 0.20,
    },
]


# ============================================================
# 3. VISUALIZATION
# ============================================================
def plot_commodity_correlation(df):
    """Multi-panel chart with dark theme."""
    
    plt.rcParams['font.family'] = ['DejaVu Sans', 'Arial', 'sans-serif']
    plt.rcParams['font.size'] = 10
    
    fig = plt.figure(figsize=(24, 18), facecolor='#0D1117')
    
    gs = fig.add_gridspec(3, 2, height_ratios=[1.2, 1, 0.8], hspace=0.35, wspace=0.3,
                          left=0.06, right=0.94, top=0.92, bottom=0.06)
    
    brent_color = '#FF6B35'
    sugar_color = '#00D4AA'
    urea_color  = '#7B68EE'
    bg_color    = '#0D1117'
    text_color  = '#C9D1D9'
    grid_color  = '#21262D'
    
    # ============================
    # PANEL 1: Raw Prices (3 axes)
    # ============================
    ax1 = fig.add_subplot(gs[0, :])
    ax1.set_facecolor(bg_color)
    
    # Brent Oil (left axis)
    ln1 = ax1.plot(df.index, df['Brent_Oil'], color=brent_color, linewidth=2, label='Dầu Brent ($/barrel)', zorder=5)
    ax1.set_ylabel('Dầu Brent ($/barrel)', color=brent_color, fontsize=11, fontweight='bold')
    ax1.tick_params(axis='y', labelcolor=brent_color)
    ax1.set_ylim(0, df['Brent_Oil'].max() * 1.15)
    
    # Sugar (right axis 1)
    ax1b = ax1.twinx()
    ln2 = ax1b.plot(df.index, df['Sugar'], color=sugar_color, linewidth=2, label='Đường (cents/lb)', zorder=4)
    ax1b.set_ylabel('Đường (cents/lb)', color=sugar_color, fontsize=11, fontweight='bold')
    ax1b.tick_params(axis='y', labelcolor=sugar_color)
    ax1b.spines['right'].set_position(('outward', 0))
    
    # Urea (right axis 2)
    ax1c = ax1.twinx()
    ax1c.spines['right'].set_position(('outward', 70))
    ln3 = ax1c.plot(df.index, df['Urea'], color=urea_color, linewidth=2, label='Urea ($/mt)', zorder=3)
    ax1c.set_ylabel('Phân Urea ($/mt)', color=urea_color, fontsize=11, fontweight='bold')
    ax1c.tick_params(axis='y', labelcolor=urea_color)
    
    # Mark proxy data region
    proxy_start = pd.Timestamp('2025-01-01')
    if df.index[-1] > proxy_start:
        ax1.axvline(x=proxy_start, color='#FFD700', linestyle='--', linewidth=1, alpha=0.5)
        ax1.text(proxy_start, ax1.get_ylim()[1] * 0.02, ' ← Urea: ước tính\n    từ proxy UAN',
                fontsize=7, color='#FFD700', alpha=0.8, va='bottom')
    
    # Geopolitical phase highlights
    for phase in GEOPOLITICAL_PHASES:
        start = pd.Timestamp(phase['start'])
        end = pd.Timestamp(phase['end'])
        if end > df.index[0] and start < df.index[-1]:
            ax1.axvspan(max(start, df.index[0]), min(end, df.index[-1]),
                       alpha=phase['alpha'], color=phase['color'], zorder=1)
            mid = max(start, df.index[0]) + (min(end, df.index[-1]) - max(start, df.index[0])) / 2
            ax1.text(mid, ax1.get_ylim()[1] * 0.95, phase['name'],
                    ha='center', va='top', fontsize=7, color=phase['color'],
                    fontweight='bold', alpha=0.9,
                    bbox=dict(boxstyle='round,pad=0.3', facecolor=bg_color,
                             edgecolor=phase['color'], alpha=0.8))
    
    # Legend
    lns = ln1 + ln2 + ln3
    labs = [l.get_label() for l in lns]
    ax1.legend(lns, labs, loc='upper left', fontsize=10,
              facecolor='#161B22', edgecolor='#30363D', labelcolor=text_color, framealpha=0.9)
    
    ax1.set_title('BIẾN ĐỘNG GIÁ HÀNG HÓA (2010 - 03/2026)', fontsize=16, fontweight='bold',
                  color='white', pad=15)
    ax1.grid(True, alpha=0.15, color=grid_color)
    ax1.tick_params(colors=text_color)
    for spine in ax1.spines.values():
        spine.set_color(grid_color)
    for spine in ax1b.spines.values():
        spine.set_color(grid_color)
    for spine in ax1c.spines.values():
        spine.set_color(grid_color)
    
    # ============================
    # PANEL 2: Normalized (Base=100)
    # ============================
    ax2 = fig.add_subplot(gs[1, :])
    ax2.set_facecolor(bg_color)
    
    df_norm = df.copy()
    for col in df_norm.columns:
        first_valid = df_norm[col].first_valid_index()
        if first_valid is not None:
            df_norm[col] = (df_norm[col] / df_norm[col].loc[first_valid]) * 100
    
    ax2.plot(df_norm.index, df_norm['Brent_Oil'], color=brent_color, linewidth=2, label='Dầu Brent')
    ax2.plot(df_norm.index, df_norm['Sugar'], color=sugar_color, linewidth=2, label='Đường')
    ax2.plot(df_norm.index, df_norm['Urea'], color=urea_color, linewidth=2, label='Phân Urea')
    ax2.axhline(y=100, color='white', linestyle='--', linewidth=0.8, alpha=0.4)
    
    # Mark proxy
    if df.index[-1] > proxy_start:
        ax2.axvline(x=proxy_start, color='#FFD700', linestyle='--', linewidth=1, alpha=0.5)
    
    for phase in GEOPOLITICAL_PHASES:
        start = pd.Timestamp(phase['start'])
        end = pd.Timestamp(phase['end'])
        if end > df.index[0] and start < df.index[-1]:
            ax2.axvspan(max(start, df.index[0]), min(end, df.index[-1]),
                       alpha=phase['alpha'] * 0.7, color=phase['color'], zorder=1)
    
    ax2.set_title('GIÁ CHUẨN HÓA (Base = 100 tại 01/2010)', fontsize=14, fontweight='bold',
                  color='white', pad=10)
    ax2.set_ylabel('Chỉ số giá (Base = 100)', fontsize=11, color=text_color)
    ax2.legend(loc='upper left', fontsize=10, facecolor='#161B22', edgecolor='#30363D',
              labelcolor=text_color, framealpha=0.9)
    ax2.grid(True, alpha=0.15, color=grid_color)
    ax2.tick_params(colors=text_color)
    for spine in ax2.spines.values():
        spine.set_color(grid_color)
    
    # ============================
    # PANEL 3: Rolling Correlation
    # ============================
    ax3a = fig.add_subplot(gs[2, 0])
    ax3a.set_facecolor(bg_color)
    
    rolling_window = 12
    corr_brent_sugar = df['Brent_Oil'].rolling(rolling_window).corr(df['Sugar'])
    corr_brent_urea = df['Brent_Oil'].rolling(rolling_window).corr(df['Urea'])
    corr_sugar_urea = df['Sugar'].rolling(rolling_window).corr(df['Urea'])
    
    ax3a.plot(df.index, corr_brent_sugar, color='#FF9F43', linewidth=1.5, label='Brent ↔ Đường', alpha=0.9)
    ax3a.plot(df.index, corr_brent_urea, color='#EE5A24', linewidth=1.5, label='Brent ↔ Urea', alpha=0.9)
    ax3a.plot(df.index, corr_sugar_urea, color='#A29BFE', linewidth=1.5, label='Đường ↔ Urea', alpha=0.9)
    
    ax3a.axhline(y=0, color='white', linestyle='--', linewidth=0.8, alpha=0.3)
    ax3a.axhline(y=0.7, color='#00FF7F', linestyle=':', linewidth=0.8, alpha=0.3, label='Ngưỡng đồng pha (+0.7)')
    ax3a.axhline(y=-0.7, color='#FF4757', linestyle=':', linewidth=0.8, alpha=0.3, label='Ngưỡng nghịch pha (-0.7)')
    
    for phase in GEOPOLITICAL_PHASES:
        start = pd.Timestamp(phase['start'])
        end = pd.Timestamp(phase['end'])
        if end > df.index[0] and start < df.index[-1]:
            ax3a.axvspan(max(start, df.index[0]), min(end, df.index[-1]),
                        alpha=phase['alpha'] * 0.5, color=phase['color'], zorder=1)
    
    ax3a.set_title(f'TƯƠNG QUAN CUỐN CHIẾU {rolling_window} THÁNG', fontsize=12, fontweight='bold',
                   color='white', pad=8)
    ax3a.set_ylabel('Hệ số tương quan (r)', fontsize=10, color=text_color)
    ax3a.set_ylim(-1.05, 1.05)
    ax3a.legend(loc='lower left', fontsize=8, facecolor='#161B22', edgecolor='#30363D',
               labelcolor=text_color, framealpha=0.9, ncol=2)
    ax3a.grid(True, alpha=0.15, color=grid_color)
    ax3a.tick_params(colors=text_color)
    for spine in ax3a.spines.values():
        spine.set_color(grid_color)
    
    # ============================
    # PANEL 4: Correlation Heatmap
    # ============================
    ax3b = fig.add_subplot(gs[2, 1])
    ax3b.set_facecolor(bg_color)
    
    corr_matrix = df[['Brent_Oil', 'Sugar', 'Urea']].corr()
    labels = ['Dầu Brent', 'Đường', 'Phân Urea']
    
    im = ax3b.imshow(corr_matrix.values, cmap='RdYlGn', vmin=-1, vmax=1, aspect='auto')
    
    for i in range(3):
        for j in range(3):
            val = corr_matrix.values[i, j]
            color = 'white' if abs(val) > 0.5 else 'black'
            ax3b.text(j, i, f'{val:.3f}', ha='center', va='center', fontsize=14,
                     fontweight='bold', color=color)
    
    ax3b.set_xticks(range(3))
    ax3b.set_yticks(range(3))
    ax3b.set_xticklabels(labels, fontsize=10, color=text_color)
    ax3b.set_yticklabels(labels, fontsize=10, color=text_color)
    ax3b.set_title('MA TRẬN TƯƠNG QUAN TOÀN BỘ (2010-03/2026)', fontsize=12, fontweight='bold',
                   color='white', pad=8)
    
    cbar = plt.colorbar(im, ax=ax3b, shrink=0.8)
    cbar.ax.tick_params(labelcolor=text_color)
    cbar.set_label('Hệ số tương quan', color=text_color, fontsize=10)
    
    # Footer
    fig.text(0.5, 0.01,
             'Nguồn: Yahoo Finance (Brent, Sugar) + World Bank (Urea 2010-2024) + UAN proxy (Urea 2025-2026) | Dữ liệu hàng tháng',
             ha='center', fontsize=9, color='#6E7681', fontstyle='italic')
    
    # Save
    output_path = os.path.join(os.path.dirname(__file__), "commodity_correlation_chart.png")
    fig.savefig(output_path, dpi=180, facecolor=bg_color, edgecolor='none', bbox_inches='tight')
    print(f"\n💾 Chart saved to: {output_path}")
    
    plt.close(fig)
    return output_path


# ============================================================
# 4. PHASE ANALYSIS
# ============================================================
def analyze_phases(df):
    """Analyze correlation within each geopolitical phase."""
    print("\n" + "="*80)
    print("📊 PHÂN TÍCH TƯƠNG QUAN THEO GIAI ĐOẠN ĐỊA CHÍNH TRỊ")
    print("="*80)
    
    results = []
    
    for phase in GEOPOLITICAL_PHASES:
        start = pd.Timestamp(phase['start'])
        end = pd.Timestamp(phase['end'])
        mask = (df.index >= start) & (df.index <= end)
        df_phase = df[mask].dropna()
        
        if len(df_phase) < 3:
            phase_name = phase['name'].replace('\n', ' ')
            print(f"\n🔸 {phase_name}")
            print(f"   ⚠️ Chỉ có {len(df_phase)} tháng dữ liệu - chưa đủ để phân tích")
            continue
            
        corr = df_phase[['Brent_Oil', 'Sugar', 'Urea']].corr()
        
        pct_changes = {}
        for col in ['Brent_Oil', 'Sugar', 'Urea']:
            series = df_phase[col].dropna()
            if len(series) >= 2:
                first, last = series.iloc[0], series.iloc[-1]
                pct_changes[col] = ((last - first) / first) * 100 if first != 0 else np.nan
            else:
                pct_changes[col] = np.nan
        
        phase_name = phase['name'].replace('\n', ' ')
        print(f"\n🔸 {phase_name}")
        print(f"   Thời gian: {start.strftime('%m/%Y')} → {end.strftime('%m/%Y')} ({len(df_phase)} tháng)")
        print(f"   Biến động giá:")
        print(f"     Dầu Brent: {pct_changes.get('Brent_Oil', 0):+.1f}%")
        print(f"     Đường:     {pct_changes.get('Sugar', 0):+.1f}%")
        print(f"     Urea:      {pct_changes.get('Urea', 0):+.1f}%")
        print(f"   Tương quan:")
        print(f"     Brent ↔ Đường: {corr.loc['Brent_Oil', 'Sugar']:.3f}")
        print(f"     Brent ↔ Urea:  {corr.loc['Brent_Oil', 'Urea']:.3f}")
        print(f"     Đường ↔ Urea:  {corr.loc['Sugar', 'Urea']:.3f}")
        
        avg_corr = (corr.loc['Brent_Oil', 'Sugar'] + corr.loc['Brent_Oil', 'Urea'] + corr.loc['Sugar', 'Urea']) / 3
        if avg_corr > 0.5:
            print(f"   ➡️ ĐỒNG PHA MẠNH (r trung bình = {avg_corr:.3f})")
        elif avg_corr > 0.2:
            print(f"   ➡️ Đồng pha vừa (r trung bình = {avg_corr:.3f})")
        elif avg_corr > -0.2:
            print(f"   ➡️ Không rõ ràng (r trung bình = {avg_corr:.3f})")
        else:
            print(f"   ➡️ NGHỊCH PHA (r trung bình = {avg_corr:.3f})")
        
        results.append({
            'phase': phase_name,
            'brent_pct': pct_changes.get('Brent_Oil', 0),
            'sugar_pct': pct_changes.get('Sugar', 0),
            'urea_pct': pct_changes.get('Urea', 0),
            'corr_brent_sugar': corr.loc['Brent_Oil', 'Sugar'],
            'corr_brent_urea': corr.loc['Brent_Oil', 'Urea'],
            'corr_sugar_urea': corr.loc['Sugar', 'Urea'],
            'avg_corr': avg_corr
        })
    
    # Overall
    print(f"\n{'='*80}")
    print("📊 TƯƠNG QUAN TOÀN BỘ (2010 - 03/2026)")
    print(f"{'='*80}")
    corr_all = df[['Brent_Oil', 'Sugar', 'Urea']].corr()
    print(f"  Brent ↔ Đường: {corr_all.loc['Brent_Oil', 'Sugar']:.3f}")
    print(f"  Brent ↔ Urea:  {corr_all.loc['Brent_Oil', 'Urea']:.3f}")
    print(f"  Đường ↔ Urea:  {corr_all.loc['Sugar', 'Urea']:.3f}")
    
    return results


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    # Load all data
    df = load_all_data()
    
    # Save CSV
    csv_path = os.path.join(os.path.dirname(__file__), "commodity_data_processed.csv")
    df.to_csv(csv_path)
    print(f"\n💾 Processed data saved to: {csv_path}")
    
    # Analyze phases
    results = analyze_phases(df)
    
    # Plot
    chart_path = plot_commodity_correlation(df)
    
    print(f"\n✅ Analysis complete!")
    print(f"📈 Chart: {chart_path}")
    print(f"📄 Data:  {csv_path}")
