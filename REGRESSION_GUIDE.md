# Hướng dẫn sử dụng Panel Data cho Regression Analysis

## 📊 Tổng quan

Script đã tạo sẵn 2 hàm để lấy panel data ROIC từ 2015-2025, **CHỈ GIỮ** các mã có đủ dữ liệu tất cả 11 năm.

**Kết quả:** 51 mã cổ phiếu có đủ data → 561 observations

---

## 🎯 2 Format dữ liệu

### 1. Wide Format (Pivot Table)
**Hàm:** `get_panel_data_roic(start_year=2015, end_year=2025)`

**Cấu trúc:**
```
symbol | year_2015 | year_2016 | ... | year_2025 | industry
-------|-----------|-----------|-----|-----------|----------
AAA    | 0.0284    | 0.0522    | ... | 0.0465    | Hóa chất
VNM    | 0.3413    | 0.3891    | ... | 0.2142    | Thực phẩm
```

**Sử dụng:**
```python
from get_financial_nopat import get_panel_data_roic

# Lấy wide format
df_wide = get_panel_data_roic(start_year=2015, end_year=2025)

# Shape: (51, 13) - 51 symbols, 13 columns (symbol + 11 years + industry)
print(df_wide.shape)

# Xem mẫu
print(df_wide.head())

# Lưu file
df_wide.to_csv('panel_roic_wide.csv', index=False)
```

**Thích hợp cho:**
- Cross-sectional analysis
- Heatmap
- Pivot analysis

---

### 2. Long Format (Panel Data)
**Hàm:** `get_long_format_panel(start_year=2015, end_year=2025)`

**Cấu trúc:**
```
symbol | industry | year | roic | roe | roa | equity | invested_capital | ...
-------|----------|------|------|-----|-----|--------|------------------|-----
AAA    | Hóa chất | 2015 | 0.0284 | 0.0495 | 0.0207 | ... | ... | ...
AAA    | Hóa chất | 2016 | 0.0522 | 0.1497 | 0.0464 | ... | ... | ...
VNM    | Thực phẩm| 2015 | 0.3413 | 0.3713 | 0.2857 | ... | ... | ...
```

**Sử dụng:**
```python
from get_financial_nopat import get_long_format_panel

# Lấy long format
df_long = get_long_format_panel(start_year=2015, end_year=2025)

# Shape: (561, 17) - 561 observations (51 symbols × 11 years)
print(df_long.shape)

# Xem columns
print(df_long.columns)

# Lưu file
df_long.to_csv('panel_roic_long.csv', index=False)
```

**Thích hợp cho:**
- Panel regression (statsmodels, linearmodels)
- Time series analysis
- Machine learning (sklearn)
- Plotting với seaborn/matplotlib

---

## 📈 Ví dụ Regression Analysis

### 1. OLS Regression đơn giản (statsmodels)

```python
import pandas as pd
import statsmodels.api as sm

# Load data
df = pd.read_csv('panel_roic_long.csv')

# Tạo dummy variables cho industry
df_dummies = pd.get_dummies(df, columns=['industry'], drop_first=True)

# Regression: ROIC ~ year + industry
X = df_dummies[['year'] + [col for col in df_dummies.columns if col.startswith('industry_')]]
y = df['roic']

X = sm.add_constant(X)  # Thêm intercept
model = sm.OLS(y, X).fit()

print(model.summary())
```

---

### 2. Panel Regression với Fixed Effects

```python
from linearmodels import PanelOLS
import pandas as pd

# Load data
df = pd.read_csv('panel_roic_long.csv')

# Set multi-index (symbol, year)
df = df.set_index(['symbol', 'year'])

# Panel regression với entity (symbol) fixed effects
model = PanelOLS(
    df['roic'],
    df[['roe', 'roa']],
    entity_effects=True  # Fixed effects
)

result = model.fit(cov_type='clustered', cluster_entity=True)
print(result.summary)
```

---

### 3. Time Series Analysis (per symbol)

```python
import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.tsa.arima.model import ARIMA

# Load data
df = pd.read_csv('panel_roic_long.csv')

# Lọc 1 mã, VD: VNM
vnm = df[df['symbol'] == 'VNM'].sort_values('year')

# Fit ARIMA model
model = ARIMA(vnm['roic'], order=(1, 0, 1))
result = model.fit()

# Forecast
forecast = result.forecast(steps=3)
print(f"Forecast ROIC cho VNM: {forecast}")

# Plot
vnm.plot(x='year', y='roic', marker='o', title='VNM ROIC Trend')
plt.show()
```

---

### 4. Sklearn - Machine Learning

