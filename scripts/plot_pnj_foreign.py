import sys
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
from datetime import datetime
from vnstock_data import Trading

# Fix encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def plot_pnj_foreign():
    symbol = 'PNJ'
    start_date = '2026-01-01'
    end_date = '2026-04-03'
    
    print(f"--- Đang trích xuất dữ liệu và vẽ biểu đồ cho {symbol}... ---")
    try:
        # Khởi tạo adapter Trading (sử dụng nguồn VCI)
        t = Trading(symbol=symbol, source='VCI')
        
        # Lấy lịch sử giao dịch (bao gồm cả dữ liệu nước ngoài)
        # Note: Trình trích xuất này phụ thuộc vào API response của VCI
        df = t.history(start=start_date, end=end_date)
        
        if df.empty:
            print("Không tìm thấy dữ liệu trong khoảng thời gian này.")
            return

        # Đảm bảo định dạng cột 'date' và sắp xếp
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')

        # Tính toán Giá trị mua bán ròng (đơn vị Tỷ VNĐ)
        # Kiểm tra sự tồn tại của các cột liên quan đến giá trị nước ngoài
        # Mặc định sử dụng khối lượng ròng * giá đóng cửa nếu không có cột giá trị trực tiếp
        if 'net_foreign_value' in df.columns:
            df['net_value_billion'] = df['net_foreign_value'] / 1e9
        elif 'foreign_buy_value' in df.columns and 'foreign_sell_value' in df.columns:
            df['net_value_billion'] = (df['foreign_buy_value'] - df['foreign_sell_value']) / 1e9
        else:
            # Ước tính từ khối lượng ròng * giá đóng cửa
            # Thường net_foreign_vol là cột có sẵn
            if 'net_foreign_vol' in df.columns:
                df['net_value_billion'] = (df['net_foreign_vol'] * df['close']) / 1e9
            else:
                # Nếu không có cả net_foreign_vol, ta log ra để debug
                print(f"Cảnh báo: Không tìm thấy cột giá trị nước ngoài. Các cột hiện có: {df.columns.tolist()}")
                return

        # Thiết lập phong cách biểu đồ (Dark mode cho chuyên nghiệp)
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(14, 8))
        
        # 1. Vẽ các cột Mua/Bán ròng
        colors = ['#ff4d4f' if x < 0 else '#52c41a' for x in df['net_value_billion']]
        bars = ax.bar(df['date'], df['net_value_billion'], color=colors, alpha=0.9, label='GT Mua/Bán ròng (Tỷ VNĐ)')
        
        # 2. Vẽ đường giá đóng cửa ở trục phụ (Twin axis)
        ax2 = ax.twinx()
        ax2.plot(df['date'], df['close'], color='#ff9800', linewidth=3, label=f'Giá đóng cửa {symbol}')
        ax2.fill_between(df['date'], df['close'], color='#ff9800', alpha=0.1)
        
        # 3. Định dạng và chú thích
        ax.set_title(f'DIỄN BIẾN GIAO DỊCH KHỐI NGOẠI & GIÁ PNJ\n(01/01/2026 - 04/04/2026)', 
                    fontsize=18, fontweight='bold', pad=30, color='white')
        
        ax.set_xlabel('Ngày giao dịch', color='#666')
        ax.set_ylabel('Giá trị ròng (Tỷ VNĐ)', color='#52c41a', fontsize=12, fontweight='bold')
        ax2.set_ylabel('Giá đóng cửa (VNĐ)', color='#ff9800', fontsize=12, fontweight='bold')
        
        # Đường ranh giới 0
        ax.axhline(0, color='white', linewidth=1.5, linestyle='-', alpha=0.5)
        
        # Lưới và Legend
        ax.grid(axis='y', color='#333', linestyle='--', alpha=0.5)
        
        # Gộp Legend từ cả 2 trục
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left', frameon=True, facecolor='#1a1a1a', edgecolor='#333')

        # Tự động điều chỉnh khoảng cách
        plt.tight_layout()
        
        # Lưu file ảnh chất lượng cao
        output_image = "pnj_foreign_chart.png"
        plt.savefig(output_image, dpi=300, facecolor='#000')
        print(f"--- ĐÃ VẼ BIỂU ĐỒ THÀNH CÔNG: {output_image} ---")
        
        # Lưu file Excel bổ sung để người dùng có thể mở xem trực tiếp
        output_excel = "pnj_foreign_data.xlsx"
        df.to_excel(output_excel, index=False)
        print(f"--- ĐÃ LƯU DỮ LIỆU EXCEL: {output_excel} ---")
        
    except Exception as e:
        print(f"LỖI TRONG QUÁ TRÌNH THỰC THI: {e}")

if __name__ == "__main__":
    plot_pnj_foreign()
