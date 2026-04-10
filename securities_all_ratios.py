"""
Thong ke toan bo 80+ chi so nang cao nhom chung khoan
Chay: C:/Users/Lenovo/.venv/Scripts/python.exe securities_all_ratios.py
"""
import sys, time, requests
import pandas as pd
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

SYMBOLS = [
    'TCX','SSI','VPX','VCK','VCI','VIX','VND','HCM','MBS','SHS',
    'EVF','FTS','ORS','BSI','DSE','CTS','VDS','DSC','AGR','TVS',
    'BMS','VFS','AAS','BVS','APG','ABW','TCI','OGC','EVS','SBS',
    'IVS','APS','PSI','WSS','VIG','HVA'
]
CODES = ','.join(SYMBOLS)
BASE = "https://api-finfo.vndirect.com.vn/v4/ratios"
HDR = {'User-Agent': 'Mozilla/5.0'}
D7AGO = (datetime.today() - timedelta(days=7)).strftime('%Y-%m-%d')

# ================================================================
# Danh sach tat ca cac chi so chia lam 2 nhom (Daily va Quarter/Annual)
# ================================================================
DAILY_CODES = [
    'PRICE_TO_EARNINGS', 'PRICE_TO_BOOK', 'PRICE_TO_SALES', 'MARKETCAP',
    'PRICE_CHG_PCT_CR_1D', 'PRICE_CHG_PCT_CR_5D', 'PRICE_CHG_PCT_CR_1M', 
    'PRICE_CHG_PCT_CR_3M', 'PRICE_CHG_PCT_CR_6M', 'PRICE_CHG_PCT_CR_1Y', 
    'PRICE_CHG_PCT_CR_3Y', 'PRICE_CHG_PCT_CR_5Y', 'PRICE_HIGHEST_CR_52W', 
    'PRICE_LOWEST_CR_52W', 'PRICE_CHG_PCT_CR_HH52W', 'PRICE_CHG_PCT_CR_LL52W',
    'NMVOLUME_AVG_CR_5D', 'NMVOLUME_AVG_CR_10D', 'NMVOLUME_AVG_CR_20D',
    'NMVALUE_AVG_CR_20D', 'NMVALUE_AVG_CR_1M'
]

ANNUAL_CODES = [
    # Sinh loi
    'ROAE_TR_AVG5Q', 'ROAA_TR_AVG5Q', 'NET_MARGIN_TR', 'NET_MARGIN_QR', 
    'GROSS_MARGIN_TR', 'GROSS_MARGIN_QR', 'EBIT_TR', 'EBITDA_TR',
    # Tang truong
    'NET_PROFIT_TR_GRYOY', 'NET_PROFIT_YD_GRYOY', 'NET_PROFIT_QR_GRYOY', 
    'NET_SALES_TR_GRYOY', 'NET_SALES_QR_GRYOY', 'NET_SALES_TR_GR2YR', 
    'GROSS_PROFIT_TR_GRYOY', 'OPERATING_PROFIT_TR_GRYOY', 'EPS_TR_GRYOY', 
    'EPS_QR_GRYOY', 'PRETAX_PROFIT_TR_GRYOY', 'TOTAL_ASSETS_AQ_GRYOY', 
    'OWNERS_EQUITY_AQ_GRYOY', 'OWNERS_EQUITY_AQ_GRYTD',
    # Cau truc von & Don bay
    'DEBT_TO_EQUITY_AQ', 'EQUITY_TO_ASSET_AQ', 'FINANCIAL_LEVERAGE_AQ', 
    'LOANS_TO_EQUITY_AQ', 'HTM_TO_EQUITY_AQ', 'FVTPL_AFS_TO_EQUITY_AQ', 
    'NET_CASH_TO_EQUITY_AQ', 'TOTAL_DEBT_AQ_GRYOY', 'TOTAL_CAP_AQ', 
    'OWNERS_EQUITY_AQ', 'TOTAL_ASSETS_AQ',
    # Dinh gia bo sung
    'EPS_TR', 'EPS_YD', 'BVPS_AQ',
    # Thanh khoan
    'CURRENT_RATIO_AQ', 'QUICK_RATIO_AQ', 'CURRENT_ASSETS_AQ',
    # Dong tien
    'CFO_TO_SALES_YD', 'CFO_TO_SALES_TR', 'CFO_TO_SALES_QR', 'CFO_YD', 'POSITIVE_CFO_NUM_CR_2YR',
    # Co tuc
    'DIVIDEND_YIELD', 'DIVIDEND_PAYOUT_TR', 'DIVIDEND_PAYOUT_YD', 'DIVIDEND_PAID_TR',
    # So huu & Thi truong
    'FOREIGN_OWNERSHIP', 'STATE_OWNERSHIP', 'TOTAL_INTERNAL_OWNERSHIP', 
    'FREEFLOAT', 'OUTSTANDING_SHARES', 'LISTED_SHARES', 'BETA', 
    'SHARES_ISSUE_PCT', 'ESOP_PCT', 'INFO_DISCLOSE', 'MEDIA', 'DIVIDEND_PAYMENT_NUM_CR_3Y'
]

