from vnstock_data import Trading
from datetime import datetime

symbol = 'VCB'
t = Trading(symbol=symbol, source='VCI')
# Fetch only for today
today_str = datetime.now().strftime('%Y-%m-%d')
print(f"Checking data for {today_str}")

df = t.price_history(start=today_str, end=today_str)
if not df.empty:
    print(f"Data for {today_str} FOUND!")
    print(df.tail())
else:
    print(f"No data for {today_str} found yet.")
