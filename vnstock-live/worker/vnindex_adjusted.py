"""
Adjusted VN-Index — Loại bỏ ảnh hưởng của nhóm cổ phiếu chỉ định (mặc định: VIC, VPL, VHM, VRE)

Phương pháp:
- Lấy lịch sử VN-Index và lịch sử giá/KL cổ phiếu cần loại bỏ
- Tính vốn hóa hàng ngày của từng mã = giá đóng cửa × số CP niêm yết
- Xấp xỉ tổng vốn hóa HOSE dựa trên VN-Index baseline + total market cap tham chiếu
- Tính daily return điều chỉnh = (VNI return - weighted return of excluded stocks)
- Tái tạo chỉ số điều chỉnh từ daily returns
"""

import os
import sys
import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("adj-vnindex")

VN_TZ = timezone(timedelta(hours=7))

# --- Config ---
EXCLUDE_SYMBOLS = ["VIC", "VHM", "VRE", "VPL"]
START_DATE = "2024-01-01"
END_DATE = datetime.now(VN_TZ).strftime("%Y-%m-%d")

# Chart styling (TradingView dark theme)
BG_COLOR = "#131722"
GRID_COLOR = "#1e222d"
TEXT_COLOR = "#d1d4dc"
VNI_COLOR = "#2962ff"      # Blue for original VN-Index
ADJ_COLOR = "#26a69a"      # Green for adjusted


def fetch_data():
    """Fetch VN-Index + excluded stocks history."""
    import vnstock

    logger.info("📊 Fetching VN-Index history...")
    vni = vnstock.Quote(source="VCI", symbol="VNINDEX").history(
        start=START_DATE, end=END_DATE, interval="1D"
    )
    time_col = "time" if "time" in vni.columns else "date"
    vni = vni.rename(columns={time_col: "date"})
    vni["date"] = pd.to_datetime(vni["date"])
    vni = vni.sort_values("date").reset_index(drop=True)
    logger.info(f"   VN-Index: {len(vni)} sessions")

    # Fetch each excluded stock
    stock_data = {}
    for sym in EXCLUDE_SYMBOLS:
        logger.info(f"   Fetching {sym}...")
        try:
            q = vnstock.Quote(source="VCI", symbol=sym)
            hist = q.history(start=START_DATE, end=END_DATE, interval="1D")
            tc = "time" if "time" in hist.columns else "date"
            hist = hist.rename(columns={tc: "date"})
            hist["date"] = pd.to_datetime(hist["date"])
            hist = hist.sort_values("date").reset_index(drop=True)
            stock_data[sym] = hist
            logger.info(f"   {sym}: {len(hist)} sessions")
        except Exception as e:
            logger.warning(f"   ⚠️ Failed {sym}: {e}")

    # Get current listed shares (approximation — used across all periods)
    logger.info("   Fetching listed shares...")
    trading = vnstock.Trading(source="VCI")
    board = trading.price_board(EXCLUDE_SYMBOLS)
    if isinstance(board.columns, pd.MultiIndex):
        board.columns = ["_".join(str(c) for c in col).strip() for col in board.columns.values]

    listed_shares = {}
    for _, row in board.iterrows():
        sym = str(row.get("listing_symbol", ""))
        shares = float(row.get("listing_listed_share", 0) or 0)
        if sym and shares > 0:
            listed_shares[sym] = shares
    logger.info(f"   Listed shares: {listed_shares}")

    return vni, stock_data, listed_shares


