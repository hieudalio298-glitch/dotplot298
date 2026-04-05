import vnstock
import pandas as pd

trading_free = vnstock.Trading(source='VCI')
df_batch = trading_free.price_board(['VCB', 'FPT'])
if not df_batch.empty:
    df_batch.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_batch.columns.values]
    match_cols = [c for c in df_batch.columns if c.startswith('match_')]
    print("Match columns:", match_cols)
    print("Values for VCB:")
    print(df_batch.iloc[0][match_cols].to_dict())
