from vnstock_data import Trading
from datetime import datetime, timedelta

# Ngày giao dịch gần nhất (trừ cuối tuần)
today = datetime.now()
if today.weekday() == 6:  # Chủ nhật
    last_trading = today - timedelta(days=2)
elif today.weekday() == 5:  # Thứ 7
    last_trading = today - timedelta(days=1)
else:
    last_trading = today

START_DATE_FETCH = (last_trading - timedelta(days=10)).strftime('%Y-%m-%d')
END_DATE_FETCH = (last_trading + timedelta(days=1)).strftime('%Y-%m-%d')

symbols = ['VCB', 'FPT', 'VIC']
print(f"Checking data from {START_DATE_FETCH} to {END_DATE_FETCH}")

for symbol in symbols:
    try:
        t = Trading(symbol=symbol, source='VCI')
        df = t.price_history(start=START_DATE_FETCH, end=END_DATE_FETCH)
        if not df.empty:
            df = df.sort_values('trading_date', ascending=True)
            latest_date = df.iloc[-1]['trading_date']
            print(f"Symbol: {symbol}, Latest Trading Date: {latest_date}")
        else:
            print(f"Symbol: {symbol}, No data found")
    except Exception as e:
        print(f"Symbol: {symbol}, Error: {e}")
