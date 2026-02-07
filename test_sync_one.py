from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import pandas as pd
import logging

# Setup Logging for test
logging.basicConfig(level=logging.INFO)

def test_sync():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    
    # Test only for REE as requested
    symbol = 'REE'
    print(f"=== Testing sync for {symbol} with source MAS and transpose() ===")
    
    fetcher.fetch_and_process_financials(symbol)
    
    print("\n[OK] Sync completed. checking Supabase data...")
    
    # Query back to see the structure of the first record
    res = fetcher.supabase.table('financial_statements') \
        .select('*') \
        .eq('symbol', symbol) \
        .eq('statement_type', 'balance_sheet') \
        .eq('period_type', 'year') \
        .limit(1) \
        .execute()
    
    if res.data:
        record = res.data[0]
        data_list = record.get('data', [])
        if data_list:
            first_period = data_list[0]
            print("\n--- Cấu trúc dữ liệu trong Supabase (Record đầu tiên) ---")
            print(f"Bản ghi cho năm: {first_period.get('Năm', 'N/A')}")
            print(f"Số lượng trường (metrics): {len(first_period)}")
            
            # Liệt kê một số trường quan trọng chuẩn VAS (MAS thường có tiền tố A., B., I.)
            vas_fields = {
                'TỔNG CỘNG TÀI SẢN': ['TỔNG CỘNG TÀI SẢN'],
                'VỐN CHỦ SỞ HỮU': ['VỐN CHỦ SỞ HỮU', 'B. VỐN CHỦ SỞ HỮU'],
                'NỢ PHẢI TRẢ': ['NỢ PHẢI TRẢ', 'A. NỢ PHẢI TRẢ'],
                'Tiền và tương đương tiền': ['Tiền và các khoản tương đương tiền', 'I. Tiền và các khoản tương đương tiền']
            }
            
            print("\nKiểm tra các trường chuẩn VAS:")
            for display_name, aliases in vas_fields.items():
                val = None
                found_key = None
                for alias in aliases:
                    if alias in first_period:
                        val = first_period[alias]
                        found_key = alias
                        break
                
                status = f"✅ Có (với tên: '{found_key}')" if val is not None else "❌ Không tìm thấy"
                print(f"- {display_name}: {status} (Giá trị: {val})")
            
            # In 10 keys đầu tiên để xem tên trường
            print("\n10 keys đầu tiên trong dữ liệu:")
            print(list(first_period.keys())[:10])
        else:
            print("❌ Không có dữ liệu trong trường 'data'")
    else:
        print("❌ Không tìm thấy bản ghi nào trong Supabase cho REE")

if __name__ == "__main__":
    test_sync()
