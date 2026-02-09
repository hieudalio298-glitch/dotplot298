from datetime import date, datetime
import logging
from typing import List, Dict, Any, Optional
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import pandas as pd
import time

logger = logging.getLogger(__name__)

class SBVInterbankProvider:
    """
    SBV Interbank Rates Provider using Selenium for JavaScript rendering.
    Fetches both interest rates and transaction volumes from State Bank of Vietnam.
    Based on user-provided working code.
    """
    
    def __init__(self):
        self.url = "https://www.sbv.gov.vn/vi/lãi-suất-thị-trường-liên-ngân-hàng"
    
    def fetch(self, target_date: date) -> List[Dict[str, Any]]:
        """
        Fetch interbank rates from SBV.
        SBV provides latest data, target_date is used to set date range.
        """
        logger.info(f"Fetching SBV interbank rates for {target_date}")
        
        driver = None
        try:
            # Setup Chrome options
            options = Options()
            options.add_argument('--headless')  # Run headless in production
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            options.add_experimental_option('excludeSwitches', ['enable-logging'])
            
            # Initialize driver
            logger.info("Initializing Chrome driver...")
            driver = webdriver.Chrome(
                service=Service(ChromeDriverManager().install()),
                options=options
            )
            
            logger.info("Navigating to SBV page...")
            driver.get(self.url)
            wait = WebDriverWait(driver, 15)
            
            # Find date input fields (using ID selectors found from inspection)
            logger.info("Looking for date input fields...")
            from_inp = wait.until(EC.presence_of_element_located((By.ID, "fromDate")))
            to_inp = driver.find_element(By.ID, "toDate")
            
            # Set date range (get today's data)
            date_str = target_date.strftime("%Y-%m-%d")  # HTML5 date input format
            logger.info(f"Setting date range to {date_str}")
            from_inp.clear()
            from_inp.send_keys(date_str)
            to_inp.clear()
            to_inp.send_keys(date_str)
            
            # Click submit button (first submit button found)
            logger.info("Clicking submit button...")
            btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")))
            driver.execute_script("arguments[0].click();", btn)
            
            # Wait for table to render
            logger.info("Waiting for table to render...")
            time.sleep(5)
            
            # Get table data - try different table selectors
            logger.info("Extracting table data...")
            try:
                table = driver.find_element(By.CLASS_NAME, "table-phong-vien")
            except:
                # Fallback: try finding any table
                logger.info("table-phong-vien not found, trying generic table selector...")
                table = driver.find_element(By.TAG_NAME, "table")
            
            df = pd.read_html(table.get_attribute('outerHTML'))[0]
            
            # Parse DataFrame to records
            records = self._parse_dataframe(df, target_date)
            
            logger.info(f"✅ Extracted {len(records)} records from SBV")
            return records
            
        except Exception as e:
            logger.error(f"❌ Error fetching SBV interbank: {e}", exc_info=True)
            return []
        finally:
            if driver:
                try:
                    driver.quit()
                    logger.info("Chrome driver closed")
                except:
                    pass
    
    def _parse_dataframe(self, df: pd.DataFrame, target_date: date) -> List[Dict[str, Any]]:
        """Parse pandas DataFrame into list of records"""
        records = []
        
        # Expected columns: Kỳ hạn, Lãi suất (%/năm), Khối lượng (tỷ đồng)
        # Column names might vary, so we'll use positional indexing
        
        for idx, row in df.iterrows():
            try:
                # Skip header rows
                if idx == 0 or pd.isna(row.iloc[0]):
                    continue
                
                tenor_text = str(row.iloc[0]).strip()
                rate_text = str(row.iloc[1]).strip() if len(row) > 1 else None
                volume_text = str(row.iloc[2]).strip() if len(row) > 2 else None
                
                # Normalize tenor
                tenor_label = self._normalize_tenor(tenor_text)
                if not tenor_label:
                    continue
                
                # Parse rate
                rate = self._parse_vietnamese_float(rate_text)
                if rate is None:
                    continue
                
                # Parse volume
                volume = self._parse_vietnamese_float(volume_text)
                
                record = {
                    "date": target_date.isoformat(),
                    "tenor_label": tenor_label,
                    "rate": rate,
                    "source": "SBV",
                    "fetched_at": datetime.now().isoformat()
                }
                
                # Add volume if available
                if volume is not None:
                    record["volume"] = volume
                
                records.append(record)
                
            except Exception as e:
                logger.warning(f"Error parsing row {idx}: {e}")
                continue
        
        return records
    
    def _normalize_tenor(self, text: str) -> Optional[str]:
        """Normalize Vietnamese tenor labels to standard format"""
        t = text.lower()
        if 'qua đêm' in t or 'overnight' in t or 'on' in t: return 'ON'
        if '1 tuần' in t or '1 week' in t or '1w' in t: return '1W'
        if '2 tuần' in t or '2 week' in t or '2w' in t: return '2W'
        if '1 tháng' in t or '1 month' in t or '1m' in t: return '1M'
        if '3 tháng' in t or '3 month' in t or '3m' in t: return '3M'
        if '6 tháng' in t or '6 month' in t or '6m' in t: return '6M'
        if '9 tháng' in t or '9 month' in t or '9m' in t: return '9M'
        if '12 tháng' in t or '1 năm' in t or '1 year' in t or '1y' in t: return '1Y'
        return None
    
    def _parse_vietnamese_float(self, text: str) -> Optional[float]:
        """Parse Vietnamese number format (e.g., '1.234,56' or '1,234.56')"""
        if not text or text == '-' or text == '—' or text == 'nan':
            return None
        
        try:
            # Remove whitespace and percentage sign
            text = text.strip().replace('%', '').strip()
            
            # Handle Vietnamese format: 1.234,56 -> 1234.56
            if ',' in text and '.' in text:
                # If comma comes after dot, it's Vietnamese format
                if text.rindex(',') > text.rindex('.'):
                    text = text.replace('.', '').replace(',', '.')
                else:
                    # Otherwise it's English format, just remove commas
                    text = text.replace(',', '')
            elif ',' in text:
                # Only comma, assume it's decimal separator
                text = text.replace(',', '.')
            elif '.' in text:
                # Only dot, could be thousands separator or decimal
                # If there are multiple dots, it's thousands separator
                if text.count('.') > 1:
                    text = text.replace('.', '')
            
            return float(text)
        except (ValueError, AttributeError):
            logger.warning(f"Could not parse float from: {text}")
            return None
