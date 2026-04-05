import sys
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
from vnstock import Finance
import os

symbol = 'PNJ'
source = 'KBS'

def fetch_bctc():
    try:
        print(f"Fetching BCTC for {symbol} using source '{source}'...")
        fin = Finance(symbol=symbol, source=source)
        
        # Lấy báo cáo kết quả kinh doanh (Income Statement)
        print("Lấy báo cáo kết quả kinh doanh...")
        df_is = fin.income_statement(period='quarter', lang='vi')
        
        # Lấy bảng cân đối kế toán (Balance Sheet)
        print("Lấy bảng cân đối kế toán...")
        df_bs = fin.balance_sheet(period='quarter', lang='vi')
        
        # Lấy báo cáo lưu chuyển tiền tệ (Cash Flow)
        print("Lấy báo cáo lưu chuyển tiền tệ...")
        df_cf = fin.cash_flow(period='quarter', lang='vi')
        
        # Lưu ra file Excel
        output_file = f"{symbol}_BCTC_{source}.xlsx"
        output_path = os.path.join(os.getcwd(), output_file)
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            if df_is is not None and not df_is.empty:
                df_is.to_excel(writer, sheet_name='KQKD', index=False)
            if df_bs is not None and not df_bs.empty:
                df_bs.to_excel(writer, sheet_name='CDKT', index=False)
            if df_cf is not None and not df_cf.empty:
                df_cf.to_excel(writer, sheet_name='LCTT', index=False)
                
        print(f"\n✅ Đã lưu dữ liệu BCTC của {symbol} thành công tại: {output_path}")
        
    except Exception as e:
        print(f"\n❌ Đã xảy ra lỗi: {e}")

if __name__ == "__main__":
    fetch_bctc()
