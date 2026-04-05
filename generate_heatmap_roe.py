import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import matplotlib

# Set font cho tiếng Việt
matplotlib.rcParams['font.family'] = 'Segoe UI'

base_path = r'c:\Users\Lenovo\dotplot\stockplot\oil_roe_quarterly.csv'
output_path = r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\heatmap_roe.png'

try:
    # Đọc dữ liệu
    df = pd.read_csv(base_path)
    df.set_index('Quarter', inplace=True)
    
    # Dữ liệu ROE ở dạng số thập phân, chuyển sang % để hiển thị
    df = df * 100
    
    # Thiết lập kích thước
    plt.figure(figsize=(16, 12))
    
    # Dải màu: Đỏ (âm) -> Trắng (0) -> Xanh (dương)
    cmap = sns.diverging_palette(10, 130, n=256, as_cmap=True, s=85, l=45)
    
    sns.heatmap(df, annot=True, fmt=".1f", cmap=cmap, center=0,
                linewidths=1, cbar_kws={"shrink": .8, "label": "ROE (%)"},
                vmin=-15, vmax=35) # Giới hạn dải màu để không bị giãn quá mức bởi các giá trị outlier (như BSR 38%)
    
    plt.title('Bảng nhiệt (Heatmap) Chỉ số ROE Cổ Phiếu Dầu Khí Kể từ Q1/2020 - Q4/2025', fontsize=18, pad=20, fontweight='bold')
    plt.ylabel('Các Quý Giao Dịch', fontsize=14, fontweight='bold')
    plt.xlabel('Mã Cổ Phiếu', fontsize=14, fontweight='bold')
    
    plt.xticks(rotation=45, ha='right', fontsize=12)
    plt.yticks(rotation=0, fontsize=12)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print("SUCCESS: Image generated at", output_path)

except Exception as e:
    print(f"FAILED: {e}")
