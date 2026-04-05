import os
import sys
import requests
import pandas as pd
from vnstock_data import config
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def test_cafef_raw():
    base_url = "https://s.cafef.vn"
    target_date = "03/20/2026" # MM/DD/YYYY as used in CAFEF ashx
    
    # Try different symbols for aggregate
    symbols = ['', 'VNINDEX', 'HOSE', 'HNX', 'UPCOM']
    
    print(f"--- TESTING CAFEF RAW FOR {target_date} ---")
    
    for sym in symbols:
        print(f"\n[SYMBOL: '{sym}']")
        # Foreign
        url_f = f"{base_url}/GDKhoiNgoai.ashx?Symbol={sym}&StartDate={target_date}&EndDate={target_date}&PageIndex=1&PageSize=20"
        try:
            resp = requests.get(url_f)
            if resp.status_code == 200:
                data = resp.json()
                if 'Data' in data and 'Data' in data['Data']:
                    df = pd.DataFrame(data['Data']['Data'])
                    if not df.empty:
                        print(f"  Foreign Data found! Rows: {len(df)}")
                        print(df.head(2))
                    else:
                        print("  Foreign: Empty Data list")
                else:
                    print("  Foreign: Data key missing")
            else:
                print(f"  Foreign: Status {resp.status_code}")
        except Exception as e:
            print(f"  Foreign: Error {e}")

        # Prop
        url_p = f"{base_url}/GDTuDoanh.ashx?Symbol={sym}&StartDate={target_date}&EndDate={target_date}&PageIndex=1&PageSize=20"
        try:
            resp = requests.get(url_p)
            if resp.status_code == 200:
                data = resp.json()
                if 'Data' in data and 'ListDataTudoanh' in data['Data']:
                    df = pd.DataFrame(data['Data']['ListDataTudoanh'])
                    if not df.empty:
                        print(f"  Prop Data found! Rows: {len(df)}")
                        print(df.head(2))
                    else:
                        print("  Prop: Empty ListDataTudoanh")
                else:
                    print("  Prop: Data key or ListDataTudoanh missing")
            else:
                print(f"  Prop: Status {resp.status_code}")
        except Exception as e:
            print(f"  Prop: Error {e}")

if __name__ == "__main__":
    test_cafef_raw()
