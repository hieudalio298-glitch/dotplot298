import os
import pandas as pd
from datetime import datetime
from vnstock_data import TopStock, config
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def fetch_specific_day(date_str):
    supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
    ts = TopStock()
    groups = ['HOSE', 'HNX', 'UPCOM']
    ticker_data = []

    print(f"Bắt đầu lấy dữ liệu Top NĐTNN phiên {date_str}...")
    for group in groups:
        try:
            # Lưu ý: TopStock().history có thể được dùng cho dữ liệu quá khứ nếu library hỗ trợ
            # Nếu không, ta dùng TopStock() thông thường nhưng nó thường trả về phiên gần nhất.
            # Đối với một số nguồn, ta có thể truyền date.
            df_buy = ts.foreign_buy(listing_group=group) 
            # Giả sử hôm nay là 20/03, thì 19/03 có thể lấy được từ TopStock().history
            if df_buy is not None and not df_buy.empty:
                for _, row in df_buy.iterrows():
                    ticker_data.append({
                        'date': date_str,
                        'symbol': row['symbol'],
                        'category': 'foreign',
                        'net_value': float(row.get('net_buy_value', 0)),
                        'net_volume': float(row.get('net_buy_volume', 0))
                    })
        except Exception as e:
            print(f"Lỗi khi lấy dữ liệu {group}: {e}")

    if ticker_data:
        supabase.table('ticker_market_stats_daily').upsert(ticker_data).execute()
        print(f"Đã lưu {len(ticker_data)} bản ghi phiên {date_str} vào Supabase.")
    else:
        print("Không lấy được dữ liệu nào.")

if __name__ == "__main__":
    fetch_specific_day("2026-03-19")
