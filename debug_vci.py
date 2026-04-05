import vnstock
import sys
import os

# Thiết lập hiển thị tiếng Việt
sys.stdout.reconfigure(encoding='utf-8')

def test():
    print("🚀 BẮT ĐẦU TEST DỮ LIỆU NGOẠI (VCI)...")
    try:
        t = vnstock.Trading(symbol='VCB', source='VCI')
        print("  [1/2] Đang lấy khối ngoại VCB...")
        df_f = t.foreign_trade()
        if not df_f.empty:
            print(f"  ✅ THÀNH CÔNG! Đã lấy được {len(df_f)} dòng dữ liệu ngoại.")
            print(df_f.tail(2))
        else:
            print("  ❌ LỖI: Dữ liệu VCI trống!")
            
        print("  [2/2] Đang lấy lịch sử giá VCB...")
        df_h = t.history(start_date='2026-03-01', end_date='2026-03-22')
        if not df_h.empty:
            print(f"  ✅ THÀNH CÔNG! Giá hiện tại: {df_h.iloc[-1]['close']}")
        else:
            print("  ❌ LỖI: Lịch sử giá trống!")
            
    except Exception as e:
        print(f"  💥 LỖI HỆ THỐNG: {str(e)}")

if __name__ == "__main__":
    test()
