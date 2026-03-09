"""
VNStock Sideway Scoring Engine
Đọc từ cache parquet, tính 7 tiêu chí accumulation, trả kết quả nhanh (<10s).

Tiêu chí:
1. Sau downtrend: Giá < MA200 hoặc giảm ≥20% từ đỉnh 52 tuần
2. Biên tích lũy hẹp: (High-Low)/Low ≤ 20% trong 40-100 ngày
3. BBW (20,2) thấp nhất 6 tháng (squeeze)
4. Volume dry-up: TB20-40 < 50% TB100 trước đó
5. Higher Lows: đáy gần nhất cao hơn đáy trước 2-3 lần
6. OBV higher highs trong vùng sideway
7. ADX(14) < 25
"""

import json
import logging
import math
from pathlib import Path
import numpy as np
import pandas as pd

CACHE_DIR = Path(__file__).parent / ".cache"

logger = logging.getLogger("sideway-engine")


# ============================================================
# TECHNICAL INDICATORS
# ============================================================
def calc_adx(df: pd.DataFrame, period: int = 14) -> float:
    """Average Directional Index."""
    try:
        h = df["high"].values
        l = df["low"].values
        c = df["close"].values
        n = len(h)
        if n < period * 2:
            return 99.0

        # True Range
        tr = np.maximum(h[1:] - l[1:],
             np.maximum(abs(h[1:] - c[:-1]), abs(l[1:] - c[:-1])))
        # +DM, -DM
        pdm = np.where((h[1:] - h[:-1]) > (l[:-1] - l[1:]),
                       np.maximum(h[1:] - h[:-1], 0), 0)
        ndm = np.where((l[:-1] - l[1:]) > (h[1:] - h[:-1]),
                       np.maximum(l[:-1] - l[1:], 0), 0)

        def wilder(arr, p):
            out = np.zeros(len(arr))
            out[p-1] = arr[:p].sum()
            for i in range(p, len(arr)):
                out[i] = out[i-1] - out[i-1]/p + arr[i]
            return out

        atr = wilder(tr, period)
        pdi = 100 * wilder(pdm, period) / (atr + 1e-10)
        ndi = 100 * wilder(ndm, period) / (atr + 1e-10)
        dx = 100 * abs(pdi - ndi) / (pdi + ndi + 1e-10)

        adx_arr = wilder(dx[period:], period)
        if len(adx_arr) == 0:
            return 99.0
        return float(adx_arr[-1])
    except Exception:
        return 99.0


def calc_obv(df: pd.DataFrame) -> pd.Series:
    """On-Balance Volume."""
    obv = [0]
    closes = df["close"].values
    vols = df["volume"].values
    for i in range(1, len(closes)):
        if closes[i] > closes[i-1]:
            obv.append(obv[-1] + vols[i])
        elif closes[i] < closes[i-1]:
            obv.append(obv[-1] - vols[i])
        else:
            obv.append(obv[-1])
    return pd.Series(obv, index=df.index)


def calc_bbw(series: pd.Series, period: int = 20, std_mult: float = 2.0) -> pd.Series:
    """Bollinger Band Width (%) = (Upper - Lower) / SMA * 100"""
    sma = series.rolling(period).mean()
    std = series.rolling(period).std()
    return (std_mult * 2 * std) / (sma + 1e-10) * 100


def find_local_lows(series: pd.Series, window: int = 5) -> list:
    """Find local low points (swing lows)."""
    lows = []
    vals = series.values
    for i in range(window, len(vals) - window):
        if vals[i] == min(vals[i-window:i+window+1]):
            lows.append((i, float(vals[i])))
    return lows


def find_local_highs(series: pd.Series, window: int = 5) -> list:
    """Find local high points (swing highs)."""
    highs = []
    vals = series.values
    for i in range(window, len(vals) - window):
        if vals[i] == max(vals[i-window:i+window+1]):
            highs.append((i, float(vals[i])))
    return highs


