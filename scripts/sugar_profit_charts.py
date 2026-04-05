"""
Script vẽ biểu đồ lợi nhuận nhóm đường (Sugar sector)
- Chart 1: LNST theo quý (stacked bar / grouped line)
- Chart 2: LNST theo năm (bar chart)
- Chart 3: Lãi gộp theo quý
- Chart 4: Tỷ suất lợi nhuận so sánh
"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import warnings
warnings.filterwarnings("ignore")

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
EXCEL_FILE  = "sugar_group_financials.xlsx"
OUTPUT_DIR  = "sugar_charts"
UNIT        = 1e9   # tỷ đồng

# Màu sắc đẹp cho từng cổ phiếu
COLORS = {
    "SBT": "#4FC3F7",
    "QNS": "#AED581",
    "LSS": "#FFB74D",
    "SLS": "#F06292",
    "KTS": "#BA68C8",
    "NHS": "#FF8A65",
    "SEC": "#4DB6AC",
    "FBT": "#90A4AE",
}

import os
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── ĐỌC DỮ LIỆU ─────────────────────────────────────────────────────────────
df_raw = pd.read_excel(EXCEL_FILE, sheet_name="KQ Kinh Doanh")

COL_LNST   = "Lợi nhuận sau thuế của Cổ đông công ty mẹ (đồng)"
COL_LN_PRE = "LN trước thuế"
COL_GROSS  = "Lãi gộp"
COL_REV    = "Doanh thu thuần"
COL_YEAR   = "Năm"
COL_QTR    = "Kỳ"
COL_SYM    = "symbol"

# Chuyển đơn vị → tỷ đồng
for col in [COL_LNST, COL_LN_PRE, COL_GROSS, COL_REV]:
    df_raw[col] = pd.to_numeric(df_raw[col], errors="coerce") / UNIT

# Tạo nhãn thời gian
df_raw["quarter_label"] = df_raw[COL_YEAR].astype(str) + "-Q" + df_raw[COL_QTR].astype(str)

SYMBOLS = list(df_raw[COL_SYM].unique())
MAIN_SYMS = ["SBT", "QNS", "LSS", "SLS", "KTS"]   # công ty có đủ dữ liệu lớn

# ─── STYLE ───────────────────────────────────────────────────────────────────
plt.style.use("dark_background")
FONT_TITLE = dict(fontsize=15, fontweight="bold", color="white", pad=12)
FONT_AXIS  = dict(fontsize=10, color="#cccccc")
GRID_KW    = dict(color="#333333", linewidth=0.5, alpha=0.7)

def fmt_bil(x, pos):
    if abs(x) >= 1000:
        return f"{x/1000:.1f}N"
    return f"{x:.0f}B"

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 1: LNST THEO QUÝ – LINE CHART (big 5)
# ═══════════════════════════════════════════════════════════════════════════════
def chart_quarterly_line():
    fig, axes = plt.subplots(len(MAIN_SYMS), 1, figsize=(16, 14),
                              facecolor="#0d0d1a", sharex=False)
    fig.suptitle("LỢI NHUẬN SAU THUẾ CỔ ĐÔNG MẸ – THEO QUÝ\n(Đơn vị: Tỷ đồng)",
                 fontsize=16, fontweight="bold", color="white", y=0.98)

    for i, sym in enumerate(MAIN_SYMS):
        ax = axes[i]
        ax.set_facecolor("#0d0d1a")
        df_s = (df_raw[df_raw[COL_SYM] == sym]
                .sort_values([COL_YEAR, COL_QTR])
                .copy())

        if df_s.empty:
            ax.axis("off")
            continue

        x_labels = df_s["quarter_label"].tolist()
        y_vals   = df_s[COL_LNST].tolist()
        color    = COLORS.get(sym, "#aaaaaa")

        ax.fill_between(range(len(x_labels)), y_vals, 0,
                        alpha=0.25, color=color)
        ax.plot(range(len(x_labels)), y_vals,
                color=color, linewidth=1.8, marker="o", markersize=3, label=sym)
        ax.axhline(0, color="#555555", linewidth=0.8, linestyle="--")

        # Đánh dấu peak
        if y_vals:
            peak_idx  = np.nanargmax(y_vals)
            trough_idx = np.nanargmin(y_vals)
            ax.annotate(f"{y_vals[peak_idx]:.0f}B",
                        xy=(peak_idx, y_vals[peak_idx]),
                        xytext=(peak_idx, y_vals[peak_idx] + abs(y_vals[peak_idx]) * 0.15),
                        color="#80ff80", fontsize=7.5, ha="center",
                        arrowprops=dict(arrowstyle="->", color="#80ff80", lw=0.8))

        ax.set_ylabel(sym, **FONT_AXIS)
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt_bil))
        ax.grid(True, axis="y", **GRID_KW)
        ax.grid(True, axis="x", **GRID_KW)

        # Chỉ hiện nhãn x mỗi 4 quý
        tick_pos   = list(range(0, len(x_labels), 4))
        tick_label = [x_labels[j] for j in tick_pos]
        ax.set_xticks(tick_pos)
        ax.set_xticklabels(tick_label, fontsize=7, rotation=45,
                           ha="right", color="#aaaaaa")
        for spine in ax.spines.values():
            spine.set_edgecolor("#333333")

    plt.tight_layout(rect=[0, 0, 1, 0.97])
    out = f"{OUTPUT_DIR}/01_lnst_quarterly_line.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ {out}")

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 2: LNST THEO NĂM – GROUPED BAR
# ═══════════════════════════════════════════════════════════════════════════════
def chart_annual_bar():
    df_yr = (df_raw.groupby([COL_SYM, COL_YEAR])[COL_LNST]
             .sum().reset_index())
    years = sorted(df_yr[COL_YEAR].unique())

    # Chỉ lấy 10 năm gần nhất
    years = years[-10:] if len(years) > 10 else years
    df_yr = df_yr[df_yr[COL_YEAR].isin(years)]

    syms = [s for s in SYMBOLS if s in df_yr[COL_SYM].unique()]
    n_syms = len(syms)
    n_years = len(years)

    fig, ax = plt.subplots(figsize=(18, 7), facecolor="#0d0d1a")
    ax.set_facecolor("#0d0d1a")

    bar_w = 0.8 / n_syms
    x = np.arange(n_years)

    for j, sym in enumerate(syms):
        df_s = df_yr[df_yr[COL_SYM] == sym].set_index(COL_YEAR)
        vals = [df_s.loc[y, COL_LNST] if y in df_s.index else np.nan for y in years]
        offset = (j - n_syms / 2 + 0.5) * bar_w
        bars = ax.bar(x + offset, vals, width=bar_w * 0.92,
                      color=COLORS.get(sym, "#aaaaaa"),
                      label=sym, alpha=0.9, zorder=3)

        # Label giá trị trên thanh cao nhất của mỗi cty
        for bi, (bar, v) in enumerate(zip(bars, vals)):
            if not np.isnan(v) and abs(v) > 0:
                ax.text(bar.get_x() + bar.get_width()/2,
                        bar.get_height() + (2 if v >= 0 else -25),
                        f"{v:.0f}", ha="center", va="bottom",
                        fontsize=6.5, color=COLORS.get(sym, "white"),
                        rotation=90)

    ax.axhline(0, color="#777777", linewidth=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels([str(y) for y in years], fontsize=10, color="#cccccc")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt_bil))
    ax.set_title("LỢI NHUẬN SAU THUẾ CỔ ĐÔNG MẸ – THEO NĂM\n(Đơn vị: Tỷ đồng)",
                 **FONT_TITLE)
    ax.set_xlabel("Năm", **FONT_AXIS)
    ax.set_ylabel("Tỷ đồng", **FONT_AXIS)
    ax.legend(fontsize=9, loc="upper left",
              facecolor="#1a1a2e", edgecolor="#555555", labelcolor="white")
    ax.grid(True, axis="y", **GRID_KW)
    for spine in ax.spines.values():
        spine.set_edgecolor("#333333")

    plt.tight_layout()
    out = f"{OUTPUT_DIR}/02_lnst_annual_bar.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ {out}")

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 3: LÃI GỘP THEO QUÝ – STACKED AREA (big 5, 20 quý gần nhất)
# ═══════════════════════════════════════════════════════════════════════════════
def chart_gross_profit_quarterly():
    # Pivot: gộp 5 cty lớn, 20 quý gần nhất
    df_pv = (df_raw[df_raw[COL_SYM].isin(MAIN_SYMS)]
             .sort_values([COL_YEAR, COL_QTR])
             .drop_duplicates([COL_SYM, COL_YEAR, COL_QTR]))

    pivot = df_pv.pivot_table(index=["Năm", "Kỳ"], columns=COL_SYM,
                               values=COL_GROSS, aggfunc="sum").reset_index()
    pivot["label"] = pivot["Năm"].astype(str) + "-Q" + pivot["Kỳ"].astype(str)
    pivot = pivot.tail(20)

    fig, ax = plt.subplots(figsize=(16, 7), facecolor="#0d0d1a")
    ax.set_facecolor("#0d0d1a")

    x      = np.arange(len(pivot))
    labels = pivot["label"].tolist()
    bottom_pos = np.zeros(len(pivot))
    bottom_neg = np.zeros(len(pivot))

    for sym in MAIN_SYMS:
        if sym not in pivot.columns:
            continue
        vals = pivot[sym].fillna(0).values
        pos_vals = np.where(vals >= 0, vals, 0)
        neg_vals = np.where(vals < 0, vals, 0)

        ax.bar(x, pos_vals, bottom=bottom_pos,
               color=COLORS.get(sym, "#aaa"), label=sym, alpha=0.85)
        ax.bar(x, neg_vals, bottom=bottom_neg,
               color=COLORS.get(sym, "#aaa"), alpha=0.85)
        bottom_pos += pos_vals
        bottom_neg += neg_vals

    ax.axhline(0, color="#777777", linewidth=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=8, rotation=45, ha="right", color="#aaaaaa")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt_bil))
    ax.set_title("LÃI GỘP THEO QUÝ – 20 QUÝ GẦN NHẤT\n(Stacked | Tỷ đồng)",
                 **FONT_TITLE)
    ax.set_ylabel("Tỷ đồng", **FONT_AXIS)
    ax.legend(fontsize=9, loc="upper left",
              facecolor="#1a1a2e", edgecolor="#555555", labelcolor="white")
    ax.grid(True, axis="y", **GRID_KW)
    for spine in ax.spines.values():
        spine.set_edgecolor("#333333")

    plt.tight_layout()
    out = f"{OUTPUT_DIR}/03_gross_profit_quarterly_stacked.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ {out}")

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 4: TỶ SUẤT LN GỘP & LNST – HEATMAP MỖI CÔNG TY
# ═══════════════════════════════════════════════════════════════════════════════
def chart_margin_heatmap():
    df_raw2 = df_raw.copy()
    df_raw2["gross_margin"] = df_raw2[COL_GROSS] / df_raw2[COL_REV] * 100
    df_raw2["net_margin"]   = df_raw2[COL_LNST]  / df_raw2[COL_REV] * 100

    fig, axes = plt.subplots(2, 1, figsize=(18, 10), facecolor="#0d0d1a")
    fig.suptitle("TỶ SUẤT LÃI GỘP & LỢI NHUẬN SAU THUẾ THEO QUÝ\n(Heatmap – %)",
                 fontsize=15, fontweight="bold", color="white", y=0.99)

    for ax_idx, (metric, title, cmap) in enumerate([
        ("gross_margin", "Tỷ suất lãi gộp (%)", "YlGn"),
        ("net_margin",   "Tỷ suất LNST (%)",    "RdYlGn"),
    ]):
        ax = axes[ax_idx]
        ax.set_facecolor("#0d0d1a")

        pivot_hm = (df_raw2.sort_values([COL_YEAR, COL_QTR])
                    .drop_duplicates([COL_SYM, COL_YEAR, COL_QTR])
                    .pivot_table(index=COL_SYM,
                                 columns="quarter_label",
                                 values=metric, aggfunc="mean"))

        # Giới hạn 20 quý gần nhất
        recent_cols = pivot_hm.columns.tolist()
        recent_cols.sort()
        recent_cols = recent_cols[-20:]
        pivot_hm = pivot_hm[recent_cols]

        # Vẽ heatmap thủ công
        data = pivot_hm.values
        im = ax.imshow(data, aspect="auto", cmap=cmap,
                       vmin=np.nanpercentile(data, 5),
                       vmax=np.nanpercentile(data, 95))

        ax.set_xticks(range(len(recent_cols)))
        ax.set_xticklabels(recent_cols, fontsize=8, rotation=45,
                           ha="right", color="#cccccc")
        ax.set_yticks(range(len(pivot_hm.index)))
        ax.set_yticklabels(pivot_hm.index, fontsize=10, color="white")
        ax.set_title(title, fontsize=12, color="white", pad=6)

        # Ghi % lên ô
        for ri in range(data.shape[0]):
            for ci in range(data.shape[1]):
                v = data[ri, ci]
                if not np.isnan(v):
                    ax.text(ci, ri, f"{v:.1f}", ha="center", va="center",
                            fontsize=7, color="black" if v > 5 else "white")

        plt.colorbar(im, ax=ax, fraction=0.02, pad=0.01)

    plt.tight_layout(rect=[0, 0, 1, 0.97])
    out = f"{OUTPUT_DIR}/04_margin_heatmap.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ {out}")

# ═══════════════════════════════════════════════════════════════════════════════
# CHART 5: TỔNG QUAN SO SÁNH LNST THEO NĂM – LINE CHART
# ═══════════════════════════════════════════════════════════════════════════════
def chart_annual_comparison_line():
    df_yr = (df_raw.groupby([COL_SYM, COL_YEAR])[COL_LNST]
             .sum().reset_index())
    years = sorted(df_yr[COL_YEAR].unique())
    years = years[-10:] if len(years) > 10 else years
    df_yr = df_yr[df_yr[COL_YEAR].isin(years)]

    syms = [s for s in SYMBOLS if s in df_yr[COL_SYM].unique()]

    fig, ax = plt.subplots(figsize=(14, 6), facecolor="#0d0d1a")
    ax.set_facecolor("#0d0d1a")

    for sym in syms:
        df_s = (df_yr[df_yr[COL_SYM] == sym]
                .sort_values(COL_YEAR)
                .set_index(COL_YEAR))
        vals = [df_s.loc[y, COL_LNST] if y in df_s.index else np.nan for y in years]
        ax.plot(years, vals,
                color=COLORS.get(sym, "#aaaaaa"),
                linewidth=2.2, marker="o", markersize=5, label=sym)
        # Nhãn giá trị cuối
        for yi, vi in zip(years, vals):
            if not np.isnan(vi):
                pass
        last_y = years[-1]
        last_v_ser = df_s[COL_LNST] if last_y in df_s.index else None
        if last_v_ser is not None and last_y in df_s.index:
            lv = df_s.loc[last_y, COL_LNST]
            ax.annotate(f"{sym}\n{lv:.0f}B",
                        xy=(last_y, lv),
                        xytext=(last_y + 0.2, lv),
                        fontsize=7.5, color=COLORS.get(sym, "white"),
                        va="center")

    ax.axhline(0, color="#555555", linewidth=0.8, linestyle="--")
    ax.set_xticks(years)
    ax.set_xticklabels([str(y) for y in years], fontsize=10, color="#cccccc")
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt_bil))
    ax.set_title("SO SÁNH LỢI NHUẬN SAU THUẾ THEO NĂM – NHÓM ĐƯỜNG",
                 **FONT_TITLE)
    ax.set_ylabel("Tỷ đồng", **FONT_AXIS)
    ax.legend(fontsize=9, loc="upper left",
              facecolor="#1a1a2e", edgecolor="#555555", labelcolor="white")
    ax.grid(True, **GRID_KW)
    for spine in ax.spines.values():
        spine.set_edgecolor("#333333")

    plt.tight_layout()
    out = f"{OUTPUT_DIR}/05_lnst_annual_line.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="#0d0d1a")
    plt.close()
    print(f"✅ {out}")

# ─── CHẠY TẤT CẢ ─────────────────────────────────────────────────────────────
print("🎨 Bắt đầu vẽ biểu đồ nhóm đường...\n")
chart_quarterly_line()
chart_annual_bar()
chart_gross_profit_quarterly()
chart_margin_heatmap()
chart_annual_comparison_line()
print(f"\n🎉 Đã lưu 5 biểu đồ vào thư mục: {OUTPUT_DIR}/")
