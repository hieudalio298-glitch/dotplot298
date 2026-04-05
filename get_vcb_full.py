import pandas as pd
from vnstock_data import Trading, Quote, Company, Finance
import sys
import io
import os

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    symbol = 'VCB'
    print(f"=== ĐANG LẤY DỮ LIỆU ĐẦY ĐỦ CHO {symbol} ===\n")

    # 1. Bảng giá Realtime (Trading)
    print("--- 1. Bảng giá hiện tại (Realtime) ---")
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
    print("--- 2. Tổng quan doanh nghiệp ---")
    try:
        c = Company(source='VCI', symbol=symbol)
        df_overview = c.overview()
        if not df_overview.empty:
            print(df_overview.transpose().head(15))
        else:
            print("Không tìm thấy thông tin tổng quan.")
    except Exception as e:
        print(f"Lỗi khi lấy tổng quan: {e}")

    print("\n" + "="*50 + "\n")

    # 3. Chỉ số tài chính (Financials - Income Statement)
    print("--- 3. Kết quả kinh doanh (4 quý gần nhất) ---")
    try:
        f = Finance(symbol=symbol, source='VCI')
        df_income = f.income_statement(period='quarter', lang='vi', size=4)
        if not df_income.empty:
            print(df_income.transpose())
        else:
            print("Không tìm thấy báo cáo kết quả kinh doanh.")
    except Exception as e:
        print(f"Lỗi khi lấy báo cáo tài chính: {e}")

    print("\n" + "="*50 + "\n")

    # 4. Lịch sử giá gần nhất (Quote)
    print("--- 4. Lịch sử giá (10 phiên gần nhất) ---")
    try:
        q = Quote(source='VND', symbol=symbol)
        # Using a recent date range
        df_hist = q.history(start='2024-03-01', end='2026-04-04', interval='1D')
        if not df_hist.empty:
            print(df_hist.tail(10))
        else:
            print("Không tìm thấy lịch sử giá.")
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử giá: {e}")

if __name__ == "__main__":
    main()
