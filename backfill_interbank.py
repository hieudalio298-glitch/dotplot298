"""
Backfill script to scrape 2 years of historical interbank rates from SBV
"""
import sys
import os
from datetime import datetime, timedelta
from time import sleep

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

from providers.sbv_interbank import SBVInterbankProvider
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def backfill_interbank_data(start_date: datetime, end_date: datetime):
    """
    Backfill interbank rates data from start_date to end_date
    
    Args:
        start_date: Starting date (inclusive)
        end_date: Ending date (inclusive)
    """
    provider = SBVInterbankProvider()
    current_date = start_date
    total_days = (end_date - start_date).days + 1
    processed_days = 0
    successful_days = 0
    failed_days = 0
    
    logger.info(f"Starting backfill from {start_date.date()} to {end_date.date()}")
    logger.info(f"Total days to process: {total_days}")
    
    while current_date <= end_date:
        processed_days += 1
        logger.info(f"\n[{processed_days}/{total_days}] Processing {current_date.date()}...")
        
        try:
            # Fetch data for this date
            data = provider.fetch(current_date.date())
            
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
                logger.info(f"  ⚠ No data available for this date")
                failed_days += 1
            
            # Sleep to avoid overwhelming the server
            sleep(2)  # 2 seconds between requests
            
        except Exception as e:
            logger.error(f"  ✗ Error processing {current_date.date()}: {e}")
            failed_days += 1
            sleep(5)  # Longer sleep on error
        
        # Move to next day
        current_date += timedelta(days=1)
        
        # Progress update every 10 days
        if processed_days % 10 == 0:
            logger.info(f"\nProgress: {processed_days}/{total_days} days processed")
            logger.info(f"Success: {successful_days}, Failed: {failed_days}")
    
    # Final summary
    logger.info("\n" + "="*60)
    logger.info("BACKFILL COMPLETE!")
    logger.info(f"Total days processed: {processed_days}")
    logger.info(f"Successful: {successful_days}")
    logger.info(f"Failed/No data: {failed_days}")
    logger.info("="*60)

if __name__ == "__main__":
    # Calculate date range: 2 years from today
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)  # 2 years = ~730 days
    
    logger.info("="*60)
    logger.info("SBV Interbank Rates - Historical Data Backfill")
    logger.info("="*60)
    
    # Confirm with user
    print(f"\nThis will scrape data from {start_date.date()} to {end_date.date()}")
    print(f"Total days: {(end_date - start_date).days + 1}")
    print(f"Estimated time: ~{((end_date - start_date).days + 1) * 2 / 60:.0f} minutes")
    print("\nNote: SBV may not have data for all dates (weekends, holidays)")
    
    response = input("\nProceed with backfill? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        backfill_interbank_data(start_date, end_date)
    else:
        logger.info("Backfill cancelled by user")
