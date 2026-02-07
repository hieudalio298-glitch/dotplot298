
from vnstock_data import Finance
import sys

# Set encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def check_gas_data():
    symbol = 'GAS'
    print(f"Fetching Financial Data Keys for {symbol}...")
    
    with open('c:/Users/Lenovo/dotplot/stockplot/debug_gas.txt', 'w', encoding='utf-8') as f:
        try:
            fin = Finance(symbol=symbol, source='VCI')
            
            # 1. Income Statement
            inc = fin.income_statement(period='year')
            f.write("\n--- INCOME STATEMENT KEYS (GAS) ---\n")
            if not inc.empty:
                cols = [c for c in inc.columns if c not in ['year', 'quarter', 'ticker', 'period']]
                for c in cols:
                    f.write(f"'{c}'\n")
            else:
                 f.write("No Income Statement Data\n")

             # 2. Balance Sheet
            bs = fin.balance_sheet(period='year')
            f.write("\n--- BALANCE SHEET KEYS (GAS) ---\n")
            if not bs.empty:
                cols = [c for c in bs.columns if c not in ['year', 'quarter', 'ticker', 'period']]
                for c in cols:
                    f.write(f"'{c}'\n")
            else:
                f.write("No Balance Sheet Data\n")

            # 3. Cash Flow
            cf = fin.cash_flow(period='year')
            f.write("\n--- CASH FLOW KEYS (GAS) ---\n")
            if not cf.empty:
                cols = [c for c in cf.columns if c not in ['year', 'quarter', 'ticker', 'period']]
                for c in cols:
                    f.write(f"'{c}'\n")
            else:
                 f.write("No Cash Flow Data\n")
                 
        except Exception as e:
            f.write(f"Error: {e}\n")
            print(f"Error: {e}")

    print("Done. Output saved to debug_gas.txt")

if __name__ == "__main__":
    check_gas_data()
