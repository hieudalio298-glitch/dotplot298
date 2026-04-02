import sys
import inspect
from vnstock_data import Finance

def test_vci_params():
    print("--- Inspecting VCI Finance ---")
    finance = Finance(source='VCI', symbol='VNM')
    
    # Inspect arguments for income_statement
    sig = inspect.signature(finance.income_statement)
    print(f"income_statement params: {sig}")
    
    # Try fetching with get_all=True if available, or just standard to see default length
    print("\n--- Fetching Data (Default) ---")
    try:
        df = finance.income_statement(period='year', lang='vi')
        print(f"Rows returned: {len(df) if df is not None else 0}")
        if df is not None:
            print(f"Years: {df['report_period'].unique().tolist()}")
    except Exception as e:
        print(f"Error default: {e}")

    print("\n--- Fetching Data (get_all=True) ---")
    try:
        # Based on docs: "income_statement | Kết quả kinh doanh | period, lang, get_all"
        df_all = finance.income_statement(period='year', lang='vi', get_all=True)
        print(f"Rows returned: {len(df_all) if df_all is not None else 0}")
        if df_all is not None:
             print(f"Years: {df_all['report_period'].unique().tolist()}")
    except Exception as e:
        print(f"Error get_all: {e}")

if __name__ == "__main__":
    test_vci_params()
