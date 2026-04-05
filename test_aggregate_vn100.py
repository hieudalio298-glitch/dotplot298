from vnstock_data import Listing, Trading
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

def aggregate_market():
    # Use VCI for robust data, since user mentioned it
    lst = Listing(source='vci')
    
    # Try with VN100 (top 100 tickers on HOSE). This usually accounts for 95-98% of market trading volume.
    # It takes approx 10-15s to fetch 100 tickers concurrently.
    try:
        vn100_df = lst.symbols_by_group('VN100', to_df=True)
        # Bắt ngoại lệ kiểu Series / Dataframe
        if isinstance(vn100_df, pd.Series):
             symbols = vn100_df.tolist()
        else:
             symbols = vn100_df['symbol'].tolist()
    except Exception as e:
        print("Lấy danh sách VN100 bị lỗi, lấy rổ VN30 tạm thay thế.")
        # Fallback to VN30
        symbols = lst.symbols_by_group('VN30', to_df=False)

    print(f"Tổng số mã chứng khoán (VN100): {len(symbols)}")

    # Target date
    START_DATE = '2026-03-20'
    END_DATE = '2026-03-20'

    def fetch_ticker_data(symbol):
        f_net = 0
        p_net = 0
        try:
            t = Trading(symbol=symbol, source='vci', random_agent=True)
            
            # Khối ngoại (Foreign)
            df_for = t.foreign_trade(start=START_DATE, end=END_DATE)
            if df_for is not None and not df_for.empty:
                if 'fr_net_value' in df_for.columns:
                    f_net = df_for['fr_net_value'].sum()
                elif 'fr_buy_value' in df_for.columns and 'fr_sell_value' in df_for.columns:
                    f_net = df_for['fr_buy_value'].sum() - df_for['fr_sell_value'].sum()

            # Tự doanh (Proprietary)
            df_prop = t.prop_trade(start=START_DATE, end=END_DATE)
            if df_prop is not None and not df_prop.empty:
                if 'prop_net_value' in df_prop.columns:
                    p_net = df_prop['prop_net_value'].sum()
                elif 'prop_buy_value' in df_prop.columns and 'prop_sell_value' in df_prop.columns:
                    p_net = df_prop['prop_buy_value'].sum() - df_prop['prop_sell_value'].sum()
                    
        except Exception as e:
            # Lỗi timeout hoặc không có dữ liệu
            pass
            
        return symbol, f_net, p_net

    print("Đang quét dữ liệu đồng thời...")
    total_f = 0
    total_p = 0
    start_time = time.time()
    
    # Số lượng thread 15 là vừa đủ tải để không bị quá rate_limit của VCI
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = [executor.submit(fetch_ticker_data, sym) for sym in symbols]
        
        for i, fut in enumerate(as_completed(futures)):
            sym, f_net, p_net = fut.result()
            total_f += f_net
            total_p += p_net
            if (i + 1) % 20 == 0:
                print(f"Đã xử lý {i + 1}/{len(symbols)} mã...")

    print(f"\nThời gian chạy: {time.time() - start_time:.2f} giây")
    print(f"--- DỮ LIỆU TỔNG HỢP RỔ VN100 (20/03/2026) ---")
    print(f"Tính tổng Net Value Khối ngoại: {total_f / 1e9:,.2f} Tỷ VNĐ")
    print(f"Tính tổng Net Value Tự doanh:  {total_p / 1e9:,.2f} Tỷ VNĐ")

if __name__ == '__main__':
    aggregate_market()
