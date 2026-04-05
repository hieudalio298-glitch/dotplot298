import os
import pandas as pd
from datetime import datetime, timedelta
from vnstock_data import Trading, config
from dotenv import load_dotenv
import sys

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def check_net_market_kbs():
    # Sử dụng Trading().foreign_trade với nguồn KBS
    t = Trading(source='KBS')
    today = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=10)).strftime('%Y-%m-%d')
    
    print(f"\n--- KIỂM TRA DỮ LIỆU KHỐI NGOẠI TOÀN SÀN HOSE (NGUỒN KBS) ({start_date} đến {today}) ---")
    try:
        # Lấy dữ liệu giao dịch khối ngoại
        df = t.foreign_trade(symbol='VNINDEX', start_date=start_date, end_date=today)
        if df is not None and not df.empty:
            if isinstance(df.columns[0], tuple):
                df.columns = ['_'.join(col).strip() for col in df.columns.values]
            
            print(df.to_string(index=False))
        else:
            print("KBS cũng không trả về dữ liệu tổng thị trường cho VNINDEX.")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    check_net_market_kbs()
