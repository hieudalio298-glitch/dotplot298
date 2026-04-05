from vnstock_data import Trading
import sys

# Thiết lập hiển thị tiếng Việt
sys.stdout.reconfigure(encoding='utf-8')

def debug_vci():
    print("🚀 SIÊU DEBUG TRADING VCI...")
    
    print("\n[THỬ 1] Trading(source='vci', symbol='VCB')")
    try:
        t1 = Trading(source='vci', symbol='VCB')
        print("  ✅ Khởi tạo THÀNH CÔNG!")
    except Exception as e:
        print(f"  ❌ Khởi tạo THẤT BẠI: {str(e)}")

    print("\n[THỬ 2] Trading(symbol='VCB', source='vci')")
    try:
        t2 = Trading(symbol='VCB', source='vci')
        print("  ✅ Khởi tạo THÀNH CÔNG!")
    except Exception as e:
        print(f"  ❌ Khởi tạo THẤT BẠI: {str(e)}")

    print("\n[THỬ 3] Trading(source='vci') KHÔNG CÓ SYMBOL")
    try:
        t3 = Trading(source='vci')
        print("  ✅ Khởi tạo THÀNH CÔNG!")
    except Exception as e:
        print(f"  ❌ Khởi tạo THẤT BẠI: {str(e)}")

    print("\n[THỬ 4] Kiểm tra __init__ của Trading...")
    try:
        import inspect
        sig = inspect.signature(Trading.__init__)
        print(f"  Cấu trúc hàm __init__: {sig}")
    except Exception as e:
        print(f"  ❌ Không thể xem cấu trúc: {str(e)}")

if __name__ == "__main__":
    debug_vci()
