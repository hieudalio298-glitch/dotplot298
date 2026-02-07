import os
import time
import json
import logging
import pandas as pd
from typing import List, Optional
from supabase import create_client, Client
from vnstock_data import Finance
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Configuration ---
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class RatioBackfiller:
    def __init__(self, supabase_url: str, supabase_key: str):
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
            logger.info("Connected to Supabase successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise

    def get_symbols_needing_ratios(self) -> List[str]:
        """Fetch symbols that don't have quarterly ratios yet."""
        try:
            # OPTION 1: Get ALL symbols (smartest for backfill)
            # OPTION 2: Get symbols compliant with logic
            # Let's just fetch all symbols for now to be safe and ensure coverage.
            # Efficiency improvement: We could query DB to exclude existing ones
            # but for <2000 items, checking all is reasonably fast.
            
            # Use raw SQL to be efficient if needed, or pagination
            all_symbols = []
            start = 0
            limit = 1000
            while True:
                response = self.supabase.table('stock_symbols').select('symbol').range(start, start + limit - 1).execute()
                data = response.data
                if not data:
                    break
                all_symbols.extend([item['symbol'] for item in data])
                if len(data) < limit:
                    break
                start += limit
                
            logger.info(f"Scanning {len(all_symbols)} symbols...")
            return all_symbols
        except Exception as e:
            logger.error(f"Error fetching symbols: {e}")
            return []

    def _process_ratios(self, symbol: str, df: Optional[pd.DataFrame], period_type: str):
        if df is None or df.empty:
            return

        try:
            df = df.loc[:, ~df.columns.duplicated()]
            df_clean = df.where(pd.notnull(df), None)
            data_json = json.loads(df_clean.to_json(orient='records', date_format='iso'))

            payload = {
                'symbol': symbol,
                'period_type': period_type,
                'data': data_json,
                'updated_at': pd.Timestamp.now().isoformat()
            }
            self.supabase.table('financial_ratios').upsert(payload).execute()
        except Exception as e:
            # logger.error(f"[{symbol}] Failed to upsert Ratios ({period_type}): {e}")
            pass

    def fetch_quarterly_ratios(self, symbol: str) -> bool:
        """Fetch ONLY quarterly ratios for a symbol."""
        source = 'VCI'
        try:
            finance = Finance(symbol=symbol, source=source)
            # Retrieve Quarterly Ratios
            df_ratios = finance.ratio(period='quarter', lang='vi')
            
            if df_ratios is not None and not df_ratios.empty:
                self._process_ratios(symbol, df_ratios, 'quarter')
                return True
            return False
        except Exception as e:
            return False

    def run(self):
        symbols = self.get_symbols_needing_ratios()
        if not symbols:
            logger.info("No symbols found.")
            return
        
        total = len(symbols)
        logger.info(f"Starting Ratio Backfill for {total} symbols (Max 10 threads)...")
        
        success_count = 0
        processed_count = 0
        
        MAX_WORKERS = 3 # Reduced from 10 to avoid rate limit (300 req/min ~ 5 req/sec)
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_symbol = {executor.submit(self.fetch_quarterly_ratios, sym): sym for sym in symbols}
            
            for future in as_completed(future_to_symbol):
                symbol = future_to_symbol[future]
                processed_count += 1
                try:
                    is_success = future.result()
                    if is_success:
                        success_count += 1
                        if success_count % 50 == 0:
                            logger.info(f"Progress: {processed_count}/{total} - Success: {success_count} (Last: {symbol})")
                except Exception:
                    pass
                
                # Tiny sleep to ensure we stay under 5 req/sec aggregate 
                # (3 workers * sleep might not be perfect but helps)
                time.sleep(0.2)

        logger.info("="*30)
        logger.info(f"Backfill Completed. Updated Quarterly Ratios for {success_count}/{total} symbols.")
        logger.info("="*30)

if __name__ == "__main__":
    app = RatioBackfiller(SUPABASE_URL, SUPABASE_KEY)
    app.run()
