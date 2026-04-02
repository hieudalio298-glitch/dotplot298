from datetime import date, datetime, timedelta
import logging
from bs4 import BeautifulSoup
from .base import BaseProvider

logger = logging.getLogger(__name__)

class HNXYieldCurveProvider(BaseProvider):
    def __init__(self):
        super().__init__()
        self.base_url = "https://hnx.vn"
        self.search_url = f"{self.base_url}/ModuleReportBonds/Bond_YieldCurve/SearchAndNextPageYieldCurveData"

    def fetch(self, target_date: date):
        logger.info(f"Fetching HNX yield curve for {target_date}")
        try:
            # Format date as dd/mm/yyyy
            date_str = target_date.strftime("%d/%m/%Y")
            
            response = self._post(
                self.search_url,
                data={"pDate": date_str}
            )
            
            if "Không tìm thấy dữ liệu" in response.text:
                logger.info(f"No data for {target_date}")
                return []

            soup = BeautifulSoup(response.content, "html.parser")
            return self._parse_table(soup, target_date)
            
        except Exception as e:
            logger.error(f"Error fetching {target_date}: {e}")
            return []

    def _parse_table(self, soup, target_date):
        table = soup.find("table", id="_tableDatas")
        if not table:
            return []
            
        rows = table.find_all("tr")
        if len(rows) < 2:
            return []
            
        records = []
        seen_tenors = set()
        for row in rows[1:]:
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) < 4:
                continue
                
            tenor_text = cols[0]
            tenor_map = {
                '3 tháng': ('3M', 90),
                '6 tháng': ('6M', 180),
                '9 tháng': ('9M', 270),
                '1 năm': ('1Y', 365),
                '2 năm': ('2Y', 730),
                '3 năm': ('3Y', 1095),
                '5 năm': ('5Y', 1825),
                '7 năm': ('7Y', 2555),
                '10 năm': ('10Y', 3650),
                '15 năm': ('15Y', 5475),
                '20 năm': ('20Y', 7300),
                '25 năm': ('25Y', 9125),
                '30 năm': ('30Y', 10950),
                '50 năm': ('50Y', 18250),
            }
            
            tenor_info = None
            for key, val in tenor_map.items():
                if key.lower() in tenor_text.lower():
                    tenor_info = val
                    break
            
            if not tenor_info:
                # Try simple X nam
                import re
                m = re.match(r'(\d+)\s*năm', tenor_text.lower())
                if m:
                    y = int(m.group(1))
                    tenor_info = (f"{y}Y", y * 365)
            
            if not tenor_info:
                continue
                
            tenor_label, tenor_days = tenor_info
            
            if tenor_label in seen_tenors:
                continue
            seen_tenors.add(tenor_label)
            
            record = {
                "date": target_date.isoformat(),
                "tenor_label": tenor_label,
                "tenor_days": tenor_days,
                "spot_rate_continuous": self._parse_vietnamese_float(cols[1]),
                "par_yield": self._parse_vietnamese_float(cols[2]),
                "spot_rate_annual": self._parse_vietnamese_float(cols[3]),
                "source": "HNX_YC",
                "fetched_at": datetime.now().isoformat()
            }
            records.append(record)
            
        return records
