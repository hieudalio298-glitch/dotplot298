"""
VNStock Interactive Telegram Bot
Bot tương tác — gõ lệnh trên Telegram để lọc cổ phiếu realtime.

Lệnh:
  /scan              — Lọc breakout (mặc định: giá ≥+2%, KL ≥1M, KL ≥+40% TB20)
  /scan 3 50 2       — Tùy chỉnh: giá ≥+3%, KL vượt 50%, KL tối thiểu 2M
  /sideway           — Lọc cổ phiếu đang sideway (nén giá, Bollinger hẹp)
  /sideway 8 500     — Tùy chỉnh: biên độ ≤8%, KL min 500K
  /price VCB         — Xem giá + biểu đồ 1 mã
  /top               — Top 10 tăng giá mạnh nhất
  /bot               — Top 10 giảm giá mạnh nhất
  /help              — Xem hướng dẫn
"""

import os
import io
import re
import time
import math
import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.gridspec import GridSpec

from telegram import Update
from telegram.ext import (
    ApplicationBuilder, CommandHandler, ContextTypes, filters
)

# ============================================================
# CONFIG
# ============================================================
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "8176419787:AAGVisWEzMu3-PB4hg4NTNJTMydku2BwP8A",
)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://utqmpdmbkubhzuccqeyf.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")

VN_TZ = timezone(timedelta(hours=7))
MA_PERIODS = [10, 20, 50]
MA_COLORS = ["#ffeb3b", "#2196f3", "#ff5722"]

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("tg-bot")


# ============================================================
# HELPERS
# ============================================================
def get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_all_symbols(sb):
    all_data = []
    page = 0
    while True:
        r = sb.from_("stocks").select("symbol").range(page, page + 999).execute()
        if not r.data:
            break
        all_data.extend(r.data)
        if len(r.data) < 1000:
            break
        page += 1000
    return [d["symbol"] for d in all_data if re.match(r'^[A-Z]{3}$', d["symbol"])]


def get_vnstock():
    import vnstock
    return vnstock


def calc_rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


# ============================================================
# CHART
# ============================================================
BG = "#131722"
GRID = "#1e222d"
TXT = "#d1d4dc"
UP = "#26a69a"
DN = "#ef5350"


