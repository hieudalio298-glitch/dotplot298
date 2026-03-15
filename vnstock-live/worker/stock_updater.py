"""
VNStock Live — Data Worker
Sử dụng vnstock_data (sponsor) để lấy dữ liệu giá realtime
và cập nhật vào Supabase (latest_prices + price_history).

Chạy mỗi 3 giây trong giờ giao dịch (9:00-15:00 VN).
"""

import os
import time
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import json

import pandas as pd
import vnstock
from supabase import create_client, Client

# ============================================================
# CONFIGURATION
# ============================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://utqmpdmbkubhzuccqeyf.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY",
    # Fallback to publishable key for dev — use service role key in production
    os.getenv("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"),
)

VN_TZ = timezone(timedelta(hours=7))
TRADING_START = 9   # 9:00 AM VN
TRADING_END = 15    # 3:00 PM VN
FETCH_INTERVAL = 3  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("vnstock-worker")


# ============================================================
# VNSTOCK DATA FETCHER
# ============================================================
class StockUpdater:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("✅ Connected to Supabase")

        # Import vnstock_data
        try:
            from vnstock_data import Trading, Listing
            self.Trading = Trading
            self.Listing = Listing
            self.Company = vnstock.Company
            self._shares_memo = {}
            self._shares_memo_initial = {}
            logger.info("✅ vnstock_data (sponsor) loaded")
        except ImportError:
            logger.error("❌ vnstock_data not installed. Run: pip install vnstock-installer && python install_vnstock_data.py")
            raise

        # Cache stock_id mapping
        self.stock_map: Dict[str, int] = {}

    @staticmethod
    def _clean_val(val):
        """Convert NaN/inf to None for JSON safety."""
        if val is None:
            return None
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        if isinstance(val, str) and val.strip().lower() in ('nan', 'none', ''):
            return None
        return val

    def get_enriched_data_map(self):
        """Fetch sector and exchange info from stock_symbols table."""
        logger.info("🔍 Fetching enrichment data from stock_symbols...")
        data_map = {}
        offset = 0
        while True:
            resp = (
                self.supabase.table("stock_symbols")
                .select("symbol, icb_name2")
                .range(offset, offset + 999)
                .execute()
            )
            if not resp.data:
                break
            for row in resp.data:
                data_map[row["symbol"]] = {
                    "sector": row.get("icb_name2"),
                    "exchange": row.get("exchange"),
                }
            if len(resp.data) < 1000:
                break
            offset += 1000
        logger.info(f"✅ Loaded enrichment data for {len(data_map)} symbols")
        return data_map

    def sync_stock_list(self):
        """Sync stock list from Listing API and enrich with sector data."""
        try:
            logger.info("📋 Syncing stock list...")
            listing = self.Listing(source="VND")
            df = listing.all_symbols()

            if df is None or df.empty:
                logger.warning("No stocks found from Listing API")
                return

            # Get enriched data (sectors, etc.)
            enriched_map = self.get_enriched_data_map()

            records = []
            for _, row in df.iterrows():
                symbol = str(row.get("symbol", ""))
                if not symbol:
                    continue
                
                # Get data from API
                name = self._clean_val(row.get("organ_short_name", row.get("short_name", None)))
                full_name = self._clean_val(row.get("organ_name", row.get("company_name", None)))
                
                # Get enrichment data
                enrich = enriched_map.get(symbol, {})
                sector = enrich.get("sector")
                exchange_val = enrich.get("exchange")
                
                if not exchange_val:
                    # Fallback to API data for exchange
                    exchange_raw = str(self._clean_val(row.get("exchange", row.get("comGroupCode", ""))) or "")
                    exchange_val = exchange_raw.upper().replace("HSX", "HOSE")
                    exchange_val = exchange_val if exchange_val in ("HOSE", "HNX", "UPCOM") else None

                records.append({
                    "symbol": symbol,
                    "name": str(name) if name else None,
                    "full_name": str(full_name) if full_name else None,
                    "exchange": exchange_val,
                    "sector": str(sector) if sector and sector != "N/A" else None,
                })

            # Batch upsert — use ignore_duplicates to avoid overwriting shares_outstanding
            batch_size = 100
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                self.supabase.table("stocks").upsert(
                    batch, on_conflict="symbol", ignore_duplicates=True
                ).execute()

            logger.info(f"✅ Synced {len(records)} stocks to database")

        except Exception as e:
            logger.error(f"❌ Stock sync failed: {e}")

    def load_stock_map(self):
        """Load stock_id mapping from Supabase."""
        logger.info("🗺️  Loading stock_id map...")
        data = []
        offset = 0
        while True:
            resp = (
                self.supabase.table("stocks")
                .select("id, symbol, shares_outstanding")
                .range(offset, offset + 999)
                .execute()
            )
            if not resp.data:
                break
            data.extend(resp.data)
            if len(resp.data) < 1000:
                break
            offset += 1000

        self.stock_map = {row["symbol"]: row["id"] for row in data}
        self._shares_memo = {row["symbol"]: row["shares_outstanding"] for row in data if row.get("shares_outstanding")}
        self._shares_memo_initial = dict(self._shares_memo)
        logger.info(f"✅ Loaded {len(self.stock_map)} stocks from DB")

    def fetch_and_update_prices(self, symbols: List[str]):
        """Fetch price board for symbols and upsert into Supabase."""
        try:
            # Use FREE vnstock library explicitly to get MultiIndex + listed_share metadata
            # as Premium vnstock_data price_board doesn't include listed_share.
            try:
                df = vnstock.Trading(source='VCI').price_board(symbols)
            except Exception as e:
                logger.warning(f"   price_board failed for batch ({len(symbols)} symbols): {e}")
                return

            if df is None or df.empty:
                logger.warning("No data from price_board")
                return

            # Flatten columns for easy access (symbol, listed_share, etc.)
            df.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df.columns.values]

            latest_records = []
            history_records = []
            stock_updates = []
            now_iso = datetime.now(VN_TZ).isoformat()

            def safe_float(val, default=None):
                try:
                    if val is None or (isinstance(val, float) and math.isnan(val)):
                        return default
                    v = float(val)
                    return v if not math.isnan(v) else default
                except (ValueError, TypeError):
                    return default

            def safe_int(val, default=None):
                try:
                    if val is None or (isinstance(val, float) and math.isnan(val)):
                        return default
                    v = int(float(val))
                    return v
                except (ValueError, TypeError):
                    return default

            if not hasattr(self, '_columns_printed'):
                logger.info(f"📋 Board Columns: {df.columns.tolist()}")
                self._columns_printed = True

            for i, (_, row) in enumerate(df.iterrows()):
                symbol = str(row.get("listing_symbol", row.get("symbol", "")))
                stock_id = self.stock_map.get(symbol)
                if not stock_id:
                    continue

                # Extract exchange and shares info
                raw_exchange = str(row.get("listing_exchange", "")).upper().strip()
                # Map VCI exchange names to our standard names
                exchange_map = {"HSX": "HOSE", "HNX": "HNX", "UPCOM": "UPCOM", "HOSE": "HOSE"}
                exchange = exchange_map.get(raw_exchange)
                
                shares_raw = row.get("listing_listed_share")
                try:
                    shares = int(float(shares_raw)) if shares_raw is not None and str(shares_raw).strip() not in ('', 'nan', 'None') else None
                except (ValueError, TypeError):
                    shares = None
                
                update_item = {"id": stock_id, "symbol": symbol}
                if exchange:
                    update_item["exchange"] = exchange
                if shares is not None and shares > 0:
                    update_item["shares_outstanding"] = shares
                
                if len(update_item) > 1:
                    stock_updates.append(update_item)
                    if i == 0:  # Debug log first item in each batch
                        logger.debug(f"🔍 Extraction trace: {symbol} -> raw_val={shares_raw} (type={type(shares_raw).__name__}), final_shares={shares}, ex={exchange}")

                # Price data
                ref_price = safe_float(row.get("listing_ref_price", row.get("ref_price", None)))
                price = safe_float(row.get("match_match_price", row.get("close_price", row.get("close", None))))
                
                # Fallback to ref_price if no current price or price is 0 (no trades today)
                if not price and ref_price:
                    price = ref_price

                open_p = safe_float(row.get("match_open_price", row.get("open", None)))
                high_p = safe_float(row.get("match_highest_price", row.get("high", None)))
                low_p = safe_float(row.get("match_lowest_price", row.get("low", None)))
                close_p = safe_float(row.get("match_match_price", price))
                ceiling = safe_float(row.get("listing_ceiling", row.get("ceiling_price", row.get("ceiling", None))))
                floor_p = safe_float(row.get("listing_floor", row.get("floor_price", row.get("floor", None))))
                # Volume and value: VCI uses match_accumulated_volume / match_accumulated_value
                volume = safe_int(row.get("match_accumulated_volume", row.get("listing_total_volume", row.get("total_volume", 0))), default=0)
                value_v = safe_float(row.get("match_accumulated_value", row.get("listing_total_value", row.get("total_value", 0.0))), default=0.0)

                # Change calculation
                change = safe_float(row.get("match_match_change", None))
                change_pct = safe_float(row.get("match_match_change_percent", None))
                if change is None and price is not None and ref_price is not None and ref_price > 0:
                    change = round(price - ref_price, 2)
                    change_pct = round((price - ref_price) / ref_price * 100, 2)

                latest_records.append({
                    "stock_id": stock_id,
                    "timestamp": now_iso,
                    "price": price,
                    "open": open_p,
                    "high": high_p,
                    "low": low_p,
                    "close": close_p,
                    "ref_price": ref_price,
                    "ceiling": ceiling,
                    "floor": floor_p,
                    "change": change,
                    "change_percent": change_pct,
                    "volume": volume,
                    "value": value_v,
                })

                if price is not None:
                    history_records.append({
                        "stock_id": stock_id,
                        "timestamp": now_iso,
                        "price": price,
                        "open": open_p,
                        "high": high_p,
                        "low": low_p,
                        "close": close_p,
                        "volume": volume,
                    })

            # Upsert latest_prices
            if latest_records:
                batch_size = 200
                for i in range(0, len(latest_records), batch_size):
                    batch = latest_records[i : i + batch_size]
                    self.supabase.table("latest_prices").upsert(
                        batch, on_conflict="stock_id"
                    ).execute()

            # Insert price_history
            if history_records:
                batch_size = 200
                for i in range(0, len(history_records), batch_size):
                    batch = history_records[i : i + batch_size]
                    self.supabase.table("price_history").insert(batch).execute()

            logger.info(
                f"📊 Updated {len(latest_records)} prices, {len(history_records)} history records"
            )

            # Update stock metadata (exchange + shares) in batch
            if stock_updates:
                try:
                    # Use upsert on id to update multiple rows in one request
                    self.supabase.table("stocks").upsert(
                        stock_updates, on_conflict="id"
                    ).execute()
                    logger.debug(f"🆙 Updated metadata for {len(stock_updates)} stocks")
                except Exception as e:
                    logger.warning(f"Metadata batch update failed: {e}")

        except Exception as e:
            logger.error(f"❌ Price update failed: {e}")

    def is_trading_hours(self) -> bool:
        """Check if current VN time is within trading hours."""
        now_vn = datetime.now(VN_TZ)
        hour = now_vn.hour
        weekday = now_vn.weekday()  # 0=Mon, 6=Sun
        return weekday < 5 and TRADING_START <= hour < TRADING_END

    def run(self, force: bool = False):
        """Main loop: sync stocks, then fetch prices every FETCH_INTERVAL seconds."""
        logger.info("🚀 VNStock Live Worker starting...")

        # Step 1: Sync stock list
        self.sync_stock_list()
        self.load_stock_map()

        if not self.stock_map:
            logger.error("❌ No stocks in database. Exiting.")
            return

        all_symbols = list(self.stock_map.keys())
        logger.info(f"📈 Tracking {len(all_symbols)} symbols")

        # Step 2: Continuous price update loop
        while True:
            if force or self.is_trading_hours():
                # Fetch in batches of 50 symbols
                batch_size = 50
                for i in range(0, len(all_symbols), batch_size):
                    batch = all_symbols[i : i + batch_size]
                    self.fetch_and_update_prices(batch)
                    time.sleep(0.5)  # Small delay between batches

                now_vn = datetime.now(VN_TZ).strftime("%H:%M:%S")
                logger.info(f"⏱️  Cycle complete at {now_vn}. Waiting {FETCH_INTERVAL}s...")
            else:
                now_vn = datetime.now(VN_TZ).strftime("%H:%M:%S")
                logger.info(f"💤 Outside trading hours ({now_vn}). Waiting 60s...")
                time.sleep(60)
                continue

            time.sleep(FETCH_INTERVAL)


if __name__ == "__main__":
    import argparse
    import re

    parser = argparse.ArgumentParser(description="VNStock Live Data Worker")
    parser.add_argument("--force", action="store_true", help="Run even outside trading hours")
    parser.add_argument("--once", action="store_true", help="Run once and exit (for testing)")
    args = parser.parse_args()

    updater = StockUpdater()

    if args.once:
        updater.sync_stock_list()
        updater.load_stock_map()
        
        # Filter to only valid stock symbols (3 uppercase alpha characters)
        valid_symbols = [s for s in updater.stock_map.keys() if re.match(r'^[A-Z]{3}$', s)]
        logger.info(f"   {len(valid_symbols)} valid 3-letter symbols out of {len(updater.stock_map)}")
        
        # Fetch in batches of 30
        batch_size = 30
        for i in range(0, len(valid_symbols), batch_size):
            batch = valid_symbols[i : i + batch_size]
            updater.fetch_and_update_prices(batch)
            time.sleep(0.5)
        logger.info("✅ Single run complete")
    else:
        updater.run(force=args.force)
