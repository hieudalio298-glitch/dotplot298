import os
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from vnstock_data import Trading, TopStock, Listing
import logging

# --- CONFIGURATION ---
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

# API Key usually loaded by vnstock_data from env var VNSTOCK_API_KEY
# If needed, set it here or ensure it's in the environment

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MarketStatsUpdater:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.trading = Trading()
        self.top_stock = TopStock()
        self.listing = Listing(source='vnd')

    def fetch_market_summary(self, date_str: str, indexes=['VNINDEX', 'VN30']):
        """Get market-wide foreign and proprietary trade summaries for a specific date."""
        results = []
        for idx in indexes:
            logger.info(f"Fetching summary stats for {idx} on {date_str}...")
            
            # Foreign
            try:
                df_f = self.trading.foreign_trade(symbol=idx, start_date=date_str, end_date=date_str)
                if df_f is not None and not df_f.empty:
                    # Depending on vnstock_data version, column names vary. Flattening just in case.
                    if isinstance(df_f.columns[0], tuple):
                         df_f.columns = ['_'.join(col).strip() for col in df_f.columns.values]
                    
                    # Expected columns: date, buy_value, sell_value, net_value, buy_volume, sell_volume, net_volume
                    # Mapping might be needed based on actual output
                    for _, row in df_f.iterrows():
                         results.append({
                              'date': date_str,
                              'category': 'foreign',
                              'index_symbol': idx,
                              'buy_value': row.get('buy_value', row.get('total_buy_value')),
                              'sell_value': row.get('sell_value', row.get('total_sell_value')),
                              'net_value': row.get('net_buy_value', row.get('net_value')),
                              'buy_volume': row.get('buy_volume', row.get('total_buy_volume')),
                              'sell_volume': row.get('sell_volume', row.get('total_sell_volume')),
                              'net_volume': row.get('net_buy_volume', row.get('net_volume'))
                         })
            except Exception as e:
                logger.error(f"Error fetching foreign summary for {idx}: {e}")

            # Prop (Tự doanh)
            try:
                df_p = self.trading.prop_trade(symbol=idx, start_date=date_str, end_date=date_str)
                if df_p is not None and not df_p.empty:
                    if isinstance(df_p.columns[0], tuple):
                         df_p.columns = ['_'.join(col).strip() for col in df_p.columns.values]
                    
                    for _, row in df_p.iterrows():
                         results.append({
                              'date': date_str,
                              'category': 'prop',
                              'index_symbol': idx,
                              'buy_value': row.get('buy_value', row.get('total_buy_value')),
                              'sell_value': row.get('sell_value', row.get('total_sell_value')),
                              'net_value': row.get('net_buy_value', row.get('net_value')),
                              'buy_volume': row.get('buy_volume', row.get('total_buy_volume')),
                              'sell_volume': row.get('sell_volume', row.get('total_sell_volume')),
                              'net_volume': row.get('net_buy_volume', row.get('net_volume'))
                         })
            except Exception as e:
                logger.error(f"Error fetching prop summary for {idx}: {e}")
        
        if results:
             self.supabase.table('market_stats_daily').upsert(results).execute()
             logger.info(f"Upserted {len(results)} market summary records.")

    def fetch_top_tickers_stats(self, date_str: str, groups=['HOSE', 'HNX', 'UPCOM']):
        """Fetch top buy/sell for tickers."""
        ticker_stats = []
        
        # 1. Foreign Top
        for group in groups:
             logger.info(f"Fetching Top Foreign stats for {group} on {date_str}...")
             try:
                  # Foreign Buy
                  df_fb = self.top_stock.foreign_buy(listing_group=group)
                  if df_fb is not None and not df_fb.empty:
                       for _, row in df_fb.iterrows():
                            ticker_stats.append({
                                 'date': date_str,
                                 'symbol': row['symbol'],
                                 'category': 'foreign',
                                 'net_value': row.get('net_buy_value'),
                                 'net_volume': row.get('net_buy_volume'),
                                 'buy_value': row.get('buy_value'),
                                 'sell_value': row.get('sell_value'),
                                 'buy_volume': row.get('buy_volume'),
                                 'sell_volume': row.get('sell_volume')
                            })
                  # Foreign Sell
                  df_fs = self.top_stock.foreign_sell(listing_group=group)
                  if df_fs is not None and not df_fs.empty:
                       for _, row in df_fs.iterrows():
                            ticker_stats.append({
                                 'date': date_str,
                                 'symbol': row['symbol'],
                                 'category': 'foreign',
                                 'net_value': row.get('net_buy_value', -row.get('net_sell_value', 0)), # handle signage if needed
                                 'net_volume': row.get('net_buy_volume', -row.get('net_sell_volume', 0))
                            })
             except Exception as e:
                  logger.error(f"Error fetching top foreign for {group}: {e}")

        # 2. Prop (Tự doanh) Top - Tự doanh data commonly available in Trading.prop_trade for index
        # To get top prop for all stickers, we usually need another endpoint or aggregate.
        # If vnstock_data has a direct method, we use it. Otherwise we fetch index prop and note summary.
        # Many sources don't provide "Top Tự Doanh" as a clean list for free.
        # But we'll try to find it.

        if ticker_stats:
             # Upsert to DB
             # We should probably deduplicate and combine buy/sell into net if needed
             # Here we just batch upsert
             batch_size = 500
             for i in range(0, len(ticker_stats), batch_size):
                  batch = ticker_stats[i:i+batch_size]
                  self.supabase.table('ticker_market_stats_daily').upsert(batch).execute()
             logger.info(f"Upserted {len(ticker_stats)} ticker market stats records.")

    def run(self, days_back=1):
        """Run update for past X days."""
        for i in range(days_back):
             d = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
             self.fetch_market_summary(d)
             # Note: Top tickers stats from top_stock usually return CURRENT day/recent.
             # Historical top stats might need a different approach.
             if i == 0:
                  self.fetch_top_tickers_stats(d)

if __name__ == "__main__":
    updater = MarketStatsUpdater()
    updater.run(days_back=1)
