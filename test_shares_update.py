"""Test script to verify shares_outstanding update flow."""
import os
import vnstock
from supabase import create_client

url = "https://utqmpdmbkubhzuccqeyf.supabase.co"
key = os.getenv("SUPABASE_KEY", "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is")
sb = create_client(url, key)

# Fetch price board for 3 symbols
t = vnstock.Trading(source="VCI", symbol="VCB")
board = t.price_board(["VNM", "FPT", "TCB"])

# Flatten columns exactly like the worker does
board.columns = [
    "_".join(col).strip() if isinstance(col, tuple) else col
    for col in board.columns.values
]

exchange_map = {"HSX": "HOSE", "HNX": "HNX", "UPCOM": "UPCOM", "HOSE": "HOSE"}
stock_map = {"VNM": 85, "FPT": 1248, "TCB": 368}

for _, row in board.iterrows():
    symbol = str(row.get("listing_symbol"))
    stock_id = stock_map.get(symbol)
    if not stock_id:
        print(f"SKIP {symbol}: not in stock_map")
        continue

    raw_exchange = str(row.get("listing_exchange", "")).upper().strip()
    exchange = exchange_map.get(raw_exchange)

    shares_raw = row.get("listing_listed_share")
    try:
        shares = (
            int(float(shares_raw))
            if shares_raw is not None
            and str(shares_raw).strip() not in ("", "nan", "None")
            else None
        )
    except (ValueError, TypeError):
        shares = None

    update_payload = {}
    if exchange:
        update_payload["exchange"] = exchange
    if shares is not None and shares > 0:
        update_payload["shares_outstanding"] = shares

    print(
        f"{symbol}: stock_id={stock_id}, raw_ex={raw_exchange}, "
        f"exchange={exchange}, shares_raw={shares_raw} "
        f"(type={type(shares_raw).__name__}), shares={shares} "
        f"(type={type(shares).__name__ if shares else 'None'})"
    )
    print(f"  payload: {update_payload}")

    if update_payload:
        result = sb.table("stocks").update(update_payload).eq("id", stock_id).execute()
        print(f"  result: {result.data}")
    else:
        print("  SKIP: empty payload")

# Verify
print("\n--- Verification ---")
res = sb.table("stocks").select("symbol, shares_outstanding").in_(
    "symbol", ["VNM", "FPT", "TCB"]
).execute()
for r in res.data:
    print(f"  {r['symbol']}: shares_outstanding={r['shares_outstanding']}")
