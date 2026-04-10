import vnstock
import pandas as pd
import json
import sys

# Fix encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

def get_bank_deposits():
    v = vnstock.Vnstock()
    
    # 1. Get bank symbols
    # Common Vietnamese banks
    banks = ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'VPB', 'ACB', 'HDB', 'SHB', 'STB', 
             'VIB', 'TPB', 'LPB', 'MSB', 'OCB', 'ABB', 'BAB', 'BVB', 'EIB', 'KLB', 
             'NAB', 'NVB', 'PGB', 'SGB', 'VAB', 'VBB']
    
    results = []
    
    for symbol in banks:
        print(f"Fetching data for {symbol}...")
        try:
            # Use Finance from vnstock v3 (if available) or similar
            # Based on update_financials.py, Finance(symbol=symbol, source='MAS').balance_sheet(period='quarter')
            # Let's try to find the specific field in the balance sheet
            
            # Using the v3 API structure if possible, otherwise fallback to MAS
            try:
                # Finance(symbol=symbol, source='MAS') is what update_financials uses
                from vnstock_data import Finance
                finance = Finance(symbol=symbol, source='MAS')
                df = finance.balance_sheet(period='quarter', lang='vi', size=10)
            except:
                # Fallback to vnstock v3 if available
                df = v.stock(symbol=symbol, source='VCI').finance.balance_sheet(period='quarter')
            
            if df is None or df.empty:
                continue
                
            # Filter for 2025
            # The columns might be years/quarters
            # In update_financials, it transposes if it's not long format
            
            # Standard bank balance sheet line: "Tiền gửi tại Ngân hàng Nhà nước"
            # It might be in the index or a column depending on the source
            
            # Let's check the structure first for one bank
            if symbol == 'VCB':
                print(f"Columns for {symbol}: {df.columns.tolist()[:5]}")
                print(f"Index for {symbol}: {df.index.tolist()[:10]}")
            
            # We want "Tiền gửi tại Ngân hàng Nhà nước"
            target_metric = "Tiền gửi tại Ngân hàng Nhà nước"
            
            # If it's MAS, it might be in 'item' column or index
            if 'item' in df.columns:
                row = df[df['item'] == target_metric]
            elif 'Chỉ tiêu' in df.columns:
                row = df[df['Chỉ tiêu'] == target_metric]
            else:
                row = df.filter(like=target_metric, axis=0)
            
            if not row.empty:
                # Get columns related to 2025
                cols_2025 = [c for c in df.columns if '2025' in str(c)]
                if not cols_2025:
                    # Maybe it's a long format with 'year' and 'quarter' columns
                    if 'year' in df.columns and 'quarter' in df.columns:
                        mask_2025 = df['year'].astype(str) == '2025'
                        row_2025 = df[mask_2025 & (df['item'] == target_metric if 'item' in df.columns else True)]
                        # Extract data
                        for _, r in row_2025.iterrows():
                            results.append({
                                'Symbol': symbol,
                                'Quarter': r.get('quarter', 'N/A'),
                                'Year': 2025,
                                'Value': r.get('value', 0) # or the actual column name
                            })
                    continue

                # Wide format
                for col in cols_2025:
                    val = row[col].iloc[0]
                    results.append({
                        'Symbol': symbol,
                        'Period': col,
                        'Value': val
                    })
                    
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            
    if results:
        res_df = pd.DataFrame(results)
        print("\n--- Tiền gửi tại Ngân hàng Trung ương (2025) ---")
        print(res_df.to_string())
        res_df.to_csv('bank_deposits_2025.csv', index=False)
    else:
        print("No data found for 2025.")

if __name__ == "__main__":
    get_bank_deposits()
