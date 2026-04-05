import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import os
import json
import pandas as pd
from supabase import create_client, Client

SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

def main():
    print("Connecting to Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 1. Fetch balance_sheet data to rank companies by Equity
        print("Fetching balance sheet data for all symbols to rank by Equity...")
        # Since supabase has a default limit of 1000, we may need to paginate if we want all symbols
        # Actually, let's paginate with a smaller limit to avoid timeout.
        all_bs = []
        limit = 100
        start = 0
        while True:
            print(f"Fetching rows {start} to {start+limit-1}...")
            res = supabase.table('financial_statements').select('symbol, data')\
                .eq('statement_type', 'balance_sheet')\
                .eq('period_type', 'quarter')\
                .range(start, start + limit - 1).execute()
            data = res.data
            if not data:
                break
            all_bs.extend(data)
            if len(data) < limit:
                break
            start += limit
        print(f"Loaded {len(all_bs)} balance sheet records.")
        
        # 2. Extract equity
        equity_list = []
        for rc in all_bs:
            symbol = rc['symbol']
            bs_data = rc.get('data')
            if not bs_data or not isinstance(bs_data, list) or len(bs_data) == 0:
                continue
            
            # Use the latest period (first record)
            latest = bs_data[0]
            
            # Find Equity value. Different companies might have different keys for "Vốn chủ sở hữu".
            equity_val = None
            keys_to_check = [
                '400. VỐN CHỦ SỞ HỮU', 
                '410. Vốn chủ sở hữu', 
                'D. VỐN CHỦ SỞ HỮU', 
                'C. VỐN CHỦ SỞ HỮU'
            ]
            for key in keys_to_check:
                if key in latest and latest[key] is not None:
                    try:
                        equity_val = float(latest[key])
                        break
                    except:
                        pass
            
            # Fallback if specific key is not found
            if equity_val is None:
                for k, v in latest.items():
                    if 'Vốn chủ sở hữu' in str(k) and v is not None:
                        try:
                            equity_val = float(v)
                            break
                        except:
                            pass
                            
            if equity_val is not None:
                equity_list.append({"symbol": symbol, "equity": equity_val})
                
        # 3. Sort by Equity and take top 200
        df_equity = pd.DataFrame(equity_list)
        df_equity = df_equity.sort_values(by="equity", ascending=False).head(200)
        top_200_symbols = df_equity['symbol'].tolist()
        print(f"Extracted top {len(top_200_symbols)} companies by Equity.")
        if len(top_200_symbols) == 0:
            print("No companies found with Equity!")
            return
            
        print("Top 10 symbols by equity:", top_200_symbols[:10])
        
        # 4. Fetch income_statement for these 200 symbols
        print("\nFetching Income Statements for the top 200...")
        
        # Paginate the IN query if necessary or just fetch in batches of 50
        all_is = []
        batch_size = 50
        for i in range(0, len(top_200_symbols), batch_size):
            batch = top_200_symbols[i:i+batch_size]
            res = supabase.table('financial_statements').select('symbol, data')\
                .eq('statement_type', 'income_statement')\
                .eq('period_type', 'quarter')\
                .in_('symbol', batch).execute()
            all_is.extend(res.data)
            
        print(f"Loaded {len(all_is)} income statement records.")
        
        # 5. Filter companies that have 2025-Q1 < 2024-Q1
        results = []
        for rc in all_is:
            symbol = rc['symbol']
            is_data = rc.get('data')
            if not is_data or not isinstance(is_data, list):
                continue
                
            q1_2024 = None
            q1_2025 = None
            
            for item in is_data:
                try:
                    # In vnstock, 'period' formatting is usually 'YYYY-Qn'
                    period = str(item.get('period', ''))
                    
                    if period == '2024-Q1':
                        q1_2024 = item
                    elif period == '2025-Q1':
                        q1_2025 = item
                except Exception as e:
                    pass
                    
            if q1_2024 and q1_2025:
                # Find Profit After Tax
                def get_profit(record):
                    # Prefer mother company profit
                    keys = [
                        'Lợi nhuận sau thuế của cổ đông của Công ty mẹ',
                        '18. Lợi nhuận sau thuế thu nhập doanh nghiệp',
                        '20. Lợi nhuận sau thuế thu nhập doanh nghiệp'
                    ]
                    for k in keys:
                        if k in record and record[k] is not None:
                            try:
                                return float(record[k])
                            except:
                                pass
                    return None
                    
                profit_2024 = get_profit(q1_2024)
                profit_2025 = get_profit(q1_2025)
                
                if profit_2024 is not None and profit_2025 is not None:
                    if profit_2025 < profit_2024:
                        # Got a match
                        equity_val = df_equity[df_equity['symbol'] == symbol]['equity'].values[0]
                        pct_change = ((profit_2025 - profit_2024) / abs(profit_2024)) * 100 if profit_2024 != 0 else 0
                        results.append({
                            "Symbol": symbol,
                            "Vốn Chủ Sở Hữu (tỷ VNĐ)": round(equity_val / 1e9, 2),
                            "LNST Q1.2024 (tỷ VNĐ)": round(profit_2024 / 1e9, 2),
                            "LNST Q1.2025 (tỷ VNĐ)": round(profit_2025 / 1e9, 2),
                            "% Giảm": round(pct_change, 2)
                        })
                        
        print("\n=== KẾT QUẢ ===")
        print(f"Có {len(results)} doanh nghiệp lớn (trong top 200) có LNST Q1.2025 GIẢM so với Q1.2024.")
        
        df_res = pd.DataFrame(results)
        if not df_res.empty:
            df_res = df_res.sort_values(by="Vốn Chủ Sở Hữu (tỷ VNĐ)", ascending=False)
            print(df_res.to_string(index=False))
            
            out_file = "profit_decline_q1_2025.csv"
            df_res.to_csv(out_file, index=False, encoding='utf-8-sig')
            print(f"\nSaved to {os.path.abspath(out_file)}")
        else:
            print("Không tìm thấy doanh nghiệp nào thỏa mãn (CÓ THỂ DO CHƯA CÓ BCTC Q1.2025).")

    except Exception as e:
        print("Lỗi:", e)

if __name__ == "__main__":
    main()
