from vnstock_data import Finance
import sys
import re

# Thiết lập UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Hàm tính level (giữ nguyên, đã hỗ trợ a., b., c. và các tiền tố)
def get_indent_level(indicator):
    stripped = indicator.strip()
    level = 0

    if re.match(r'^[A-Z]\.\s', stripped):
        return 0
    if re.match(r'^[IVXLD]+\.\s', stripped):
        return 1
    if re.match(r'^\d+\.\s', stripped):
        level = 2
    if re.match(r'^\d+\.\d+\.\s', stripped):
        level = 3
    if re.match(r'^\d+\.\d+\.\d+\.?\s', stripped):
        level = 4
    if re.match(r'^[a-z]\.\s', stripped):
        level = 4

    current = stripped
    while True:
        if current.startswith(('-', '+', 'Trong đó:', 'Gồm:', 'Bao gồm:', '* ')):
            level += 1
            current = current.lstrip('-+ *:').strip()
            if not current or current == stripped:
                break
            stripped = current
        else:
            break

    if any(kw in stripped for kw in ['Dự phòng', 'ký quỹ', 'ký cược', 'thế chấp', 'Lợi thế thương mại']):
        level = max(level, 4)

    return level

# Hàm in cây ASCII – ĐÃ FIX HOÀN HẢO CHO CÁC CẤP NGANG HÀNG (I./II./III. thẳng hàng tuyệt đối)
def print_hierarchy(df, title):
    if df.empty:
        print(f"Không có dữ liệu cho {title}.")
        return

    print("\n" + "=" * 90)
    print(title.upper().center(90))
    print("=" * 90)

    indicators = [c for c in df.columns if c.lower() not in ['year_period', 'period', 'year', 'quarter', 'năm', 'quý']]
    levels = [get_indent_level(ind) for ind in indicators]
    print(f"Tổng cộng: {len(indicators)} chỉ tiêu\n")

    for i, ind in enumerate(indicators):
        level = levels[i]

        # FIX CHÍNH: Chỉ coi là "cuối nhóm ngang hàng" khi next_level < level (quay lên mẹ) hoặc là dòng cuối
        if i == len(indicators) - 1:
            is_last = True
        else:
            next_level = levels[i + 1]
            is_last = (next_level < level)  # CHỈ <, không <= nữa → các anh em ngang hàng sẽ dùng ├──

        connector = "└── " if is_last else "├── "

        # Prefix với │ dọc nếu còn bất kỳ nhánh sâu hơn nào sau này
        prefix = ""
        for l in range(level):
            has_deeper_below = any(lev > l for lev in levels[i + 1:])
            prefix += "│   " if has_deeper_below else "    "

        print(prefix + connector + ind)

    print("\n" + "═" * 90 + "\n")

# Main
def print_full_indicators():
    fin = Finance(symbol='HPG', source='mas')  # Ngân hàng TCB → cấu trúc B01-NH
    
    print("=" * 90)
    print("BÁO CÁO TÀI CHÍNH CHI TIẾT TCB (NGÂN HÀNG) - CÂY PHÂN CẤP HOÀN HẢO".center(90))
    print("=" * 90)
    
    try:
        bs = fin.balance_sheet(period='year')
        print_hierarchy(bs, "1. BẢNG CÂN ĐỐI KẾ TOÁN")
    except Exception as e:
        print(f"Lỗi: {e}")

    try:
        income = fin.income_statement(period='year')
        print_hierarchy(income, "2. KẾT QUẢ KINH DOANH")
    except Exception as e:
        print(f"Lỗi: {e}")

    try:
        cf = fin.cash_flow(period='year')
        print_hierarchy(cf, "3. LƯU CHUYỂN TIỀN TỆ")
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    print_full_indicators()