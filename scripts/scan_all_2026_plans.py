import pandas as pd
from vnstock_data import Finance
import vnstock
import concurrent.futures

def check_2026_plan(sym):
    try:
        fin = Finance('MAS', sym)
        df = fin.annual_plan(lang='vi')
        if df is not None and not df.empty:
            df['period'] = df['period'].astype(str)
            if '2026' in df['period'].tolist():
                row = df[df['period'] == '2026'].iloc[0].to_dict()
                row['Symbol'] = sym
                return row
    except Exception:
        pass
    return None

def main():
    print("Fetching all ticker symbols...")
    import requests
    # Use vnstock to get a list of symbols quickly, or just use price board
    t = vnstock.Trading('VCI')
    try:
        board = t.price_board('VN30') # just to initialize
        # To get all symbols, let's use a public API or vnstock's company list
        # We can just fetch from the supabase DB since we already have it in floor_sell.py
    except:
        pass

    import re
    from supabase import create_client
    sb = create_client("https://utqmpdmbkubhzuccqeyf.supabase.co", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")
    all_data = []
    page = 0
    while True:
        r = sb.from_("stocks").select("symbol").range(page, page + 999).execute()
        if not r.data: break
        all_data.extend(r.data)
        if len(r.data) < 1000: break
        page += 1000
    
    symbols = [d["symbol"] for d in all_data if re.match(r'^[A-Z]{3}$', d["symbol"])]
    print(f"Loaded {len(symbols)} symbols. Scanning for 2026 plans...")

    found_2026 = []
    
    # Use ThreadPoolExecutor to speed up checking
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_sym = {executor.submit(check_2026_plan, sym): sym for sym in symbols}
        
        for i, future in enumerate(concurrent.futures.as_completed(future_to_sym)):
            sym = future_to_sym[future]
            try:
                res = future.result()
                if res:
                    found_2026.append(res)
                    print(f"\n🎉 FOUND 2026 PLAN FOR: {sym}")
                    print(res)
            except Exception:
                pass
                
            if (i+1) % 100 == 0:
                print(f"Checked {i+1}/{len(symbols)} stocks...")

    if not found_2026:
        print("\n💤 XONG! KHÔNG có công ty nào có kế hoạch 2026 trên hệ thống.")
    else:
        print(f"\n✅ Đã tìm thấy {len(found_2026)} công ty có kế hoạch 2026!")
        df = pd.DataFrame(found_2026)
        df.to_excel('ke_hoach_kinh_doanh_2026_toan_thi_truong.xlsx', index=False)

if __name__ == "__main__":
    main()
