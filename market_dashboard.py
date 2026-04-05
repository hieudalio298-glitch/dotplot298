import pandas as pd
from supabase import create_client, Client
from datetime import datetime

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

import sys
sys.stdout.reconfigure(encoding='utf-8')

def show_summary():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    today = datetime.now().strftime('%Y-%m-%d')
    
    print(f"\n===== BÁO CÁO THỊ TRƯỜNG NGÀY {today} =====")
    
    # 1. Market Summary (Index)
    res_m = supabase.table('market_stats_daily').select('*').eq('date', today).execute()
    if res_m.data:
        df_m = pd.DataFrame(res_m.data)
        print("\n--- GTGD NĐT NƯỚC NGOÀI & TỰ DOANH (Tỷ VNĐ) ---")
        # Divide value by 1e9 for cleaner look
        for _, row in df_m.iterrows():
            print(f"- {row['index_symbol']} [{row['category']}]: Net={row['net_value']/1e9:.2f} | Buy={row['buy_value']/1e9:.2f} | Sell={row['sell_value']/1e9:.2f}")
    else:
        print("\nChưa có dữ liệu tổng hợp thị trường hôm nay.")

    # 2. Top Foreign Buy/Sell
    res_t = supabase.table('ticker_market_stats_daily').select('*').eq('date', today).eq('category', 'foreign').execute()
    if res_t.data:
        df_t = pd.DataFrame(res_t.data)
        print("\n--- TOP MUA RÒNG NĐT NƯỚC NGOÀI (Tỷ VNĐ) ---")
        top_buy = df_t.sort_values('net_value', ascending=False).head(10)
        for _, row in top_buy.iterrows():
            print(f"[{row['symbol']}]: {row['net_value']/1e9:.2f}")
        
        print("\n--- TOP BÁN RÒNG NĐT NƯỚC NGOÀI (Tỷ VNĐ) ---")
        top_sell = df_t.sort_values('net_value', ascending=True).head(10)
        for _, row in top_sell.iterrows():
            print(f"[{row['symbol']}]: {row['net_value']/1e9:.2f}")

    # 3. Top Prop Buy/Sell (If available)
    res_p = supabase.table('ticker_market_stats_daily').select('*').eq('date', today).eq('category', 'prop').execute()
    if res_p.data:
        df_p = pd.DataFrame(res_p.data)
        print("\n--- TOP MUA RÒNG TỰ DOANH (Tỷ VNĐ) ---")
        top_buy_p = df_p.sort_values('net_value', ascending=False).head(10)
        for _, row in top_buy_p.iterrows():
            print(f"[{row['symbol']}]: {row['net_value']/1e9:.2f}")
    else:
        print("\nChưa có dữ liệu Top Tự doanh.")

if __name__ == "__main__":
    show_summary()
