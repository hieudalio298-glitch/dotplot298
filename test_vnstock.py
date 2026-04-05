import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from vnstock import Finance
import pandas as pd

try:
    fin = Finance(symbol='TCB', source='VCI')
    ratio = fin.ratio(period='quarter')
    print("Ratio columns:", ratio.columns.tolist() if ratio is not None else "None")
    print(ratio[['year', 'quarter', 'ticker']].head(2) if ratio is not None else "")
    # Check if any column has 'cap' or 'vốn'
    cols = ratio.columns.tolist()
    cap_cols = [c for c in cols if 'cap' in c.lower() or 'von' in c.lower() or 'vốn' in c.lower()]
    print("Columns related to cap:", cap_cols)
except Exception as e:
    print("Error:", e)
