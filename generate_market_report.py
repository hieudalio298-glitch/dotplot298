import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from supabase import create_client, Client
from datetime import datetime
import sys
import matplotlib.ticker as mticker
import numpy as np

# Windows terminal UTF-8 support
sys.stdout.reconfigure(encoding='utf-8')

# --- CONFIGURATION ---
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

# Modern Slate Theme
BG_COLOR = "#0b1121"   # Deep Navy/Black
GRID_COLOR = "#1e293b"
TEXT_COLOR = "#ecf0f1"
BUY_COLOR = "#26a69a"  # Teal Green
SELL_COLOR = "#ef5350" # Coral Red
ACCENT_COLOR = "#f1c40f" # Gold for title accents

plt.rcParams.update({
    'axes.facecolor': BG_COLOR,
    'figure.facecolor': BG_COLOR,
    'axes.edgecolor': 'none',
    'grid.color': GRID_COLOR,
    'text.color': TEXT_COLOR,
    'axes.labelcolor': TEXT_COLOR,
    'xtick.color': "#94a3b8",
    'ytick.color': "#94a3b8",
    'font.family': 'sans-serif',
    'font.sans-serif': ['Segoe UI', 'Arial', 'DejaVu Sans']
})

class AestheticReporter:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def generate_report(self):
        # Fetch data
        res = self.supabase.table('ticker_market_stats_daily') \
                 .select('date') \
                 .eq('category', 'foreign') \
                 .order('date', desc=True) \
                 .execute()
        
        all_dates = sorted(list(set([r['date'] for r in res.data])))
        last_21_dates = all_dates[-21:]
        
        if not last_21_dates:
            print("Chưa có đủ dữ liệu.")
            return

        res_data = self.supabase.table('ticker_market_stats_daily') \
                    .select('*') \
                    .in_('date', last_21_dates) \
                    .execute()
        df = pd.DataFrame(res_data.data)
        latest_date = last_21_dates[-1]
        
        # 1. Trend Report
        self.plot_trend_aesthetic(df, last_21_dates)
        # 2. Top 10 Balanced Report
        self.plot_top_10_balanced(df, latest_date)
        
        print(f"Báo cáo Aesthetic 21 phiên hoàn thành: {latest_date}.")

    def plot_trend_aesthetic(self, df, dates):
        daily = df[df['category'] == 'foreign'].groupby('date')['net_value'].sum() / 1e9
        
        fig, ax = plt.subplots(figsize=(15, 8))
        
        # Create bars with slight alpha and clean edges
        colors = [BUY_COLOR if x > 0 else SELL_COLOR for x in daily]
        bars = ax.bar(daily.index, daily.values, color=colors, width=0.7, alpha=0.9, zorder=3)
        
        # Format X-axis
        formatted_dates = [datetime.strptime(d, '%Y-%m-%d').strftime('%d/%m') for d in daily.index]
        ax.set_xticks(range(len(daily)))
        ax.set_xticklabels(formatted_dates, rotation=0, fontsize=10, fontweight='medium')
        
        # Grid and Labels
        ax.yaxis.grid(True, linestyle='--', which='major', color=GRID_COLOR, alpha=0.5, zorder=0)
        ax.axhline(0, color=TEXT_COLOR, linewidth=1.2, alpha=0.7, zorder=4)
        
        plt.title('DIỄN BIẾN MUA BÁN RÒNG KHỐI NGOẠI 21 PHIÊN', fontsize=20, fontweight='bold', pad=35, color=ACCENT_COLOR)
        plt.ylabel('Tỷ VNĐ', fontsize=12, labelpad=15)
        
        # Data labels
        for bar in bars:
            yval = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, yval + (5 if yval > 0 else -15),
                    f'{yval:,.0f}', ha='center', va='bottom' if yval > 0 else 'top',
                    fontsize=9, fontweight='bold', color=BUY_COLOR if yval > 0 else SELL_COLOR)

        plt.tight_layout()
        plt.savefig('foreign_trend_21d.png', dpi=300, facecolor=BG_COLOR)
        plt.close()

    def plot_top_10_balanced(self, df, target_date):
        df_today = df[(df['date'] == target_date) & (df['category'] == 'foreign')].copy()
        
        top_buy = df_today.sort_values('net_value', ascending=False).head(10).copy().iloc[::-1] # Reverse for top-down
        top_sell = df_today.sort_values('net_value', ascending=True).head(10).copy().iloc[::-1] 
        
        top_buy['net_bill'] = top_buy['net_value'] / 1e9
        top_sell['net_bill'] = top_sell['net_value'] / 1e9
        
        # IMPORTANT: Balance the scale
        max_abs = max(top_buy['net_bill'].max() if not top_buy.empty else 0, 
                      abs(top_sell['net_bill'].min()) if not top_sell.empty else 0)
        max_abs = max_abs * 1.25 # Add room for labels
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 10), sharey=False)
        fig.patch.set_facecolor(BG_COLOR)

        # Plot Buy (Green)
        ax1.barh(top_buy['symbol'], top_buy['net_bill'], color=BUY_COLOR, alpha=0.85, height=0.6, zorder=3)
        ax1.set_xlim(0, max_abs)
        ax1.set_title('TOP 10 MUA RÒNG MẠNH NHẤT', fontsize=15, fontweight='bold', color=BUY_COLOR, pad=20)
        ax1.invert_xaxis() # Put Buy on the "Left" side facing middle? No, standard is Buy Right. 
        # Actually standard for balance is Mua Right, Ban Left (centered at 0) or Side-by-Side balanced. 
        # We'll go Side-by-Side but with same X-scale length.
        ax1.set_xlim(0, max_abs) 
        ax1.invert_xaxis() # Let's mirror them for a "Book" look
        
        # Plot Sell (Red)
        ax2.barh(top_sell['symbol'], top_sell['net_bill'], color=SELL_COLOR, alpha=0.85, height=0.6, zorder=3)
        ax2.set_xlim(-max_abs, 0)
        ax2.set_title('TOP 10 BÁN RÒNG MẠNH NHẤT', fontsize=15, fontweight='bold', color=SELL_COLOR, pad=20)
        ax2.yaxis.tick_right() # Labels on right for the sell chart

        # Formatting
        for ax in [ax1, ax2]:
            ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'{abs(x):.0f}T'))
            ax.grid(axis='x', color=GRID_COLOR, linestyle='--', alpha=0.3)
            for spine in ax.spines.values(): spine.set_visible(False)

        # Labels on bars
        for i, row in top_buy.reset_index().iterrows():
            ax1.text(row['net_bill'], i, f" {row['net_bill']:,.1f}  ", ha='right', va='center', fontweight='bold', fontsize=11)
        for i, row in top_sell.reset_index().iterrows():
            ax2.text(row['net_bill'], i, f"  {row['net_bill']:,.1f} ", ha='left', va='center', fontweight='bold', fontsize=11)

        plt.suptitle(f'CHI TIẾT GIAO DỊCH KHỐI NGOẠI - PHIÊN {target_date}', fontsize=24, fontweight='bold', color=ACCENT_COLOR, y=0.98)
        plt.tight_layout(rect=[0, 0.05, 1, 0.95])
        plt.savefig('top_foreign_today.png', dpi=300, facecolor=BG_COLOR)
        plt.close()

if __name__ == "__main__":
    reporter = AestheticReporter()
    reporter.generate_report()
