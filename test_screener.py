import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from vnstock import Screener

try:
    print("Trying Screener.stock...")
    # Get all stocks to see columns
    df = Screener.stock(params={"exchangeName": "HOSE,HNX,UPCOM"}, limit=5)
    print("Columns:", df.columns.tolist() if df is not None else "None")
    print(df.head() if df is not None else "No data")
    
    # Try fetching by market cap
    # We don't know the exact syntax for market cap sort from here, but let's see what columns are returned.
    print("\nFetching Top 200 by marketCap if possible...")
    df2 = Screener.stock(params={"exchangeName": "HOSE,HNX,UPCOM"}, limit=200) # Maybe it returns marketCap? Let's check columns first
    if df2 is not None and not df2.empty:
      print("Columns returned:", df2.columns.tolist())
    
except Exception as e:
    print("Error:", e)
