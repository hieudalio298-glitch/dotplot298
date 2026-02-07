from vnstock_data import Finance
import pandas as pd
import sys
import os
import io

# Đảm bảo in được tiếng Việt trên Windows Terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== Đang lấy TẤT CẢ các kỳ báo cáo NĂM từ nguồn VCI ===")

try:
    # 1. Khởi tạo Finance cho REE với nguồn VCI
    symbol = 'REE'
    source = 'MAS'
    f = Finance(symbol=symbol, source=source)
    
    # 2. Lấy tất cả báo cáo năm (dùng size lớn để lấy hết)
    print(f"\n--- Đang gọi API lấy dữ liệu {symbol} từ {source} (size=100) ---")
    df = f.balance_sheet(period='year', lang='vi', size=100).transpose()
    
    if df is not None and not df.empty:
        # Nhận diện các cột năm
        year_cols = [c for c in df.columns if str(c).isdigit()]
        sorted_years = sorted(year_cols, reverse=True)
        other_cols = [c for c in df.columns if not str(c).isdigit()]
        
        # Sắp xếp DataFrame: các cột thông tin trước, sau đó là các năm mới nhất đến cũ nhất
        df = df[other_cols + sorted_years]

        print(f"\n[KẾT QUẢ] Tổng số năm lấy được: {len(year_cols)}")
        print(f"Danh sách năm: {sorted_years}")
        
        # 3. Xuất file Excel
        excel_name = f"tat_ca_cac_nam_{symbol}_{source}.xlsx"
        try:
            df.to_excel(excel_name)
            print(f"\n[OK] Đã lưu file Excel: {excel_name}")
            print(f"Đường dẫn: {os.path.abspath(excel_name)}")
        except Exception as e:
            print(f"\n[!] Lỗi khi lưu Excel: {e}")

        print("\n--- 10 hàng đầu dữ liệu ---")
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', 1000)
        print(df.head(10))
    else:
        print(f"\n[!] Không lấy được dữ liệu cho {symbol} từ nguồn {source}.")

except Exception as e:
    print(f"\n[!] Lỗi hệ thống: {e}")
