from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client
from pydantic import BaseModel
from typing import List, Optional
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Supabase client ────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://utqmpdmbkubhzuccqeyf.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is')

try:
    supa: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("✅ Supabase client initialized")
except Exception as _e:
    supa = None
    logger.warning(f"⚠️  Supabase client failed to init: {_e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Financial Data Updater API is running"}


@app.post("/update/{symbol}")
async def update_stock_data(symbol: str):
    logger.info(f"Received update request for symbol: {symbol}")
    symbol = symbol.upper()
    try:
        from update_financials import FinancialFetcher
        from update_financials import SUPABASE_URL as SB_URL, SUPABASE_KEY as SB_KEY
        fetcher = FinancialFetcher(SB_URL, SB_KEY)
        success = fetcher.process_symbol_safely(symbol)
        if success:
            return {"status": "success", "message": f"Data for {symbol} updated successfully."}
        else:
            raise HTTPException(status_code=500, detail=f"Failed to update data for {symbol}.")
    except Exception as e:
        logger.error(f"Exception during update: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
async def get_history(symbol: str, start: str, end: str):
    logger.info(f"API history requested for {symbol} from {start} to {end}")
    try:
        from vnstock_data import Quote
        q = Quote(source="VCI", symbol=symbol)
        df = q.history(start=start, end=end, interval="1D")
        if df is None or df.empty:
            return []
        if "date" not in df.columns and "time" not in df.columns:
            df = df.reset_index()
        if "time" in df.columns:
            df["date"] = df["time"].astype(str)
        elif "date" in df.columns:
            df["date"] = df["date"].astype(str)
        df = df[df["date"] <= end]
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SharesRequest(BaseModel):
    symbols: List[str]


@app.post("/api/shares")
async def get_shares(req: SharesRequest):
    logger.info(f"API shares requested for {req.symbols}")
    try:
        from vnstock_data import Company
        result = {}
        for sym in req.symbols:
            try:
                cp = Company(source="VCI", symbol=sym)
                df = cp.overview()
                if df is not None and not df.empty:
                    val = 0
                    if "issue_share" in df.columns:
                        val = df.iloc[0]["issue_share"]
                    elif "outstanding_share" in df.columns:
                        val = df.iloc[0]["outstanding_share"]
                    elif "financial_ratio_issue_share" in df.columns:
                        val = df.iloc[0]["financial_ratio_issue_share"]
                    if val > 0:
                        result[sym] = float(val)
            except Exception as e:
                logger.error(f"Error fetching shares for {sym}: {e}")
        return result
    except Exception as e:
        logger.error(f"Error fetching shares: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/oil_prices")
async def get_oil_prices():
    logger.info("API oil prices requested")
    try:
        import yfinance as yf
        start_date = "2026-02-27"
        end_date = datetime.now().strftime("%Y-%m-%d")
        symbols = ['BZ=F', 'CL=F', 'DCB=F']
        df = yf.download(symbols, start=start_date, end=end_date)
        if df is None or df.empty:
            return []
        df = df['Close'].reset_index()
        df['date'] = df['Date'].dt.strftime('%Y-%m-%d')
        result = []
        for _, row in df.iterrows():
            result.append({
                "date": row['date'],
                "brent": float(row['BZ=F']) if pd.notnull(row['BZ=F']) else None,
                "wti":   float(row['CL=F']) if pd.notnull(row['CL=F']) else None,
                "dubai": float(row['DCB=F']) if pd.notnull(row['DCB=F']) else None,
            })
        return result
    except Exception as e:
        logger.error(f"Error fetching oil prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Column name mapping helper ────────────────────────────────────────────────
_COL_MAP = {
    'fr_buy_value_total':   'buy_val',
    'fr_buy_value_matched': 'buy_val',
    'fr_sell_value_total':  'sell_val',
    'fr_sell_value_matched':'sell_val',
    'fr_net_value_total':   'net_val',
    'fr_net_value_matched': 'net_val',
    'fr_buy_volume_total':  'buy_vol',
    'fr_sell_volume_total': 'sell_vol',
    'fr_net_volume_total':  'net_vol',
    'fr_current_room':      'fr_room',
    'fr_room_percentage':   'fr_room_pct',
    'match_foreign_buy_value':  'buy_val',
    'match_foreign_sell_value': 'sell_val',
    'foreign_buy_value':    'buy_val',
    'foreign_sell_value':   'sell_val',
}
_KEEP_COLS  = ['symbol', 'date', 'buy_val', 'sell_val', 'net_val',
               'buy_vol', 'sell_vol', 'net_vol', 'fr_room', 'fr_room_pct']
_RETURN_COLS = ['date', 'buy_val', 'sell_val', 'net_val',
                'buy_vol', 'sell_vol', 'net_vol', 'fr_room', 'fr_room_pct']


def _normalize_df(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    """Standardize columns and add symbol."""
    df.columns = [str(c).lower() for c in df.columns]
    date_col = next((c for c in df.columns if c in ('date', 'time', 'trading_date')), None)
    if date_col and date_col != 'date':
        df = df.rename(columns={date_col: 'date'})
    df['date'] = df['date'].astype(str).str[:10]
    df = df.rename(columns={k: v for k, v in _COL_MAP.items()
                             if k in df.columns and v not in df.columns})
    df['symbol'] = symbol
    return df


@app.get("/api/foreign_trade")
async def get_foreign_trade(symbol: str, start: str, end: str):
    logger.info(f"Foreign trade requested: {symbol} {start} → {end}")
    symbol = symbol.upper()

    # ── Bước 1: Đọc Supabase (nhanh ~100ms) ──────────────────────────────────
    cached_records: list = []
    cached_dates: set = set()
    if supa:
        try:
            res = (supa.table("foreign_trade_daily")
                   .select(",".join(_RETURN_COLS))
                   .eq("symbol", symbol)
                   .gte("date", start)
                   .lte("date", end)
                   .order("date")
                   .execute())
            if res.data:
                cached_records = res.data
                cached_dates = {r["date"] for r in res.data}
                logger.info(f"✅ Cache hit: {len(cached_records)} rows")
        except Exception as e:
            logger.warning(f"⚠️  Supabase read error: {e}")

    # ── Bước 2: Xác định ngày còn thiếu ──────────────────────────────────────
    start_dt = datetime.strptime(start, "%Y-%m-%d").date()
    end_dt   = min(datetime.strptime(end, "%Y-%m-%d").date(), datetime.now().date())
    all_biz  = set()
    cur = start_dt
    while cur <= end_dt:
        if cur.weekday() < 5:
            all_biz.add(str(cur))
        cur += timedelta(days=1)
    missing = all_biz - cached_dates

    # ── Bước 3: Fetch VCI chỉ những ngày thiếu ───────────────────────────────
    if missing:
        fs, fe = min(missing), max(missing)
        logger.info(f"🔄 Fetching {len(missing)} missing dates [{fs} → {fe}]")
        df = None

        try:
            from vnstock_data import Trading
            df = Trading(symbol=symbol, source="VCI").foreign_trade(start=fs, end=fe)
            if df is not None and not df.empty:
                logger.info(f"vnstock_data: {len(df)} rows")
        except Exception as e:
            logger.warning(f"vnstock_data failed: {e}")
            df = None

        if df is None or df.empty:
            try:
                from vnstock import Vnstock
                df = Vnstock().stock(symbol=symbol, source='VCI').trading.price_depth(
                    start=fs, end=fe)
                if df is not None and not df.empty:
                    logger.info(f"vnstock v3: {len(df)} rows")
            except Exception as e:
                logger.warning(f"vnstock v3 failed: {e}")
                df = None

        if df is not None and not df.empty:
            df = _normalize_df(df, symbol)
            df = df[df['date'].isin(missing)]

            # Lưu vào Supabase
            if supa and not df.empty:
                save_df = df[[c for c in _KEEP_COLS if c in df.columns]].copy()
                save_df = save_df.where(pd.notnull(save_df), other=None)
                try:
                    supa.table("foreign_trade_daily").upsert(
                        save_df.to_dict(orient='records'),
                        on_conflict="symbol,date"
                    ).execute()
                    logger.info(f"💾 Saved {len(save_df)} rows → Supabase")
                except Exception as e:
                    logger.warning(f"⚠️  Supabase upsert failed: {e}")

            # Thêm vào cached_records
            ret_cols = ['date'] + [c for c in _RETURN_COLS[1:] if c in df.columns]
            cached_records.extend(df[ret_cols].to_dict(orient='records'))

    # ── Bước 4: Trả kết quả ──────────────────────────────────────────────────
    if not cached_records:
        logger.warning(f"No data for {symbol}")
        return []

    return sorted(cached_records, key=lambda r: r.get('date', ''))



@app.get("/api/market_overview")
async def get_market_overview():
    logger.info("API market overview requested")
    try:
        csv_path = os.path.join(os.getcwd(), 'market_data_cache.csv')
        if not os.path.exists(csv_path):
            logger.warning(f"File not found: {csv_path}")
            return []
        
        df = pd.read_csv(csv_path)
        # Handle NaN values for JSON compatibility
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error fetching market overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
