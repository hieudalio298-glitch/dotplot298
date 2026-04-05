from vnstock_data import Fundamental
import json

def test_fundamental_ratio():
    try:
        fun = Fundamental()
        df_ratio = fun.equity.ratio("TCB")
        if df_ratio is not None and not df_ratio.empty:
            print("Columns in Fundamental().equity.ratio('TCB'):")
            print(json.dumps(df_ratio.columns.tolist(), indent=2, ensure_ascii=False))
            print("\nFirst row data:")
            # Convert first row to dict and print
            first_row = df_ratio.iloc[0].to_dict()
            print(json.dumps(first_row, indent=2, ensure_ascii=False))
        else:
            print("DataTable is empty or None")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_fundamental_ratio()
