"""
Script to fix incorrect tenor labels in interbank_rates table
(e.g., 'Qua đêm' -> 'ON')
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

def fix_tenor_labels():
    try:
        # Check for records with "Qua đêm"
        # We search specifically for variations
        variations = ["Qua đêm", "qua đêm", "Qua đêm ", " qua đêm", "Overnight"]
        
        total_fixed = 0
        for var in variations:
            result = supabase.table("interbank_rates").select("*").eq("tenor_label", var).execute()
            records = result.data
            
            if records:
                logger.info(f"Found {len(records)} records with tenor_label='{var}'")
                for record in records:
                    logger.info(f"Fixing {record['date']} {record['tenor_label']} -> ON")
                    # Note: We use match for specific record update
                    supabase.table("interbank_rates").update({"tenor_label": "ON"}).match({
                        "date": record['date'],
                        "tenor_label": record['tenor_label'],
                        "source": record['source']
                    }).execute()
                    total_fixed += 1
        
        logger.info(f"Fix complete. Total records updated: {total_fixed}")
            
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    fix_tenor_labels()