# ============================================================
# MAIN SCORING FUNCTION
# ============================================================
def score_symbol(df: pd.DataFrame, symbol: str) -> dict | None:
    """
    Score a symbol for accumulation/sideway quality.
    Returns dict with score 0-100 and criteria breakdown.
    """
    try:
        if len(df) < 60:
            return None

        df = df.copy().sort_values("date").reset_index(drop=True)
        for c in ["open", "high", "low", "close", "volume"]:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        df["high"] = df["high"].fillna(df[["open", "close"]].max(axis=1))
        df["low"] = df["low"].fillna(df[["open", "close"]].min(axis=1))
        df = df.dropna(subset=["close", "volume"])

        n = len(df)
        last = df.iloc[-1]
        current_price = float(last["close"])

        # ── INDICATOR PRE-COMPUTE ──────────────────────────────
        df["ma20"] = df["close"].rolling(20).mean()
        df["ma50"] = df["close"].rolling(50).mean()
        df["ma200"] = df["close"].rolling(200).mean()
        df["bbw"] = calc_bbw(df["close"], 20, 2)
        df["obv"] = calc_obv(df)

        criteria = {}
        score = 0

        # ── 1. Sau Downtrend (giá < MA200 hoặc giảm ≥20% từ đỉnh 52 tuần) ──
        peak_52w = df.tail(252)["high"].max() if n >= 252 else df["high"].max()
        drawdown = (current_price - peak_52w) / peak_52w * 100
        ma200 = df["ma200"].iloc[-1]
        after_downtrend = (not math.isnan(ma200) and current_price < ma200) or drawdown <= -20
        criteria["after_downtrend"] = {
            "pass": after_downtrend,
            "drawdown_pct": round(drawdown, 1),
            "below_ma200": not math.isnan(ma200) and current_price < ma200,
        }
        if after_downtrend:
            score += 15

        # ── 2. Biên tích lũy hẹp (40-100 ngày gần nhất) ──────
        window_acc = min(80, n)
        acc = df.tail(window_acc)
        high_acc = acc["high"].max()
        low_acc = acc["low"].min()
        mid_acc = (high_acc + low_acc) / 2 if (high_acc + low_acc) > 0 else 1
        range_pct = (high_acc - low_acc) / mid_acc * 100
        tight_range = range_pct <= 20
        criteria["tight_range"] = {"pass": tight_range, "range_pct": round(range_pct, 1)}
        if tight_range:
            score += 20
        elif range_pct <= 25:
            score += 10

        # ── 3. BBW Squeeze (thấp nhất 6 tháng) ───────────────
        bbw_now = df["bbw"].iloc[-1]
        bbw_6m = df.tail(126)["bbw"].dropna()
        if len(bbw_6m) >= 20 and not math.isnan(bbw_now):
            bbw_min_6m = bbw_6m.min()
            is_squeeze = bbw_now <= bbw_min_6m * 1.1  # within 10% of 6M low
            squeeze_pct = bbw_now / bbw_6m.max() * 100 if bbw_6m.max() > 0 else 100
            criteria["bbw_squeeze"] = {
                "pass": is_squeeze,
                "bbw_now": round(float(bbw_now), 2),
                "bbw_6m_min": round(float(bbw_min_6m), 2),
                "squeeze_pct": round(float(squeeze_pct), 1),
            }
            if is_squeeze:
                score += 20
        else:
            criteria["bbw_squeeze"] = {"pass": False}

        # ── 4. Volume Dry-up (TB20-40 < 50% TB100 trước đó) ──
        vol_series = df["volume"]
        if n >= 140:
            vol_recent = vol_series.tail(40).mean()
            vol_old = vol_series.iloc[-140:-40].mean()
            dry_up_ratio = vol_recent / (vol_old + 1)
            is_dry_up = dry_up_ratio < 0.5
            criteria["vol_dry_up"] = {
                "pass": is_dry_up,
                "recent_avg": round(vol_recent / 1e6, 2),
                "old_avg": round(vol_old / 1e6, 2),
                "ratio": round(dry_up_ratio, 2),
            }
            if is_dry_up:
                score += 15
        else:
            criteria["vol_dry_up"] = {"pass": False}

        # ── 5. Higher Lows (swing lows đang tăng dần) ─────────
        lows = find_local_lows(df["low"].tail(window_acc), window=3)
        higher_lows = False
        if len(lows) >= 3:
            # Check last 3 lows are ascending
            last_lows = [v for _, v in lows[-3:]]
            higher_lows = all(last_lows[i] < last_lows[i+1] for i in range(len(last_lows)-1))
        criteria["higher_lows"] = {"pass": higher_lows, "lows_count": len(lows)}
        if higher_lows:
            score += 15

        # ── 6. OBV Higher Highs trong vùng sideway ────────────
        obv_acc = df["obv"].tail(window_acc)
        highs_obv = find_local_highs(obv_acc, window=5)
        obv_hh = False
        if len(highs_obv) >= 2:
            last_highs = [v for _, v in highs_obv[-2:]]
            obv_hh = last_highs[-1] > last_highs[-2]
        criteria["obv_higher_highs"] = {"pass": obv_hh}
        if obv_hh:
            score += 10

        # ── 7. ADX < 25 (không có xu hướng mạnh) ─────────────
        adx = calc_adx(df.tail(100), period=14)
        no_strong_trend = adx < 25
        criteria["adx_low"] = {"pass": no_strong_trend, "adx": round(adx, 1)}
        if no_strong_trend:
            score += 5

        # ── SUMMARY ───────────────────────────────────────────
        passed = sum(1 for c in criteria.values() if c.get("pass"))
        avg_vol_20 = float(df["volume"].tail(20).mean())

        return {
            "symbol": symbol,
            "score": score,
            "criteria_passed": passed,
            "total_criteria": len(criteria),
            "price": current_price,
            "drawdown_52w": round(drawdown, 1),
            "range_pct": criteria.get("tight_range", {}).get("range_pct", None),
            "bbw": criteria.get("bbw_squeeze", {}).get("bbw_now", None),
            "adx": criteria.get("adx_low", {}).get("adx", None),
            "avg_vol_20": avg_vol_20,
            "criteria": criteria,
        }

    except Exception as e:
        logger.debug(f"Score error {symbol}: {e}")
        return None


