"""
VNStock History Cache Builder
Fetch 1-năm lịch sử OHLCV cho toàn bộ cổ phiếu, lưu vào Parquet.
Dùng concurrent async (semaphore) để tăng tốc đáng kể.
Chạy mỗi sáng 8:30 (Task Scheduler).
"""

import asyncio
import json
import logging
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

# ============================================================
# CONFIG
# ============================================================
CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://utqmpdmbkubhzuccqeyf.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")

VN_TZ = timezone(timedelta(hours=7))
HISTORY_DAYS = 400          # ~1.1 năm
MAX_WORKERS = 8             # concurrent threads
BATCH_PREFILTER = 50        # mỗi batch price board
MIN_AVG_VOL = 100_000       # loại mã thanh khoản thấp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("cache-builder")


# ============================================================
# HELPERS
# ============================================================
def get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_all_symbols(sb) -> list:
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


def prefilter_by_price_board(symbols: list, vnstock) -> list:
    """
    Quick pre-filter: loại mã KL thấp hoặc không có dữ liệu.
    Giảm từ ~1700 → ~400-600 mã có thanh khoản.
    """
    passed = []
    for i in range(0, len(symbols), BATCH_PREFILTER):
        batch = symbols[i:i + BATCH_PREFILTER]
        try:
            board = vnstock.Trading(source="VCI").price_board(batch)
            if board is None or board.empty:
                continue
            if isinstance(board.columns, pd.MultiIndex):
                board.columns = ["_".join(str(c) for c in col).strip() for col in board.columns.values]
            for _, row in board.iterrows():
                sym = str(row.get("listing_symbol", ""))
                vol = float(row.get("match_accumulated_volume", 0) or 0)
                price = float(row.get("match_match_price", 0) or 0)
                if sym and vol >= MIN_AVG_VOL and price > 0:
                    passed.append(sym)
        except Exception as e:
            logger.debug(f"Batch pre-filter error: {e}")
    logger.info(f"📋 Pre-filter: {len(symbols)} → {len(passed)} mã có thanh khoản")
    return passed


def fetch_history_single(symbol: str, vnstock, start: str, end: str) -> tuple:
    """Fetch 1 mã — chạy trong thread pool."""
    try:
        q = vnstock.Quote(source="VCI", symbol=symbol)
        hist = q.history(start=start, end=end, interval="1D")
        if hist is None or len(hist) < 50:
            return symbol, None
        tcol = "time" if "time" in hist.columns else "date"
        hist = hist.rename(columns={tcol: "date"})
        hist["date"] = pd.to_datetime(hist["date"])
        hist = hist.sort_values("date", ascending=True).reset_index(drop=True)
        for c in ["open", "high", "low", "close", "volume"]:
            hist[c] = pd.to_numeric(hist[c], errors="coerce")
        hist["high"] = hist["high"].fillna(hist[["open", "close"]].max(axis=1))
        hist["low"] = hist["low"].fillna(hist[["open", "close"]].min(axis=1))
        hist["symbol"] = symbol
        return symbol, hist[["symbol", "date", "open", "high", "low", "close", "volume"]]
    except Exception:
        return symbol, None


def save_symbol_cache(symbol: str, df: pd.DataFrame):
    """Lưu 1 mã vào file parquet riêng."""
    path = CACHE_DIR / f"{symbol}.parquet"
    df.to_parquet(path, index=False)


def load_symbol_cache(symbol: str) -> pd.DataFrame | None:
    """Load cache của 1 mã."""
    path = CACHE_DIR / f"{symbol}.parquet"
    if not path.exists():
        return None
    try:
        return pd.read_parquet(path)
    except Exception:
        return None


def is_cache_fresh(path: Path, max_age_hours: int = 20) -> bool:
    """Kiểm tra cache có còn mới không."""
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age < max_age_hours * 3600


# ============================================================
# MAIN BUILD
# ============================================================
def build_cache():
    logger.info("🚀 Cache Builder starting...")
    start_time = time.time()

    import vnstock as vns
    sb = get_supabase()

    today = datetime.now(VN_TZ).strftime("%Y-%m-%d")
    start_date = (datetime.now(VN_TZ) - timedelta(days=HISTORY_DAYS)).strftime("%Y-%m-%d")

    # 1. Get all symbols from Supabase
    logger.info("📋 Fetching symbols from Supabase...")
    all_symbols = fetch_all_symbols(sb)
    logger.info(f"   Total: {len(all_symbols)} symbols")

    # 2. Pre-filter by price board (fast)
    logger.info("🔍 Pre-filtering by price board...")
    tradeable = prefilter_by_price_board(all_symbols, vns)

    # 3. Skip already fresh cached symbols
    stale = []
    for sym in tradeable:
        cache_path = CACHE_DIR / f"{sym}.parquet"
        if not is_cache_fresh(cache_path):
            stale.append(sym)

    logger.info(f"📦 {len(tradeable) - len(stale)} symbols already cached. Fetching {len(stale)} stale...")

    # 4. Concurrent fetch with ThreadPoolExecutor
    done = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_history_single, sym, vns, start_date, today): sym
            for sym in stale
        }
        for future in as_completed(futures):
            sym = futures[future]
            try:
                symbol, df = future.result()
                if df is not None:
                    save_symbol_cache(symbol, df)
                    done += 1
                else:
                    errors += 1
            except Exception as e:
                errors += 1

            total = done + errors
            if total % 50 == 0:
                pct = total / len(stale) * 100
                elapsed = time.time() - start_time
                eta = (elapsed / total) * (len(stale) - total) if total > 0 else 0
                logger.info(f"   Progress: {total}/{len(stale)} ({pct:.0f}%) | ETA: {eta/60:.1f} phút")

    # 5. Save metadata
    meta = {
        "last_build": datetime.now(VN_TZ).isoformat(),
        "total_symbols": len(tradeable),
        "cached": done + (len(tradeable) - len(stale)),
        "errors": errors,
        "start_date": start_date,
        "end_date": today,
    }
    (CACHE_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    elapsed = time.time() - start_time
    logger.info(f"✅ Cache built! {done} fetched, {errors} errors. Thời gian: {elapsed/60:.1f} phút")
    return meta


if __name__ == "__main__":
    build_cache()
