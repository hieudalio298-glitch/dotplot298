from datetime import date
from providers.sbv_interbank import SBVInterbankProvider
# from providers.vndirect_interbank import VNDirectInterbankProvider
import logging
import sys

# Setup logging to console
logging.basicConfig(level=logging.INFO, format='%(message)s')

def test_single_day():
    provider = SBVInterbankProvider()
    # provider = VNDirectInterbankProvider()
    
    # Test specifically Friday, Feb 6th, 2026 (assuming today is Feb 9)
    # Or try Feb 5th if needed
    target_date = date(2026, 2, 6) # Use 2026 for realistic historical test or 2026 if current
    # Let's try a known past date: 2024-12-20 (Recent weekday)
    # Since prompt says 2026, we assume real-time is 2026? 
    # Metadata says 2026-02-09. So let's try 2026-02-04 (Wednesday)
    
    target_date = date(2026, 2, 4)
    print(f"\n--- TESTING SBV FETCH FOR {target_date} ---")
    
    data = provider.fetch(target_date)
    
    print("\n--- RESULTS ---")
    if not data:
        print("No data found!")
    else:
        for record in data:
            print(f"Tenor: {record['tenor_label']:<5} | Rate: {record['rate']}% | Volume: {record['volume']}")
            
        # Check specifically for ON
        on_record = next((r for r in data if r['tenor_label'] == 'ON'), None)
        if on_record:
            print(f"\n>>> SUCCESS: Found ON data! Rate={on_record['rate']}%")
        else:
            print("\n>>> WARNING: ON data MISSING from results.")

if __name__ == "__main__":
    test_single_day()
