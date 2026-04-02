from datetime import date, datetime
import logging
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any, Optional
from .base import BaseProvider

logger = logging.getLogger(__name__)

class ABOMarketWatchProvider(BaseProvider):
    def __init__(self):
        super().__init__()
        self.url = "https://asianbondsonline.adb.org/vietnam/"

    def fetch(self, target_date: date) -> List[Dict[str, Any]]:
        logger.info(f"Fetching ABO market watch data")
        try:
            response = self._get(self.url)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # ABO has both Yields and Interbank
            # We want Interbank mainly, but can fetch both if needed.
            interbank_records = self._parse_interbank_table(soup, target_date)
            return interbank_records
            
        except Exception as e:
            logger.error(f"Error fetching ABO market watch: {e}")
            return []

    def _parse_interbank_table(self, soup: BeautifulSoup, data_date: date) -> List[Dict[str, Any]]:
        records = []
        tables = soup.find_all('table')
        
        for table in tables:
            try:
                table_text = table.get_text().upper()
                if not any(k in table_text for k in ['VNIBOR', 'INTERBANK', 'OVERNIGHT', '1M', '3M']):
                    continue

                rows = table.find_all('tr')
                for row in rows[1:]:
                    cols = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                    if len(cols) < 2: continue

                    tenor_text = cols[0]
                    tenor_info = self._match_abo_interbank_tenor(tenor_text)
                    if not tenor_info: continue

                    tenor_label, _ = tenor_info
                    rate_value = self._parse_abo_rate(cols[1])

                    if rate_value is not None:
                        records.append({
                            'date': data_date.strftime('%Y-%m-%d'),
                            'tenor_label': tenor_label,
                            'rate': rate_value,
                            'source': 'ABO',
                            'fetched_at': datetime.now().isoformat()
                        })
                
                if records: break
            except Exception as e:
                continue
                
        return records

    def _parse_abo_rate(self, value: str) -> Optional[float]:
        if not value or value.strip() in {"", "-", "N/A", "NA"}:
            return None
        cleaned = value.strip().replace("%", "").strip()
        # ABO uses dot decimal.
        try:
            return float(cleaned)
        except:
            return None

    def _match_abo_interbank_tenor(self, text: str) -> Optional[tuple[str, int]]:
        text_upper = re.sub(r"\s+", " ", text.strip().upper())
        if "OVERNIGHT" in text_upper or "O/N" in text_upper: return ('ON', 0)
        if "1D" in text_upper: return ('ON', 0)
        if "1 WEEK" in text_upper or "1W" in text_upper: return ('1W', 7)
        if "1 MONTH" in text_upper or "1M" in text_upper: return ('1M', 30)
        if "3 MONTH" in text_upper or "3M" in text_upper: return ('3M', 90)
        if "6 MONTH" in text_upper or "6M" in text_upper: return ('6M', 180)
        return None
