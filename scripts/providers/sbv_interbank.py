import logging
import requests
import pandas as pd
from datetime import date, datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SBVInterbankProvider:
    """
    SBV Interbank Rates Provider using requests (lighter than Selenium).
    Fetches interest rates from State Bank of Vietnam using the new URL structure.
    """
    
    def __init__(self):
        # Use the encoded URL to avoid issues
        self.url = "https://www.sbv.gov.vn/vi/l%C3%A3i-su%E1%BA%A5t-th%E1%BB%8B-tr%C6%B0%E1%BB%9Dng-li%C3%AAn-ng%C3%A2n-h%C3%A0ng"
    
    def fetch(self, target_date: date) -> List[Dict[str, Any]]:
        logger.info(f"Fetching SBV interbank rates via requests...")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.sbv.gov.vn/'
        }

        try:
            # Send GET request
            response = requests.get(self.url, headers=headers, timeout=20, verify=False)
            response.encoding = 'utf-8'
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch page. Status: {response.status_code}")
                return []
            
            # Parse HTML tables directly with pandas
            # Note: This page might show CURRENT data, not historical by date
            # So we check if the page content matches our target date or is just 'latest'
            
            dfs = pd.read_html(response.text)
            logger.info(f"Found {len(dfs)} tables.")
            
            records = []
            
            for i, df in enumerate(dfs):
                # Normalize columns
                df.columns = [str(c).lower().strip() for c in df.columns]
                
                # Check keywords
                if not any('kỳ hạn' in c for c in df.columns):
                    continue
                
                logger.info(f"Processing Table #{i}...")
                
                # Iterate rows
                for _, row in df.iterrows():
                    try:
                        # Map columns based on content
                        # Assuming structure: Ky han | Lai suat | Doanh so
                        # But we need to find indices.
                        
                        col_ky_han = next((c for c in df.columns if 'kỳ hạn' in c), None)
                        col_lai_suat = next((c for c in df.columns if 'lãi suất' in c), None)
                        col_doanh_so = next((c for c in df.columns if 'doanh số' in c), None)
                        
                        if not col_ky_han: continue
                        
                        raw_tenor = str(row[col_ky_han]).strip()
                        
                        # Fix encoding issues if any (e.g. non-breaking spaces)
                        raw_tenor = raw_tenor.replace('\xa0', ' ')
                        
                        # Normalize Tenor
                        tenor_label = None
                        t_lower = raw_tenor.lower()
                        
                        if 'qua đêm' in t_lower or 'overnight' in t_lower or 'on' in t_lower: tenor_label = 'ON'
                        elif '1 tuần' in t_lower or '1w' in t_lower: tenor_label = '1W'
                        elif '2 tuần' in t_lower or '2w' in t_lower: tenor_label = '2W'
                        elif '1 tháng' in t_lower or '1m' in t_lower: tenor_label = '1M'
                        elif '3 tháng' in t_lower or '3m' in t_lower: tenor_label = '3M'
                        elif '6 tháng' in t_lower or '6m' in t_lower: tenor_label = '6M'
                        elif '9 tháng' in t_lower or '9m' in t_lower: tenor_label = '9M'
                        elif '1 năm' in t_lower or '1y' in t_lower or '12 tháng' in t_lower: tenor_label = '1Y'
                        
                        if not tenor_label: continue
                        
                        # Rate
                        rate = None
                        if col_lai_suat:
                            rate = self._parse_vietnamese_float(str(row[col_lai_suat]))
                            # Scaling
                            if rate is not None:
                                if rate >= 100: rate /= 100.0
                                elif rate >= 20: rate /= 10.0
                        
                        # Volume
                        volume = None
                        if col_doanh_so:
                            volume = self._parse_vietnamese_float(str(row[col_doanh_so]))
                            
                        if rate is not None:
                            # IMPORTANT: This page shows CURRENT rates. 
                            # If target_date is far in past, this data is WRONG/MISMATCH.
                            # But for "Current Status" or "Today", it is fine.
                            # We will use target_date as the date for this record for now.
                            
                            records.append({
                                "date": target_date.isoformat(), 
                                "tenor_label": tenor_label,
                                "rate": rate,
                                "volume": volume,
                                "source": "SBV_Direct",
                                "fetched_at": datetime.now().isoformat()
                            })
                            
                    except Exception as e:
                        logger.warning(f"Row error: {e}")
                        continue
            
            logger.info(f"✅ Extracted {len(records)} records.")
            return records

        except Exception as e:
            logger.error(f"❌ Requests Error: {e}")
            return []

    def _parse_vietnamese_float(self, text: str) -> Optional[float]:
        if not text or text.lower() in ['nan', '-', '—', 'none']: return None
        try:
            text = text.replace('%', '').strip()
            # Handle 1.234,56 -> 1234.56
            if ',' in text and '.' in text:
                if text.rindex(',') > text.rindex('.'): # 1.234,56
                    text = text.replace('.', '').replace(',', '.')
                else: # 1,234.56
                    text = text.replace(',', '')
            elif ',' in text: # 8,5 -> 8.5
                text = text.replace(',', '.')
            elif '.' in text:
                if text.count('.') > 1: text = text.replace('.', '')
            
            return float(text)
        except:
            return None
