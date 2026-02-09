import requests
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

url = "https://www.sbv.gov.vn/vi/l%C3%A3i-su%E1%BA%A5t-th%E1%BB%8B-tr%C6%B0%E1%BB%9Dng-li%C3%AAn-ng%C3%A2n-h%C3%A0ng"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
}

try:
    logger.info(f"Fetching {url}")
    response = requests.get(url, headers=headers, timeout=30, verify=False)
    response.encoding = 'utf-8'
    
    if response.status_code == 200:
        logger.info("Success. Parsing tables...")
        try:
            dfs = pd.read_html(response.text)
            logger.info(f"Found {len(dfs)} tables.")
            for i, df in enumerate(dfs):
                print(f"\nTable {i}: Shape {df.shape}")
                print(df.head().to_string())
        except Exception as e:
            logger.error(f"No tables found or parse error: {e}")
            # Dump to file to check
            with open("debug_requests.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            logger.info("Dumped to debug_requests.html")
    else:
        logger.error(f"Status code: {response.status_code}")
except Exception as e:
    logger.error(f"Error: {e}")