```python
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

# Load data
df = pd.read_csv('panel_roic_long.csv')

# Prepare features
df_ml = pd.get_dummies(df, columns=['industry'])
X = df_ml.drop(['symbol', 'roic', 'roe', 'roa'], axis=1)
y = df_ml['roic']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Random Forest
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

# Predict
y_pred = rf.predict(X_test)

# Evaluate
print(f"R² Score: {r2_score(y_test, y_pred):.4f}")
print(f"RMSE: {mean_squared_error(y_test, y_pred, squared=False):.4f}")

# Feature importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print(feature_importance.head(10))
```

---

## 📊 Visualization Examples

### Heatmap (Wide Format)

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Load wide format
df_wide = pd.read_csv('panel_roic_wide.csv')

# Chọn top 20 symbols theo ROIC trung bình
df_wide['mean_roic'] = df_wide[[f'year_{y}' for y in range(2015, 2026)]].mean(axis=1)
top20 = df_wide.nlargest(20, 'mean_roic')

# Heatmap
year_cols = [f'year_{y}' for y in range(2015, 2026)]
plt.figure(figsize=(12, 8))
sns.heatmap(
    top20[year_cols].set_index(top20['symbol']),
    annot=True,
    fmt='.2f',
    cmap='RdYlGn',
    center=0.15,
    cbar_kws={'label': 'ROIC'}
)
plt.title('Top 20 ROIC Heatmap (2015-2025)')
plt.tight_layout()
plt.show()
```

### Time Series Plot (Long Format)

```python
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

# Load long format
df_long = pd.read_csv('panel_roic_long.csv')

# Top 5 symbols theo ROIC trung bình
top5_symbols = df_long.groupby('symbol')['roic'].mean().nlargest(5).index

# Filter
df_top5 = df_long[df_long['symbol'].isin(top5_symbols)]

# Plot
plt.figure(figsize=(12, 6))
sns.lineplot(data=df_top5, x='year', y='roic_pct', hue='symbol', marker='o')
plt.title('Top 5 ROIC Trends (2015-2025)')
plt.xlabel('Year')
plt.ylabel('ROIC (%)')
plt.legend(title='Symbol')
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
```

---

## 🔍 Phân tích theo ngành

```python
import pandas as pd

# Load data
df = pd.read_csv('panel_roic_long.csv')

# Tính ROIC trung bình theo ngành và năm
industry_avg = df.groupby(['industry', 'year'])['roic_pct'].mean().reset_index()

# Pivot để xem theo năm
industry_pivot = industry_avg.pivot(index='industry', columns='year', values='roic_pct')

print(industry_pivot)

# Lưu ra Excel
industry_pivot.to_excel('industry_roic_analysis.xlsx')
```

---

## 📦 Thư viện cần thiết

```bash
pip install pandas numpy statsmodels linearmodels scikit-learn seaborn matplotlib openpyxl
```

---

## ✅ Files đã tạo

Khi chạy `python get_financial_nopat.py`, script sẽ tự động tạo:

1. **`panel_roic_wide.csv`** (51 rows × 13 columns)
   - Wide format cho pivot analysis

2. **`panel_roic_long.csv`** (561 rows × 17 columns)
   - Long format cho regression/machine learning

---

## 🎓 Giải thích

### Tại sao chỉ có 51 mã?

Ban đầu có ~1680 mã trong database, nhưng:
- Nhiều mã IPO sau 2015 → không có data đủ 11 năm
- Một số mã bị hủy niêm yết trước 2025
- Các mã thiếu data năm 2021 do COVID hoặc lý do khác

→ **Chỉ 51 mã** có đầy đủ ROIC từ 2015-2025 (balanced panel)

### Các cột trong Long Format

| Cột | Giải thích |
|---|---|
| `roic`, `roe`, `roa` | Decimal (0.2142 = 21.42%) |
| `roic_pct`, `roe_pct`, `roa_pct` | Phần trăm (21.42) |
| `equity_billion`, `invested_capital_billion` | Tỷ VNĐ |
| `nopat_billion`, `total_assets_billion` | Tỷ VNĐ |

---

## 🚀 Quick Start

```python
# Import
from get_financial_nopat import get_panel_data_roic, get_long_format_panel

# Wide format
df_wide = get_panel_data_roic(2015, 2025)
print(df_wide.head())

# Long format
df_long = get_long_format_panel(2015, 2025)
print(df_long.head())

# Hoặc đọc từ CSV đã lưu
import pandas as pd
df = pd.read_csv('panel_roic_long.csv')
```

Chúc bạn phân tích thành công! 📊
