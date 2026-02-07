import os
import time
import json
import logging
import pandas as pd
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from vnstock_data import Finance, Listing, Company

# --- Configuration ---
# User provided credentials
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

class FinancialFetcher:
    def __init__(self, supabase_url: str, supabase_key: str):
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key)
            logger.info("Connected to Supabase successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise

    def sync_stock_symbols(self):
        """Fetch latest stock list from vnstock and update 'stock_symbols' table."""
        logger.info("Syncing stock symbols from VNStock...")
        try:
            # Listing source 'vnd' as requested
            listing = Listing(source='vnd') 
            # Get all symbols
            df = listing.all_symbols()
            
            if df is None or df.empty:
                logger.error("Failed to fetch symbols from VNStock.")
                return

            logger.info(f"VNStock Columns: {df.columns.tolist()}")

            # Keep relevant columns and rename if necessary to match DB
            # DB Schema: symbol (PK), company_name
            # DB Schema: symbol (PK), company_name
            # VNStock VND Columns include: 'symbol', 'company_name'
            
            symbols_to_upsert: List[Dict[str, Any]] = []
            for _, row in df.iterrows():
                symbols_to_upsert.append({
                    'symbol': row['symbol'],
                    'company_name': row.get('company_name', row.get('organ_name', '')),
                })
            
            # Upsert in batches to avoid payload limit
            batch_size = 1000
            for i in range(0, len(symbols_to_upsert), batch_size):
                batch: List[Dict[str, Any]] = symbols_to_upsert[i:i+batch_size]
                self.supabase.table('stock_symbols').upsert(batch).execute()
                logger.info(f"Upserted batch {i} - {i+len(batch)}")
            
            logger.info("Stock symbols sync completed.")

        except Exception as e:
            logger.error(f"Error syncing stock symbols: {e}")

    def sync_industry_details(self, limit: Optional[int] = None, max_workers: int = 10):
        """Fetch industry and share details using Company.overview() with parallel processing."""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        logger.info(f"Syncing industry details with {max_workers} workers...")
        
        try:
            response = self.supabase.table('stock_symbols') \
                .select('symbol') \
                .is_('icb_name2', 'null') \
                .execute()
            symbols = [item['symbol'] for item in (response.data or [])]
            
            if limit:
                symbols = symbols[:limit]
            
            logger.info(f"Processing {len(symbols)} symbols...")

            def process_symbol(symbol):
                # Try sources in order
                sources = ['VCI', 'KBS']
                for source in sources:
                    try:
                        cp = Company(symbol=symbol, source=source)
                        df = cp.overview()
                        
                        if df is not None and not df.empty:
                            row = df.iloc[0]
                            update_data = {
                                'icb_name2': row.get('icb_name2', 'Unknown'),
                                'financial_ratio_issue_share': float(row.get('financial_ratio_issue_share', 0)) if row.get('financial_ratio_issue_share') else 0
                            }
                            
                            self.supabase.table('stock_symbols').update(update_data).eq('symbol', symbol).execute()
                            logger.info(f"Updated {symbol} via {source}: {update_data['icb_name2']}")
                            return True
                    except Exception as e:
                        logger.debug(f"Source {source} failed for {symbol}: {e}")
                
                # If we reach here, both sources likely failed or have no data
                # We update with 'N/A' to avoid re-processing invalid symbols in basic null checks
                try:
                    self.supabase.table('stock_symbols').update({'icb_name2': 'N/A'}).eq('symbol', symbol).execute()
                    logger.warning(f"No data found for {symbol} after trying all sources.")
                except: pass
                return False

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(process_symbol, s): s for s in symbols}
                for future in as_completed(futures):
                    pass
                
            logger.info("Industry details sync completed.")
        except Exception as e:
            logger.error(f"Overall error in sync_industry_details: {e}")

    def get_symbols(self, start_offset=0) -> List[str]:
        """Fetch stock symbols that need updating (null last_updated_at)."""
        try:
            # We filter for symbols where last_updated_at IS NULL
            # This allows "smart resume" - processing anything that hasn't finished yet.
            
            all_symbols = []
            
            # Filter for symbols that haven't been updated yet
            response = self.supabase.table('stock_symbols') \
                .select('symbol') \
                .is_('last_updated_at', 'null') \
                .execute()
                
            data = response.data
            if data:
                all_symbols = [item['symbol'] for item in data]

            logger.info(f"Fetched {len(all_symbols)} pending symbols from Supabase.")
            return all_symbols
        except Exception as e:
            logger.error(f"Error fetching symbols from Supabase: {e}")
            return []

    def fetch_and_process_financials(self, symbol: str):
        """Fetch financial data for a single symbol and upsert to Supabase."""
        source = 'MAS'
        try:
            # Initialize vnstock_data Finance API
            finance = Finance(symbol=symbol, source=source)
            
            logger.info(f"[{symbol}] Starting data fetch from {source}...")

            # 1. Balance Sheet
            logger.info(f"[{symbol}] Fetching Balance Sheets...")
            self._process_statement(symbol, finance.balance_sheet(period='year', lang='vi', size=100), 'balance_sheet', 'year')
            self._process_statement(symbol, finance.balance_sheet(period='quarter', lang='vi', size=100), 'balance_sheet', 'quarter')

            # 2. Income Statement
            logger.info(f"[{symbol}] Fetching Income Statements...")
            self._process_statement(symbol, finance.income_statement(period='year', lang='vi', size=100), 'income_statement', 'year')
            self._process_statement(symbol, finance.income_statement(period='quarter', lang='vi', size=100), 'income_statement', 'quarter')

            # 3. Cash Flow
            logger.info(f"[{symbol}] Fetching Cash Flows...")
            self._process_statement(symbol, finance.cash_flow(period='year', lang='vi', size=100), 'cash_flow', 'year')
            self._process_statement(symbol, finance.cash_flow(period='quarter', lang='vi', size=100), 'cash_flow', 'quarter')

            # 4. Financial Ratios
            logger.info(f"[{symbol}] Fetching Financial Ratios...")
            self._process_ratios(symbol, finance.ratio(period='year', lang='vi', size=100), 'year')
            self._process_ratios(symbol, finance.ratio(period='quarter', lang='vi', size=100), 'quarter')
            
            # Mark completion
            self.supabase.table('stock_symbols').update({'last_updated_at': pd.Timestamp.now().isoformat()}).eq('symbol', symbol).execute()
            logger.info(f"[{symbol}] Finished all reports.")
            
            logger.info(f"[{symbol}] DONE.")

        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}")
            raise e

    def _process_statement(self, symbol: str, df: Optional[pd.DataFrame], statement_type: str, period_type: str):
        if df is None or df.empty:
            return

        try:
            df = df.copy()
            logger.info(f"[{symbol}] Processing {statement_type} ({period_type}) from MAS...")
            
            # --- MAS Source Intelligence ---
            # If 'period' or 'year_period' is in columns, MAS returned "Long" format (Metrics as Columns).
            # We DON'T need to transpose, just map the period column.
            is_mas_long = any(p in df.columns for p in ['period', 'year_period', 'Kỳ báo cáo', 'report_period'])
            
            if not is_mas_long:
                # If it's Wide (Years as columns) or Classic (Metrics as rows), we TRANSPOSE
                # Detect metric column first
                potential_metric_cols = ['Chỉ tiêu', 'item', 'index', 'Name', 'metric', 'category', 'Unnamed: 0']
                metric_col = next((c for c in df.columns if any(p.lower() == str(c).lower() for p in potential_metric_cols)), None)
                
                if metric_col:
                    df = df.set_index(metric_col)
                df = df.transpose()
                df.index.name = 'Kỳ báo cáo'
                df = df.reset_index()
                logger.info(f"[{symbol}] Transposed data to align periods into rows.")
            else:
                logger.info(f"[{symbol}] MAS Long format detected, preserving columns as metrics.")

            # Identify the actual time column
            time_col = next((c for c in df.columns if c in ['period', 'year_period', 'Kỳ báo cáo', 'report_period', 'index']), 'index')
            
            # Extract Year/Quarter
            def extract_time(row):
                val = str(row.get(time_col, ''))
                year = None
                quarter = None
                # Regex for 4 digits year
                import re
                y_match = re.search(r'(\d{4})', val)
                if y_match:
                    year = y_match.group(1)
                
                # Regex for quarter
                q_match = re.search(r'[Qq](\d)', val)
                if q_match:
                    quarter = q_match.group(1)
                elif '-' in val and not q_match:
                    # Handle 2023-1
                    parts = val.split('-')
                    if len(parts) > 1 and parts[1].isdigit():
                        quarter = parts[1]
                return pd.Series([year, quarter])

            df[['Năm', 'Quý']] = df.apply(extract_time, axis=1)

            # Drop duplicate columns
            df = df.loc[:, ~df.columns.duplicated()]
            
            # Clean and convert to JSON
            df_clean = df.where(pd.notnull(df), None)
            data_json = json.loads(df_clean.to_json(orient='records', date_format='iso'))

            payload = {
                'symbol': symbol,
                'statement_type': statement_type,
                'period_type': period_type,
                'data': data_json,
                'updated_at': pd.Timestamp.now().isoformat()
            }

            self.supabase.table('financial_statements').upsert(payload).execute()
        except Exception as e:
            logger.error(f"[{symbol}] Failed to upsert {statement_type} ({period_type}): {e}")

    def _process_ratios(self, symbol: str, df: Optional[pd.DataFrame], period_type: str):
        if df is None or df.empty:
            return

        try:
            df = df.copy()
            logger.info(f"[{symbol}] Processing Ratios ({period_type}) from MAS...")

            # --- MAS Source Intelligence ---
            is_mas_long = any(p in df.columns for p in ['period', 'year_period', 'Kỳ báo cáo', 'report_period'])
            
            if not is_mas_long:
                # Transpose if not in Long format
                potential_metric_cols = ['Chỉ tiêu', 'item', 'index', 'Name', 'metric', 'category', 'Unnamed: 0']
                metric_col = next((c for c in df.columns if any(p.lower() == str(c).lower() for p in potential_metric_cols)), None)
                
                if metric_col:
                    df = df.set_index(metric_col)
                df = df.transpose()
                df.index.name = 'Kỳ báo cáo'
                df = df.reset_index()
            else:
                logger.info(f"[{symbol}] MAS Ratios Long format detected.")

            # Identify time column and extract Year/Quarter
            time_col = next((c for c in df.columns if c in ['period', 'year_period', 'Kỳ báo cáo', 'report_period', 'index']), 'index')
            
            def extract_time(row):
                val = str(row.get(time_col, ''))
                year, quarter = None, None
                import re
                y_match = re.search(r'(\d{4})', val)
                if y_match: year = y_match.group(1)
                q_match = re.search(r'[Qq](\d)', val)
                if q_match: quarter = q_match.group(1)
                elif '-' in val and not q_match:
                    parts = val.split('-')
                    if len(parts) > 1 and parts[1].isdigit(): quarter = parts[1]
                return pd.Series([year, quarter])

            df[['Năm', 'Quý']] = df.apply(extract_time, axis=1)

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
            logger.error(f"[{symbol}] Failed to upsert Ratios ({period_type}): {e}")

    def process_symbol_safely(self, symbol: str) -> bool:
        """Wrapper to safely process a symbol and return success status."""
        try:
            self.fetch_and_process_financials(symbol)
            return True
        except Exception as e:
            logger.error(f"Failed to process {symbol}: {e}")
            return False

    def run(self, test_mode=False, test_symbols=None):
        # 1. Sync stock symbols list (only if needed/not recently run, but safe to run)
        if not test_mode:
            # self.sync_stock_symbols() 
            pass

        # 2. Get symbols to process
        if test_mode:
            symbols = test_symbols or ['VNM', 'HPG']
            logger.info(f"Running in TEST MODE with symbols: {symbols}")
        else:
            # Resume mode: Get all pending symbols
            symbols = self.get_symbols()
            if not symbols:
                logger.info("No pending symbols found. All updated!")
                return
        
        total = len(symbols)
        logger.info(f"Resuming processing for {total} pending symbols with MULTI-THREADING (5 workers)...")
        
        success_count: int = 0
        failure_count: int = 0
        
        from concurrent.futures import ThreadPoolExecutor, as_completed

        # Giảm số worker xuống 5 để tránh lỗi WinError 10035/10054 (nghẽn mạng/socket)
        MAX_WORKERS = 5
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Create a dictionary to map futures to symbols
            future_to_symbol = {executor.submit(self.process_symbol_safely, sym): sym for sym in symbols}
            
            completed_count = 0
            for future in as_completed(future_to_symbol):
                symbol = future_to_symbol[future]
                completed_count += 1
                try:
                    is_success = future.result()
                    if is_success:
                        success_count += 1
                        logger.info(f"[{completed_count}/{total}] Success: {symbol}")
                    else:
                        failure_count += 1
                        logger.info(f"[{completed_count}/{total}] Failed: {symbol}")
                except Exception as exc:
                    logger.error(f"[{completed_count}/{total}] Exception for {symbol}: {exc}")
                    failure_count = failure_count + 1

        logger.info("="*30)
        logger.info("SUMMARY")
        logger.info(f"Total Processed: {total}")
        logger.info(f"Success: {success_count}")
        logger.info(f"Failed: {failure_count}")
        logger.info("="*30)

if __name__ == "__main__":
    app = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    
    # Run full production sync
    # WARNING: This will take a long time (1600+ symbols * 3s = ~1.5 hours)
    app.run(test_mode=False)
