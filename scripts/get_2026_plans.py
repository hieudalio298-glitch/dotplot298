"""
Script lấy Kế hoạch Kinh Doanh (Business Plans) từ vnstock_data (nguồn: MAS).
Bạn có thể chạy script này vào cuối tháng 3 hoặc tháng 4/2026 để lấy dữ liệu 2026.
"""

import pandas as pd
from vnstock_data import Finance
from datetime import date
from pathlib import Path

def get_plans(symbols, target_year="2026"):
    results = []
    print(f"Đang kiểm tra kế hoạch {target_year} cho {len(symbols)} mã...")
    
    for sym in symbols:
        try:
            fin = Finance('MAS', sym)
            df = fin.annual_plan(lang='vi')
            if df is not None and not df.empty:
                df['period'] = df['period'].astype(str)
                # Filter for target year
                df_year = df[df['period'] == str(target_year)]
                if not df_year.empty:
                    row = df_year.iloc[0].to_dict()
                    row['Mã CP'] = sym
                    results.append(row)
                    print(f"✅ {sym}: Đã có kế hoạch {target_year}")
                else:
                    print(f"⏳ {sym}: Chưa có kế hoạch {target_year} (mới nhất: {df['period'].iloc[0]})")
        except Exception as e:
            print(f"❌ {sym}: Lỗi khi lấy dữ liệu ({e})")
            
    if results:
        df_out = pd.DataFrame(results)
        # Move symbol column to front
        cols = ['Mã CP'] + [c for c in df_out.columns if c != 'Mã CP']
        df_out = df_out[cols]
        
        out_file = f"ke_hoach_kinh_doanh_{target_year}.xlsx"
        df_out.to_excel(out_file, index=False)
        print(f"\n🎉 Đã lưu {len(results)} mã vào: {out_file}")
    else:
        print(f"\n💤 Chưa có công ty nào trong danh sách công bố kế hoạch {target_year}.")

if __name__ == "__main__":
    # Điền danh sách mã bạn muốn theo dõi vào đây (Ví dụ: VN30)
    test_symbols = [
        'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG', 
        'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB', 
        'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
    ]
    get_plans(test_symbols, target_year="2025")
