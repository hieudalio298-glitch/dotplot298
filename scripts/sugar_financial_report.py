"""
Script lấy báo cáo tài chính nhóm cổ phiếu ĐƯỜNG (Sugar sector)
Nguồn: VCI via vnstock  |  Tác giả: Antigravity
"""

import sys, io, time
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from vnstock import Vnstock

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────
SUGAR_STOCKS = ["SBT", "QNS", "LSS", "SLS", "KTS", "NHS", "SEC", "FBT"]
PERIOD       = "quarter"   # "quarter" hoặc "year"
SLEEP_SEC    = 3           # giây chờ giữa mỗi request  (tránh rate-limit 60 req/min)
RETRY_COUNT  = 3           # số lần thử lại khi gặp rate-limit
RETRY_WAIT   = 12          # giây chờ khi gặp rate-limit
OUTPUT_FILE  = "sugar_group_financials.xlsx"
SOURCE       = "VCI"

print("=" * 70)
print("  BÁO CÁO TÀI CHÍNH NHÓM ĐƯỜNG - Nguồn: VCI")
print("=" * 70)
print(f"\n📋 Danh sách ({len(SUGAR_STOCKS)} cổ phiếu): {SUGAR_STOCKS}\n")

# ─── HÀM THU THẬP ──────────────────────────────────────────────────────────

def safe_fetch(fn, label: str):
    """Gọi hàm fn() với retry khi gặp rate-limit hoặc lỗi tạm thời."""
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            return fn()
        except Exception as e:
            msg = str(e)
            is_rate = "rate" in msg.lower() or "429" in msg or "limit" in msg.lower()
            is_transient = "502" in msg or "503" in msg or "timeout" in msg.lower()
            if (is_rate or is_transient) and attempt < RETRY_COUNT:
                wait = RETRY_WAIT if is_rate else 5
                print(f"  ⏳ {label} – lỗi tạm thời, thử lại sau {wait}s "
                      f"(lần {attempt}/{RETRY_COUNT - 1})...")
                time.sleep(wait)
            else:
                print(f"  ⚠️  {label} – bỏ qua: {msg[:120]}")
                return pd.DataFrame()
    return pd.DataFrame()


def flatten_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Flatten MultiIndex columns thành chuỗi đơn."""
    if isinstance(df.columns, pd.MultiIndex):
        df = df.copy()
        df.columns = [" | ".join(str(c) for c in col).strip(" | ") for col in df.columns]
    return df


def get_all_reports(symbol: str) -> dict:
    stock = Vnstock().stock(symbol=symbol, source=SOURCE)
    fin   = stock.finance

    def _add_symbol(df):
        if not df.empty:
            df = flatten_cols(df)
            df.insert(0, "symbol", symbol)
        return df

    income   = _add_symbol(safe_fetch(lambda: fin.income_statement(period=PERIOD, lang="vi"), f"{symbol}/income"))
    time.sleep(SLEEP_SEC)

    balance  = _add_symbol(safe_fetch(lambda: fin.balance_sheet(period=PERIOD, lang="vi"),    f"{symbol}/balance"))
    time.sleep(SLEEP_SEC)

    cashflow = _add_symbol(safe_fetch(lambda: fin.cash_flow(period=PERIOD, lang="vi"),        f"{symbol}/cashflow"))
    time.sleep(SLEEP_SEC)

    ratio    = _add_symbol(safe_fetch(lambda: fin.ratio(period=PERIOD, lang="vi"),            f"{symbol}/ratio"))
    time.sleep(SLEEP_SEC)

    return {"income": income, "balance": balance, "cashflow": cashflow, "ratio": ratio}


# ─── THU THẬP DỮ LIỆU ────────────────────────────────────────────────────────

all_income, all_balance, all_cashflow, all_ratio = [], [], [], []

for i, symbol in enumerate(SUGAR_STOCKS):
    print(f"[{i+1}/{len(SUGAR_STOCKS)}] 📥 Tải: {symbol} ...", flush=True)
    data = get_all_reports(symbol)

    if not data["income"].empty:
        all_income.append(data["income"])
        print(f"     ✔ income_statement  : {len(data['income'])} hàng")
    if not data["balance"].empty:
        all_balance.append(data["balance"])
        print(f"     ✔ balance_sheet     : {len(data['balance'])} hàng")
    if not data["cashflow"].empty:
        all_cashflow.append(data["cashflow"])
        print(f"     ✔ cash_flow         : {len(data['cashflow'])} hàng")
    if not data["ratio"].empty:
        all_ratio.append(data["ratio"])
        print(f"     ✔ ratio             : {len(data['ratio'])} hàng")

# ─── GHÉP VÀ XUẤT EXCEL ──────────────────────────────────────────────────────

df_income   = pd.concat(all_income,   ignore_index=True) if all_income   else pd.DataFrame()
df_balance  = pd.concat(all_balance,  ignore_index=True) if all_balance  else pd.DataFrame()
df_cashflow = pd.concat(all_cashflow, ignore_index=True) if all_cashflow else pd.DataFrame()
df_ratio    = pd.concat(all_ratio,    ignore_index=True) if all_ratio    else pd.DataFrame()

print("\n" + "=" * 70)
print("  KẾT QUẢ THU THẬP")
print("=" * 70)
print(f"✅ Kết quả kinh doanh : {len(df_income):>4} dòng | {df_income['symbol'].nunique() if not df_income.empty else 0} công ty")
print(f"✅ Cân đối kế toán    : {len(df_balance):>4} dòng | {df_balance['symbol'].nunique() if not df_balance.empty else 0} công ty")
print(f"✅ Lưu chuyển tiền tệ : {len(df_cashflow):>4} dòng | {df_cashflow['symbol'].nunique() if not df_cashflow.empty else 0} công ty")
print(f"✅ Chỉ số tài chính   : {len(df_ratio):>4} dòng | {df_ratio['symbol'].nunique() if not df_ratio.empty else 0} công ty")

print(f"\n📊 Xuất Excel → {OUTPUT_FILE}")
with pd.ExcelWriter(OUTPUT_FILE, engine="openpyxl") as writer:
    for df, sheet in [(df_income,   "KQ Kinh Doanh"),
                      (df_balance,  "Can Doi Ke Toan"),
                      (df_cashflow, "Luu Chuyen Tien Te"),
                      (df_ratio,    "Chi So Tai Chinh")]:
        if not df.empty:
            df.to_excel(writer, sheet_name=sheet, index=False)

print(f"✅ Đã lưu: {OUTPUT_FILE}")

# ─── IN MẪU ──────────────────────────────────────────────────────────────────

if not df_income.empty:
    print("\n--- Kết quả kinh doanh – 2 quý gần nhất mỗi công ty ---")
    cols = list(df_income.columns[:10])
    print(df_income[cols].groupby("symbol", group_keys=False)
                         .apply(lambda g: g.head(2))
                         .to_string(index=False))

if not df_ratio.empty:
    print("\n--- Chỉ số tài chính – 2 quý gần nhất mỗi công ty ---")
    cols2 = list(df_ratio.columns[:10])
    print(df_ratio[cols2].groupby("symbol", group_keys=False)
                         .apply(lambda g: g.head(2))
                         .to_string(index=False))

print("\n🎉 Hoàn thành!")
