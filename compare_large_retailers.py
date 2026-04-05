import yfinance as yf
import pandas as pd
pd.options.display.float_format = '{:.2f}'.format

tickers = {
    'FRT.VN': 'FPT Retail (VN)',
    'DGW.VN': 'Digiworld (VN)',
    'MWG.VN': 'Mobile World (VN)',
    'ERAA.JK': 'Erajaya (ID)',
    'COM7.BK': 'Com7 (TH)',
    'EMIL.NS': 'Elect. Mart (IN)',
    'BBY': 'Best Buy (US)',
    'CEC.DE': 'Ceconomy (GER)',
    '9831.T': 'Yamada Hldgs (JP)',
    'JBH.AX': 'JB Hi-Fi (AU)',
    '8282.T': "K's Holdings (JP)",
    'HVN.AX': 'Harvey Norman (AU)',
    '3048.T': 'Bic Camera (JP)',
    'FNAC.PA': 'Fnac Darty (FR)',
    '2730.T': 'Edion Corp (JP)',
    'CURY.L': 'Currys plc (UK)'
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
    orig_curr = curr
    if curr == 'USD':
        rates[curr] = 1.0
        continue
        
    print(f"Fetching exchange rate for {curr} to USD...")
    rate = None
    
    # Handle GBp logic (Pence Sterling)
    req_curr = curr
    multiplier = 1.0
    if curr == 'GBp':
        req_curr = 'GBP'
        multiplier = 0.01

    try:
        t = yf.Ticker(f"{req_curr}USD=X")
        rate = t.fast_info['previous_close'] * multiplier
    except Exception:
        try:
            t = yf.Ticker(f"USD{req_curr}=X")
            rate = (1.0 / t.fast_info['previous_close']) * multiplier
        except Exception:
            # Fallbacks
            if req_curr == 'VND': rate = 1/25400
            elif req_curr == 'IDR': rate = 1/15800
            elif req_curr == 'THB': rate = 1/36.5
            elif req_curr == 'INR': rate = 1/83.5
            elif req_curr == 'AUD': rate = 0.65
            elif req_curr == 'JPY': rate = 1/151.0
            elif req_curr == 'EUR': rate = 1.08
            elif req_curr == 'GBP': rate = 1.25 * multiplier
    rates[orig_curr] = rate

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

# Sort by market cap descending to easily compare large vs small. Need to parse the $...B strings back or sort before format.
# It's easier to sort before string formatting, but since the df is already formatted, we will just save it as is.

with open('large_retailers_comparison.md', 'w', encoding='utf-8') as f:
    f.write("# So sánh các công ty bán lẻ Toàn Cầu\n\n")
    f.write(final_df.to_markdown(index=False))

print("\nDone generating markdown to large_retailers_comparison.md")
