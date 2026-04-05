import requests
import json
import urllib3
import sys

sys.stdout.reconfigure(encoding='utf-8')
urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
}

def test_vci_direct():
    print("Testing direct VCI API...")
    url = "https://trading.vietcap.com.vn/api/price/symbols/history"
    
    # Typical VCI payload 
    # Usually it's an array of symbols or a single symbol with fromDate, toDate
    # Let's see what vnstock sends! In `vnstock_data/explorer/vci/trading.py`
    #   payload = {"symbol": symbol, "fromDate": start_date, "toDate": end_date}
    
    payload = {
        "symbol": "MSN",
        "fromDate": "11/03/2026",
        "toDate": "20/03/2026"
    }
    
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            if len(data) > 0:
                 print("Keys:", data[0].keys())
        else:
            print("Response:", r.text[:200])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_vci_direct()
