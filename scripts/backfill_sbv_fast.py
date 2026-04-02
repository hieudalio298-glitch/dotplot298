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
    from selenium.webdriver.support.ui import WebDriverWait, Select
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
        # chrome_options.add_argument("--headless")  # Run headful to avoid detection
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Stealth options
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.driver.set_page_load_timeout(60)
        
        # Load SBV page initially
        try:
            self.driver.get("https://www.sbv.gov.vn/vi/l%C3%A3i-su%E1%BA%A5t-th%E1%BB%8B-tr%C6%B0%E1%BB%9Dng-li%C3%AAn-ng%C3%A2n-h%C3%A0ng")
            sleep(5) # Initial load wait
        except Exception as e:
            logger.error(f"Failed to load SBV page: {e}")

    def fetch_date(self, target_date):
        try:
            # Refresh if needed or check current url
            if "sbv.gov.vn" not in self.driver.current_url:
                self.driver.get("https://www.sbv.gov.vn/vi/l%C3%A3i-su%E1%BA%A5t-th%E1%BB%8B-tr%C6%B0%E1%BB%9Dng-li%C3%AAn-ng%C3%A2n-h%C3%A0ng")
                sleep(2)

            params = {
                "d": target_date.day,
                "m": target_date.month,
                "y": target_date.year
            }
            
            # Find elements
            wait = WebDriverWait(self.driver, 10)
            
            # Try to select date (best effort)
            try:
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
                sleep(2)
            except Exception:
                # If date picker fails, we proceed assuming table is there (or we can't do anything about it)
                pass

            # Try to find table
            table = None
            try:
                table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.table-phong-vien")))
            except:
                try:
                    table = wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
                except:
                    return []
            
            if not table: return []

            html = table.get_attribute('outerHTML')
            try:
                df = pd.read_html(html, header=0)[0] # First try standard header
            except:
                try:
                    df = pd.read_html(html, header=[0, 1])[0] # Fallback to user suggestion
                except:
                    return []

            if df.empty: return []

            # Normalize columns
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [' '.join(col).strip() for col in df.columns.values]
            
            # Identify columns
            cols = [str(c).lower() for c in df.columns]
            
            ky_han_idx = next((i for i, c in enumerate(cols) if 'kỳ hạn' in c or 'term' in c or 'ky han' in c or 'thời hạn' in c or 'thoi han' in c), -1)
            lai_suat_idx = next((i for i, c in enumerate(cols) if 'lãi suất' in c or 'rate' in c or 'lai suat' in c), -1)
            doanh_so_idx = next((i for i, c in enumerate(cols) if 'doanh số' in c or 'volume' in c or 'doanh so' in c), -1)

            if ky_han_idx == -1: 
                return []

            record = {
                "date": target_date.isoformat(),
                "fetched_at": datetime.now().isoformat(),
                "source": "SBV"
            }

            found_data = False
            for _, row in df.iterrows():
                try:
                    raw_tenor = str(row.iloc[ky_han_idx]).strip()
                    t_lower = raw_tenor.lower()
                    
                    tenor_code = None
                    if 'qua đêm' in t_lower or 'overnight' in t_lower or 'on' in t_lower: tenor_code = 'on'
                    elif '1 tuần' in t_lower or '1w' in t_lower: tenor_code = '1w'
                    elif '2 tuần' in t_lower or '2w' in t_lower: tenor_code = '2w'
                    elif '1 tháng' in t_lower or '1m' in t_lower: tenor_code = '1m'
                    elif '3 tháng' in t_lower or '3m' in t_lower: tenor_code = '3m'
                    elif '6 tháng' in t_lower or '6m' in t_lower: tenor_code = '6m'
                    elif '9 tháng' in t_lower or '9m' in t_lower: tenor_code = '9m'
                    elif '1 năm' in t_lower or '12 tháng' in t_lower or '1y' in t_lower: tenor_code = '1y'
                    
                    if not tenor_code: continue
                    
                    # Rate
                    if lai_suat_idx != -1:
                        val = row.iloc[lai_suat_idx]
                        if pd.notna(val):
                            val_str = str(val).replace(',', '.')
                            try:
                                rate = float(val_str)
                                if rate >= 100: rate /= 100.0
                                elif rate > 50: rate /= 10.0 # Heuristic
                                record[f"{tenor_code}_rate"] = rate
                                found_data = True
                            except: pass
                            
                    # Volume
                    if doanh_so_idx != -1:
                        val = row.iloc[doanh_so_idx]
                        if pd.notna(val):
                            val_str = str(val).replace('.', '').replace(',', '.')
                            try:
                                vol = float(val_str)
                                record[f"{tenor_code}_volume"] = vol
                                found_data = True
                            except: pass

                except Exception: continue
                
            return [record] if found_data else [] 

        except Exception as e:
            logger.error(f"Error fetching {target_date}: {e}")
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
                print(f" [OK] Found {len(data)}", end="", flush=True)
                try:
                    # Clean data for Supabase
                    cleaned = []
                    for r in data:
                        cleaned_r = {k: (v if v == v else None) for k, v in r.items()} # Handle NaN
                        cleaned.append(cleaned_r)
                        
                    supabase.table("interbank_rates").upsert(
                        cleaned, on_conflict="date"
                    ).execute()
                    print(f" [INSERTED]")
                    success += 1
                except Exception as e:
                    print(f" [ERROR] DB Error: {e}")
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
    days = 730
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except:
            print("Invalid days argument, defaulting to 730")
    
    run_fast_backfill(days)
