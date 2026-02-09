import os
import asyncio
from datetime import date, timedelta, datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from providers.hnx_yield_curve import HNXYieldCurveProvider

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANNON_KEY) in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def ingest_yield_curve(days_back=30):
    provider = HNXYieldCurveProvider()
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)
    
    current_date = start_date
    while current_date <= end_date:
        logger.info(f"Processing {current_date}...")
        try:
            records = provider.fetch(current_date)
            if records:
                logger.info(f"Found {len(records)} records. Inserting...")
                data, count = supabase.table("gov_yield_curve").upsert(records, on_conflict="date,tenor_label,source").execute()
                logger.info(f"Inserted successfully.")
            else:
                logger.info("No data found.")
        except Exception as e:
            logger.error(f"Failed to process {current_date}: {e}")
            
        current_date += timedelta(days=1)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="Number of days to backfill")
    parser.add_argument("--start-date", type=str, help="Start date in YYYY-MM-DD format (overrides --days)")
    args = parser.parse_args()
    
    if args.start_date:
        try:
            start_dt = datetime.strptime(args.start_date, "%Y-%m-%d").date()
            days = (date.today() - start_dt).days
            print(f"Fetching from {start_dt} ({days} days ago)...")
            ingest_yield_curve(days)
        except ValueError:
            print("Invalid date format. Please use YYYY-MM-DD")
    else:
        ingest_yield_curve(args.days)
