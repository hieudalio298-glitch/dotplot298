# Hướng dẫn sử dụng get_financial_nopat.py

## 📋 Tổng quan
File Python để query dữ liệu từ bảng `financial_nopat` trong Supabase.

## 🔧 Cài đặt

### Bước 1: Cài đặt thư viện cần thiết
```bash
pip install supabase pandas
```

Hoặc dùng file requirements:
```bash
pip install -r requirements_nopat.txt
```

### Bước 2: Chạy file
```bash
python get_financial_nopat.py
```

---

## 🎯 Các hàm chính

### 1. `get_financial_data(symbol, period_type='year', year=None)`
Lấy dữ liệu tài chính của 1 mã cổ phiếu

**Tham số:**
- `symbol`: Mã cổ phiếu (VD: 'VNM', 'HPG')
- `period_type`: 'year' hoặc 'quarter'
- `year`: Năm cụ thể (optional)

**Ví dụ:**
```python
# Lấy tất cả dữ liệu yearly của VNM
df = get_financial_data('VNM', period_type='year')

# Lấy dữ liệu VNM năm 2024
df = get_financial_data('VNM', period_type='year', year=2024)

# Lấy dữ liệu quarterly của HPG
df = get_financial_data('HPG', period_type='quarter')
```

---

### 2. `get_top_roic(year=2024, limit=10, industry=None)`
Lấy top các công ty có ROIC cao nhất

**Tham số:**
- `year`: Năm
- `limit`: Số lượng kết quả
- `industry`: Ngành (optional)

**Ví dụ:**
```python
# Top 10 ROIC năm 2024
top = get_top_roic(year=2024, limit=10)

# Top 5 ROIC ngành "Thực phẩm và đồ uống"
top_food = get_top_roic(year=2024, limit=5, industry="Thực phẩm và đồ uống")
```

---

### 3. `compare_companies(symbols, year=2024)`
So sánh nhiều công ty

**Tham số:**
- `symbols`: Danh sách mã cổ phiếu
- `year`: Năm so sánh

**Ví dụ:**
```python
# So sánh VNM, HPG, FPT năm 2024
df = compare_companies(['VNM', 'HPG', 'FPT'], year=2024)

# So sánh nhiều ngân hàng
df = compare_companies(['VCB', 'TCB', 'MBB', 'ACB'], year=2024)
```

---

### 4. `get_time_series(symbol, period_type='year', start_year=None)`
Lấy chuỗi thời gian của 1 mã

**Tham số:**
- `symbol`: Mã cổ phiếu
- `period_type`: 'year' hoặc 'quarter'
- `start_year`: Năm bắt đầu (optional)

**Ví dụ:**
```python
# Time series VNM từ 2020
df = get_time_series('VNM', period_type='year', start_year=2020)

# Time series quarterly của FPT
df = get_time_series('FPT', period_type='quarter', start_year=2023)
```

---

## 📊 Cột dữ liệu trong DataFrame

| Cột | Mô tả | Đơn vị |
|---|---|---|
| `symbol` | Mã cổ phiếu | - |
| `industry` | Ngành | - |
| `year` | Năm | - |
| `quarter` | Quý (0 nếu yearly) | - |
| `nopat` | NOPAT | VNĐ |
| `equity` | Vốn chủ sở hữu | VNĐ |
| `short_term_debt` | Vay ngắn hạn | VNĐ |
| `long_term_debt` | Vay dài hạn | VNĐ |
| `invested_capital` | Vốn đầu tư | VNĐ |
| `total_assets` | Tổng tài sản | VNĐ |
| `roic` | Return on Invested Capital | 0-1 |
| `roe` | Return on Equity | 0-1 |
| `roa` | Return on Assets | 0-1 |

**Lưu ý:** 
- Các ratios (roic, roe, roa) ở dạng decimal (VD: 0.2142 = 21.42%)
- Các hàm đã tự động format ra cột `_pct` và `_ty` (tỷ VNĐ) cho tiện

---

## 💡 Ví dụ nâng cao

### Lọc theo ngành và sắp xếp
```python
# Query trực tiếp
response = supabase.table('financial_nopat') \
    .select('*') \
    .eq('industry', 'Ngân hàng') \
    .eq('year', 2024) \
    .order('roic', desc=True) \
    .execute()

df = pd.DataFrame(response.data)
```

### Tính trung bình ROIC theo ngành
```python
df = get_financial_data('VNM', period_type='year')

# Group by industry
industry_avg = df.groupby('industry').agg({
    'roic': 'mean',
    'roe': 'mean',
    'roa': 'mean'
}).round(4)
```

### Export ra Excel
```python
df = get_top_roic(year=2024, limit=50)
df.to_excel('top_roic_2024.xlsx', index=False)
```

---

## ⚙️ Cấu hình

Supabase URL và Key đã được cấu hình sẵn trong file. Nếu cần thay đổi:

```python
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-key"
```

---

## 🎓 Giải thích các Ratios

### ROIC (Return on Invested Capital)
```
ROIC = NOPAT / Invested Capital
```
Đo hiệu quả sử dụng vốn đầu tư (equity + debt)

### ROE (Return on Equity)
```
ROE = NOPAT / Equity
```
Đo hiệu quả sử dụng vốn chủ sở hữu

### ROA (Return on Assets)
```
ROA = NOPAT / Total Assets
```
Đo hiệu quả sử dụng tài sản

---

## ✅ Kết quả mẫu

Chạy `python get_financial_nopat.py` sẽ hiển thị 5 ví dụ:
1. ✅ Dữ liệu VNM yearly
2. ✅ Top 10 ROIC cao nhất 2024
3. ✅ So sánh VNM, HPG, FPT
4. ✅ Time series VNM từ 2020
5. ✅ Top 5 ROE ngành Thực phẩm

Tất cả đều chạy thành công! 🎉
