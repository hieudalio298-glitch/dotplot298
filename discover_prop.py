import os
from vnstock_data import Trading, TopStock, config
from dotenv import load_dotenv
import pandas as pd
import sys

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')

load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def discover_prop():
    # Thử lấy Top Tự doanh mua từ nguồn KBS
    # Một số phiên bản vnstock_data lấy qua Trading().prop_trade(symbol='HOSE', ...)
    try:
        t = Trading(source='KBS')
        print("Đang thử lấy dữ liệu Tự doanh HOSE qua Trading().prop_trade...")
        df = t.prop_trade(symbol='HOSE', start_date='2026-03-20', end_date='2026-03-20')
        if df is not None and not df.empty:
            print("Tìm thấy dữ liệu Tự doanh!")
            print(df.head(5).to_string())
            return
    except Exception as e:
        print(f"Lỗi Trading Prop: {e}")

    try:
        ts = TopStock()
        print("\nĐang kiểm tra các phương thức của TopStock liên quan đến Tự doanh...")
        methods = [m for m in dir(ts) if 'prop' in m.lower()]
        print(f"Các hàm liên quan đến Prop trong TopStock: {methods}")
    except Exception as e:
        print(f"Lỗi TopStock discovery: {e}")

if __name__ == "__main__":
    discover_prop()
