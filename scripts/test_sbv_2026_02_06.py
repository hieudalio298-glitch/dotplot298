
import sys
import os
import logging
from datetime import date
import pandas as pd
from time import sleep

# Add the current directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import from the user's script
# We need to access the module to get the classes and imports
import backfill_sbv_fast as sbv_mod

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

class HeadfulSBVScraper(sbv_mod.FastSBVScraper):
    def setup_driver(self):
        logger.info("Initializing headful Chrome driver with extended timeout...")
        chrome_options = sbv_mod.Options()
        # chrome_options.add_argument("--headless") 
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Stealth options
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        service = sbv_mod.Service(sbv_mod.ChromeDriverManager().install())
        self.driver = sbv_mod.webdriver.Chrome(service=service, options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.driver.set_page_load_timeout(60) 
        
        # Revert to the URL that worked previously
        self.base_url = "https://www.sbv.gov.vn/vi/l%C3%A3i-su%E1%BA%A5t-th%E1%BB%8B-tr%C6%B0%E1%BB%9Dng-li%C3%AAn-ng%C3%A2n-h%C3%A0ng"
        
        try:
            logger.info(f"Navigating to {self.base_url}")
            self.driver.get(self.base_url)
            sleep(10) 
            logger.info(f"Page title: {self.driver.title}")
        except Exception as e:
            logger.error(f"Failed to load SBV page: {e}")

def test_fetch():
    scraper = HeadfulSBVScraper()
    target_date = date(2026, 2, 6)
    
    print(f"\nFetching data for {target_date}...")
    try:
        data = scraper.fetch_date(target_date)
        
        if data:
            print(f"\nSuccessfully fetched {len(data)} records:")
            for r in data:
                print(r)
        else:
            print(f"\nNo data found for {target_date}")
            
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        scraper.close()


if __name__ == "__main__":
    test_fetch()
