"""
Script to fix incorrectly scaled rates in interbank_rates table
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

def fix_rate(rate):
    if rate is None:
        return None
    
    # Logic: if rate > 15 and is likely a concatenated integer
    # (Interbank rates are almost always < 15%)
    
    # 828.0 -> 8.28
    if rate >= 100:
        return rate / 100.0
    # 85.0 -> 8.5
    elif rate >= 20: 
        return rate / 10.0
    
    return rate

def fix_all_records():
    try:
        # Fetch records with suspiciously high rates
        # We'll fetch everything from SBV source to be safe
        result = supabase.table("interbank_rates").select("*").eq("source", "SBV").gt("rate", 15).execute()
        records = result.data
        
        logger.info(f"Found {len(records)} records to fix")
        
        for record in records:
            old_rate = record['rate']
            new_rate = fix_rate(old_rate)
            
            if old_rate != new_rate:
                logger.info(f"Fixing {record['date']} {record['tenor_label']}: {old_rate} -> {new_rate}")
                supabase.table("interbank_rates").update({"rate": new_rate}).match({
                    "date": record['date'],
                    "tenor_label": record['tenor_label'],
                    "source": record['source']
                }).execute()
        
        logger.info("Fix complete.")
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    fix_all_records()
