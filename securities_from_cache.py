"""
Thong ke toan dien nhom chung khoan - 100% VNDirect API
  - P/E, P/B, Von hoa: daily real-time
  - ROE, ROA, Tang truong LN, Bien GP, D/E, Tang truong VCSH, HTM/VCSH, FVTPL/VCSH: annual (2025-12-31)
Chay: C:/Users/Lenovo/.venv/Scripts/python.exe securities_from_cache.py
"""
import sys, time, requests
import pandas as pd
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')

# ================================================================
# Config
# ================================================================
SYMBOLS = [
    'HHV', 'LCG', 'C4G', 'CTD', 'CII', 'FCN', 'HBC', 'CTI', 'DPG'
]

BASE   = "https://api-finfo.vndirect.com.vn/v4/ratios"
HDR    = {'User-Agent': 'Mozilla/5.0'}
TODAY  = datetime.today().strftime('%Y-%m-%d')
D7AGO  = (datetime.today() - timedelta(days=7)).strftime('%Y-%m-%d')
CODES  = ','.join(SYMBOLS)

# ================================================================
# Ham tien ich
# ================================================================
def get(url, params, timeout=20):
    try:
        r = requests.get(url, params=params, headers=HDR, timeout=timeout)
        r.raise_for_status()
        return r.json().get('data', [])
    except Exception as e:
        print(f"  [ERR] {e}")
        return []

def batch_daily(ratio_code) -> dict:
    data = get(BASE, {
        'q':      f'ratioCode:{ratio_code}~code:{CODES}~reportDate:gte:{D7AGO}',
        'sort':   'reportDate:desc',
        'size':   len(SYMBOLS) * 5,
        'fields': 'value,reportDate,code',
    })
    res = {}
    for item in data:
        s = item.get('code','')
        if s in SYMBOLS and s not in res:
            try: res[s] = float(item['value'])
            except: pass
    return res

def batch_annual(ratio_codes: list, report_dates: list) -> dict:
    codes_str  = ','.join(ratio_codes)
    dates_str  = ','.join(report_dates)
    data = get(BASE, {
        'q':      f'ratioCode:{codes_str}~code:{CODES}~reportDate:{dates_str}',
        'sort':   'reportDate:desc',
        'size':   len(SYMBOLS) * len(ratio_codes) * len(report_dates),
        'fields': 'value,reportDate,code,ratioCode',
    })
    res = {s: {} for s in SYMBOLS}
    for item in data:
        s  = item.get('code','')
        rc = item.get('ratioCode','')
        if s in SYMBOLS and rc not in res.get(s, {}):
            try:
                res[s][rc] = (float(item['value']), item.get('reportDate',''))
            except:
                pass
    return res

# ================================================================
# Fetch data
# ================================================================
print("=" * 80)
print("  DANG FETCH DU LIEU TU VNDIRECT API...")
print("=" * 80)

# --- Daily ratios ---
pe_map   = batch_daily('PRICE_TO_EARNINGS');  print(f"  P/E:    {len(pe_map)} ma")
pb_map   = batch_daily('PRICE_TO_BOOK');      print(f"  P/B:    {len(pb_map)} ma")
mc_map   = batch_daily('MARKETCAP');          print(f"  MCAP:   {len(mc_map)} ma")

# --- Annual ratios ---
ANNUAL_CODES = [
    'ROAE_TR_AVG5Q',          # ROE
    'ROAA_TR_AVG5Q',          # ROA
    'NET_PROFIT_YD_GRYOY',    # Tang truong LN rong (YoY)
    'GROSS_MARGIN_YD',        # Bien GP
    'DEBT_TO_EQUITY_AQ',      # D/E
    'OWNERS_EQUITY_AQ_GRYTD', # Tang truong VCSH so voi dau nam
    'HTM_TO_EQUITY_AQ',       # Ty le HTM / VCSH
    'FVTPL_AFS_TO_EQUITY_AQ', # Ty le FVTPL & AFS / VCSH
]
ANNUAL_DATES = ['2025-12-31','2024-12-31','2023-12-31','2022-12-31']

ann = batch_annual(ANNUAL_CODES, ANNUAL_DATES)
print(f"  Annual ratios: {len(ann)} ma co du lieu")

# ================================================================
# Build table
# ================================================================
def av(sym, rc, scale=1.0):
    v = ann.get(sym, {}).get(rc)
    if v is None: return None
    try:    return float(v[0]) * scale
    except: return None