# ============================================================
# BATCH SCAN — đọc từ cache
# ============================================================
def scan_sideway(
    min_score: int = 50,
    top_n: int = 20,
    mode: str = "normal",  # "quick", "normal", "deep"
) -> list:
    """
    Scan tất cả mã từ cache, score, return top_n.
    Mode:
      quick — chỉ 3 tiêu chí (tight_range + bbw_squeeze + vol_dry_up)
      normal — tất cả 7 tiêu chí, min_score >= 50
      deep — min_score >= 70 (ít nhất 5/7 tiêu chí thỏa)
    """
    if mode == "quick":
        min_score = 30
    elif mode == "deep":
        min_score = 65

    if not CACHE_DIR.exists():
        return []

    # Check meta
    meta_path = CACHE_DIR / "meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        logger.info(f"📦 Cache từ: {meta.get('last_build', 'N/A')[:10]} | {meta.get('cached', 0)} mã")

    # List all cached symbols
    parquet_files = list(CACHE_DIR.glob("*.parquet"))
    logger.info(f"🔍 Scanning {len(parquet_files)} symbols from cache...")

    results = []
    for f in parquet_files:
        symbol = f.stem
        try:
            df = pd.read_parquet(f)
            result = score_symbol(df, symbol)
            if result and result["score"] >= min_score:
                results.append(result)
        except Exception:
            continue

    # Sort by score desc
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


# ============================================================
# CLI TEST
# ============================================================
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "normal"
    print(f"\n🔍 Scanning sideway [{mode}]...")
    results = scan_sideway(top_n=20, mode=mode)
    print(f"\n{'='*60}")
    print(f"{'Sym':<6} {'Score':>5} {'Pass':>5} {'Drawdown':>9} {'Range%':>7} {'BBW':>6} {'ADX':>6}")
    print(f"{'─'*60}")
    for r in results:
        print(
            f"{r['symbol']:<6} {r['score']:>5} {r['criteria_passed']:>3}/{r['total_criteria']:<2} "
            f"{r['drawdown_52w']:>8.1f}% {r.get('range_pct', 0) or 0:>6.1f}% "
            f"{r.get('bbw', 0) or 0:>5.1f}  {r.get('adx', 99) or 99:>5.1f}"
        )
