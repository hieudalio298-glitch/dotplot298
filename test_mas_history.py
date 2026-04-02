from vnstock_data import Finance
import pandas as pd

def test_mas_history():
    print("--- Testing MAS Source History ---")
    try:
        finance = Finance(source='MAS', symbol='VNM')
        
        # MAS docs say it supports 'limit' in some contexts, or maybe just returns all?
        # Let's try fetching without params first
        print("Fetching MAS Income Statement (Year)...")
        df = finance.income_statement(period='year', lang='vi')
        
        if df is not None:
            print(f"Rows returned: {len(df)}")
            if 'year_period' in df.columns:
                 years = df['year_period'].sort_values().unique().tolist()
                 print(f"Years: {years}")
            elif 'period' in df.columns:
                 years = df['period'].sort_values().unique().tolist()
                 print(f"Years: {years}")
            else:
                 print("Could not find year column. Columns:", df.columns.tolist())
        else:
            print("No data returned.")

    except Exception as e:
        print(f"Error fetching MAS: {e}")

if __name__ == "__main__":
    test_mas_history()
