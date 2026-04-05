import requests
import json
import urllib3

urllib3.disable_warnings()

headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def check_endpoint(url):
    print(f"\n--- Testing: {url} ---")
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print snippet
            print(json.dumps(data, indent=2)[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    endpoints = [
        "https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/foreign-trading?ticker=VNINDEX",
        "https://apipubaws.tcbs.com.vn/market-watch/info/market-overview",
        "https://apipubaws.tcbs.com.vn/market-watch/info/foreign-trading",
        "https://fiin-market.ssi.com.vn/Market/CashFlowValue?exchange=HOSE"
    ]
    for url in endpoints:
        check_endpoint(url)
