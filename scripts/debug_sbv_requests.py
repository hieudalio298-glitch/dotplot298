import requests
from bs4 import BeautifulSoup
import pandas as pd
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def fetch_sbv_requests():
    url = "https://sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Increase timeout significantly
    try:
        print("Fetching SBV using requests...")
        response = requests.get(url, headers=headers, verify=False, timeout=30)
        
        if response.status_code != 200:
            print(f"Failed with code {response.status_code}")
            return
            
        print("Parsing HTML...")
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # SBV often puts data in a table. Let's find all tables.
        tables = soup.find_all('table')
        
        if not tables:
            print("No tables found in HTML response.")
            # Print stricture to debug
            # print(soup.prettify()[:1000])
            return

        print(f"Found {len(tables)} tables. Analyzing specific content...")
        
        for i, table in enumerate(tables):
            # Check if this table has relevant keywords
            text = table.get_text()
            if 'Kỳ hạn' in text or 'Lãi suất' in text:
                print(f"\n--- Relevant Table Found (Table #{i}) ---")
                try:
                    df = pd.read_html(str(table))[0]
                    print(df.to_string())
                except Exception as e:
                    print(f"Could not parse table with pandas: {e}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_sbv_requests()
