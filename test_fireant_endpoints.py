import requests
import json
import urllib3
from datetime import datetime

urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin': 'https://fireant.vn',
    'Referer': 'https://fireant.vn/',
    'Accept': 'application/json, text/plain, */*'
}

def check_endpoint(url):
    print(f"\n--- Testing: {url} ---")
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"Returned list with {len(data)} items.")
                if len(data) > 0:
                    print(json.dumps(data[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    endpoints = [
        "https://restv2.fireant.vn/symbols/proprietary-trading-value?exchange=HSX&type=Total&topType=BuySell&count=1000",
        "https://restv2.fireant.vn/symbols/foreign-trading-value?exchange=HSX&type=Total&topType=BuySell&count=1000",
        # Historical values endpoints on FireAnt are usually found under data or market stats. Let's try historical ones:
        "https://restv2.fireant.vn/symbols/foreign-historical-values?exchange=HSX&count=21",
        "https://restv2.fireant.vn/symbols/proprietary-historical-values?exchange=HSX&count=21",
        
        # FireAnt Dashboard Historical Endpoints:
        "https://restv2.fireant.vn/symbols/HOSE/foreign-historical-values?count=21",
        "https://restv2.fireant.vn/symbols/VNINDEX/foreign-historical-values?count=21"
    ]
    for url in endpoints:
        check_endpoint(url)
