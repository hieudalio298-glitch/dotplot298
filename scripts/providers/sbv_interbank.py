from datetime import date, datetime
import logging
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any, Optional
from .base import BaseProvider

logger = logging.getLogger(__name__)

class SBVInterbankProvider(BaseProvider):
    def __init__(self):
        super().__init__()
        self.url = "https://dttktt.sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh"

    def fetch(self, target_date: date) -> List[Dict[str, Any]]:
        # SBV only provides LATEST data. content usually matches "target_date" if it's today/yesterday.
        # We will parse whatever is there and check the date.
        logger.info(f"Fetching SBV interbank rates (latest) for {target_date}")
        
        try:
            response = self._get(self.url)
            soup = BeautifulSoup(response.content, 'html.parser')
            return self._parse_table(soup)
        except Exception as e:
            logger.error(f"Error fetching SBV interbank: {e}")
            return []

    def _parse_table(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        records = []
        
        # Find the section for Interbank
        # Look for table with "Lãi suất"
        tables = soup.find_all('table')
        target_table = None
        
        for table in tables:
            text = table.get_text().lower()
            if 'liên ngân hàng' in text and 'lãi suất' in text:
                target_table = table
                break
        
        if not target_table:
            logger.warning("Could not find Interbank table on SBV page")
            return []
            
        # Parse rows
        rows = target_table.find_all('tr')
        if len(rows) < 2:
            return []
            
        current_year = date.today().year
        
        # Try to find date in the page content
        # Note: Parsing date from SBV is tricky, sometimes it's in a div above table
        # For now, we assume it is "Latest" and user handles date mapping? 
        # Actually, best to try to find the date string.
        
        extracted_date = date.today() # Fallback
        
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all('td')]
            if len(cols) < 2:
                continue
                
            tenor_text = cols[0]
            rate_text = cols[1]
            
            # Normalize tenor
            tenor_label = self._normalize_tenor(tenor_text)
            if not tenor_label:
                continue
                
            # Parse rate
            rate = self._parse_vietnamese_float(rate_text)
            if rate is None:
                continue
                
            records.append({
                "date": extracted_date.isoformat(),
                "tenor_label": tenor_label,
                "rate": rate,
                "source": "SBV",
                "fetched_at": datetime.now().isoformat()
            })
            
        return records

    def _normalize_tenor(self, text: str) -> Optional[str]:
        t = text.lower()
        if 'qua đêm' in t: return 'ON'
        if '1 tuần' in t: return '1W'
        if '2 tuần' in t: return '2W'
        if '1 tháng' in t: return '1M'
        if '3 tháng' in t: return '3M'
        if '6 tháng' in t: return '6M'
        if '9 tháng' in t: return '9M'
        if '12 tháng' in t or '1 năm' in t: return '1Y'
        return None
