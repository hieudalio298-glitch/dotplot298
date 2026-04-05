from vnstock_data import Listing, Trading
import pandas as pd
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

def aggregate_cafef():
    lst = Listing(source='vci')
    try:
        vn100_df = lst.symbols_by_group('VN100', to_df=True)
        if isinstance(vn100_df, pd.Series):
             symbols = vn100_df.tolist()
        else:
             symbols = vn100_df['symbol'].tolist()
    except:
        symbols = lst.symbols_by_group('VN30', to_df=True)['symbol'].tolist()

    print(f"Quét {len(symbols)} mã từ CAFEF để ra con số chính xác Khối ngoại...")
    
    START_DATE = '2026-03-20'
    total_f = 0
    start_t = time.time()
    
    for i, symbol in enumerate(symbols):
        try:
            t = Trading(symbol=symbol, source='cafef')
            df = t.foreign_trade(start=START_DATE, end=START_DATE)
            if df is not None and not df.empty:
                if 'fr_net_value' in df.columns:
                    total_f += df['fr_net_value'].sum()
        except:
             pass
        time.sleep(0.05) # CAFEF usually open, but wait a bit
        
        if (i+1) % 20 == 0:
             print(f"Đã xử lý {i+1} mã...")

    print(f"Thời gian quét CAFEF: {time.time() - start_t:.2f}s")
    print(f"Giá trị Khối ngoại Bán/Mua ròng (VN100 - CAFEF): {total_f / 1e9:,.2f} Tỷ VNĐ")

if __name__ == '__main__':
    aggregate_cafef()
