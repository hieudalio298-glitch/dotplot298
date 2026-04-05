from vnstock_data import Trading
import sys

# Thiết lập hiển thị tiếng Việt
sys.stdout.reconfigure(encoding='utf-8')

def test_vci():
    print("🚀 ĐANG KIỂM TRA ĐỊNH DẠNG SYMBOL CHO VCI...")
    trading = Trading(source='vci')
    
    # Thử danh sách mã (List)
    print("\n[TEST 1] Thử với List: symbols=['VCB','ACB']")
    try:
        df1 = trading.price_board(symbols=['VCB','ACB'], flatten_columns=True, drop_levels=[0])
        print(f"  ✅ THÀNH CÔNG! Đã lấy được {len(df1)} dòng.")
    except Exception as e:
        print(f"  ❌ THẤT BẠI: {str(e)}")

    # Thử chuỗi phẩy (Comma String)
    print("\n[TEST 2] Thử với String: symbols='VCB,ACB'")
    try:
        df2 = trading.price_board(symbols='VCB,ACB', flatten_columns=True, drop_levels=[0])
        print(f"  ✅ THÀNH CÔNG! Đã lấy được {len(df2)} dòng.")
    except Exception as e:
        print(f"  ❌ THẤT BẠI: {str(e)}")

    # Thử gọi hàm liệt kê mã của VCI
    print("\n[TEST 3] Thử lấy danh sách mã toàn sàn từ VCI...")
    try:
        from vnstock_data import Company
        c = Company(source='vci')
        all_symbols = c.listing()
        print(f"  ✅ THÀNH CÔNG! Tổng số mã: {len(all_symbols)}")
        print(f"  Ví dụ mã đầu tiên: '{all_symbols.iloc[0]['symbol']}'")
    except Exception as e:
        print(f"  ❌ THẤT BẠI: {str(e)}")

if __name__ == "__main__":
    test_vci()
