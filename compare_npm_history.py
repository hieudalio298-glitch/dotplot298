import yfinance as yf
import pandas as pd

tickers = {
    'FRT.VN': 'FRT VN',
    'DGW.VN': 'DGW VN',
    'MWG.VN': 'MWG VN',
    'ERAA.JK': 'ERAA IJ',
    'COM7.BK': 'COM7 TB',
    'EMIL.NS': 'EMIL IN',
    'HVN.AX': 'HVN AU',
    '3048.T': '3048 JP'
}

all_npm = {}

for ticker, name in tickers.items():
    print(f"Fetching {name} ({ticker})...")
    try:
        stock = yf.Ticker(ticker)
        inc_stmt = stock.financials
        
        if inc_stmt is None or inc_stmt.empty:
            print(f"  No financials found for {ticker}")
            continue
            
        # Print available index rows for debugging if needed
        # print("  Rows:", inc_stmt.index.tolist())
        
        inc_stmt.index = [str(i).strip() for i in inc_stmt.index]
        
        # Determine net income key
        ni_key = None
        for k in ['Net Income', 'Net Income Common Stockholders', 'Net Income From Continuing Operations']:
            if k in inc_stmt.index:
                ni_key = k
                break
                
        # Determine revenue key
        rev_key = None
        for k in ['Total Revenue', 'Operating Revenue']:
            if k in inc_stmt.index:
                rev_key = k
                break
                
        if ni_key and rev_key:
            net_income = inc_stmt.loc[ni_key]
            revenue = inc_stmt.loc[rev_key]
            npm = net_income / revenue
            
            # Group by year
            npm.index = pd.to_datetime(npm.columns if isinstance(npm, pd.DataFrame) else npm.index).year
            npm.name = name
            
            # Drop duplicates if any (e.g. multiple records for same year)
            npm = npm[~npm.index.duplicated(keep='first')]
            
            all_npm[name] = npm
            print(f"  Successfully extracted {len(npm)} years for {ticker}")
        else:
            print(f"  Missing required rows for {ticker}. Found NI: {ni_key}, Rev: {rev_key}")
                
    except Exception as e:
        print(f"  Error fetching {ticker}: {e}")

if all_npm:
    df = pd.DataFrame(all_npm).T
    df = df.sort_index(axis=1)
    
    # We want columns to be years.
    # Format as percentage
    def fmt_pct(x):
        if pd.isna(x):
            return "N/A"
        return f"{x*100:.2f}%"
        
    for col in df.columns:
        df[col] = df[col].apply(fmt_pct)
        
    # Reorder columns chronologically
    df = df[sorted(df.columns)]
    
    with open('npm_history.md', 'w', encoding='utf-8') as f:
        f.write("# Lịch sử Net Profit Margin\n\n")
        f.write(df.to_markdown())
        
    print("\nFinal output generated in npm_history.md")
else:
    print("\nNo data collected.")
