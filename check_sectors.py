from vnstock_data import Company
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check(symbol):
    try:
        df = Company(symbol=symbol, source='VCI').overview()
        if df is not None:
            print(f"{symbol}: {df.iloc[0]['icb_name2']} | {df.iloc[0]['icb_name3']} | {df.iloc[0]['icb_name4']}")
    except: pass

for s in ['VCB', 'VHM', 'FPT', 'HPG', 'GAS']:
    check(s)
