from vnstock_data import Company
import sys

# Set encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def inspect_overview(symbol):
    try:
        # Use a supported source
        cp = Company(symbol=symbol, source='VCI') 
        df = cp.overview()
        if df is not None and not df.empty:
            print(f"--- Overview for {symbol} ---")
            print("Columns:", df.columns.tolist())
            # Convert to dict but handles potentially long text by showing first few chars
            data = df.iloc[0].to_dict()
            for k, v in data.items():
                print(f"{k}: {v}")
        else:
            print(f"No data for {symbol}")
    except Exception as e:
        print(f"Error for {symbol}: {e}")

if __name__ == "__main__":
    inspect_overview('HPG')