rows = []
for sym in SYMBOLS:
    rows.append({
        'Mã':         sym,
        'Vốn hóa':    mc_map.get(sym, 0) / 1e9 if mc_map.get(sym) else None,
        'P/E':        pe_map.get(sym),
        'P/B':        pb_map.get(sym),
        'ROE%':       av(sym, 'ROAE_TR_AVG5Q', 100),
        'ROA%':       av(sym, 'ROAA_TR_AVG5Q', 100),
        'LN%YoY':     av(sym, 'NET_PROFIT_YD_GRYOY', 100),
        'VCSH%YTD':   av(sym, 'OWNERS_EQUITY_AQ_GRYTD', 100),
        'BienGP%':    av(sym, 'GROSS_MARGIN_YD', 100),
        'D/E':        av(sym, 'DEBT_TO_EQUITY_AQ'),
        'HTM/VCSH':   av(sym, 'HTM_TO_EQUITY_AQ'),
        'FVTPL/VCSH': av(sym, 'FVTPL_AFS_TO_EQUITY_AQ'),
    })

df = pd.DataFrame(rows)
df = df.sort_values('Vốn hóa', ascending=False).reset_index(drop=True)

# ================================================================
# In ket qua
# ================================================================
def f(val, dec=2, suf='', lo=None, hi=None):
    try:
        v = float(val)
        if v != v: return '-'
        if lo is not None and v < lo: return '-'
        if hi is not None and v > hi: return '-'
        return f"{v:.{dec}f}{suf}"
    except:
        return '-'

today_str = datetime.today().strftime('%d/%m/%Y')
print(f"\n{'='*110}")
print(f"  THONG KE NHOM CHUNG KHOAN - {today_str}  (Nguon: VNDirect API)")
print(f"{'='*110}")
print(f"{'Mã':<5} | {'VH(Tỷ)':>8} | {'P/E':>6} | {'P/B':>5} | {'ROE%':>7} | {'ROA%':>7} | {'LN%YOY':>8} | {'VCSH%YTD':>8} | {'BienGP%':>7} | {'D/E':>5} | {'HTM/VC':>7} | {'FVT/VC':>7}")
print("-" * 110)

for _, r in df.iterrows():
    vh    = f(r['Vốn hóa'], 0)
    pe    = f(r['P/E'], 1, '', 0, 300)
    pb    = f(r['P/B'], 2)
    roe   = f(r['ROE%'], 1, '%')
    roa   = f(r['ROA%'], 1, '%')
    ln    = f(r['LN%YoY'], 1, '%', -200, 1000)
    vcsh  = f(r['VCSH%YTD'], 1, '%')
    gp    = f(r['BienGP%'], 1, '%')
    de    = f(r['D/E'], 2)
    htm   = f(r['HTM/VCSH'], 2)
    fv    = f(r['FVTPL/VCSH'], 2)
    print(f"{r['Mã']:<5} | {vh:>8} | {pe:>6} | {pb:>5} | {roe:>7} | {roa:>7} | {ln:>8} | {vcsh:>8} | {gp:>7} | {de:>5} | {htm:>7} | {fv:>7}")

# ================================================================
# Trung vi nganh
# ================================================================
print(f"\n{'='*110}")
print("  CHI SO TRUNG VI NGANH (loai outlier)")
print(f"{'='*110}")
metrics = [
    ('P/E', 'P/E (x)', 0, 300),
    ('P/B', 'P/B (x)', 0, None),
    ('ROE%','ROE%',    0, None),
    ('ROA%','ROA%',    0, None),
    ('LN%YoY','T.Truong LN% YoY', -200, 1000),
    ('VCSH%YTD','T.Truong VCSH% YTD', None, None),
    ('BienGP%','Bien GP%', 0, None),
    ('D/E', 'D/E', 0, 50),
    ('HTM/VCSH', 'HTM/VCSH', None, None),
    ('FVTPL/VCSH', 'FVTPL/VCSH', None, None),
]
for col, label, lo, hi in metrics:
    vals = pd.to_numeric(df[col], errors='coerce').dropna()
    if lo is not None: vals = vals[vals >= lo]
    if hi is not None: vals = vals[vals <= hi]
    if not vals.empty:
        print(f"  {label:<18}: Median={vals.median():>7.2f}  Mean={vals.mean():>7.2f}  Min={vals.min():>7.2f}  Max={vals.max():>7.2f}  (n={len(vals)})")
    else:
        print(f"  {label:<18}: Khong du du lieu")

df.to_csv('securities_stats_result.csv', index=False, encoding='utf-8-sig')
print(f"\n[OK] Da luu -> securities_stats_result.csv")
