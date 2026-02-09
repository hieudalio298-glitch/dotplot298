"""
Script to delete 'ABO' source data from interbank_rates table
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def delete_abo_data():
    try:
        # Check current count
        result = supabase.table("interbank_rates").select("count", count="exact").eq("source", "ABO").execute()
        count = result.count
        logger.info(f"Found {count} records with source='ABO'")
        
        if count > 0:
            # Delete records
            logger.info("Deleting records...")
            supabase.table("interbank_rates").delete().eq("source", "ABO").execute()
            logger.info("Deletion complete.")
        else:
            logger.info("No records found to delete.")
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    delete_abo_data()
