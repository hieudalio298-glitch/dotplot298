import yfinance as yf
import pandas as pd
import json

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
currencies_to_fetch = set()

for ticker, name in tickers.items():
    print(f"Fetching data for {name} ({ticker})...")
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        gross_margin = info.get('grossMargins', None)
        roe = info.get('returnOnEquity', None)
        roa = info.get('returnOnAssets', None)
        pe_ratio = info.get('trailingPE', info.get('forwardPE', None))
        market_cap = info.get('marketCap', None)
        net_profit_margin = info.get('profitMargins', None)
        rev_growth = info.get('revenueGrowth', None)
        earning_growth = info.get('earningsGrowth', None)
        debt_to_equity = info.get('debtToEquity', None)
        currency = info.get('currency', 'Unknown')
        
        if currency != 'Unknown':
            currencies_to_fetch.add(currency)
            
        metrics.append({
            'Company': name,
            'Ticker (YF)': ticker,
            'Currency': currency,
            'P/E Ratio (TTM)': pe_ratio,
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

# Fetch exchange rates
rates = {}
for curr in currencies_to_fetch:
    if curr == 'USD':
        rates[curr] = 1.0
        continue
    
    print(f"Fetching exchange rate for {curr} to USD...")
    rate = None
    try:
        t = yf.Ticker(f"{curr}USD=X")
        rate = t.fast_info['previous_close']
    except Exception:
        try:
            t = yf.Ticker(f"USD{curr}=X")
            rate = 1.0 / t.fast_info['previous_close']
        except Exception:
            # Fallbacks
            if curr == 'VND': rate = 1/25400
            elif curr == 'IDR': rate = 1/15800
            elif curr == 'THB': rate = 1/36.5
            elif curr == 'INR': rate = 1/83.5
            elif curr == 'AUD': rate = 0.65
            elif curr == 'JPY': rate = 1/151.0
    rates[curr] = rate

df = pd.DataFrame(metrics)

def format_pct(x):
    if pd.isna(x) or x is None:
        return 'N/A'
    return f"{x*100:.2f}%"

def format_de(x):
    if pd.isna(x) or x is None:
        return 'N/A'
    return f"{x/100:.2f}x"

def format_pe(x):
    if pd.isna(x) or x is None:
        return 'N/A'
    return f"{x:.2f}"

def format_mcap_usd(row):
    val = row['Market Cap']
    curr = row['Currency']
    
    if pd.isna(val) or val is None or curr not in rates or rates[curr] is None:
        return 'N/A'
        
    usd_val = val * rates[curr]
    return f"${usd_val / 1e9:.2f}B"

df['Gross Margin'] = df['Gross Margin'].apply(format_pct)
df['Net Profit Margin'] = df['Net Profit Margin'].apply(format_pct)
df['ROE'] = df['ROE'].apply(format_pct)
df['ROA'] = df['ROA'].apply(format_pct)
df['Revenue Growth (YoY)'] = df['Revenue Growth (YoY)'].apply(format_pct)
df['Net Income Growth (YoY)'] = df['Net Income Growth (YoY)'].apply(format_pct)
df['D/E Ratio'] = df['D/E Ratio'].apply(format_de)
df['P/E Ratio (TTM)'] = df['P/E Ratio (TTM)'].apply(format_pe)
df['Market Cap (USD)'] = df.apply(format_mcap_usd, axis=1)

output_cols = ['Company', 'Market Cap (USD)', 'P/E Ratio (TTM)', 'Gross Margin', 'Net Profit Margin', 'ROE', 'ROA', 'Revenue Growth (YoY)', 'Net Income Growth (YoY)', 'D/E Ratio']
final_df = df[output_cols]

with open('retailers_comparison_usd.md', 'w', encoding='utf-8') as f:
    f.write("# So sánh các công ty bán lẻ (Yahoo Finance) - Vốn Hóa Tỷ USD\n\n")
    f.write(final_df.to_markdown(index=False))

print("\nDone generating markdown to retailers_comparison_usd.md")