# Dict chua toan bo du lieu: data[symbol][ratioCode] = value
all_data = {s: {} for s in SYMBOLS}

def get(url, params):
    try:
        r = requests.get(url, params=params, headers=HDR, timeout=15)
        r.raise_for_status()
        return r.json().get('data', [])
    except Exception as e:
        print(f"  [ERR] {e}")
        return []

def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

print("=" * 80)
print(f"  DANG LAY TOAN BO {len(DAILY_CODES) + len(ANNUAL_CODES)} CHI SO CHO {len(SYMBOLS)} MA...")
print("=" * 80)

# 1. FETCH DAILY (Chia khoang 15 ma moi url de tranh URL qua dai)
print("  1. Dang lay nhom Daily (Gia, KLGD, Dinh gia, P/E, P/B)...")
for chunk in chunk_list(DAILY_CODES, 15):
    cstr = ','.join(chunk)
    d = get(BASE, {
        'q': f'ratioCode:{cstr}~code:{CODES}~reportDate:gte:{D7AGO}',
        'sort': 'reportDate:desc',
        'size': len(SYMBOLS) * len(chunk) * 5,
        'fields': 'value,reportDate,code,ratioCode'
    })
    # Set val moi nhat
    for it in d:
        s, c, v = it.get('code',''), it.get('ratioCode',''), it.get('value')
        if s in all_data and c not in all_data[s]:
            try: all_data[s][c] = float(v)
            except: pass
    time.sleep(0.5)

# 2. FETCH ANNUAL/QUARTERLY
print(f"  2. Dang lay nhom BCTC (Sinh loi, Tang truong, Dong tien, VCSH... nam 2025/2024)...")
REPORT_DATES = '2025-12-31,2024-12-31'
for chunk in chunk_list(ANNUAL_CODES, 15):
    cstr = ','.join(chunk)
    d = get(BASE, {
        'q': f'ratioCode:{cstr}~code:{CODES}~reportDate:{REPORT_DATES}',
        'sort': 'reportDate:desc',
        'size': len(SYMBOLS) * len(chunk) * 5,
        'fields': 'value,reportDate,code,ratioCode'
    })
    for it in d:
        s, c, v = it.get('code',''), it.get('ratioCode',''), it.get('value')
        if s in all_data and c not in all_data[s]:
            try: all_data[s][c] = float(v)
            except: pass
    time.sleep(0.5)

# ================================================================
# BUILD DATAFRAME & LUU FILE
# ================================================================
rows = []
all_cols = DAILY_CODES + ANNUAL_CODES

for sym in SYMBOLS:
    row = {'Mã': sym}
    for c in all_cols:
        row[c] = all_data[sym].get(c, None)
    rows.append(row)

df = pd.DataFrame(rows)
df = df.sort_values('MARKETCAP', ascending=False).reset_index(drop=True)

# Luu file dung luong khong lo
df.to_csv('securities_all_ratios_result.csv', index=False, encoding='utf-8-sig')

# In man hinh tom tat 12 cot quan trong
def f(val, dec=2, suf='', lo=None, hi=None, m=1):
    try:
        v = float(val) * m
        if v != v: return '-'
        if lo is not None and v < lo: return '-'
        if hi is not None and v > hi: return '-'
        return f"{v:.{dec}f}{suf}"
    except: return '-'

print("\n" + "=" * 110)
print(f"  THONG KE TOM TAT (Truy xuat thanh cong mien phi tap {len(all_cols)} chi so)")
print(f"  -> File day du: securities_all_ratios_result.csv")
print("=" * 110)
print(f"{'Mã':<5} | {'VH(Tỷ)':>8} | {'P/E':>6} | {'P/B':>5} | {'ROE%':>7} | {'ROA%':>7} | {'LN%YOY':>8} | {'VCSH%YTD':>8} | {'D/E':>5} | {'HTM/VC':>7} | {'FVT/VC':>7}")
print("-" * 110)

for _, r in df.iterrows():
    vh    = f(r['MARKETCAP'], 0, '', m=1e-9)
    pe    = f(r['PRICE_TO_EARNINGS'], 1, '', 0, 300)
    pb    = f(r['PRICE_TO_BOOK'], 2)
    roe   = f(r['ROAE_TR_AVG5Q'], 1, '%', m=100)
    roa   = f(r['ROAA_TR_AVG5Q'], 1, '%', m=100)
    ln    = f(r['NET_PROFIT_YD_GRYOY'], 1, '%', -200, 1000, m=100)
    vcsh  = f(r['OWNERS_EQUITY_AQ_GRYTD'], 1, '%', m=100)
    de    = f(r['DEBT_TO_EQUITY_AQ'], 2)
    htm   = f(r['HTM_TO_EQUITY_AQ'], 2)
    fv    = f(r['FVTPL_AFS_TO_EQUITY_AQ'], 2)
    print(f"{r['Mã']:<5} | {vh:>8} | {pe:>6} | {pb:>5} | {roe:>7} | {roa:>7} | {ln:>8} | {vcsh:>8} | {de:>5} | {htm:>7} | {fv:>7}")

print("[OK] Xong! Chi tiet nhat tu truoc den nay.")
