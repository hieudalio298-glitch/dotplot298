from vnstock_data import Finance
import pandas as pd
import sys

# Set encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def test_financials(symbol):
    print(f"\n{'='*60}")
    print(f"TESTING FINANCIAL DATA FOR: {symbol}")
    print(f"{'='*60}")
    
    f = Finance(symbol=symbol, source='MAS')
    
    reports = {
        "Income Statement": "income_statement",
        "Balance Sheet": "balance_sheet",
        "Cash Flow": "cash_flow"
    }
    
    for label, method_name in reports.items():
        print(f"\n>>> SOURCE: {label}")
        try:
            # Fetch quarterly data for most recent periods
            method = getattr(f, method_name)
            df = method(period='quarter')
            
            if df is not None and not df.empty:
                # Column name in vnstock_data is usually 'item' or the metric name
                # Let's find what columns we have
                print(f"Columns found: {df.columns.tolist()}")
                
                # Get unique metrics (usually the first column)
                metrics = df.iloc[:, 0].unique().tolist()
                print(f"Total indicators found: {len(metrics)}")
                print(f"Sample indicators: {metrics[:10]}")
                
                # Show first few periods found
                periods = [c for c in df.columns if any(year in c for year in ['2023', '2024'])]
                if periods:
                    print(f"Sample data for {periods[0]}:")
                    print(df[[df.columns[0], periods[0]]].head(5))
            else:
                print(f"NO DATA FOUND for {label}")
        except Exception as e:
            print(f"ERROR fetching {label}: {e}")

if __name__ == "__main__":
    # Test for different types of industries
    test_financials('HPG')  # Manufacturing
    test_financials('VCB')  # Banking
    test_financials('SSI')  # Securities
