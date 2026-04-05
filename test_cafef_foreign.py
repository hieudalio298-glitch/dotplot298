from vnstock_data import Trading
import pandas as pd
import sys
import traceback

sys.stdout.reconfigure(encoding='utf-8')

def test_cafef():
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 1000)
    
    print("\n--- Thử lấy dữ liệu khối ngoại cho VNINDEX từ CAFEF ---")
    try:
        trading = Trading(symbol='VNINDEX', source='cafef')
        df = trading.foreign_trade(start='2026-03-11', end='2026-03-20')
        if df is not None and not df.empty:
            print(df)
        else:
            print("Không có dữ liệu trả về.")
    except Exception as e:
        print(f"Lỗi: {e}")
        
    print("\n--- Thử lấy dữ liệu khối ngoại cho riêng mã MSN từ CAFEF (để so sánh) ---")
    try:
        trading = Trading(symbol='MSN', source='cafef')
        df = trading.foreign_trade(start='2026-03-11', end='2026-03-20')
        if df is not None and not df.empty:
            print(df)
        else:
            print("Không có dữ liệu trả về.")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    test_cafef()
