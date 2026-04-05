from vnstock_data import Listing, Trading
import pandas as pd
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

def aggregate_market_safe():
    print("Đang khởi tạo danh sách VN100...")
    lst = Listing(source='vci')
    try:
        vn100_df = lst.symbols_by_group('VN100', to_df=True)
        if isinstance(vn100_df, pd.Series):
             symbols = vn100_df.tolist()
        else:
             symbols = vn100_df['symbol'].tolist()
    except Exception:
        print("Lỗi lấy VN100, chuyển sang VN30")
        symbols = lst.symbols_by_group('VN30', to_df=True)['symbol'].tolist()

    print(f"Tổng số mã chứng khoán cần quét: {len(symbols)}")

    START_DATE = '2026-03-20'
    END_DATE = '2026-03-20'

    total_f = 0
    total_p = 0
    start_time = time.time()
    
    print("Bắt đầu quét dữ liệu Tuần tự (Sequential) để tránh quá tải API...")
    
    for i, symbol in enumerate(symbols):
        try:
            t = Trading(symbol=symbol, source='vci')
            
            # Khối ngoại
            df_for = t.foreign_trade(start=START_DATE, end=END_DATE)
            if df_for is not None and not df_for.empty:
                if 'total_trade_net_value' in df_for.columns:
                    total_f += df_for['total_trade_net_value'].sum()

            time.sleep(0.1)

            # Tự doanh
            df_prop = t.prop_trade(start=START_DATE, end=END_DATE)
            if df_prop is not None and not df_prop.empty:
                if 'total_trade_net_value' in df_prop.columns:
                    total_p += df_prop['total_trade_net_value'].sum()
                    
            time.sleep(0.1)
            
        except Exception as e:
            pass
            
        if (i + 1) % 10 == 0:
            print(f"Đã xử lý {i + 1}/{len(symbols)} mã...")

    print(f"\nThời gian chạy: {time.time() - start_time:.2f} giây")
    print(f"--- DỮ LIỆU TỔNG HỢP RỔ VN100 (20/03/2026) ---")
    print(f"Giá trị Khối ngoại Bán/Mua ròng: {total_f / 1e9:,.2f} Tỷ VNĐ")
    print(f"Giá trị Tự doanh Bán/Mua ròng:  {total_p / 1e9:,.2f} Tỷ VNĐ")

if __name__ == '__main__':
    aggregate_market_safe()
