import requests
import json
import urllib3

urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'X-Fiin-Key': 'KEY', # Some APIs require this, try without first
}

def check_endpoint(url):
    print(f"\n--- Testing: {url} ---")
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                print(f"Returned object with keys: {list(data.keys())}")
                if 'items' in data:
                    print(f"Items count: {len(data['items'])}")
                    if len(data['items']) > 0:
                         print("Top Item:")
                         print(json.dumps(data['items'][0], indent=2))
            elif isinstance(data, list):
                print(f"Returned list with {len(data)} items")
                if len(data) > 0:
                   print(json.dumps(data[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    # SSI Iboard APIs often used for market details
    endpoints = [
        "https://fiin-market.ssi.com.vn/Market/SignalForeign?language=vi",
        "https://fiin-market.ssi.com.vn/Market/TradingForeign?language=vi",
        "https://fiin-market.ssi.com.vn/Market/TradingProprietary?language=vi",
        # CafeF API
        "https://fiin-core.ssi.com.vn/Master/GetListOrganization?language=vi",
        # Custom SSI for historical 
        "https://fiin-market.ssi.com.vn/Market/CashFlowValue?exchange=HOSE",
        
    ]
    for url in endpoints:
        check_endpoint(url)
