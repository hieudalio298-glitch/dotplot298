"""
Targeted backfill for recent days to debug 'ON' missing data
"""
import os
import sys
import logging
import pandas as pd
from datetime import date, timedelta
from time import sleep

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Direct imports
try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import Select
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def debug_recent_days():
    chrome_options = Options()
    # chrome_options.add_argument("--headless") # Run visible for debugging
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        driver.get("https://sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh")
        sleep(5) # Wait for page load
        
        # Test specific days
        target_dates = [
            date(2026, 2, 6), # Friday
            date(2026, 2, 5), # Thursday
            date(2026, 2, 4)  # Wednesday
        ]
        
        for target_date in target_dates:
            print(f"\n--- Checking {target_date} ---")
            
            # Navigate date
            wait = WebDriverWait(driver, 20)
            
            # Try to find date selectors more robustly
            try:
                # Often there are 3 selects for Day, Month, Year
                selects = driver.find_elements(By.TAG_NAME, "select")
                
                if len(selects) >= 3:
                     # Heuristic: usually Day is first or has 31 options, Month has 12, Year has range
                     # Let's try to identify by order: Day, Month, Year
                     day_el = selects[0]
                     month_el = selects[1]
                     year_el = selects[2]
                     
                     logger.info("Found 3+ selects, attempting to set date...")
                     Select(day_el).select_by_value(str(target_date.day))
                     Select(month_el).select_by_value(str(target_date.month))
                     Select(year_el).select_by_value(str(target_date.year))
                else:
                    logger.warning("Could not find 3 select elements. Trying XPath fallback.")
                    # Fallback to text proximity if needed (not implemented here for brevity, trusting selects count)
            except Exception as e:
                logger.error(f"Error setting date selectors: {e}")

            # Click view button - find by text 'Xem' or 'View' or class
            try:
                submit_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Xem') or contains(text(), 'Tra cứu')]")
                submit_btn.click()
            except:
                 # Fallback to original ID attempt if text fails
                 try:
                    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[id*='cb1']")
                    driver.execute_script("arguments[0].click();", submit_btn)
                 except:
                    logger.error("Could not find Submit button")
            
            sleep(5) # Wait for table refresh
            
            # Parse table
            try:
                table = driver.find_element(By.CSS_SELECTOR, "table[id*='t1']")
                html = table.get_attribute('outerHTML')
                df = pd.read_html(html)[0]
                
                print("Table Content Found:")
                print(df.to_string())
                
                # Check for ON
                found_on = False
                for idx, row in df.iterrows():
                    # Print first column (Tenor)
                    first_col = str(row.iloc[0]).strip() if len(row) > 0 else "EMPTY"
                    print(f"Row {idx} Tenor: '{first_col}'")
                    
                    if 'qua đêm' in first_col.lower() or 'on' in first_col.lower():
                        found_on = True
                        print(">>> FOUND MATCH FOR ON!")
                        
                        # Extract Rate
                        if len(row) > 1:
                            rate_str = str(row.iloc[1]).replace(',', '.')
                            try:
                                rate = float(rate_str)
                                # Fix scaling
                                if rate >= 100: rate = rate / 100.0
                                elif rate >= 20: rate = rate / 10.0
                                
                                # Insert immediately
                                print(f"Inserting ON rate: {rate}")
                                supabase.table("interbank_rates").upsert({
                                    "date": target_date.isoformat(),
                                    "tenor_label": "ON",
                                    "rate": rate,
                                    "source": "SBV",
                                    "fetched_at": date.today().isoformat()
                                }, on_conflict="date,tenor_label,source").execute()
                                
                            except Exception as e:
                                print(f"Error parsing rate: {e}")
                
                if not found_on:
                    print(">>> NO MATCH FOR ON FOUND IN THIS TABLE")
                    
            except Exception as e:
                print(f"No table found or error: {e}")
                
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_recent_days()
