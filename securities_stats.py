import vnstock_data
from vnstock_data import Listing, Trading
import pandas as pd
import sys
import io

# Fix encoding for Windows terminal
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_securities_stats():
    try:
        # 1. Get all symbols and filter for securities companies
        l = Listing(source='vnd')
        all_syms = l.all_symbols()
        
        # Securites sector symbols (comprehensive list)
        securities_symbols = ['SSI', 'VND', 'VCI', 'HCM', 'SHS', 'VIX', 'MBS', 'FTS', 'BSI', 'CTS', 'AGR', 'ORS', 'TVS', 'VDS', 'APS', 'APG', 'BVS', 'EVS', 'IVS', 'PSI', 'TCI', 'TDS', 'VIG', 'WSS', 'ASG', 'HBS', 'VUA', 'DSC', 'SBS', 'TVB', 'TVSC', 'PDS', 'VFS']
        
        # Filter symbols that are actually in the market list
        market_list = all_syms['symbol'].tolist()
        symbols = [s for s in securities_symbols if s in market_list]
        
        if not symbols:
            # Fallback filter if hardcoded list doesn't match
            if 'industry_name' in all_syms.columns:
                symbols = all_syms[all_syms['industry_name'].str.contains('Chứng khoán|Dịch vụ tài chính', na=False, case=False)]['symbol'].tolist()
        
        print(f"Bắt đầu thống kê {len(symbols)} mã chứng khoán...")
        
        # 2. Fetch data from price_board
        # Using source 'vci' as it usually has good fundamental data
        t = Trading(source='vci')
        pb_df = t.price_board(symbols_list=symbols, get_all=True)
        
        if pb_df.empty:
            print("Không lấy được dữ liệu từ bảng giá.")
            return

        # 3. Identify and rename columns
        # Column names can vary: 'pE'/'pe', 'pB'/'pb', 'roe', 'roa', 'marketCap'
        mapping = {
            'pE': 'P/E',
            'pB': 'P/B',
            'roe': 'ROE',
            'roa': 'ROA',
            'marketCap': 'Vốn hóa'
        }
        
        # Case insensitive mapping
        display_cols = {'symbol': 'Mã'}
        present_mapping = {}
        for col in pb_df.columns:
            for k, v in mapping.items():
                if col.lower() == k.lower():
                    present_mapping[col] = v
        
        final_df = pb_df[['symbol'] + list(present_mapping.keys())].copy()
        final_df.rename(columns={'symbol': 'Mã', **present_mapping}, inplace=True)
        
        # Handle formatting
        if 'ROE' in final_df.columns:
            final_df['ROE'] = pd.to_numeric(final_df['ROE'], errors='coerce').map(lambda x: f"{x:.2f}%" if pd.notnull(x) else "-")
        if 'ROA' in final_df.columns:
            final_df['ROA'] = pd.to_numeric(final_df['ROA'], errors='coerce').map(lambda x: f"{x:.2f}%" if pd.notnull(x) else "-")
        if 'P/E' in final_df.columns:
            final_df['P/E'] = pd.to_numeric(final_df['P/E'], errors='coerce').map(lambda x: f"{x:.2f}" if pd.notnull(x) else "-")
        if 'P/B' in final_df.columns:
            final_df['P/B'] = pd.to_numeric(final_df['P/B'], errors='coerce').map(lambda x: f"{x:.2f}" if pd.notnull(x) else "-")
        
        if 'Vốn hóa' in final_df.columns:
            final_df['Vốn hóa (Tỷ)'] = pd.to_numeric(final_df['Vốn hóa'], errors='coerce') / 1e9
            final_df['Vốn hóa (Tỷ)'] = final_df['Vốn hóa (Tỷ)'].map(lambda x: f"{x:,.0f}" if pd.notnull(x) else "-")
            final_df.drop(columns=['Vốn hóa'], inplace=True)

        print("\n### BẢNG THỐNG KÊ NHÓM CHỨNG KHOÁN")
        print(final_df.to_markdown(index=False))
        
        # Calculate sector medians
        print("\n### CHỈ SỐ TRUNG BÌNH NGÀNH")
        stats = []
        for col in ['P/E', 'P/B', 'ROE', 'ROA']:
            if col in final_df.columns:
                vals = pd.to_numeric(pb_df[[c for c in pb_df.columns if c.lower() == col.lower()][0]], errors='coerce').dropna()
                if not vals.empty:
                    stats.append({'Chỉ số': col, 'Trung vị (Median)': f"{vals.median():.2f}" + ("%" if "RO" in col else "")})
        
        if stats:
            print(pd.DataFrame(stats).to_markdown(index=False))

    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    get_securities_stats()
