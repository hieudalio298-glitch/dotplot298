import requests
import urllib3

urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def check(url):
    print(f"\n--- Testing: {url} ---")
    try:
        r = requests.get(url, headers=headers, verify=False, timeout=10)
        print(f"Status: {r.status_code}")
        print(r.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    endpoints = [
        "https://iboard-api.ssi.com.vn/market//foreign-trading?exchange=HOSE",
        "https://iboard-api.ssi.com.vn/market/proprietary-trading?exchange=HOSE",
        "https://api.vietcap.com.vn/market-watch/foreign-trading",
        "https://wgateway-fmarket.ssi.com.vn/api/market/foreign-trading"
    ]
    for url in endpoints:
        check(url)
