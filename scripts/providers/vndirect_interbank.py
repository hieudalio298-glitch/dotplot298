import requests
import logging
from datetime import datetime, date
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class VNDirectInterbankProvider:
    def __init__(self):
        # API endpoint for macro indicators including interbank rates
        self.url = "https://finfo-api.vndirect.com.vn/v4/macro_indicators"
    
    def fetch(self, target_date: date) -> List[Dict[str, Any]]:
        # VNDirect stores interbank rates with code 'IR'
        # We fetch a range around the target date just to be sure
        
        start_date_str = target_date.strftime("%Y-%m-%d")
        end_date_str = target_date.strftime("%Y-%m-%d")
        
        params = {
            "q": f"code:IR~date:gte:{start_date_str}~date:lte:{end_date_str}",
            "sort": "date:desc",
            "size": 100
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://dstock.vndirect.com.vn/'
        }
        
        try:
            logger.info(f"Fetching Interbank Rates from VNDirect for {target_date}")
            resp = requests.get(self.url, params=params, headers=headers, timeout=10)
            data = resp.json()
            
            if 'data' not in data:
                return []
                
            records = []
            for item in data['data']:
                # Item structure example:
                # {'code': 'IR', 'date': '2025-02-06', 'name': 'Qua đêm', 'value': 4.5, ...}
                
                tenor_vn = item.get('name', '')
                rate = item.get('value')
                
                # Normalize Tenor
                tenor_label = None
                t = tenor_vn.lower()
                if 'qua đêm' in t: tenor_label = 'ON'
                elif '1 tuần' in t: tenor_label = '1W'
                elif '2 tuần' in t: tenor_label = '2W'
                elif '1 tháng' in t: tenor_label = '1M'
                elif '3 tháng' in t: tenor_label = '3M'
                elif '6 tháng' in t: tenor_label = '6M'
                elif '9 tháng' in t: tenor_label = '9M'
                elif '1 năm' in t: tenor_label = '1Y'
                
                if tenor_label and rate is not None:
                    records.append({
                        "date": item['date'],
                        "tenor_label": tenor_label,
                        "rate": rate,
                        "volume": None, # VNDirect might not have volume in this endpoint
                        "source": "VNDIRECT", # Mark source differently if you want, or 'SBV' to match existing
                        "fetched_at": datetime.now().isoformat()
                    })
            
            return records

        except Exception as e:
            logger.error(f"VNDirect fetch error: {e}")
            return []
