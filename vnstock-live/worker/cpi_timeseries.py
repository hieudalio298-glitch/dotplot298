import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from vnstock_data import Macro
from datetime import datetime
import os

# Trọng số CPI Việt Nam (Dựa trên rổ hàng hóa 2019 của GSO)
GSO_WEIGHTS = {
    'Hàng ăn và dịch vụ ăn uống': 33.56,
    'Lương thực': 3.67,
    'Thực phẩm': 21.28,
    'Ăn uống ngoài gia đình': 8.61,
    'Đồ uống và thuốc lá': 2.73,
    'May mặc, giày dép mũ nón': 5.70,
    'Nhà ở và vật liệu xây dựng': 18.82,
    'Thiết bị và đồ dùng gia đình': 6.74,
    'Thuốc và dịch vụ y tế': 5.39,
    'Giao thông': 9.67,
    'Bưu chính viễn thông': 3.14,
    'Giáo dục': 6.17,
    'Văn hóa, giải trí và du lịch': 3.96,
    'Đồ dùng và dịch vụ khác': 3.32
}

def generate_cpi_weight_visualization():
    print("🚀 Đang lấy dữ liệu CPI lịch sử và áp dụng trọng số GSO...")
    m = Macro()
    
    # Lấy dữ liệu từ 2024 đến nay
    try:
        df = m.cpi(start="2024-01", end="2026-12")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        return

    if df is None or df.empty:
        print("❌ Không lấy được dữ liệu.")
        return

    # 1. Tiền xử lý dữ liệu
    # Loại bỏ các hàng không nằm trong danh mục trọng số (Headline, YoY)
    df_filtered = df[df['name'].isin(GSO_WEIGHTS.keys())].copy()
    df_filtered['date'] = df_filtered.index
    
    # Pivot dữ liệu: Rows = Date, Columns = Component
    df_pivot = df_filtered.pivot(index='date', columns='name', values='value')
    df_pivot = df_pivot.sort_index()

    # 2. Tính toán Đóng góp (Contribution) = (Biến động giá x Trọng số) / 100
    df_contribution = pd.DataFrame(index=df_pivot.index)
    for col in df_pivot.columns:
        weight = GSO_WEIGHTS.get(col, 0)
        df_contribution[col] = (df_pivot[col] * weight) / 100

    # 3. Tính tỷ trọng đóng góp (%) = (Đóng góp cấu phần / Tổng đóng góp) * 100
    # Chú ý: Ta lấy trị tuyệt đối để biểu đồ 100% stack bar dễ nhìn hơn về mặt quy mô tác động
    # Hoặc giữ nguyên để thấy rõ âm/dương. Ở đây dùng đóng góp tuyệt đối cho dễ quan sát.
    df_percentage = df_contribution.divide(df_contribution.abs().sum(axis=1), axis=0) * 100

    # 4. Vẽ biểu đồ
    sns.set_theme(style="whitegrid")
    plt.rcParams['font.family'] = 'DejaVu Sans'
    
    fig, ax = plt.subplots(figsize=(15, 8))

    # Vẽ 100% Stacked Bar Chart
    # Sử dụng bảng màu 'Paired' hoặc 'tab20' có độ tương phản cao hơn 'Spectral'
    df_percentage.plot(kind='bar', stacked=True, ax=ax, colormap='tab20')

    ax.set_xticklabels([d.strftime('%m/%Y') for d in df_percentage.index], rotation=45)
    ax.set_title('TỶ TRỌNG ĐÓNG GÓP CỦA CÁC CẤU PHẦN TRONG CPI VIỆT NAM (2023-2025)\n(Dựa trên trọng số GSO 2019)', 
                 fontsize=15, fontweight='bold', pad=20)
    ax.set_ylabel('Phần trăm đóng góp vào CPI (%)', fontsize=12)
    ax.set_xlabel('Tháng / Năm', fontsize=12)
    
    # Legend
    plt.legend(title='Nhóm hàng hóa', bbox_to_anchor=(1.02, 1), loc='upper left', fontsize=9)
    
    # Ghi chú tổng mức đóng góp (Headine CPI) lên đầu cột
    headline_cpi = df_contribution.sum(axis=1)
    for i, (idx, val) in enumerate(headline_cpi.items()):
        ax.text(i, 102, f"{val:.1f}%", ha='center', fontsize=8, fontweight='bold', color='darkred')

    plt.tight_layout()

    # Lưu kết quả
    output_dir = r"C:\Users\Lenovo\.gemini\antigravity\brain\6c997bfd-a6cd-4eb0-aa07-d76584be42f9"
    output_path = os.path.join(output_dir, "cpi_percentage_contribution.png")
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    
    print(f"🎉 Biểu đồ tỷ trọng đã được lưu tại: {output_path}")

if __name__ == "__main__":
    generate_cpi_weight_visualization()