def calculate_adjusted_index(vni, stock_data, listed_shares):
    """
    Calculate adjusted VN-Index by removing the contribution of excluded stocks.

    Method:
    - For each day, estimate the market cap weight of excluded stocks
    - Decompose VN-Index daily return into: excluded contribution + rest
    - Rebuild index from 'rest' returns only
    """
    df = vni[["date", "close"]].copy()
    df = df.rename(columns={"close": "vni_close"})

    # Merge excluded stock prices
    for sym in EXCLUDE_SYMBOLS:
        if sym in stock_data:
            sdf = stock_data[sym][["date", "close"]].rename(columns={"close": f"{sym}_close"})
            df = df.merge(sdf, on="date", how="left")

    df = df.sort_values("date").reset_index(drop=True)

    # Forward-fill missing stock prices (holidays, etc.)
    for sym in EXCLUDE_SYMBOLS:
        col = f"{sym}_close"
        if col in df.columns:
            df[col] = df[col].ffill()

    # Calculate daily returns
    df["vni_ret"] = df["vni_close"].pct_change()

    # Estimate total HOSE market cap (rough baseline)
    # VN-Index ≈ total_mcap / divisor. We use a reference point to estimate.
    # As of early 2024, HOSE total mcap ≈ 4,800 trillion VND when VNI ≈ 1,200
    # Scale factor: total_mcap ≈ VNI_close * 4e9 (very rough)
    MCAP_SCALE = 4e9  # VND per VNI point (rough estimate)

    # Calculate excluded stocks' combined market cap
    for sym in EXCLUDE_SYMBOLS:
        col = f"{sym}_close"
        if col in df.columns and sym in listed_shares:
            df[f"{sym}_mcap"] = df[col] * listed_shares[sym]
            df[f"{sym}_ret"] = df[col].pct_change()

    # Calculate excluded stocks' weight and their weighted return each day
    df["excluded_mcap"] = 0
    df["excluded_weighted_ret"] = 0

    for sym in EXCLUDE_SYMBOLS:
        mcap_col = f"{sym}_mcap"
        ret_col = f"{sym}_ret"
        if mcap_col in df.columns and ret_col in df.columns:
            df["excluded_mcap"] += df[mcap_col].fillna(0)

    # Total market cap estimate
    df["total_mcap"] = df["vni_close"] * MCAP_SCALE

    # Weight of excluded stocks
    df["excluded_weight"] = df["excluded_mcap"] / df["total_mcap"]
    df["excluded_weight"] = df["excluded_weight"].clip(0, 0.5)  # safety cap

    # Weighted return of excluded stocks
    for sym in EXCLUDE_SYMBOLS:
        mcap_col = f"{sym}_mcap"
        ret_col = f"{sym}_ret"
        if mcap_col in df.columns and ret_col in df.columns:
            sym_weight = df[mcap_col].fillna(0) / df["total_mcap"]
            df["excluded_weighted_ret"] += sym_weight * df[ret_col].fillna(0)

    # Adjusted return = (VNI_return - excluded_weighted_return) / (1 - excluded_weight)
    df["adj_ret"] = (df["vni_ret"] - df["excluded_weighted_ret"]) / (1 - df["excluded_weight"])

    # Rebuild adjusted index from the first day
    df["adj_close"] = np.nan
    first_valid = df["vni_close"].first_valid_index()
    if first_valid is not None:
        df.loc[first_valid, "adj_close"] = df.loc[first_valid, "vni_close"]
        for i in range(first_valid + 1, len(df)):
            ret = df.loc[i, "adj_ret"]
            if pd.notna(ret) and pd.notna(df.loc[i - 1, "adj_close"]):
                df.loc[i, "adj_close"] = df.loc[i - 1, "adj_close"] * (1 + ret)
            else:
                df.loc[i, "adj_close"] = df.loc[i - 1, "adj_close"]

    logger.info(f"✅ Adjusted index calculated. Avg excluded weight: {df['excluded_weight'].mean():.2%}")
    logger.info(f"   Excluded symbols contribution range: {df['excluded_weight'].min():.2%} - {df['excluded_weight'].max():.2%}")

    return df


