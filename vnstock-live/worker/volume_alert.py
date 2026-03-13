"""
VNStock Volume Alert — Telegram Notification
Lọc cổ phiếu: Giá tăng >2% VÀ KL >1M VÀ KL >40% so với TB 20 phiên.
Gửi alert kèm biểu đồ TradingView-style (Candle + MA + Volume + RSI) tới Telegram.
Hoạt động độc lập — lấy giá trực tiếp từ VCI API, không cần worker.
"""

import os
import io
import time
import logging
import math
import threading
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

import httpx
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.patches import FancyBboxPatch
from matplotlib.gridspec import GridSpec

# ============================================================
# CONFIGURATION
# ============================================================
TELEGRAM_BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "8176419787:AAGVisWEzMu3-PB4hg4NTNJTMydku2BwP8A",
)
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "1899480201")

# Alert conditions
MIN_CHANGE_PCT = 2.0       # Price change >= +2%
MIN_VOL_RATIO = 1.4        # Volume >= 140% of 20-session average (= +40%)
MIN_VOLUME = 1_000_000     # Minimum absolute volume (1 million shares)
HISTORY_SESSIONS = 20      # Sessions for average volume
CHART_DAYS = 60            # Days of history to show on chart

# MA periods
MA_PERIODS = [10, 20, 50]
MA_COLORS = ["#ffeb3b", "#2196f3", "#ff5722"]  # Yellow, Blue, Orange

VN_TZ = timezone(timedelta(hours=7))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("volume-alert")


# ============================================================
# RATE LIMITER — auto-detect tier and throttle API calls
# ============================================================
class RateLimiter:
    """Thread-safe sliding-window rate limiter for vnstock API."""

    def __init__(self):
        self._lock = threading.Lock()
        self._timestamps: list[float] = []
        # Detect tier:
        #   sponsor (vnstock_data installed) → up to 600/min
        #   silver/paid API key set          → up to 180/min
        #   guest (no key)                   → 20/min
        try:
            import vnstock_data  # noqa: F401
            self.max_per_min = 150  # sponsor, leave headroom
            self.tier = "sponsor"
        except ImportError:
            if os.getenv("VNSTOCK_API_KEY"):
                self.max_per_min = 150  # silver/paid key, leave headroom
                self.tier = "silver"
            else:
                self.max_per_min = 15  # guest, leave headroom
                self.tier = "guest"
        logger.info(f"🔑 API tier detected: {self.tier} ({self.max_per_min} req/min effective)")

    def wait(self):
        """Block until it is safe to make a new request."""
        with self._lock:
            now = time.time()
            # Remove timestamps older than 60s
            self._timestamps = [t for t in self._timestamps if now - t < 60]
            if len(self._timestamps) >= self.max_per_min:
                sleep_for = 60 - (now - self._timestamps[0]) + 0.5
                if sleep_for > 0:
                    logger.info(f"⏳ Rate limit: waiting {sleep_for:.0f}s...")
                    time.sleep(sleep_for)
                    now = time.time()
                    self._timestamps = [t for t in self._timestamps if now - t < 60]
            self._timestamps.append(time.time())


rate_limiter = RateLimiter()


def api_call_with_retry(fn, *args, max_retries=3, **kwargs):
    """Wrap any vnstock API call with rate limiting + retry on failure."""
    for attempt in range(max_retries):
        rate_limiter.wait()
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            err_msg = str(e).lower()
            if "rate limit" in err_msg or "429" in err_msg or "giới hạn" in err_msg:
                wait = min(60 * (attempt + 1), 120)
                logger.warning(f"⚠️ Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait}s...")
                time.sleep(wait)
            else:
                if attempt < max_retries - 1:
                    time.sleep(2)
                else:
                    raise
    return None


# ============================================================
# TELEGRAM
# ============================================================
def telegram_send_message(chat_id: str, text: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        r = httpx.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=15)
        if not r.json().get("ok"):
            logger.error(f"sendMessage failed: {r.text[:200]}")
    except Exception as e:
        logger.error(f"sendMessage error: {e}")


