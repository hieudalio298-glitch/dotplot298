import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def test_cafef():
    print("Testing CafeF...")
    url = "https://s.cafef.vn/Lich-su-giao-dich-VNINDEX-1.chn"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        soup = BeautifulSoup(r.text, 'html.parser')
        # find the table rows
        rows = soup.find_all('tr')
        print(f"Found {len(rows)} rows on the page.")
        # print first 5 rows' text
        for idx, tr in enumerate(rows[:5]):
            print(f"Row {idx}: {tr.text.strip()[:100].replace(chr(10), ' ')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_cafef()
