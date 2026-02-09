import httpx
from bs4 import BeautifulSoup

def debug_abo():
    url = "https://asianbondsonline.adb.org/vietnam/"
    print(f"Fetching {url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    response = httpx.get(url, headers=headers, timeout=30)
    print(f"Status: {response.status_code}")
    
    with open("debug_abo.html", "w", encoding="utf-8") as f:
        f.write(response.text)
    print("Saved HTML to debug_abo.html")

    soup = BeautifulSoup(response.content, 'html.parser')
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables.")

    for i, table in enumerate(tables):
        text = table.get_text().upper()
        if any(k in text for k in ['VNIBOR', 'INTERBANK']):
            print(f"--- Table {i} Match ---")
            rows = table.find_all('tr')
            for j, row in enumerate(rows):
                cols = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                safe_cols = [c.encode('ascii', 'ignore').decode() for c in cols]
                print(f"Row {j}: {safe_cols}")
        else:
            print(f"Table {i} - No match")

if __name__ == "__main__":
    debug_abo()