def telegram_send_photo(chat_id: str, photo_bytes: bytes, caption: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    try:
        r = httpx.post(
            url,
            data={"chat_id": chat_id, "caption": caption, "parse_mode": "HTML"},
            files={"photo": ("chart.png", photo_bytes, "image/png")},
            timeout=30,
        )
        if not r.json().get("ok"):
            logger.error(f"sendPhoto failed: {r.text[:200]}")
    except Exception as e:
        logger.error(f"sendPhoto error: {e}")


# ============================================================
# TECHNICAL INDICATORS
# ============================================================
def calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


# ============================================================
# CHART GENERATION — TradingView Lightweight Style
# ============================================================
BG_COLOR = "#131722"
GRID_COLOR = "#1e222d"
TEXT_COLOR = "#d1d4dc"
UP_COLOR = "#26a69a"
DOWN_COLOR = "#ef5350"
BORDER_UP = "#26a69a"
BORDER_DOWN = "#ef5350"
VOL_UP = "rgba(38,166,154,0.5)"
VOL_DOWN = "rgba(239,83,80,0.5)"


def generate_chart(
    symbol: str,
    df: pd.DataFrame,
    today_vol: int,
    avg_vol: float,
    change_pct: float,
    price: float,
) -> bytes:
    """Generate TradingView-style chart: Candlestick + MA + Volume + RSI."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["time"] if "time" in df.columns else df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    df["close"] = df["close"].astype(float)
    df["open"] = df["open"].astype(float)
    df["high"] = df["high"].astype(float).fillna(df[["open", "close"]].max(axis=1))
    df["low"] = df["low"].astype(float).fillna(df[["open", "close"]].min(axis=1))
    df["volume"] = df["volume"].astype(float)

    # Compute indicators
    for p in MA_PERIODS:
        df[f"ma{p}"] = df["close"].rolling(p).mean()
    df["rsi"] = calc_rsi(df["close"], 14)

    n = len(df)
    x = np.arange(n)
    is_up = df["close"].values >= df["open"].values

    # ---- Figure setup ----
    fig = plt.figure(figsize=(12, 7.5), facecolor=BG_COLOR)
    gs = GridSpec(4, 1, height_ratios=[3, 1, 0.8, 0.05], hspace=0.02, figure=fig)
    ax_price = fig.add_subplot(gs[0])
    ax_vol = fig.add_subplot(gs[1], sharex=ax_price)
    ax_rsi = fig.add_subplot(gs[2], sharex=ax_price)
    ax_spacer = fig.add_subplot(gs[3])
    ax_spacer.set_visible(False)

    for ax in [ax_price, ax_vol, ax_rsi]:
        ax.set_facecolor(BG_COLOR)
        ax.tick_params(colors=TEXT_COLOR, labelsize=7, length=0)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color(GRID_COLOR)
        ax.spines["left"].set_color(GRID_COLOR)
        ax.grid(axis="both", color=GRID_COLOR, linewidth=0.5, alpha=0.5)

    # ---- Candlestick ----
    body_width = 0.6
    wick_width = 0.15

    for i in range(n):
        color = UP_COLOR if is_up[i] else DOWN_COLOR
        border = BORDER_UP if is_up[i] else BORDER_DOWN
        o, c = df["open"].iloc[i], df["close"].iloc[i]
        h, l = df["high"].iloc[i], df["low"].iloc[i]

        # Wick
        ax_price.plot([x[i], x[i]], [l, h], color=border, linewidth=wick_width * 2, solid_capstyle="round")
        # Body
        body_bottom = min(o, c)
        body_height = abs(c - o) or (h - l) * 0.01
        ax_price.bar(x[i], body_height, bottom=body_bottom, width=body_width,
                     color=color, edgecolor=border, linewidth=0.5)

    # ---- Moving Averages ----
    for p, col in zip(MA_PERIODS, MA_COLORS):
        key = f"ma{p}"
        valid = df[key].notna()
        if valid.sum() > 1:
            ax_price.plot(x[valid], df.loc[valid, key], color=col, linewidth=1, alpha=0.8, label=f"MA{p}")

    # MA legend
    ax_price.legend(
        loc="upper left", fontsize=7, frameon=True,
        facecolor=BG_COLOR, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR,
        handlelength=1, borderpad=0.3, handletextpad=0.4
    )

    # Price title
    change_color = UP_COLOR if change_pct >= 0 else DOWN_COLOR
    title_text = (
        f"{symbol}  ·  {price/1000:.1f}  ·  "
        f"{change_pct:+.1f}%  ·  "
        f"KL: {today_vol/1_000_000:.1f}M ({today_vol/avg_vol:.1f}x TB20)"
    )
    ax_price.set_title(title_text, fontsize=11, fontweight="bold", color=change_color, loc="left", pad=8)

    # Y-axis format (price in K)
    ax_price.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v/1000:.1f}"))
    ax_price.set_ylabel("Giá (nghìn)", fontsize=7, color=TEXT_COLOR, labelpad=5)

    # ---- Volume bars ----
    vol_colors = [UP_COLOR if u else DOWN_COLOR for u in is_up]
    vol_alphas = [0.7 if u else 0.7 for u in is_up]
    ax_vol.bar(x, df["volume"], width=body_width, color=vol_colors, alpha=0.6)

    # Average volume line
    if avg_vol > 0:
        ax_vol.axhline(y=avg_vol, color="#ffeb3b", linewidth=0.8, linestyle="--", alpha=0.6)
        ax_vol.text(
            n - 1, avg_vol * 1.05, f"TB20: {avg_vol/1_000_000:.1f}M",
            fontsize=6, color="#ffeb3b", alpha=0.7, ha="right", va="bottom"
        )

    ax_vol.yaxis.set_major_formatter(mticker.FuncFormatter(
        lambda v, _: f"{v/1_000_000:.0f}M" if v >= 1_000_000 else f"{v/1_000:.0f}K"
    ))
    ax_vol.set_ylabel("KL", fontsize=7, color=TEXT_COLOR, labelpad=5)

    # ---- RSI ----
    rsi_valid = df["rsi"].notna()
    if rsi_valid.sum() > 1:
        ax_rsi.plot(x[rsi_valid], df.loc[rsi_valid, "rsi"], color="#b39ddb", linewidth=1.2)
        ax_rsi.fill_between(x[rsi_valid], 30, 70, alpha=0.05, color="#b39ddb")
        ax_rsi.axhline(70, color="#ef5350", linewidth=0.5, linestyle="--", alpha=0.4)
        ax_rsi.axhline(30, color="#26a69a", linewidth=0.5, linestyle="--", alpha=0.4)
        ax_rsi.axhline(50, color=GRID_COLOR, linewidth=0.5, linestyle="-", alpha=0.3)

    ax_rsi.set_ylim(0, 100)
    ax_rsi.set_ylabel("RSI", fontsize=7, color=TEXT_COLOR, labelpad=5)
    ax_rsi.set_yticks([30, 50, 70])

    # ---- X-axis labels (dates) ----
    ax_rsi.set_xlim(-1, n + 0.5)
    tick_step = max(1, n // 8)
    tick_positions = list(range(0, n, tick_step))
    tick_labels = [df["date"].iloc[i].strftime("%d/%m") for i in tick_positions]
    ax_rsi.set_xticks(tick_positions)
    ax_rsi.set_xticklabels(tick_labels, fontsize=7, color=TEXT_COLOR)
    plt.setp(ax_price.get_xticklabels(), visible=False)
    plt.setp(ax_vol.get_xticklabels(), visible=False)

    # ---- Save ----
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor=BG_COLOR, pad_inches=0.15)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ============================================================
# MAIN SCANNER — Fetches data directly from VCI API
# ============================================================
def scan_and_alert():
    """Scan stocks directly via VCI API and send Telegram alerts."""
    logger.info("🚀 Volume Breakout Scanner starting...")

    # --- Import vnstock ---
    try:
        import vnstock
        import os # Added for os.getenv
        logger.info("✅ vnstock loaded")
    except ImportError:
        logger.error("❌ vnstock not installed")
        return

    # --- Register API key if provided (enables Silver/paid tier rate limits) ---
    api_key = os.getenv("VNSTOCK_API_KEY")
    if api_key:
        try:
            success = vnstock.change_api_key(api_key)
            if success:
                logger.info(f"🔑 API key registered successfully (Silver tier)")
            else:
                logger.warning("⚠️ API key registration returned False — check key validity")
        except Exception as e:
            logger.warning(f"⚠️ API key registration failed: {e}")
    else:
        logger.info("ℹ️ No VNSTOCK_API_KEY set — running as Guest (20 req/min)")

    # --- Get all stock symbols (Supabase first, vnstock fallback) ---
    symbols = []
    try:
        from supabase import create_client
        SUPABASE_URL = os.getenv("SUPABASE_URL", "https://utqmpdmbkubhzuccqeyf.supabase.co")
        SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Fetch ALL symbols with pagination (Supabase default limit is 1000)
        all_data = []
        page_from = 0
        while True:
            result = sb.from_("stocks").select("symbol").range(page_from, page_from + 999).execute()
            if not result.data:
                break
            all_data.extend(result.data)
            if len(result.data) < 1000:
                break
            page_from += 1000
        if all_data:
            import re
            symbols = [r["symbol"] for r in all_data if re.match(r'^[A-Z]{3}$', r["symbol"])]
            logger.info(f"📋 {len(symbols)} symbols from Supabase")
    except Exception as e:
        logger.warning(f"Supabase failed: {e}")

    # Fallback to vnstock listing
    if not symbols:
        try:
            listing = vnstock.Listing()
            all_stocks_df = listing.all_symbols()
            import re
            symbols = [s for s in all_stocks_df["symbol"].tolist() if re.match(r'^[A-Z]{3}$', s)]
            logger.info(f"📋 {len(symbols)} symbols from vnstock")
        except Exception as e:
            logger.error(f"❌ Failed to load symbols: {e}")
            return

    # --- Fetch today's price board in batches ---
    today = datetime.now(VN_TZ).strftime("%Y-%m-%d")
    start_date = (datetime.now(VN_TZ) - timedelta(days=CHART_DAYS + 30)).strftime("%Y-%m-%d")

    logger.info("📊 Fetching price board...")
    candidates = []

    # Adjust batch size based on API tier
    batch_size = 50 if rate_limiter.tier == "sponsor" else 20
    total_batches = (len(symbols) + batch_size - 1) // batch_size
    logger.info(f"📦 Processing {total_batches} batches (size={batch_size}, tier={rate_limiter.tier})")

    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i + batch_size]
        batch_num = i // batch_size + 1
        try:
            trading = vnstock.Trading(source="VCI")
            board = api_call_with_retry(trading.price_board, batch)
            if board is None or board.empty:
                continue

            # Flatten multi-level columns
            if isinstance(board.columns, pd.MultiIndex):
                board.columns = [
                    "_".join(str(c) for c in col).strip() if isinstance(col, tuple) else col
                    for col in board.columns.values
                ]

            for _, row in board.iterrows():
                try:
                    symbol = str(row.get("listing_symbol", ""))
                    if not symbol or symbol not in batch:
                        continue

                    price = float(row.get("match_match_price", 0) or 0)
                    ref = float(row.get("listing_ref_price", 0) or 0)
                    vol = int(float(row.get("match_accumulated_volume", 0) or 0))

                    if price <= 0 or ref <= 0:
                        continue

                    change_pct = ((price - ref) / ref) * 100

                    # Filter: price change >= MIN_CHANGE_PCT and volume >= MIN_VOLUME
                    if change_pct >= MIN_CHANGE_PCT and vol >= MIN_VOLUME:
                        candidates.append({
                            "symbol": symbol,
                            "price": price,
                            "ref_price": ref,
                            "change_pct": change_pct,
                            "volume": vol,
                            "name": str(row.get("listing_organ_name", "")),
                        })
                except Exception:
                    continue

        except Exception as e:
            logger.warning(f"Batch {batch_num}/{total_batches} error: {e}")
            continue

        if batch_num % 10 == 0:
            logger.info(f"   ⏱️ Progress: {batch_num}/{total_batches} batches")

    logger.info(f"🔍 {len(candidates)} stocks with change ≥ +{MIN_CHANGE_PCT}% and volume ≥ {MIN_VOLUME:,}")

    if not candidates:
        logger.info("💤 No stocks meet criteria. Done.")
        return

    # --- Check each candidate against 20-session average volume ---
    alerts = []
    for j, c in enumerate(candidates):
        symbol = c["symbol"]
        try:
            q = vnstock.Quote(source="VCI", symbol=symbol)
            hist = api_call_with_retry(q.history, start=start_date, end=today, interval="1D")
            if hist is None or len(hist) < 10:
                continue

            time_col = "time" if "time" in hist.columns else "date"
            hist = hist.sort_values(time_col, ascending=True).reset_index(drop=True)

            # Get previous sessions (exclude today)
            hist_prev = hist.iloc[:-1].tail(HISTORY_SESSIONS)
            avg_vol = hist_prev["volume"].mean()
            if avg_vol <= 0 or math.isnan(avg_vol):
                continue

            vol_ratio = c["volume"] / avg_vol

            if vol_ratio >= MIN_VOL_RATIO:
                c["avg_vol_20"] = avg_vol
                c["vol_ratio"] = vol_ratio
                c["hist_df"] = hist
                alerts.append(c)
                logger.info(
                    f"🚨 {symbol}: +{c['change_pct']:.1f}%, "
                    f"KL={c['volume']/1_000_000:.1f}M ({vol_ratio:.1f}x TB20)"
                )
        except Exception as e:
            logger.debug(f"   Skip {symbol}: {e}")

    logger.info(f"🚨 Total alerts: {len(alerts)}")

    if not alerts:
        logger.info("✅ No volume breakouts found. Done.")
        return

    alerts.sort(key=lambda x: x["vol_ratio"], reverse=True)

    # --- Send summary ---
    now_str = datetime.now(VN_TZ).strftime("%d/%m/%Y %H:%M")
    header = (
        f"🚨 <b>Volume Breakout</b> — {now_str}\n"
        f"📋 Giá ≥ +{MIN_CHANGE_PCT}% · KL ≥ {MIN_VOLUME/1_000_000:.0f}M · KL ≥ +{int((MIN_VOL_RATIO-1)*100)}% TB20\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
    )
    lines = []
    for a in alerts[:20]:
        lines.append(
            f"📈 <b>{a['symbol']}</b> "
            f"+{a['change_pct']:.1f}% · "
            f"KL: {a['volume']/1_000_000:.1f}M ({a['vol_ratio']:.1f}x)"
        )
    telegram_send_message(TELEGRAM_CHAT_ID, header + "\n".join(lines))
    logger.info("📤 Summary sent")

    # --- Send charts ---
    for a in alerts[:10]:
        try:
            chart_bytes = generate_chart(
                a["symbol"], a["hist_df"], a["volume"],
                a["avg_vol_20"], a["change_pct"], a["price"]
            )
            caption = (
                f"📈 <b>{a['symbol']}</b> — {a['name']}\n"
                f"Giá: {a['price']/1000:.1f}K ({a['change_pct']:+.1f}%)\n"
                f"KL: {a['volume']/1_000_000:.1f}M ({a['vol_ratio']:.1f}x TB20)\n"
                f"RSI(14) · MA10/20/50"
            )
            telegram_send_photo(TELEGRAM_CHAT_ID, chart_bytes, caption)
            logger.info(f"📤 Chart: {a['symbol']}")
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"Chart error {a['symbol']}: {e}")

    logger.info("✅ All alerts sent!")


# ============================================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="VNStock Volume Breakout Alert")
    parser.add_argument("--chat-id", type=str, default=TELEGRAM_CHAT_ID)
    parser.add_argument("--min-change", type=float, default=MIN_CHANGE_PCT, help="Min price change %%")
    parser.add_argument("--min-vol-ratio", type=float, default=MIN_VOL_RATIO, help="Min vol ratio vs 20d avg")
    parser.add_argument("--min-volume", type=int, default=MIN_VOLUME, help="Min absolute volume")
    args = parser.parse_args()

    TELEGRAM_CHAT_ID = args.chat_id
    MIN_CHANGE_PCT = args.min_change
    MIN_VOL_RATIO = args.min_vol_ratio
    MIN_VOLUME = args.min_volume

    scan_and_alert()
