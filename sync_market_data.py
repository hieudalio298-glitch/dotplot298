import os
import pandas as pd
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
from vnstock_data import Trading, TopStock, Listing, config
from dotenv import load_dotenv

import sys
sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')

# --- CONFIGURATION ---
# Replace with your actual Supabase credentials if different
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://utqmpdmbkubhzuccqeyf.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")

# Initialize vnstock_data config with API key from environment
config.api_key = os.environ.get("VNSTOCK_API_KEY")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('market_sync.log')]
)
logger = logging.getLogger(__name__)

class MarketDataSponsor:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.trading = Trading()
        self.top_stock = TopStock()
        
    def _clean_numeric(self, val):
        if val is None or pd.isna(val):
            return 0
        try:
            return float(val)
        except:
            return 0

    def fetch_market_summary(self, date_str: str, indexes=['VNINDEX', 'VN30']):
        """
        Fetches daily summary for Foreign and Proprietary trading for indices.
        """
        market_stats = []
        # Sources for Trading: 'CAFEF', 'VCI', 'KBS' are commonly supported
        # For indices, CAFEF is often reliable for summary data
        sources = ['CAFEF', 'KBS'] 

        for index in indexes:
            logger.info(f"[{date_str}] Fetching Market Summary for {index}...")
            
            # Try Foreign
            success_f = False
            for s in sources:
                try:
                    t = Trading(source=s)
                    df_f = t.foreign_trade(symbol=index, start_date=date_str, end_date=date_str)
                    if df_f is not None and not df_f.empty:
                        if isinstance(df_f.columns[0], tuple):
                             df_f.columns = ['_'.join(col).strip() for col in df_f.columns.values]
                        
                        for _, row in df_f.iterrows():
                            market_stats.append({
                                'date': date_str,
                                'category': 'foreign',
                                'index_symbol': index,
                                'buy_value': self._clean_numeric(row.get('buy_value', row.get('total_buy_value'))),
                                'sell_value': self._clean_numeric(row.get('sell_value', row.get('total_sell_value'))),
                                'net_value': self._clean_numeric(row.get('net_buy_value', row.get('net_value'))),
                                'buy_volume': self._clean_numeric(row.get('buy_volume', row.get('total_buy_volume'))),
                                'sell_volume': self._clean_numeric(row.get('sell_volume', row.get('total_sell_volume'))),
                                'net_volume': self._clean_numeric(row.get('net_buy_volume', row.get('net_volume')))
                            })
                        success_f = True
                        logger.info(f"  [Foreign] Success with source {s}")
                        break
                except Exception as e:
                    logger.debug(f"  [Foreign] Source {s} failed for {index}: {e}")
            
            # Try Prop (Tự doanh) - Sources: 'KBS' is usually best for Prop
            success_p = False
            prop_sources = ['KBS', 'VCI']
            for s in prop_sources:
                try:
                    t = Trading(source=s)
                    df_p = t.prop_trade(symbol=index, start_date=date_str, end_date=date_str)
                    if df_p is not None and not df_p.empty:
                        if isinstance(df_p.columns[0], tuple):
                             df_p.columns = ['_'.join(col).strip() for col in df_p.columns.values]
                             
                        for _, row in df_p.iterrows():
                            market_stats.append({
                                'date': date_str,
                                'category': 'prop',
                                'index_symbol': index,
                                'buy_value': self._clean_numeric(row.get('buy_value', row.get('total_buy_value'))),
                                'sell_value': self._clean_numeric(row.get('sell_value', row.get('total_sell_value'))),
                                'net_value': self._clean_numeric(row.get('net_buy_value', row.get('net_value'))),
                                'buy_volume': self._clean_numeric(row.get('buy_volume', row.get('total_buy_volume'))),
                                'sell_volume': self._clean_numeric(row.get('sell_volume', row.get('total_sell_volume'))),
                                'net_volume': self._clean_numeric(row.get('net_buy_volume', row.get('net_volume')))
                            })
                        success_p = True
                        logger.info(f"  [Prop] Success with source {s}")
                        break
                except Exception as e:
                    logger.debug(f"  [Prop] Source {s} failed for {index}: {e}")

        if market_stats:
            try:
                self.supabase.table('market_stats_daily').upsert(market_stats).execute()
                logger.info(f"Upserted {len(market_stats)} index summary records.")
            except Exception as e:
                logger.error(f"Supabase Upsert Error (Market Stats): {e}")
                logger.info("Tip: Have you run the SQL migration to create the tables?")

    def fetch_top_tickers(self, date_str: str):
        """
        Fetches Top Net Buy/Sell for Tickers (Foreign & Prop).
        """
        ticker_data = []
        groups = ['HOSE', 'HNX', 'UPCOM']
        
        # Foreign Tops
        for group in groups:
            logger.info(f"[{date_str}] Fetching Top Foreign tickers ({group})...")
            try:
                # Top Foreign Buy
                df_buy = self.top_stock.foreign_buy(listing_group=group, date=date_str)
                if df_buy is not None and not df_buy.empty:
                    for _, row in df_buy.iterrows():
                        ticker_data.append({
                            'date': date_str,
                            'symbol': row['symbol'],
                            'category': 'foreign',
                            'buy_value': self._clean_numeric(row.get('buy_value')),
                            'sell_value': self._clean_numeric(row.get('sell_value')),
                            'net_value': self._clean_numeric(row.get('net_value', row.get('net_buy_value', 0))),
                            'buy_volume': self._clean_numeric(row.get('buy_volume')),
                            'sell_volume': self._clean_numeric(row.get('sell_volume')),
                            'net_volume': self._clean_numeric(row.get('net_volume', row.get('net_buy_volume', 0)))
                        })
                
                # Top Foreign Sell
                df_sell = self.top_stock.foreign_sell(listing_group=group, date=date_str)
                if df_sell is not None and not df_sell.empty:
                    for _, row in df_sell.iterrows():
                        ticker_data.append({
                            'date': date_str,
                            'symbol': row['symbol'],
                            'category': 'foreign',
                            'buy_value': self._clean_numeric(row.get('buy_value')),
                            'sell_value': self._clean_numeric(row.get('sell_value')),
                            'net_value': self._clean_numeric(row.get('net_value', -row.get('net_sell_value', 0))),
                            'buy_volume': self._clean_numeric(row.get('buy_volume')),
                            'sell_volume': self._clean_numeric(row.get('sell_volume')),
                            'net_volume': self._clean_numeric(row.get('net_volume', -row.get('net_sell_volume', 0)))
                        })
            except Exception as e:
                logger.error(f"Error for {group} Top Foreign: {e}")

        # Proprietary Top - Note: Some vnstock packages provide Top Prop differently.
        # If not direct, we skip or use specific endpoint if known.
        try:
             # Placeholder for Top Prop logic if available in future vnstock update
             # df_prop = self.top_stock.prop_trade(listing_group='HOSE')
             pass
        except: pass

        if ticker_data:
            # deduplicate by (date, symbol, category) - take the one with higher net abs if multiple
            df_temp = pd.DataFrame(ticker_data)
            df_temp = df_temp.sort_values('net_value', ascending=False).drop_duplicates(['date', 'symbol', 'category'])
            
            records = df_temp.to_dict('records')
            batch_size = 500
            for i in range(0, len(records), batch_size):
                self.supabase.table('ticker_market_stats_daily').upsert(records[i:i+batch_size]).execute()
            logger.info(f"Upserted {len(records)} ticker records.")

    def backfill(self, days=30):
        current_date = datetime.now()
        for i in range(days):
            d_str = (current_date - timedelta(days=i)).strftime('%Y-%m-%d')
            # Check if holiday (Saturday=5, Sunday=6)
            weekday = (current_date - timedelta(days=i)).weekday()
            if weekday >= 5: continue
            
            self.fetch_market_summary(d_str)
            self.fetch_top_tickers(d_str)

if __name__ == "__main__":
    sponsor_sync = MarketDataSponsor(SUPABASE_URL, SUPABASE_KEY)
    # Check if we have an API KEY environment variable
    if not os.environ.get('VNSTOCK_API_KEY'):
        logger.warning("VNSTOCK_API_KEY not found in environment. Sponsor features might fail.")
    
    # Run sync for last 45 days to cover 21 sessions
    sponsor_sync.backfill(days=45)
    logger.info("Daily Market Stats Sync Completed.")
