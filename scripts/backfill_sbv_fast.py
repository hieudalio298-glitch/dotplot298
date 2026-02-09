"""
Optimized SBV Backfill Script - Reuses Browser Session
Run from project root: python scripts/backfill_sbv_fast.py
"""
import os
import sys
import logging
import pandas as pd
from datetime import date, timedelta, datetime
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
except ImportError as e:
    print(f"Missing dependency: {e}")
    sys.exit(1)

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
    logger.error("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class FastSBVScraper:
    def __init__(self):
        self.driver = None
        self.setup_driver()
        
    def setup_driver(self):
        logger.info("Initializing optimize Chrome driver...")
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run headless for speed
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.set_page_load_timeout(30)
        
        # Load SBV page initially
        try:
            self.driver.get("https://sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh")
            sleep(3) # Initial load wait
        except Exception as e:
            logger.error(f"Failed to load SBV page: {e}")

    def fetch_date(self, target_date):
        try:
            # Refresh if needed or check current url
            if "sbv.gov.vn" not in self.driver.current_url:
                self.driver.get("https://sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh")
                sleep(2)

            params = {
                "d": target_date.day,
                "m": target_date.month,
                "y": target_date.year
            }
            
            # Find elements
            wait = WebDriverWait(self.driver, 10)
            
            # Find elements
            wait = WebDriverWait(self.driver, 15)
            
            from selenium.webdriver.support.ui import Select
            
            # Select day
            day_el = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "select[id*='soc2::content']")))
            Select(day_el).select_by_value(str(params["d"]))
            
            # Select month
            month_el = self.driver.find_element(By.CSS_SELECTOR, "select[id*='soc3::content']")
            Select(month_el).select_by_value(str(params["m"]))
            
            # Select year
            year_el = self.driver.find_element(By.CSS_SELECTOR, "select[id*='soc4::content']")
            Select(year_el).select_by_value(str(params["y"]))
            
            # Click view button
            submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button[id*='cb1']")
            self.driver.execute_script("arguments[0].click();", submit_btn)
            
            # Wait for table update
            sleep(2) 
            
            # Parse table
            try:
                # Use a more specific wait for the table to refresh if possible
                table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table[id*='t1']")))
                html = table.get_attribute('outerHTML')
                df = pd.read_html(html)[0]
                
                # Check if valid data (sometimes returns empty table)
                if df.empty or len(df.columns) < 2:
                    return []
                
                # Process data
                records = []
                # Map column names
                # Try to identify columns by content
                cols = df.columns.tolist()
                ky_han_idx = -1
                lai_suat_idx = -1
                doanh_so_idx = -1
                
                for i, col in enumerate(cols):
                    col_str = str(col).lower()
                    if 'kỳ hạn' in col_str: ky_han_idx = i
                    elif 'lãi suất' in col_str: lai_suat_idx = i
                    elif 'doanh số' in col_str: doanh_so_idx = i
                
                if ky_han_idx == -1: return []
                
                for _, row in df.iterrows():
                    try:
                        tenor = str(row.iloc[ky_han_idx]).strip()
                        # Clean tenor label
                        tenor_map = {
                            'Qua đêm': 'ON', '1 Tuần': '1W', '2 Tuần': '2W',
                            '1 Tháng': '1M', '3 Tháng': '3M', '6 Tháng': '6M',
                            '9 Tháng': '9M', '1 Năm': '1Y', '12 Tháng': '12M'
                        }
                        tenor_label = tenor_map.get(tenor, tenor)
                        
                        rate = None
                        if lai_suat_idx != -1:
                            rate_str = str(row.iloc[lai_suat_idx]).replace(',', '.')
                            try: 
                                rate = float(rate_str)
                                # Scale logic: handle cases where decimal is dropped
                                if rate >= 100:
                                    rate = rate / 100.0
                                elif rate >= 20:
                                    rate = rate / 10.0
                            except: pass
                            
                        volume = None
                        if doanh_so_idx != -1:
                            # Volume often has dots for thousands, e.g. 150.000 -> 150000
                            # But wait, Vietnamese locale uses dot for thousands and comma for specific decimal?
                            # Usually volume is integer integer billion VND
                            vol_str = str(row.iloc[doanh_so_idx]).replace('.', '').replace(',', '.')
                            try: volume = float(vol_str)
                            except: pass
                            
                        if rate is not None:
                            records.append({
                                "date": target_date.isoformat(),
                                "tenor_label": tenor_label,
                                "rate": rate,
                                "volume": volume,
                                "source": "SBV",
                                "fetched_at": datetime.now().isoformat()
                            })
                    except Exception:
                        continue
                        
                return records
                
            except Exception as e:
                # No table found usually means no data
                return []
                
        except Exception as e:
            logger.error(f"Error fetching {target_date}: {e}")
            # Try to recover session
            try:
                self.driver.refresh()
                sleep(3)
            except:
                self.close()
                self.setup_driver()
            return []

    def close(self):
        if self.driver:
            self.driver.quit()

def run_fast_backfill(days_back=730):
    scraper = FastSBVScraper()
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)
    
    total_days = (end_date - start_date).days + 1
    processed = 0
    success = 0
    
    print("\n" + "="*60)
    print(f"FAST BACKFILL STARTED: {start_date} to {end_date}")
    print("="*60)
    
    # Iterate backwards
    date_range = [end_date - timedelta(days=x) for x in range(total_days)]
    
    try:
        for current_date in date_range:
            processed += 1
            # Skip weekends
            if current_date.weekday() >= 5:
                continue
                
            print(f"[{processed}/{total_days}] {current_date}...", end="", flush=True)
            
            data = scraper.fetch_date(current_date)
            
            if data:
                print(f" \u2713 Found {len(data)}", end="", flush=True)
                try:
                    # Clean data for Supabase
                    cleaned = []
                    for r in data:
                        cleaned_r = {k: (v if v == v else None) for k, v in r.items()} # Handle NaN
                        cleaned.append(cleaned_r)
                        
                    supabase.table("interbank_rates").upsert(
                        cleaned, on_conflict="date,tenor_label,source"
                    ).execute()
                    print(f" \u2713 Inserted")
                    success += 1
                except Exception as e:
                    print(f" \u274c DB Error: {e}")
            else:
                print(" - No data")
                
            # Very short sleep is enough since we reuse session
            sleep(0.5)
            
    except KeyboardInterrupt:
        print("\nStopped by user")
    finally:
        scraper.close()
        print(f"\nCompleted. Success: {success} days")

if __name__ == "__main__":
    run_fast_backfill(730)
