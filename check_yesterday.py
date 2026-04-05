import pandas as pd
from supabase import create_client, Client
from datetime import datetime, timedelta

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def show_yesterday():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Target: 2026-03-19 (Yesterday)
    target_date = "2026-03-19"
    
    print(f"\n===== DỮ LIỆU PHIÊN NGÀY {target_date} =====")
    
    # top_foreign
    res_t = supabase.table('ticker_market_stats_daily').select('*').eq('date', target_date).eq('category', 'foreign').execute()
    if res_t.data:
        df_t = pd.DataFrame(res_t.data)
        print("\n--- TOP MUA RÒNG NĐT NƯỚC NGOÀI (Tỷ VNĐ) ---")
        top_buy = df_t.sort_values('net_value', ascending=False).head(10)
        for _, row in top_buy.iterrows():
            print(f"[{row['symbol']}]: {row['net_value']/1e9:.2f}")
    else:
        print("\nChưa tìm thấy dữ liệu Top NĐTNN phiên hôm qua trong database.")

    # summary
    res_m = supabase.table('market_stats_daily').select('*').eq('date', target_date).execute()
    if res_m.data:
        df_m = pd.DataFrame(res_m.data)
        print("\n--- TỔNG HỢP THỊ TRƯỜNG ---")
        for _, row in df_m.iterrows():
            print(f"- {row['index_symbol']} [{row['category']}]: Net={row['net_value']/1e9:.2f}")
    else:
        print("\nChưa tìm thấy dữ liệu tổng hợp chỉ số phiên hôm qua.")

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    show_yesterday()
