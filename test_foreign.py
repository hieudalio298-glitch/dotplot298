from vnstock import Vnstock
import pandas as pd

ticker = 'BSR'
sources = ['SSI', 'VCI', 'KBS', 'VND', 'TCBS', 'DNSE', 'FMP']

for src in sources:
    try:
        stock = Vnstock().stock(symbol=ticker, source=src)
        df_hist = stock.quote.history(start='2026-02-28', end='2026-03-20')
        print(f"--- SOURCE: {src} -> quote.history columns: {df_hist.columns.tolist() if df_hist is not None else 'None'} ---")
        if df_hist is not None and not df_hist.empty:
            if 'foreignBuyVolume' in df_hist.columns or 'foreign_buy' in df_hist.columns or 'foreignBuy' in df_hist.columns:
                print(f"BING000! Found foreign data in {src}: {df_hist.columns.tolist()}")
    except Exception as e:
        pass
