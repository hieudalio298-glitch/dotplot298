import os
from vnstock_data import TopStock, config
from dotenv import load_dotenv

load_dotenv(r'c:\Users\Lenovo\dotplot\stockplot\.env')
config.api_key = os.environ.get("VNSTOCK_API_KEY")

def inspect_sell():
    ts = TopStock()
    df = ts.foreign_sell(listing_group='HOSE')
    if df is not None and not df.empty:
        print("Columns in foreign_sell:")
        print(df.columns.tolist())
        print("\nFirst 3 rows:")
        print(df.head(3).to_string())
    else:
        print("No data from foreign_sell.")

if __name__ == "__main__":
    inspect_sell()
