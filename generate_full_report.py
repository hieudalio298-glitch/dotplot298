import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
from supabase import create_client, Client
from vnstock_data import Trading, config
from datetime import datetime, timedelta
from dotenv import load_dotenv
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')

# --- CONFIGURATION ---
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
config.api_key = os.environ.get("VNSTOCK_API_KEY")

BOT_TOKEN = "8176419787:AAGVisWEzMu3-PB4hg4NTNJTMydku2BwP8A"
CHAT_ID = "1899480201"

# Modern Slate Theme
BG_COLOR = "#0b1121"
GRID_COLOR = "#1e293b"
TEXT_COLOR = "#ecf0f1"
BUY_COLOR = "#26a69a"
SELL_COLOR = "#ef5350"
ACCENT_COLOR = "#f1c40f"
PROP_BUY_COLOR = "#42a5f5"   # Blue for prop buy
PROP_SELL_COLOR = "#ab47bc"   # Purple for prop sell
PROP_ACCENT = "#00e5ff"       # Cyan accent for prop

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

class FullReporter:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def get_foreign_data(self):
        """Fetch foreign trading data from Supabase (last 21 sessions)"""
        res = self.supabase.table('ticker_market_stats_daily') \
                 .select('date') \
                 .eq('category', 'foreign') \
                 .order('date', desc=True) \
                 .execute()
        
        all_dates = sorted(list(set([r['date'] for r in res.data])))
        last_21_dates = all_dates[-21:]
        
        if not last_21_dates:
            print("❌ Chưa có đủ dữ liệu foreign.")
            return None, None
        
        res_data = self.supabase.table('ticker_market_stats_daily') \
                    .select('*') \
                    .in_('date', last_21_dates) \
                    .execute()
        df = pd.DataFrame(res_data.data)
        latest_date = last_21_dates[-1]
        return df, latest_date

    def get_prop_data_for_tickers(self, tickers, start_date, end_date):
        """Fetch proprietary trading data per ticker from CAFEF"""
        all_prop = []
        for symbol in tickers:
            try:
                t = Trading(source='CAFEF', symbol=symbol)
                df = t._provider.prop_trade(start=start_date, end=end_date)
                if df is not None and not df.empty:
                    df = df.reset_index()
                    df['symbol'] = symbol
                    # Rename columns  
                    df = df.rename(columns={
                        'time': 'date',
                        'prop_buy_value': 'buy_value',
                        'prop_sell_value': 'sell_value',
                        'prop_buy_volume': 'buy_volume',
                        'prop_sell_volume': 'sell_volume'
                    })
                    df['net_value'] = df['buy_value'] - df['sell_value']
                    all_prop.append(df)
            except Exception as e:
                pass  # Silently skip tickers that fail
        
        if all_prop:
            return pd.concat(all_prop, ignore_index=True)
        return pd.DataFrame()

    def plot_foreign_trend(self, df, dates):
        """Chart 1: Foreign net buy/sell trend 21 sessions"""
        daily = df[df['category'] == 'foreign'].groupby('date')['net_value'].sum() / 1e9
        
        fig, ax = plt.subplots(figsize=(15, 8))
        colors = [BUY_COLOR if x > 0 else SELL_COLOR for x in daily]
        bars = ax.bar(daily.index, daily.values, color=colors, width=0.7, alpha=0.9, zorder=3)
        
        formatted_dates = [datetime.strptime(d, '%Y-%m-%d').strftime('%d/%m') for d in daily.index]
        ax.set_xticks(range(len(daily)))
        ax.set_xticklabels(formatted_dates, rotation=0, fontsize=10, fontweight='medium')
        
        ax.yaxis.grid(True, linestyle='--', which='major', color=GRID_COLOR, alpha=0.5, zorder=0)
        ax.axhline(0, color=TEXT_COLOR, linewidth=1.2, alpha=0.7, zorder=4)
        
        plt.title('DIỄN BIẾN MUA BÁN RÒNG KHỐI NGOẠI 21 PHIÊN', fontsize=20, fontweight='bold', pad=35, color=ACCENT_COLOR)
        plt.ylabel('Tỷ VNĐ', fontsize=12, labelpad=15)
        
        for bar in bars:
            yval = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, yval + (5 if yval > 0 else -15),
                    f'{yval:,.0f}', ha='center', va='bottom' if yval > 0 else 'top',
                    fontsize=9, fontweight='bold', color=BUY_COLOR if yval > 0 else SELL_COLOR)

        plt.tight_layout()
        plt.savefig('foreign_trend_21d.png', dpi=300, facecolor=BG_COLOR)
        plt.close()
        print("✅ Chart 1: Foreign trend 21 sessions")

    def plot_foreign_top10(self, df, target_date):
        """Chart 2: Top 10 foreign net buy/sell"""
        df_today = df[(df['date'] == target_date) & (df['category'] == 'foreign')].copy()
        
        top_buy = df_today.sort_values('net_value', ascending=False).head(10).copy().iloc[::-1]
        top_sell = df_today.sort_values('net_value', ascending=True).head(10).copy().iloc[::-1]
        
        top_buy['net_bill'] = top_buy['net_value'] / 1e9
        top_sell['net_bill'] = top_sell['net_value'] / 1e9
        
        max_abs = max(top_buy['net_bill'].max() if not top_buy.empty else 0, 
                      abs(top_sell['net_bill'].min()) if not top_sell.empty else 0)
        max_abs = max_abs * 1.25
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 10), sharey=False)
        fig.patch.set_facecolor(BG_COLOR)

        ax1.barh(top_buy['symbol'], top_buy['net_bill'], color=BUY_COLOR, alpha=0.85, height=0.6, zorder=3)
        ax1.set_xlim(0, max_abs) 
        ax1.set_title('TOP 10 MUA RÒNG MẠNH NHẤT', fontsize=15, fontweight='bold', color=BUY_COLOR, pad=20)
        ax1.invert_xaxis()
        
        ax2.barh(top_sell['symbol'], top_sell['net_bill'], color=SELL_COLOR, alpha=0.85, height=0.6, zorder=3)
        ax2.set_xlim(-max_abs, 0)
        ax2.set_title('TOP 10 BÁN RÒNG MẠNH NHẤT', fontsize=15, fontweight='bold', color=SELL_COLOR, pad=20)
        ax2.yaxis.tick_right()

        for ax in [ax1, ax2]:
            ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'{abs(x):.0f}T'))
            ax.grid(axis='x', color=GRID_COLOR, linestyle='--', alpha=0.3)
            for spine in ax.spines.values(): spine.set_visible(False)

        for i, row in top_buy.reset_index().iterrows():
            ax1.text(row['net_bill'], i, f" {row['net_bill']:,.1f}  ", ha='right', va='center', fontweight='bold', fontsize=11)
        for i, row in top_sell.reset_index().iterrows():
            ax2.text(row['net_bill'], i, f"  {row['net_bill']:,.1f} ", ha='left', va='center', fontweight='bold', fontsize=11)

        formatted_date = datetime.strptime(target_date, '%Y-%m-%d').strftime('%d/%m/%Y')
        plt.suptitle(f'CHI TIẾT GIAO DỊCH KHỐI NGOẠI - PHIÊN {formatted_date}', fontsize=24, fontweight='bold', color=ACCENT_COLOR, y=0.98)
        plt.tight_layout(rect=[0, 0.05, 1, 0.95])
        plt.savefig('top_foreign_today.png', dpi=300, facecolor=BG_COLOR)
        plt.close()
        print("✅ Chart 2: Top 10 foreign buy/sell")

    def plot_prop_trend(self, df_prop, dates):
        """Chart 3: Proprietary net buy/sell trend 21 sessions"""
        if df_prop.empty:
            print("⚠️ Không có dữ liệu tự doanh để vẽ trend.")
            return False

        df_prop = df_prop.copy()
        df_prop['date'] = pd.to_datetime(df_prop['date']).dt.strftime('%Y-%m-%d')
        
        # Filter outliers: cap individual ticker net_value at ±500 billion VND
        MAX_TICKER_NET = 500e9  # 500 Tỷ per ticker per day is already very high
        df_prop_clean = df_prop.copy()
        df_prop_clean['net_value'] = df_prop_clean['net_value'].clip(-MAX_TICKER_NET, MAX_TICKER_NET)
        
        daily = df_prop_clean.groupby('date')['net_value'].sum() / 1e9
        daily = daily.sort_index()
        
        # Only keep dates that have data
        daily = daily[daily.index.isin(dates)]
        
        if daily.empty:
            print("⚠️ Không có dữ liệu tự doanh trong 21 phiên.")
            return False

        fig, ax = plt.subplots(figsize=(15, 8))
        colors = [PROP_BUY_COLOR if x > 0 else PROP_SELL_COLOR for x in daily]
        bars = ax.bar(range(len(daily)), daily.values, color=colors, width=0.7, alpha=0.9, zorder=3)
        
        formatted_dates = [datetime.strptime(d, '%Y-%m-%d').strftime('%d/%m') for d in daily.index]
        ax.set_xticks(range(len(daily)))
        ax.set_xticklabels(formatted_dates, rotation=0, fontsize=10, fontweight='medium')
        
        ax.yaxis.grid(True, linestyle='--', which='major', color=GRID_COLOR, alpha=0.5, zorder=0)
        ax.axhline(0, color=TEXT_COLOR, linewidth=1.2, alpha=0.7, zorder=4)
        
        plt.title('DIỄN BIẾN MUA BÁN RÒNG TỰ DOANH 21 PHIÊN', fontsize=20, fontweight='bold', pad=35, color=PROP_ACCENT)
        plt.ylabel('Tỷ VNĐ', fontsize=12, labelpad=15)
        
        for bar in bars:
            yval = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2, yval + (3 if yval > 0 else -10),
                    f'{yval:,.0f}', ha='center', va='bottom' if yval > 0 else 'top',
                    fontsize=9, fontweight='bold', color=PROP_BUY_COLOR if yval > 0 else PROP_SELL_COLOR)

        plt.tight_layout()
        plt.savefig('prop_trend_21d.png', dpi=300, facecolor=BG_COLOR)
        plt.close()
        print("✅ Chart 3: Prop trend 21 sessions")
        return True

    def plot_prop_top10(self, df_prop, target_date):
        """Chart 4: Top 10 proprietary net buy/sell"""
        df_prop = df_prop.copy()
        df_prop['date'] = pd.to_datetime(df_prop['date']).dt.strftime('%Y-%m-%d')
        df_today = df_prop[df_prop['date'] == target_date].copy()
        
        if df_today.empty:
            print(f"⚠️ Không có dữ liệu tự doanh ngày {target_date}")
            return False

        top_buy = df_today.sort_values('net_value', ascending=False).head(10).copy().iloc[::-1]
        top_sell = df_today.sort_values('net_value', ascending=True).head(10).copy().iloc[::-1]
        
        top_buy['net_bill'] = top_buy['net_value'] / 1e9
        top_sell['net_bill'] = top_sell['net_value'] / 1e9
        
        # Only include tickers that actually have net sell (negative values)
        top_sell = top_sell[top_sell['net_bill'] < 0]
        top_buy = top_buy[top_buy['net_bill'] > 0]
        
        if top_buy.empty and top_sell.empty:
            print("⚠️ Không có dữ liệu tự doanh đáng kể.")
            return False

        max_abs = max(top_buy['net_bill'].max() if not top_buy.empty else 1, 
                      abs(top_sell['net_bill'].min()) if not top_sell.empty else 1)
        max_abs = max_abs * 1.25
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 10), sharey=False)
        fig.patch.set_facecolor(BG_COLOR)

        if not top_buy.empty:
            ax1.barh(top_buy['symbol'], top_buy['net_bill'], color=PROP_BUY_COLOR, alpha=0.85, height=0.6, zorder=3)
            for i, row in top_buy.reset_index().iterrows():
                ax1.text(row['net_bill'], i, f" {row['net_bill']:,.1f}  ", ha='right', va='center', fontweight='bold', fontsize=11, color=PROP_BUY_COLOR)
        ax1.set_xlim(0, max_abs) 
        ax1.set_title('TOP MUA RÒNG TỰ DOANH', fontsize=15, fontweight='bold', color=PROP_BUY_COLOR, pad=20)
        ax1.invert_xaxis()
        
        if not top_sell.empty:
            ax2.barh(top_sell['symbol'], top_sell['net_bill'], color=PROP_SELL_COLOR, alpha=0.85, height=0.6, zorder=3)
            for i, row in top_sell.reset_index().iterrows():
                ax2.text(row['net_bill'], i, f"  {row['net_bill']:,.1f} ", ha='left', va='center', fontweight='bold', fontsize=11, color=PROP_SELL_COLOR)
        ax2.set_xlim(-max_abs, 0)
        ax2.set_title('TOP BÁN RÒNG TỰ DOANH', fontsize=15, fontweight='bold', color=PROP_SELL_COLOR, pad=20)
        ax2.yaxis.tick_right()

        for ax in [ax1, ax2]:
            ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'{abs(x):.0f}T'))
            ax.grid(axis='x', color=GRID_COLOR, linestyle='--', alpha=0.3)
            for spine in ax.spines.values(): spine.set_visible(False)

        formatted_date = datetime.strptime(target_date, '%Y-%m-%d').strftime('%d/%m/%Y')
        plt.suptitle(f'CHI TIẾT GIAO DỊCH TỰ DOANH - PHIÊN {formatted_date}', fontsize=24, fontweight='bold', color=PROP_ACCENT, y=0.98)
        plt.tight_layout(rect=[0, 0.05, 1, 0.95])
        plt.savefig('top_prop_today.png', dpi=300, facecolor=BG_COLOR)
        plt.close()
        print("✅ Chart 4: Top 10 prop buy/sell")
        return True

    def send_photo(self, photo_path, caption):
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
        try:
            with open(photo_path, 'rb') as photo:
                payload = {"chat_id": CHAT_ID, "caption": caption, "parse_mode": "HTML"}
                r = requests.post(url, data=payload, files={"photo": photo}, timeout=30)
                return r.json()
        except Exception as e:
            print(f"❌ Lỗi khi gửi {photo_path}: {e}")
            return None

    def run(self):
        print("🌟 BẮT ĐẦU TẠO BÁO CÁO TOÀN DIỆN 🌟\n")
        
        # === FOREIGN DATA (from Supabase) ===
        df_foreign, latest_date = self.get_foreign_data()
        if df_foreign is None:
            print("❌ Không có dữ liệu foreign. Dừng.")
            return
        
        all_dates = sorted(df_foreign[df_foreign['category'] == 'foreign']['date'].unique())[-21:]
        print(f"📅 Dữ liệu foreign: {all_dates[0]} → {latest_date} ({len(all_dates)} phiên)")
        
        # Generate foreign charts
        self.plot_foreign_trend(df_foreign, all_dates)
        self.plot_foreign_top10(df_foreign, latest_date)
        
        # === PROPRIETARY DATA (from CAFEF API) ===
        print("\n📊 Đang lấy dữ liệu Tự doanh từ CAFEF...")
        
        # Get the top tickers from foreign data to also fetch prop data for them
        df_today_foreign = df_foreign[(df_foreign['date'] == latest_date) & (df_foreign['category'] == 'foreign')]
        top_tickers = df_today_foreign.sort_values('net_value', key=abs, ascending=False)['symbol'].head(30).tolist()
        
        # Also add some major bluechip tickers for diversity
        major_tickers = ['VNM', 'VCB', 'VHM', 'VIC', 'HPG', 'FPT', 'MWG', 'MSN', 'TCB', 'MBB', 
                         'SSI', 'VND', 'GAS', 'SAB', 'PLX', 'PNJ', 'REE', 'DGC', 'ACB', 'STB']
        all_tickers = list(set(top_tickers + major_tickers))
        
        start_date_prop = (datetime.strptime(all_dates[0], '%Y-%m-%d') - timedelta(days=5)).strftime('%Y-%m-%d')
        
        print(f"   Đang truy vấn {len(all_tickers)} mã cổ phiếu...")
        df_prop = self.get_prop_data_for_tickers(all_tickers, start_date_prop, latest_date)
        
        has_prop_trend = False
        has_prop_top10 = False
        if not df_prop.empty:
            print(f"   ✅ Nhận được {len(df_prop)} bản ghi tự doanh")
            has_prop_trend = self.plot_prop_trend(df_prop, all_dates)
            has_prop_top10 = self.plot_prop_top10(df_prop, latest_date)
        else:
            print("   ⚠️ Không lấy được dữ liệu tự doanh từ CAFEF")
        
        # === SEND TO TELEGRAM ===
        print("\n🚀 Đang gửi báo cáo lên Telegram...")
        
        formatted_date = datetime.strptime(latest_date, '%Y-%m-%d').strftime('%d/%m/%Y')
        
        # 1. Foreign trend
        res1 = self.send_photo("foreign_trend_21d.png", 
            f"📊 <b>DIỄN BIẾN MUA BÁN RÒNG KHỐI NGOẠI 21 PHIÊN</b>\n"
            f"📅 Dữ liệu đến: {formatted_date}\n"
            f"<i>Tự động cập nhật bởi Antigravity Bot</i>")
        print("  ✅ Gửi Foreign Trend" if res1 and res1.get("ok") else f"  ❌ Lỗi: {res1}")
        
        # 2. Foreign top 10
        res2 = self.send_photo("top_foreign_today.png", 
            f"🔝 <b>TOP 10 GIAO DỊCH KHỐI NGOẠI - {formatted_date}</b>\n"
            f"<i>Chi tiết mã mua/bán ròng mạnh nhất</i>")
        print("  ✅ Gửi Foreign Top 10" if res2 and res2.get("ok") else f"  ❌ Lỗi: {res2}")
        
        # 3. Prop trend  
        if has_prop_trend:
            res3 = self.send_photo("prop_trend_21d.png",
                f"📊 <b>DIỄN BIẾN MUA BÁN RÒNG TỰ DOANH 21 PHIÊN</b>\n"
                f"📅 Dữ liệu đến: {formatted_date}\n"
                f"<i>Nguồn: CAFEF | Antigravity Bot</i>")
            print("  ✅ Gửi Prop Trend" if res3 and res3.get("ok") else f"  ❌ Lỗi: {res3}")
        
        # 4. Prop top 10
        if has_prop_top10:
            res4 = self.send_photo("top_prop_today.png",
                f"🔝 <b>TOP GIAO DỊCH TỰ DOANH - {formatted_date}</b>\n"
                f"<i>Chi tiết mã mua/bán ròng tự doanh mạnh nhất</i>")
            print("  ✅ Gửi Prop Top 10" if res4 and res4.get("ok") else f"  ❌ Lỗi: {res4}")
        
        print("\n✨ HOÀN TẤT BÁO CÁO! ✨")

if __name__ == "__main__":
    reporter = FullReporter()
    reporter.run()
