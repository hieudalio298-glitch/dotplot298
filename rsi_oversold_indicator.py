# -*- coding: utf-8 -*-
"""
RSI Quá Bán Indicator - Quét toàn bộ 3 sàn HOSE, HNX, UPCOM
Sử dụng vnstock_data (Gói Silver, Rate Limit 300 req/phút)
"""

import sys
import time
import re
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

try:
    from vnstock_data import Listing, Trading
except ImportError:
    print("Cài đặt: pip install vnstock_data")
    sys.exit(1)

import io
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

RSI_PERIOD = 14
RSI_OVERSOLD = 30
SLEEP_PER_REQ = 0.21  # 300 req/phút = 5 req/giây => 0.2s/req + buffer

def calc_rsi(prices, period=14):
    """Tính RSI từ chuỗi giá đóng cửa."""
    if len(prices) < period + 1:
        return None
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]

def main():
    start_time = time.time()
    print("=" * 60)
    print(f"  RSI OVERSOLD INDICATOR - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"  Ngưỡng quá bán: RSI < {RSI_OVERSOLD}")
    print("=" * 60)

    # 1. Lấy danh sách mã trên 3 sàn
    print("\n[1/3] Đang lấy danh sách mã trên 3 sàn...", flush=True)
    ls = Listing(source='vnd')
    all_syms_df = ls.all_symbols()
    
    # Đảm bảo cột symbol tồn tại và là chuỗi
    if 'symbol' not in all_syms_df.columns:
        print(f"  [!] Không tìm thấy cột 'symbol'. Các cột hiện có: {all_syms_df.columns.tolist()}")
        return

    # Lọc mã hợp lệ (3 chữ cái in hoa, không rỗng)
    all_syms_df['symbol'] = all_syms_df['symbol'].astype(str)
    valid_symbols = [s.strip() for s in all_syms_df['symbol'].tolist() if re.match(r'^[A-Z]{3}$', s.strip())]
    print(f"  -> Tổng số mã hợp lệ (3 chữ cái): {len(valid_symbols)}", flush=True)

    # 2. Tính RSI cho từng mã
    print(f"\n[2/3] Đang tính RSI cho {len(valid_symbols)} mã (ước tính ~{len(valid_symbols) * SLEEP_PER_REQ / 60:.1f} phút)...", flush=True)
    
    trading = None
    for src in ['tcbs', 'vnd', 'VCI', 'SSI']:
        try:
            print(f"  -> Thử tải nguồn dữ liệu: {src}...", end=' ', flush=True)
            trading = Trading(source=src)
            print("Thành công!", flush=True)
            break
        except Exception as e:
            print(f"Thất bại. ({e})", flush=True)
    
    if trading is None:
        print(" [!] Không thể khởi tạo bất kỳ nguồn dữ liệu nào. Dừng chương trình.")
        return

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=60)).strftime('%Y-%m-%d')
    
    oversold_list = []
    errors = 0
    processed = 0
    
    for i, symbol in enumerate(valid_symbols):
        try:
            # Lấy dữ liệu lịch sử giá
            df_price = trading.price_history(symbol=symbol, start=start_date, end=end_date)
            
            if df_price is not None and not df_price.empty and len(df_price) > RSI_PERIOD:
                # Xác định cột giá đóng cửa (thường là 'close' hoặc 'close_price')
                close_col = 'close' if 'close' in df_price.columns else (df_price.columns[-2] if len(df_price.columns) > 1 else df_price.columns[0])
                
                # Tính RSI
                rsi_val = calc_rsi(df_price[close_col].astype(float), RSI_PERIOD)
                
                if rsi_val is not None and rsi_val < RSI_OVERSOLD:
                    last_price = float(df_price[close_col].iloc[-1])
                    oversold_list.append({
                        'symbol': symbol,
                        'rsi': round(rsi_val, 2),
                        'price': last_price,
                    })
            processed += 1
        except ValueError as ve:
            # Thường là lỗi 'Invalid symbol' từ API
            errors += 1
            # print(f"  [!] Bỏ qua {symbol}: {ve}")
        except Exception as e:
            errors += 1
            # print(f"  [!] Lỗi hệ thống mã {symbol}: {e}")
        
        # Rate limit: 300 req/phút (5 req/giây)
        time.sleep(SLEEP_PER_REQ)
        
        # In tiến độ mỗi 100 mã
        if (i + 1) % 100 == 0:
            elapsed = time.time() - start_time
            eta = (elapsed / (i + 1)) * (len(valid_symbols) - i - 1)
            print(f"  -> Đã xử lý {i+1}/{len(valid_symbols)} mã | Quá bán: {len(oversold_list)} | Lỗi: {errors} | ETA: {eta/60:.1f} phút", flush=True)
    
    # 3. Kết quả
    print(f"\n[3/3] KẾT QUẢ:", flush=True)
    print(f"  -> Tổng mã đã quét: {processed}")
    print(f"  -> Số mã lỗi: {errors}")
    print(f"  -> Số mã RSI < {RSI_OVERSOLD} (Quá bán): {len(oversold_list)}")
    
    if oversold_list:
        df_result = pd.DataFrame(oversold_list).sort_values('rsi', ascending=True)
        print(f"\n{'='*60}")
        print(f"  DANH SÁCH {len(df_result)} MÃ QUÁ BÁN (RSI < {RSI_OVERSOLD})")
        print(f"{'='*60}")
        print(df_result.to_string(index=False))
        
        # Lưu ra file CSV
        output_csv = 'rsi_oversold_list.csv'
        df_result.to_csv(output_csv, index=False, encoding='utf-8-sig')
        print(f"\n  -> Đã lưu danh sách tại: {output_csv}")
    else:
        print("  -> Không có mã nào đang quá bán!")

    elapsed_total = time.time() - start_time
    print(f"\n  Tổng thời gian: {elapsed_total/60:.1f} phút")

if __name__ == "__main__":
    main()