def generate_chart(symbol, df, today_vol=None, avg_vol=None, change_pct=None, price=None):
    df = df.copy()
    df["date"] = pd.to_datetime(df["time"] if "time" in df.columns else df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    for c in ["close","open","high","low","volume"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df["high"] = df["high"].fillna(df[["open","close"]].max(axis=1))
    df["low"] = df["low"].fillna(df[["open","close"]].min(axis=1))
    for p in MA_PERIODS:
        df[f"ma{p}"] = df["close"].rolling(p).mean()
    df["rsi"] = calc_rsi(df["close"], 14)

    n = len(df)
    x = np.arange(n)
    is_up = df["close"].values >= df["open"].values

    fig = plt.figure(figsize=(12, 7.5), facecolor=BG)
    gs = GridSpec(3, 1, height_ratios=[3, 1, 0.8], hspace=0.02, figure=fig)
    ax1, ax2, ax3 = fig.add_subplot(gs[0]), fig.add_subplot(gs[1], sharex=fig.add_subplot(gs[0])), fig.add_subplot(gs[2])
    # Redo properly
    plt.close(fig)
    fig = plt.figure(figsize=(12, 7.5), facecolor=BG)
    gs = GridSpec(3, 1, height_ratios=[3, 1, 0.8], hspace=0.02, figure=fig)
    ax1 = fig.add_subplot(gs[0])
    ax2 = fig.add_subplot(gs[1], sharex=ax1)
    ax3 = fig.add_subplot(gs[2], sharex=ax1)

    for ax in [ax1, ax2, ax3]:
        ax.set_facecolor(BG)
        ax.tick_params(colors=TXT, labelsize=7, length=0)
        for s in ["top","right"]:
            ax.spines[s].set_visible(False)
        for s in ["bottom","left"]:
            ax.spines[s].set_color(GRID)
        ax.grid(axis="both", color=GRID, linewidth=0.5, alpha=0.5)

    # Candlestick
    for i in range(n):
        clr = UP if is_up[i] else DN
        o, c = df["open"].iloc[i], df["close"].iloc[i]
        h, l = df["high"].iloc[i], df["low"].iloc[i]
        ax1.plot([x[i], x[i]], [l, h], color=clr, linewidth=0.3)
        ax1.bar(x[i], abs(c-o) or (h-l)*0.01, bottom=min(o,c), width=0.6, color=clr, edgecolor=clr, linewidth=0.5)

    # MA
    for p, col in zip(MA_PERIODS, MA_COLORS):
        v = df[f"ma{p}"].notna()
        if v.sum() > 1:
            ax1.plot(x[v], df.loc[v, f"ma{p}"], color=col, linewidth=1, alpha=0.8, label=f"MA{p}")
    ax1.legend(loc="upper left", fontsize=7, frameon=True, facecolor=BG, edgecolor=GRID, labelcolor=TXT)

    # Title
    title_parts = [symbol]
    if price: title_parts.append(f"{price/1000:.1f}K")
    if change_pct is not None: title_parts.append(f"{change_pct:+.1f}%")
    if today_vol and avg_vol and avg_vol > 0:
        title_parts.append(f"KL: {today_vol/1e6:.1f}M ({today_vol/avg_vol:.1f}x TB20)")
    ax1.set_title("  ·  ".join(title_parts), fontsize=11, fontweight="bold",
                   color=UP if (change_pct or 0) >= 0 else DN, loc="left", pad=8)
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v/1000:.1f}"))

    # Volume
    ax2.bar(x, df["volume"], width=0.6, color=[UP if u else DN for u in is_up], alpha=0.6)
    if avg_vol and avg_vol > 0:
        ax2.axhline(y=avg_vol, color="#ffeb3b", linewidth=0.8, linestyle="--", alpha=0.6)
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f"{v/1e6:.0f}M" if v >= 1e6 else f"{v/1e3:.0f}K"))

    # RSI
    rv = df["rsi"].notna()
    if rv.sum() > 1:
        ax3.plot(x[rv], df.loc[rv, "rsi"], color="#b39ddb", linewidth=1.2)
        ax3.axhline(70, color=DN, linewidth=0.5, linestyle="--", alpha=0.4)
        ax3.axhline(30, color=UP, linewidth=0.5, linestyle="--", alpha=0.4)
    ax3.set_ylim(0, 100)
    ax3.set_yticks([30, 50, 70])

    # X labels
    step = max(1, n // 8)
    ticks = list(range(0, n, step))
    ax3.set_xticks(ticks)
    ax3.set_xticklabels([df["date"].iloc[i].strftime("%d/%m") for i in ticks], fontsize=7, color=TXT)
    plt.setp(ax1.get_xticklabels(), visible=False)
    plt.setp(ax2.get_xticklabels(), visible=False)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight", facecolor=BG, pad_inches=0.15)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ============================================================
# BOT COMMANDS
# ============================================================
async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = (
        "📊 <b>VNStock Bot — Lệnh</b>\n\n"
        "<b>🔍 Lọc cổ phiếu:</b>\n"
        "/scan — Lọc breakout (giá ≥+2%, KL ≥1M, KL ≥+40% TB20)\n"
        "/scan <i>giá% vol% klMin(M)</i> — Tùy chỉnh\n"
        "   VD: <code>/scan 3 50 2</code>\n"
        "/sideway — Lọc cổ phiếu đang sideway nén giá\n"
        "/sideway <i>biên_độ% klMin(K)</i> — Tùy chỉnh\n"
        "   VD: <code>/sideway 8 500</code>\n\n"
        "<b>📊 Xem dữ liệu:</b>\n"
        "/price <i>MÃ</i> — Biểu đồ 1 mã (VD: <code>/price VCB</code>)\n"
        "/top — Top 10 tăng giá\n"
        "/bot — Top 10 giảm giá\n\n"
        "/help — Xem hướng dẫn này"
    )
    await update.effective_message.reply_text(text, parse_mode="HTML")


async def cmd_scan(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Scan volume breakout with customizable params."""
    # Parse args: /scan [min_change] [min_vol_pct] [min_vol_M]
    args = ctx.args or []
    min_change = float(args[0]) if len(args) > 0 else 2.0
    min_vol_pct = float(args[1]) if len(args) > 1 else 40.0
    min_vol_m = float(args[2]) if len(args) > 2 else 1.0
    min_vol_ratio = 1 + min_vol_pct / 100
    min_volume = int(min_vol_m * 1_000_000)

    await update.effective_message.reply_text(
        f"🔍 Đang lọc: giá ≥ +{min_change}% · KL ≥ {min_vol_m:.0f}M · KL ≥ +{min_vol_pct:.0f}% TB20\n⏳ Chờ 1-2 phút...",
        parse_mode="HTML"
    )

    try:
        vnstock = get_vnstock()
        sb = get_supabase()
        symbols = fetch_all_symbols(sb)

        today = datetime.now(VN_TZ).strftime("%Y-%m-%d")
        start = (datetime.now(VN_TZ) - timedelta(days=90)).strftime("%Y-%m-%d")

        # Fetch price board
        candidates = []
        for i in range(0, len(symbols), 50):
            batch = symbols[i:i+50]
            try:
                board = vnstock.Trading(source="VCI").price_board(batch)
                if board is None or board.empty:
                    continue
                if isinstance(board.columns, pd.MultiIndex):
                    board.columns = ["_".join(str(c) for c in col).strip() for col in board.columns.values]
                for _, row in board.iterrows():
                    sym = str(row.get("listing_symbol", ""))
                    price = float(row.get("match_match_price", 0) or 0)
                    ref = float(row.get("listing_ref_price", 0) or 0)
                    vol = int(float(row.get("match_accumulated_volume", 0) or 0))
                    if price <= 0 or ref <= 0:
                        continue
                    chg = ((price - ref) / ref) * 100
                    if chg >= min_change and vol >= min_volume:
                        candidates.append({"symbol": sym, "price": price, "change_pct": chg, "volume": vol,
                                           "name": str(row.get("listing_organ_name", ""))})
            except:
                continue

        # Check volume vs 20-session avg
        alerts = []
        for c in candidates:
            try:
                hist = vnstock.Quote(source="VCI", symbol=c["symbol"]).history(start=start, end=today, interval="1D")
                if hist is None or len(hist) < 10:
                    continue
                tcol = "time" if "time" in hist.columns else "date"
                hist = hist.sort_values(tcol, ascending=True).reset_index(drop=True)
                avg = hist.iloc[:-1].tail(20)["volume"].mean()
                if avg <= 0 or math.isnan(avg):
                    continue
                ratio = c["volume"] / avg
                if ratio >= min_vol_ratio:
                    c["avg_vol"] = avg
                    c["vol_ratio"] = ratio
                    c["hist"] = hist
                    alerts.append(c)
            except:
                continue

        if not alerts:
            await update.effective_message.reply_text("💤 Không tìm thấy mã nào đạt điều kiện.")
            return

        alerts.sort(key=lambda x: x["vol_ratio"], reverse=True)

        # Summary
        lines = [f"🚨 <b>Breakout: {len(alerts)} mã</b>\n"]
        for a in alerts[:20]:
            lines.append(f"📈 <b>{a['symbol']}</b> +{a['change_pct']:.1f}% · KL: {a['volume']/1e6:.1f}M ({a['vol_ratio']:.1f}x)")
        await update.effective_message.reply_text("\n".join(lines), parse_mode="HTML")

        # Charts (top 5)
        for a in alerts[:5]:
            try:
                img = generate_chart(a["symbol"], a["hist"], a["volume"], a["avg_vol"], a["change_pct"], a["price"])
                cap = f"📈 <b>{a['symbol']}</b> +{a['change_pct']:.1f}% · KL: {a['volume']/1e6:.1f}M ({a['vol_ratio']:.1f}x TB20)"
                await update.effective_message.reply_photo(photo=img, caption=cap, parse_mode="HTML")
            except:
                pass

    except Exception as e:
        await update.effective_message.reply_text(f"❌ Lỗi: {e}")


async def cmd_price(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Show price + chart for a single stock."""
    if not ctx.args:
        await update.effective_message.reply_text("⚠️ Dùng: <code>/price VCB</code>", parse_mode="HTML")
        return

    symbol = ctx.args[0].upper()
    await update.effective_message.reply_text(f"📊 Đang tải {symbol}...")

    try:
        vnstock = get_vnstock()
        today = datetime.now(VN_TZ).strftime("%Y-%m-%d")
        start = (datetime.now(VN_TZ) - timedelta(days=90)).strftime("%Y-%m-%d")

        hist = vnstock.Quote(source="VCI", symbol=symbol).history(start=start, end=today, interval="1D")
        if hist is None or hist.empty:
            await update.effective_message.reply_text(f"❌ Không tìm thấy dữ liệu cho {symbol}")
            return

        tcol = "time" if "time" in hist.columns else "date"
        hist = hist.sort_values(tcol, ascending=True).reset_index(drop=True)

        last = hist.iloc[-1]
        price = float(last["close"])
        prev_close = float(hist.iloc[-2]["close"]) if len(hist) > 1 else price
        chg = ((price - prev_close) / prev_close) * 100
        vol = int(last["volume"])
        avg = hist.iloc[:-1].tail(20)["volume"].mean() if len(hist) > 1 else 0

        img = generate_chart(symbol, hist, vol, avg, chg, price)
        cap = (f"📊 <b>{symbol}</b>\n"
               f"Giá: {price/1000:.1f}K ({chg:+.1f}%)\n"
               f"KL: {vol/1e6:.1f}M" +
               (f" ({vol/avg:.1f}x TB20)" if avg > 0 else ""))
        await update.effective_message.reply_photo(photo=img, caption=cap, parse_mode="HTML")
    except Exception as e:
        await update.effective_message.reply_text(f"❌ Lỗi: {e}")


async def cmd_top(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Top 10 tăng giá mạnh nhất."""
    await _top_bot(update, ctx, mode="top")

async def cmd_bot_bottom(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Top 10 giảm giá mạnh nhất."""
    await _top_bot(update, ctx, mode="bot")

async def _top_bot(update: Update, ctx: ContextTypes.DEFAULT_TYPE, mode="top"):
    await update.effective_message.reply_text(f"{'📈' if mode=='top' else '📉'} Đang tải...")
    try:
        vnstock = get_vnstock()
        sb = get_supabase()
        symbols = fetch_all_symbols(sb)

        all_stocks = []
        for i in range(0, len(symbols), 50):
            batch = symbols[i:i+50]
            try:
                board = vnstock.Trading(source="VCI").price_board(batch)
                if board is None or board.empty:
                    continue
                if isinstance(board.columns, pd.MultiIndex):
                    board.columns = ["_".join(str(c) for c in col).strip() for col in board.columns.values]
                for _, row in board.iterrows():
                    price = float(row.get("match_match_price", 0) or 0)
                    ref = float(row.get("listing_ref_price", 0) or 0)
                    vol = int(float(row.get("match_accumulated_volume", 0) or 0))
                    if price <= 0 or ref <= 0 or vol < 100000:
                        continue
                    chg = ((price - ref) / ref) * 100
                    all_stocks.append({
                        "symbol": str(row.get("listing_symbol", "")),
                        "price": price, "change_pct": chg, "volume": vol
                    })
            except:
                continue

        if mode == "top":
            all_stocks.sort(key=lambda x: x["change_pct"], reverse=True)
            emoji = "📈"
            title = "Top 10 Tăng Giá"
        else:
            all_stocks.sort(key=lambda x: x["change_pct"])
            emoji = "📉"
            title = "Top 10 Giảm Giá"

        top = all_stocks[:10]
        lines = [f"{emoji} <b>{title}</b>\n"]
        for i, s in enumerate(top):
            lines.append(f"{i+1}. <b>{s['symbol']}</b>  {s['change_pct']:+.1f}%  ·  {s['price']/1000:.1f}K  ·  KL: {s['volume']/1e6:.1f}M")

        await update.effective_message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        await update.effective_message.reply_text(f"❌ Lỗi: {e}")


async def cmd_sideway(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Lọc sideway từ cache — 7 tiêu chí chuyên nghiệp, kết quả trong <10s."""
    from pathlib import Path as _Path
    from build_cache import CACHE_DIR

    args = ctx.args or []
    mode = args[0].lower() if args else "normal"
    if mode not in ("quick", "normal", "deep"):
        mode = "normal"

    # Check if cache exists
    meta_path = CACHE_DIR / "meta.json"
    if not meta_path.exists() or not list(CACHE_DIR.glob("*.parquet")):
        await update.effective_message.reply_text(
            "⚠️ Cache chưa được build!\n"
            "Đang build lần đầu... ⏳ mất 20-40 phút.\n"
            "Bot sẽ thông báo khi xong.",
        )
        # Run build in background thread
        import asyncio
        loop = asyncio.get_event_loop()
        from build_cache import build_cache
        await loop.run_in_executor(None, build_cache)
        await update.effective_message.reply_text("✅ Cache đã sẵn sàng! Đang scan...")

    mode_emoji = {"quick": "⚡", "normal": "📐", "deep": "🔬"}[mode]
    mode_desc = {
        "quick": "nhanh (3 tiêu chí — Range + BBW + Volume)",
        "normal": "chuẩn (7 tiêu chí — score ≥ 50)",
        "deep": "chặt (7 tiêu chí — score ≥ 65)",
    }[mode]

    await update.effective_message.reply_text(
        f"{mode_emoji} Đang scan sideway [{mode_desc}]...\n⏳ Vài giây...",
    )

    try:
        import asyncio
        from sideway_engine import scan_sideway
        from build_cache import load_symbol_cache

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, lambda: scan_sideway(top_n=20, mode=mode))

        if not results:
            await update.effective_message.reply_text(
                f"💤 Không tìm mã sideway nào (mode: {mode}).\n"
                "Thử /sideway quick để nới lỏng tiêu chí."
            )
            return

        # Summary
        lines = [f"{mode_emoji} <b>Sideway [{mode}]: {len(results)} mã</b>\n"]
        for r in results:
            passed = r["criteria_passed"]
            total = r["total_criteria"]
            score = r["score"]
            bbw = r.get("bbw") or 0
            adx = r.get("adx") or 0
            drawdown = r.get("drawdown_52w") or 0
            lines.append(
                f"📦 <b>{r['symbol']}</b> "
                f"Score:<b>{score}</b> ({passed}/{total}) · "
                f"Giá:{r['price']/1000:.1f}K · "
                f"DD:{drawdown:.0f}% · "
                f"BBW:{bbw:.1f} · "
                f"ADX:{adx:.0f}"
            )

        await update.effective_message.reply_text("\n".join(lines), parse_mode="HTML")

        # Charts top 5 kèm chi tiết tiêu chí
        for r in results[:5]:
            try:
                df = load_symbol_cache(r["symbol"])
                if df is None:
                    continue
                avg_vol = r["avg_vol_20"]
                img = generate_chart(r["symbol"], df, None, avg_vol, None, r["price"])
                c = r["criteria"]
                cap_lines = [
                    f"📐 <b>{r['symbol']}</b> — Score {r['score']}/100",
                    f"{'✅' if c.get('after_downtrend',{}).get('pass') else '❌'} Sau downtrend (DD: {r['drawdown_52w']:.0f}%)",
                    f"{'✅' if c.get('tight_range',{}).get('pass') else '❌'} Biên tích lũy: {r.get('range_pct',0):.1f}%",
                    f"{'✅' if c.get('bbw_squeeze',{}).get('pass') else '❌'} BBW squeeze: {r.get('bbw',0):.1f}%",
                    f"{'✅' if c.get('vol_dry_up',{}).get('pass') else '❌'} Volume dry-up",
                    f"{'✅' if c.get('higher_lows',{}).get('pass') else '❌'} Higher lows",
                    f"{'✅' if c.get('obv_higher_highs',{}).get('pass') else '❌'} OBV higher highs",
                    f"{'✅' if c.get('adx_low',{}).get('pass') else '❌'} ADX: {r.get('adx',99):.0f} (<25)",
                ]
                await update.effective_message.reply_photo(
                    photo=img,
                    caption="\n".join(cap_lines),
                    parse_mode="HTML"
                )
            except Exception:
                pass

    except Exception as e:
        await update.effective_message.reply_text(f"❌ Lỗi: {e}")


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await cmd_help(update, ctx)


# ============================================================
# MAIN
# ============================================================
def main():
    logger.info("🤖 Starting VNStock Telegram Bot...")
    app = ApplicationBuilder().token(BOT_TOKEN).connect_timeout(30.0).read_timeout(30.0).get_updates_read_timeout(42.0).build()

    cmd_filters = filters.COMMAND | filters.UpdateType.CHANNEL_POST
    app.add_handler(CommandHandler("start", cmd_start, filters=cmd_filters))
    app.add_handler(CommandHandler("help", cmd_help, filters=cmd_filters))
    app.add_handler(CommandHandler("scan", cmd_scan, filters=cmd_filters))
    app.add_handler(CommandHandler("price", cmd_price, filters=cmd_filters))
    app.add_handler(CommandHandler("top", cmd_top, filters=cmd_filters))
    app.add_handler(CommandHandler("bot", cmd_bot_bottom, filters=cmd_filters))
    app.add_handler(CommandHandler("sideway", cmd_sideway, filters=cmd_filters))

    logger.info("✅ Bot is running! Send /help in Telegram.")
    app.run_polling(drop_pending_updates=True, timeout=60)


if __name__ == "__main__":
    main()
