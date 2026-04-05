import pandas as pd
from vnstock_data import Trading, Quote, Company
import sys
import io

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    symbol = 'VCB'
    print(f"=== ĐANG LẤY DỮ LIỆU CHO {symbol} ===\n")

    # 1. Bảng giá Realtime (Trading)
    print("--- Bảng giá hiện tại (Realtime) ---")
    try:
        t = Trading(source='KBS', symbol=symbol)
        df_board = t.price_board(symbols_list=[symbol])
        if not df_board.empty:
            print(df_board.transpose())
        else:
            print("Không tìm thấy dữ liệu bảng giá.")
    except Exception as e:
        print(f"Lỗi khi lấy bảng giá: {e}")

    print("\n" + "="*50 + "\n")

    # 2. Tổng quan công ty (Company)
    print("--- Tổng quan doanh nghiệp ---")
    try:
        c = Company(source='VCI', symbol=symbol)
        df_overview = c.overview()
        if not df_overview.empty:
            # Transpose for easier reading
            print(df_overview.transpose().head(15))
        else:
            print("Không tìm thấy thông tin tổng quan.")
    except Exception as e:
        print(f"Lỗi khi lấy tổng quan: {e}")

    print("\n" + "="*50 + "\n")

    # 3. Lịch sử giá gần nhất (Quote)
    print("--- 5 phiên giao dịch gần nhất ---")
    try:
        q = Quote(source='VND', symbol=symbol)
        df_hist = q.history(start='2024-03-01', end='2026-03-22', interval='1D')
        if not df_hist.empty:
            print(df_hist.tail(5))
        else:
            print("Không tìm thấy lịch sử giá.")
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử giá: {e}")

if __name__ == "__main__":
    main()
