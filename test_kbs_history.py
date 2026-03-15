from vnstock_data import Finance
import pandas as pd

def test_kbs_history():
    print("--- Testing KBS Source History ---")
    try:
        # KBS source
        finance = Finance(source='KBS', symbol='VNM')
        
        # KBS uses wide-form (metrics as rows, periods as columns)
        # Arguments: period='year'/'quarter', limit=int
        print("Fetching KBS Income Statement (Year, limit=20)...")
        df = finance.income_statement(period='year', limit=20)
        
        if df is not None:
            print(f"Shape: {df.shape}")
            print("Columns:", df.columns.tolist())
            print(df.head())
            
            # Extract years from columns (filtering out non-year columns like 'item', 'item_id')
            years = [c for c in df.columns if c.startswith('20')]
            print(f"\nYears found: {sorted(years)}")
            print(f"Total years: {len(years)}")
        else:
            print("No data returned.")

    except Exception as e:
        print(f"Error fetching KBS: {e}")

if __name__ == "__main__":
    test_kbs_history()
