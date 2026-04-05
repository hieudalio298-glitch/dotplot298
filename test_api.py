import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests

try:
    url = "https://finfo-api.vndirect.com.vn/v4/stocks?q=type:STOCK~status:LISTED&size=10"
    res = requests.get(url)
    print("VNDirect /stocks Status:", res.status_code)
    if res.status_code == 200:
        data = res.json().get('data', [])
        if data:
            print("Keys:", data[0].keys())
            print(data[0])
            
    # Maybe finfo-api ratios endpoint?
    url2 = "https://finfo-api.vndirect.com.vn/v4/ratios/latest?filter=industryCode:AAA&size=10" # Just guessing
except Exception as e:
    print("Error:", e)
