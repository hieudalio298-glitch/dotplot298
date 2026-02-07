from vnstock_data import Finance
import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== Kiểm tra định dạng RAW từ nguồn MAS (không transpose) ===")

try:
    symbol = 'REE'
    source = 'MAS'
    f = Finance(symbol=symbol, source=source)
    
    # Lấy dữ liệu thô
    df = f.balance_sheet(period='year', lang='vi', size=3)
    
    print("\n--- Cột (Columns) ---")
    print(df.columns.tolist())
    
    print("\n--- Chỉ mục (Index) ---")
    print(df.index.tolist()[:10])
    
    print("\n--- 5 hàng đầu tiên ---")
    print(df.head())

except Exception as e:
    print(f"Lỗi: {e}")
