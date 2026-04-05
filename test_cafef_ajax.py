import requests
from bs4 import BeautifulSoup
import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

# Let's try CafeF's Ajax endpoint for Thong Ke Giao Dich
def test_cafef_ajax():
    print("Testing CafeF AJAX...")
    # Parameters for CafeF's Thong Ke Giao Dich Ajax endpoint
    # type=1 might be Foreign, type=2 might be Prop
    url = "https://s.cafef.vn/Ajax/ThongKeGiaoDich.aspx"
    payload = {
        'type': '1', # 1 for foreign, 2 presumably prop
        'floor': 'HOSE',
        'date': '20/03/2026'
    }
    headers = {
        'User-Agent': 'Mozilla/5.0'
    }
    
    try:
        r = requests.post(url, data=payload, headers=headers, timeout=10)
        print(f"Status: {r.status_code}")
        print("Response Text:", r.text[:500])
        
    except Exception as e:
         print(f"Error: {e}")

if __name__ == "__main__":
    test_cafef_ajax()
