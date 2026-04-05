import vnstock
import pandas as pd

trading_free = vnstock.Trading(source='VCI')
df_batch = trading_free.price_board(['VCB', 'FPT'])
if not df_batch.empty:
    df_batch.columns = ['_'.join(map(str, col)).strip() if isinstance(col, tuple) else col for col in df_batch.columns.values]
    print("Columns in flattened df_batch:")
    print(df_batch.columns.tolist())
    print("\nFirst row data (dict):")
    print(df_batch.iloc[0].to_dict())
