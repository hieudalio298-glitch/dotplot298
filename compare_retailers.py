import yfinance as yf
import pandas as pd
import json

# Map Bloomberg tickers to Yahoo Finance tickers
tickers = {
    'FRT.VN': 'FRT VN Equity',
    'DGW.VN': 'DGW VN Equity',
    'MWG.VN': 'MWG VN Equity',
    'ERAA.JK': 'ERAA IJ Equity',
    'COM7.BK': 'COM7 TB Equity',
    'EMIL.NS': 'EMIL IN Equity',
    'HVN.AX': 'HVN AU EQUITY',
    '3048.T': '3048 JP EQUITY'
}

metrics = []

for ticker, name in tickers.items():
    print(f"Fetching data for {name} ({ticker})...")
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        gross_margin = info.get('grossMargins', None)
        roe = info.get('returnOnEquity', None)
        roa = info.get('returnOnAssets', None)
        market_cap = info.get('marketCap', None)
        net_profit_margin = info.get('profitMargins', None)
        rev_growth = info.get('revenueGrowth', None)
        earning_growth = info.get('earningsGrowth', None)
        debt_to_equity = info.get('debtToEquity', None)
        currency = info.get('currency', 'Unknown')
        
        metrics.append({
            'Company': name,
            'Ticker (YF)': ticker,
            'Currency': currency,
            'Market Cap': market_cap,
            'Gross Margin': gross_margin,
            'Net Profit Margin': net_profit_margin,
            'ROE': roe,
            'ROA': roa,
            'Revenue Growth (YoY)': rev_growth,
            'Net Income Growth (YoY)': earning_growth,
            'D/E Ratio': debt_to_equity
        })
    except Exception as e:
        print(f"Error fetching {ticker}: {e}")

df = pd.DataFrame(metrics)

def format_pct(x):
    if pd.isna(x) or x is None:
        return 'N/A'
    return f"{x*100:.2f}%"

def format_de(x):
    if pd.isna(x) or x is None:
        return 'N/A'
    # Yahoo finance sometimes returns DE as percentage (e.g. 150 = 1.5x) or absolute.
    # Usually it's in percentage.
    return f"{x/100:.2f}x"

def format_mcap(row):
    val = row['Market Cap']
    curr = row['Currency']
    if pd.isna(val) or val is None:
        return 'N/A'
    return f"{val / 1e9:.2f}B {curr}"

df['Gross Margin'] = df['Gross Margin'].apply(format_pct)
df['Net Profit Margin'] = df['Net Profit Margin'].apply(format_pct)
df['ROE'] = df['ROE'].apply(format_pct)
df['ROA'] = df['ROA'].apply(format_pct)
df['Revenue Growth (YoY)'] = df['Revenue Growth (YoY)'].apply(format_pct)
df['Net Income Growth (YoY)'] = df['Net Income Growth (YoY)'].apply(format_pct)
df['D/E Ratio'] = df['D/E Ratio'].apply(format_de)
df['Market Cap (Local)'] = df.apply(format_mcap, axis=1)

output_cols = ['Company', 'Market Cap (Local)', 'Gross Margin', 'Net Profit Margin', 'ROE', 'ROA', 'Revenue Growth (YoY)', 'Net Income Growth (YoY)', 'D/E Ratio']
final_df = df[output_cols]

with open('retailers_comparison.md', 'w', encoding='utf-8') as f:
    f.write("# So sánh các công ty bán lẻ (Yahoo Finance)\n\n")
    f.write(final_df.to_markdown(index=False))

print("\nDone generating markdown to retailers_comparison.md")
