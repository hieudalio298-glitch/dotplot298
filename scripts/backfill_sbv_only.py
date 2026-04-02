"""
Script to backfill ONLY SBV Interbank Rates (skip HNX Yield Curve)
Run from project root: python scripts/backfill_sbv_only.py
"""
import os
import sys
from datetime import date, timedelta, datetime
from time import sleep

# Add scripts directory to path to allow imports
sys.path.insert(0, os.path.dirname(__file__))

# Import directly from the file path if module import fails
try:
    from providers.sbv_interbank import SBVInterbankProvider
except ImportError:
    # Fallback to appending parent directory for running from scripts/
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from scripts.providers.sbv_interbank import SBVInterbankProvider

from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials in environment variables")
    logger.error("Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def backfill_sbv_only(days_back=730):
    provider = SBVInterbankProvider()
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)
    
    current_date = start_date
    total_days = (end_date - start_date).days + 1
    processed_count = 0
    successful_days = 0
    
    logger.info("="*60)
    logger.info("STARTING SBV INTERBANK BACKFILL (ONLY)")
    logger.info(f"From: {start_date}")
    logger.info(f"To:   {end_date}")
    logger.info("="*60)

    # We will iterate backwards from today to get recent data first
    # This is better for immediate chart visualization
    date_range = [end_date - timedelta(days=x) for x in range(total_days)]
    
    for current_date in date_range:
        processed_count += 1
        
        # Skip weekends (Saturday=5, Sunday=6)
        if current_date.weekday() >= 5:
            continue
            
        logger.info(f"[{processed_count}/{total_days}] Processing {current_date}...")
        
        try:
            # Fetch SBV data
            data = provider.fetch(current_date)
            
            if data and len(data) > 0:
                logger.info(f"  ✓ Found {len(data)} records")
                
                # Check for nan values and replace with None (null in JSON)
                cleaned_data = []
                for record in data:
                    cleaned_record = {}
                    for k, v in record.items():
                        # Simple check for NaN-like values if they are floats
                        if isinstance(v, float) and v != v:
                            cleaned_record[k] = None
                        else:
                            cleaned_record[k] = v
                    cleaned_data.append(cleaned_record)

                # Insert to Supabase
                result = supabase.table("interbank_rates").upsert(
                    cleaned_data, 
                    on_conflict="date,tenor_label,source"
                ).execute()
                
                logger.info("  ✓ Inserted to database")
                successful_days += 1
            else:
                logger.info("  - No data")
                
        except Exception as e:
            logger.error(f"  ✗ Error: {e}")
        
        # Sleep to be polite to the server
        sleep(1) 

    logger.info("="*60)
    logger.info(f"BACKFILL COMPLETED. Successfully imported {successful_days} days.")

if __name__ == "__main__":
    backfill_sbv_only(730)