def generate_chart(df):
    """Generate comparison chart: Original vs Adjusted VN-Index."""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 9), facecolor=BG_COLOR,
                                     gridspec_kw={"height_ratios": [3, 1], "hspace": 0.08})

    for ax in [ax1, ax2]:
        ax.set_facecolor(BG_COLOR)
        ax.tick_params(colors=TEXT_COLOR, labelsize=8)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color(GRID_COLOR)
        ax.spines["left"].set_color(GRID_COLOR)
        ax.grid(axis="both", color=GRID_COLOR, linewidth=0.5, alpha=0.5)

    valid = df.dropna(subset=["vni_close", "adj_close"])

    # --- Top: Price comparison ---
    ax1.plot(valid["date"], valid["vni_close"], color=VNI_COLOR, linewidth=1.5,
             label=f"VN-Index (gốc)", alpha=0.9)
    ax1.plot(valid["date"], valid["adj_close"], color=ADJ_COLOR, linewidth=1.5,
             label=f"VN-Index (loại {', '.join(EXCLUDE_SYMBOLS)})", alpha=0.9)

    # Fill area between
    ax1.fill_between(valid["date"], valid["vni_close"], valid["adj_close"],
                     where=valid["vni_close"] >= valid["adj_close"],
                     alpha=0.15, color=VNI_COLOR, interpolate=True)
    ax1.fill_between(valid["date"], valid["vni_close"], valid["adj_close"],
                     where=valid["vni_close"] < valid["adj_close"],
                     alpha=0.15, color=ADJ_COLOR, interpolate=True)

    # Stats annotation
    last = valid.iloc[-1]
    diff = last["vni_close"] - last["adj_close"]
    diff_pct = diff / last["vni_close"] * 100

    ax1.set_title(
        f"VN-Index vs VN-Index Điều Chỉnh (loại bỏ {', '.join(EXCLUDE_SYMBOLS)})",
        fontsize=13, fontweight="bold", color=TEXT_COLOR, loc="left", pad=10
    )

    # Add current values
    stats_text = (
        f"VN-Index: {last['vni_close']:.1f}  ·  "
        f"Adj: {last['adj_close']:.1f}  ·  "
        f"Chênh lệch: {diff:+.1f} ({diff_pct:+.1f}%)"
    )
    ax1.text(0.01, 0.95, stats_text, transform=ax1.transAxes,
             fontsize=9, color=TEXT_COLOR, alpha=0.8, va="top",
             bbox=dict(boxstyle="round,pad=0.3", facecolor=BG_COLOR, edgecolor=GRID_COLOR, alpha=0.8))

    ax1.legend(loc="upper left", fontsize=9, frameon=True,
               facecolor=BG_COLOR, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v:,.0f}"))
    ax1.set_ylabel("Điểm", fontsize=9, color=TEXT_COLOR)

    # --- Bottom: Excluded weight over time ---
    ax2.fill_between(valid["date"], valid["excluded_weight"] * 100,
                     alpha=0.4, color="#ff9800")
    ax2.plot(valid["date"], valid["excluded_weight"] * 100,
             color="#ff9800", linewidth=1, alpha=0.8)
    ax2.set_ylabel("Tỷ trọng loại bỏ (%)", fontsize=8, color=TEXT_COLOR)
    ax2.set_ylim(0, max(valid["excluded_weight"].max() * 100 * 1.3, 5))
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v:.1f}%"))

    # X-axis formatting
    ax2.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%m/%Y"))
    plt.setp(ax1.get_xticklabels(), visible=False)

    # Save
    output_path = os.path.join(os.path.dirname(__file__), "vnindex_adjusted.png")
    fig.savefig(output_path, dpi=150, bbox_inches="tight", facecolor=BG_COLOR, pad_inches=0.15)
    plt.close(fig)
    logger.info(f"📊 Chart saved: {output_path}")
    return output_path


def main():
    logger.info("🚀 Building Adjusted VN-Index...")
    vni, stock_data, listed_shares = fetch_data()
    df = calculate_adjusted_index(vni, stock_data, listed_shares)
    chart_path = generate_chart(df)

    # Save data to Excel
    excel_path = os.path.join(os.path.dirname(__file__), "vnindex_adjusted.xlsx")
    export = df[["date", "vni_close", "adj_close", "excluded_weight"]].copy()
    export.columns = ["Ngày", "VN-Index", "VN-Index Điều Chỉnh", "Tỷ trọng loại bỏ"]
    export.to_excel(excel_path, index=False)
    logger.info(f"📁 Data saved: {excel_path}")

    # Print summary
    last = df.dropna(subset=["adj_close"]).iloc[-1]
    print(f"\n{'='*50}")
    print(f"VN-Index (gốc):        {last['vni_close']:>10,.1f}")
    print(f"VN-Index (điều chỉnh): {last['adj_close']:>10,.1f}")
    print(f"Chênh lệch:            {last['vni_close'] - last['adj_close']:>+10,.1f} ({(last['vni_close'] - last['adj_close'])/last['vni_close']*100:+.1f}%)")
    print(f"Tỷ trọng loại bỏ TB:   {df['excluded_weight'].mean()*100:>9.1f}%")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
