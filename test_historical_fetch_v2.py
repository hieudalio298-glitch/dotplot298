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

def fetch_historical_day(date_str):
    supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
    ts = TopStock()
    groups = ['HOSE', 'HNX', 'UPCOM']
    ticker_data = []

    print(f"Bắt đầu lấy dữ liệu LỊCH SỬ Top NĐTNN phiên {date_str}...")
    for group in groups:
        try:
            # Type list: 'foreign_buy', 'foreign_sell', 'gainer', 'loser', 'value', 'volume'
            df_h = ts.history(listing_group=group, data_type='foreign_buy', start_date=date_str, end_date=date_str)
            if df_h is not None and not df_h.empty:
                for _, row in df_h.iterrows():
                    ticker_data.append({
                        'date': date_str,
                        'symbol': row['symbol'],
                        'category': 'foreign',
                        'net_value': float(row.get('net_buy_value', row.get('net_value', 0))),
                        'net_volume': float(row.get('net_buy_volume', row.get('net_volume', 0)))
                    })
        except Exception as e:
            print(f"Lỗi khi lấy lịch sử {group}: {e}")

    if ticker_data:
        # Batch insert
        supabase.table('ticker_market_stats_daily').upsert(ticker_data).execute()
        print(f"Đã lưu {len(ticker_data)} bản ghi lịch sử phiên {date_str} vào Supabase.")
    else:
        print("Không lấy được dữ liệu lịch sử nào.")

if __name__ == "__main__":
    fetch_historical_day("2026-03-19")
