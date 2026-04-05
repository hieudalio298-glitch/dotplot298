import requests
import json
import urllib3

urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def check_endpoint(url):
    print(f"\n--- Testing: {url} ---")
    try:
        response = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'data' in data:
                 print(f"Returned object with {len(data['data'])} items.")
                 if len(data['data']) > 0:
                      print("Top Item:")
                      print(json.dumps(data['data'][0], indent=2))
            elif isinstance(data, list):
                 pass
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    # VNDirect APIs are usually open
    endpoints = [
        # Foreign trading by exchange
        "https://finfo-api.vndirect.com.vn/v4/foreigns?q=date:eq:2026-03-20~floor:eq:HOSE",
        # Proprietary trading by exchange
        "https://finfo-api.vndirect.com.vn/v4/proprietarys?q=date:eq:2026-03-20~floor:eq:HOSE",
        # Another market stats
        "https://finfo-api.vndirect.com.vn/v4/marketstats?q=date:eq:2026-03-20~floor:eq:HOSE"
    ]
    for url in endpoints:
        check_endpoint(url)
