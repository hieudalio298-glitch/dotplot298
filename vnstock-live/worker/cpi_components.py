from vnstock_data import Macro
import pandas as pd
from datetime import datetime

def get_cpi_breakdown():
    # Khởi tạo Macro module
    m = Macro()
    
    # Lấy dữ liệu 2 tháng gần nhất để so sánh
    today = datetime.now()
    # Lấy toàn bộ dữ liệu từ 2024 đến nay để tìm tháng mới nhất thực tế
    df = m.cpi(start="2024-01", end="2026-12")
    
    if df is None or df.empty:
        print("Không có dữ liệu CPI.")
        return

    # Sắp xếp theo thời gian mới nhất
    df = df.sort_index(ascending=False)
    
    # Lấy danh sách các tháng có dữ liệu
    available_months = df.index.unique().tolist()
    latest_month = available_months[0]
    
    print(f"\n📊 CẤU PHẦN CPI VIỆT NAM - THÁNG {latest_month.strftime('%m/%Y')}")
    print("="*60)
    
    # Lọc dữ liệu của tháng mới nhất
    latest_data = df.loc[[latest_month]]
    
    # Loại bỏ các hàng không phải là cấu phần (như 'So sánh với cùng kỳ')
    exclude_list = ['So sánh với cùng kỳ năm trước', 'Chỉ số giá tiêu dùng']
    headline = latest_data[latest_data['name'] == 'Chỉ số giá tiêu dùng']
    components = latest_data[~latest_data['name'].isin(exclude_list)]
    
    # Hiển thị Headline trước
    if not headline.empty:
        val = headline.iloc[0]['value']
        print(f"🔥 CHỈ SỐ GIÁ TIÊU DÙNG (Headline CPI): {val}%")
        print("-" * 60)
    
    # Hiển thị các cấu phần
    print(f"{'Cấu phần':<35} | {'Giá trị (%)':<10} | {'Đơn vị'}")
    print("-" * 60)
    
    for _, row in components.sort_values('value', ascending=False).iterrows():
        print(f"{row['name']:<35} | {row['value']:>10.2f} | {row['unit']}")
    
    print("="*60)
    print(f"Nguồn: {latest_data.iloc[0]['source']}")

if __name__ == "__main__":
    get_cpi_breakdown()
