import requests
from bs4 import BeautifulSoup
import urllib3
import sys

sys.stdout.reconfigure(encoding='utf-8')
urllib3.disable_warnings()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def analyze_cafef(type_id, name):
    print(f"\n--- CafeF {name} ---")
    url = f"https://s.cafef.vn/Lich-su-giao-dich-VNINDEX-{type_id}.chn"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # In the modern CafeF interface, the table might have a specific ID, like "GiaoDich_ThongKe"
        table = soup.find('table', id='GiaoDich_ThongKe')
        if not table:
             table = soup.find('table', class_='CafeF_KGD_Data')
        
        if table:
             rows = table.find_all('tr')
             for row in rows[:5]:
                 cols = row.find_all('td')
                 text_cols = [c.text.strip().replace('\\n', '').replace('\\r', '') for c in cols]
                 print(" | ".join(text_cols))
        else:
             print("No table found. The data might be loaded via AJAX.")
             
             # Let's check if there's any JSON in the page
             for script in soup.find_all('script'):
                 if 'KgdData' in script.text or 'historyData' in script.text:
                      print("Found data inside a script tag!")
                      print(script.text[:200])
             
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    analyze_cafef('1', 'Khối ngoại')
    analyze_cafef('2', 'Tự doanh')
