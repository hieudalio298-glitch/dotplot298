import requests
import sys

# Windows terminal UTF-8 support
sys.stdout.reconfigure(encoding='utf-8')

BOT_TOKEN = "8176419787:AAGVisWEzMu3-PB4hg4NTNJTMydku2BwP8A"
CHAT_ID = "1899480201"

def send_photo(photo_path, caption):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendPhoto"
    try:
        with open(photo_path, 'rb') as photo:
            payload = {
                "chat_id": CHAT_ID,
                "caption": caption,
                "parse_mode": "HTML"
            }
            files = {"photo": photo}
            r = requests.post(url, data=payload, files=files, timeout=30)
            return r.json()
    except Exception as e:
        print(f"Lỗi khi gửi {photo_path}: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Đang gửi báo cáo hình ảnh lên Telegram...")
    
    # Gửi ảnh 1: Xu hướng
    res1 = send_photo("foreign_trend_21d.png", "📊 <b>BÁO CÁO XU HƯỚNG KHỐI NGOẠI (21 PHIÊN)</b>\n<i>Tự động cập nhật bởi Antigravity Bot</i>")
    if res1 and res1.get("ok"):
        print("✅ Đã gửi biểu đồ xu hướng.")
    else:
        print(f"❌ Lỗi gửi biểu đồ xu hướng: {res1}")

    # Gửi ảnh 2: Top 10
    res2 = send_photo("top_foreign_today.png", "🔝 <b>TOP 10 GIAO DỊCH KHỐI NGOẠI HÔM NAY</b>\n<i>Chi tiết mã mua/bán ròng mạnh nhất.</i>")
    if res2 and res2.get("ok"):
        print("✅ Đã gửi biểu đồ Top 10.")
    else:
        print(f"❌ Lỗi gửi biểu đồ Top 10: {res2}")
