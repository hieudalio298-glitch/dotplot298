"""
Script vẽ biểu đồ Stacked Bar cho các khoản mục BCTC ngành Đường
Thể hiện sự đóng góp của từng công ty vào toàn ngành qua từng quý.
"""

import sys, io, os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import warnings

# Fix encoding cho Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
warnings.filterwarnings("ignore")

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
INPUT_FILE = "sugar_group_financials.xlsx"
OUTPUT_DIR = "sugar_stacked_charts"
UNIT = 1e9  # Tỷ đồng
KEEP_SYMS = ["SBT", "QNS", "LSS", "SLS", "KTS", "FBT"]

COLORS = {
    "SBT": "#4FC3F7",
    "QNS": "#AED581",
    "LSS": "#FFB74D",
    "SLS": "#F06292",
    "KTS": "#BA68C8",
    "FBT": "#90A4AE",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── STYLE ───────────────────────────────────────────────────────────────────
plt.style.use("dark_background")
FONT_TITLE = dict(fontsize=15, fontweight="bold", color="white", pad=15)
FONT_AXIS = dict(fontsize=10, color="#cccccc")
GRID_KW = dict(color="#333333", linewidth=0.5, alpha=0.7)

def fmt_bil(x, pos):
    if abs(x) >= 1000:
        return f"{x/1000:.1f}N"
    return f"{x:.0f}B"

# ─── HÀM VẼ BIỂU ĐỒ STACKED BAR ──────────────────────────────────────────────
def draw_stacked_bar(df_raw, item_name, output_filename, title):
    # Lọc công ty và chuyển đơn vị
    df = df_raw[df_raw["symbol"].isin(KEEP_SYMS)].copy()
    if item_name not in df.columns:
        print(f"⚠️ Không tìm thấy cột '{item_name}'")
        return
        
    df[item_name] = pd.to_numeric(df[item_name], errors="coerce") / UNIT
    df["Kỳ báo cáo"] = df["Năm"].astype(str) + "-Q" + df["Kỳ"].astype(str)
    
    # Pivot dữ liệu để mỗi dòng là 1 quý, mỗi cột là 1 công ty
    pivot = df.pivot_table(
        index="Kỳ báo cáo", 
        columns="symbol", 
        values=item_name, 
        aggfunc="sum"
    ).reset_index()
    
    # Sắp xếp theo kỳ báo cáo (tăng dần)
    # Kỳ báo cáo có dạng YYYY-QX
    pivot = pivot.sort_values("Kỳ báo cáo")
    
    # Chỉ lấy 20 quý gần nhất cho dễ nhìn
    pivot = pivot.tail(20)
    
    # Vẽ
    fig, ax = plt.subplots(figsize=(16, 8), facecolor="#0d0d1a")
    ax.set_facecolor("#0d0d1a")
    
    x = np.arange(len(pivot))
    labels = pivot["Kỳ báo cáo"].tolist()
    
    bottom_pos = np.zeros(len(pivot))
    bottom_neg = np.zeros(len(pivot))
    
    for sym in KEEP_SYMS:
        if sym in pivot.columns:
            vals = pivot[sym].fillna(0).values
            pos_vals = np.where(vals >= 0, vals, 0)
            neg_vals = np.where(vals < 0, vals, 0)
            
            c = COLORS.get(sym, "#ffffff")
            
            ax.bar(x, pos_vals, bottom=bottom_pos, color=c, label=sym, alpha=0.9, width=0.7)
            ax.bar(x, neg_vals, bottom=bottom_neg, color=c, alpha=0.9, width=0.7)
            
            bottom_pos += pos_vals
            bottom_neg += neg_vals
            
    # Định dạng trục
    ax.axhline(0, color="#777777", linewidth=1)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=9, color="#cccccc")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt_bil))
    
    ax.set_title(title, **FONT_TITLE)
    ax.set_ylabel("Tỷ đồng", **FONT_AXIS)
    
    # Legend đảo ngược thứ tự để khớp với thứ tự chồng trên biểu đồ
    handles, legend_labels = ax.get_legend_handles_labels()
    ax.legend(handles[::-1], legend_labels[::-1], loc="upper left", bbox_to_anchor=(1, 1),
              facecolor="#1a1a2e", edgecolor="#555555", labelcolor="white")
              
    ax.grid(True, axis="y", **GRID_KW)
    for spine in ax.spines.values():
        spine.set_edgecolor("#333333")
        
    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, output_filename)
    plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ Đã vẽ: {title} -> {out_path}")

# ─── ĐỌC DỮ LIỆU & THỰC THI ──────────────────────────────────────────────────
print(f"📖 Đang đọc dữ liệu từ {INPUT_FILE}...")

df_inc = pd.read_excel(INPUT_FILE, sheet_name="KQ Kinh Doanh")
df_bal = pd.read_excel(INPUT_FILE, sheet_name="Can Doi Ke Toan")

print("🎨 Bắt đầu vẽ các biểu đồ Stacked Bar ngành đường...")

# Các chỉ số KQKD
draw_stacked_bar(
    df_inc, 
    "Doanh thu thuần", 
    "01_doanh_thu_stacked.png", 
    "DOANH THU THUẦN NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

draw_stacked_bar(
    df_inc, 
    "Lãi gộp", 
    "02_lai_gop_stacked.png", 
    "LÃI GỘP NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

draw_stacked_bar(
    df_inc, 
    "Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)", 
    "03_lnst_stacked.png", 
    "LỢI NHUẬN SAU THUẾ NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

# Các chỉ số CĐKT
draw_stacked_bar(
    df_bal, 
    "TỔNG CỘNG TÀI SẢN (đồng)", 
    "04_tong_tai_san_stacked.png", 
    "TỔNG TÀI SẢN NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

draw_stacked_bar(
    df_bal, 
    "NỢ PHẢI TRẢ (đồng)", 
    "05_tong_no_stacked.png", 
    "TỔNG NỢ NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

draw_stacked_bar(
    df_bal, 
    "VỐN CHỦ SỞ HỮU (đồng)", 
    "06_vcsh_stacked.png", 
    "VỐN CHỦ SỞ HỮU NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

# Chờ chút, một số cty cột tên là "Hàng tồn kho ròng", có cty là "Hàng tồn kho, ròng (đồng)"
col_ton_kho = "Hàng tồn kho, ròng (đồng)" if "Hàng tồn kho, ròng (đồng)" in df_bal.columns else "Hàng tồn kho ròng"
draw_stacked_bar(
    df_bal, 
    col_ton_kho, 
    "07_hang_ton_kho_stacked.png", 
    "HÀNG TỒN KHO NGÀNH ĐƯỜNG THEO QUÝ (Cộng dồn từng công ty)"
)

print("\n🎉 Hoàn thành vẽ 7 biểu đồ Stacked Bar!")
