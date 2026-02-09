"""
Backfill script - Modified to work without .env file
Run from scripts directory: python backfill_historical.py
"""
import os
import sys

# Add current directory to path so we can import providers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import date, timedelta
from time import sleep
from supabase import create_client, Client
import logging

# Import providers
from providers.sbv_interbank import SBVInterbankProvider

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials in environment variables")
    logger.error("Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def backfill_interbank_data(start_date: date, end_date: date):
    """
    Backfill interbank rates data from start_date to end_date
    """
    provider = SBVInterbankProvider()
    current_date = start_date
    total_days = (end_date - start_date).days + 1
    processed_days = 0
    successful_days = 0
    failed_days = 0
    
    logger.info("="*60)
    logger.info(f"Starting backfill from {start_date} to {end_date}")
    logger.info(f"Total days to process: {total_days}")
    logger.info("="*60)
    
    while current_date <= end_date:
        processed_days += 1
        logger.info(f"\n[{processed_days}/{total_days}] Processing {current_date}...")
        
        try:
            # Fetch data for this date
            data = provider.fetch(current_date)
            
            if data and len(data) > 0:
                logger.info(f"  ✓ Fetched {len(data)} records")
                
                # Insert to database
                result = supabase.table("interbank_rates").upsert(
                    data, 
                    on_conflict="date,tenor_label,source"
                ).execute()
                
                logger.info(f"  ✓ Inserted to database")
                successful_days += 1
            else:
                logger.info(f"  ⚠ No data available")
                failed_days += 1
            
            # Sleep to avoid overwhelming the server
            sleep(2)  # 2 seconds between requests
            
        except Exception as e:
            logger.error(f"  ✗ Error: {e}")
            failed_days += 1
            sleep(5)  # Longer sleep on error
        
        # Move to next day
        current_date += timedelta(days=1)
        
        # Progress update every 10 days
        if processed_days % 10 == 0:
            logger.info(f"\n{'='*60}")
            logger.info(f"Progress: {processed_days}/{total_days} days")
            logger.info(f"Success: {successful_days}, Failed: {failed_days}")
            logger.info(f"{'='*60}")
    
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("BACKFILL COMPLETE!")
    logger.info(f"Total days processed: {processed_days}")
    logger.info(f"Successful: {successful_days}")
    logger.info(f"Failed/No data: {failed_days}")
    logger.info("="*60)

if __name__ == "__main__":
    # Calculate date range: 2 years from today
    end_date = date.today()
    start_date = end_date - timedelta(days=730)  # 2 years
    
    print("\n" + "="*60)
    print("SBV Interbank Rates - Historical Data Backfill")
    print("="*60)
    print(f"\nDate range: {start_date} to {end_date}")
    print(f"Total days: {(end_date - start_date).days + 1}")
    print(f"Estimated time: ~{((end_date - start_date).days + 1) * 2 / 60:.0f} minutes")
    print("\nNote: SBV may not have data for weekends/holidays")
    print("="*60)
    
    response = input("\nProceed with backfill? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        backfill_interbank_data(start_date, end_date)
    else:
        logger.info("Backfill cancelled by user")
