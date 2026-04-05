import os
import pandas as pd
from datetime import datetime, timedelta
from vnstock_data import Trading, config
from dotenv import load_dotenv
import sys

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def check_net_market():
    # Sử dụng Trading().foreign_trade cho VNINDEX (toàn sàn HOSE)
    t = Trading(source='CAFEF')
    today = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=21)).strftime('%Y-%m-%d')
    
    print(f"\n--- KIỂM TRA DỮ LIỆU KHỐI NGOẠI TOÀN SÀN HOSE ({start_date} đến {today}) ---")
    try:
        # Lấy dữ liệu giao dịch khối ngoại cho VNINDEX
        df = t.foreign_trade(symbol='VNINDEX', start_date=start_date, end_date=today)
        if df is not None and not df.empty:
            # Sắp xếp theo ngày
            df = df.sort_values('date', ascending=False)
            
            # Làm sạch dữ liệu
            for col in ['buy_value', 'sell_value', 'net_value']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Hiển thị
            print(df[['date', 'buy_value', 'sell_value', 'net_value']].to_string(index=False))
        else:
            print("Không tìm được dữ liệu tổng quan cho VNINDEX từ CAFEF. Đang thử KBS...")
            t2 = Trading(source='KBS')
            df2 = t2.foreign_trade(symbol='VNINDEX', start_date=start_date, end_date=today)
            if df2 is not None and not df2.empty:
                print(df2.to_string(index=False))
            else:
                print("Tất cả các nguồn đều không trả về kết quả cho chỉ số VNINDEX.")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    check_net_market()
