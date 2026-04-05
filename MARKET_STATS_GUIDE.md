# Dự án Theo dõi Giao dịch Thị trường Daily (VNStock Sponsor)

Dự án này sử dụng thư viện `vnstock_data` (phiên bản Sponsor) để tự động hóa việc lấy dữ liệu giao dịch của Khối ngoại (Foreign) và Tự doanh (Proprietary Trading) hàng ngày, lưu trữ vào Supabase và hiển thị báo cáo.

## Các thành phần chính

1.  **Cấu trúc dữ liệu (Supabase)**:
    - `market_stats_daily`: Lưu tổng giá trị giao dịch theo chỉ số (VN-Index, VN30, v.v.) của Khối ngoại và Tự doanh.
    - `ticker_market_stats_daily`: Lưu chi tiết giao dịch theo từng mã cổ phiếu (Top mua/bán ròng).

2.  **Scripts**:
    - [sync_market_data.py](file:///c:/Users/Lenovo/dotplot/stockplot/sync_market_data.py): Script chính để lấy dữ liệu từ VNStock và cập nhật database.
    - [market_dashboard.py](file:///c:/Users/Lenovo/dotplot/stockplot/market_dashboard.py): Hiển thị báo cáo vắn tắt kết quả giao dịch trong ngày ngay trên terminal.
    - [migrations/create_market_stats_tables.sql](file:///c:/Users/Lenovo/dotplot/stockplot/migrations/create_market_stats_tables.sql): File SQL để khởi tạo bảng trong Supabase.

## Hướng dẫn sử dụng

### 1. Khởi tạo Cơ sở dữ liệu
Chạy các lệnh SQL trong file [create_market_stats_tables.sql](file:///c:/Users/Lenovo/dotplot/stockplot/migrations/create_market_stats_tables.sql) trên bảng SQL Editor của Supabase Dashboard.

### 2. Cấu hình API Key
Đảm bảo bạn đã cài đặt API Key cho `vnstock_data`. Cách tốt nhất là thiết lập biến môi trường:
```powershell
$env:VNSTOCK_API_KEY = "your_key_here"
```

### 3. Đồng bộ dữ liệu hàng ngày
Chạy script đồng bộ:
```powershell
.venv\Scripts\python.exe sync_market_data.py
```

### 4. Xem báo cáo
Xem tóm tắt giao dịch trong ngày:
```powershell
.venv\Scripts\python.exe market_dashboard.py
```

## Các chỉ số theo dõi
- **GTGD Khối ngoại**: Tổng giá trị mua, bán và giá trị ròng.
- **Giao dịch Tự doanh**: Diễn biến mua/bán của các công ty chứng khoán.
- **Top mã giao dịch**: Danh sách các cổ phiếu được Khối ngoại và Tự doanh quan tâm nhất trong ngày.
