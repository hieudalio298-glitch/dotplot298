import subprocess
import time
import sys

# Windows terminal UTF-8 support
sys.stdout.reconfigure(encoding='utf-8')

def run_step(cmd, description):
    print(f"\n--- {description} ---")
    try:
        subprocess.run([".venv\\Scripts\\python.exe", cmd], check=True)
        print(f"✅ Hoàn thành: {description}")
    except Exception as e:
        print(f"❌ Lỗi tại bước {description}: {e}")

if __name__ == "__main__":
    print("🌟 BẮT ĐẦU QUY TRÌNH BÁO CÁO HÀNG NGÀY 🌟")
    
    # Bước 1: Đồng bộ dữ liệu mới nhất (backfill 35 ngày để đảm bảo đủ 21 phiên)
    run_step("sync_market_data.py", "Đồng bộ dữ liệu từ VNStock (Sponsor)")
    
    # Bước 2: Tạo biểu đồ hình ảnh
    run_step("generate_market_report.py", "Vẽ biểu đồ báo cáo 21 phiên")
    
    # Bước 3: Gửi lên Telegram
    run_step("send_telegram_report.py", "Gửi báo cáo lên Telegram")
    
    print("\n✨ TOÀN BỘ QUY TRÌNH ĐÃ HOÀN TẤT! ✨")
