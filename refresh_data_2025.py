# -*- coding: utf-8 -*-
"""
File: refresh_data_2025.py
Mo ta: Cap nhat du lieu tai chinh moi nhat tu vnstock_data cho nam 2025
"""

from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
import logging
import pandas as pd

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def refresh_all_2025():
    fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Lay danh sach cac ma can cap nhat
    # Ban co the chon cap nhat toan bo hoac chi nhung ma thieu 2025
    print("[INFO] Dang lay danh sach ma chung khoan...")
    res = fetcher.supabase.table('stock_symbols').select('symbol').execute()
    symbols = [item['symbol'] for item in res.data]
    
    # Neu muon test thu 5 ma truoc, hay uncomment dong duoi:
    # symbols = ['FPT', 'VNM', 'HPG', 'DGC', 'SSI']
    
    total = len(symbols)
    print(f"[START] Bat dau cap nhat {total} ma (Source: MAS)...")
    
    # 2. Chay cap nhat (Dung 5 workers de tranh bi chan API)
    fetcher.run(test_mode=True, test_symbols=symbols)
    
    print("[DONE] Da hoan thanh cap nhat du lieu tho vao financial_statements.")

if __name__ == "__main__":
    refresh_all_2025()
