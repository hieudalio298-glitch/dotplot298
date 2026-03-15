# -*- coding: utf-8 -*-
"""
File: process_nopat_data.py
Mo ta: Chuyen doi du lieu tu JSON tho sang bang financial_nopat (ROIC, ROE, NOPAT)
"""

import pandas as pd
import json
import logging
from supabase import create_client, Client
from update_financials import SUPABASE_URL, SUPABASE_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_value(data_dict, keys):
    """Lay gia tri tu dict dua trên danh sach cac key thay the (aliases)"""
    for key in keys:
        if key in data_dict and data_dict[key] is not None:
            try:
                return float(data_dict[key])
            except:
                return 0
    return 0

def process_symbol(symbol, symbol_map):
    try:
        # Lay du lieu tu financial_statements
        res_is = supabase.table('financial_statements').select('*').eq('symbol', symbol).eq('statement_type', 'income_statement').execute()
        res_bs = supabase.table('financial_statements').select('*').eq('symbol', symbol).eq('statement_type', 'balance_sheet').execute()
        
        if not res_is.data or not res_bs.data:
            return

        # Map du lieu theo nam
        income_data = {f"{item['period_type']}_{item['data'][0].get('Năm')}": item['data'][0] for item in res_is.data if item['data']}
        balance_data = {f"{item['period_type']}_{item['data'][0].get('Năm')}": item['data'][0] for item in res_bs.data if item['data']}

        payloads = []
        
        # Duyet qua cac nam co trong ca 2 bao cao
        available_years = set(income_data.keys()) & set(balance_data.keys())
        
        for key in available_years:
            period_type, year = key.split('_')
            inc = income_data[key]
            bal = balance_data[key]
            
            # --- Map Fields (Standard VAS/MAS) ---
            pre_tax = get_value(inc, ['15. Tổng lợi nhuận kế toán trước thuế', 'XI. Tổng lợi nhuận trước thuế (IX-X)', 'IX. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ'])
            tax_1 = get_value(inc, ['16. Chi phí thuế TNDN hiện hành', '7. Chi phí thuế TNDN hiện hành', '10.1. Chi phí thuế TNDN hiện hành'])
            tax_2 = get_value(inc, ['17. Chi phí thuế TNDN hoãn lại', '8. Chi phí thuế TNDN hoãn lại', '10.2. Chi phí thuế TNDN hoãn lại'])
            total_tax = tax_1 + tax_2
            
            equity = get_value(bal, ['I. Vốn chủ sở hữu', 'B. VỐN CHỦ SỞ HỮU', 'VỐN CHỦ SỞ HỮU'])
            short_debt = get_value(bal, ['10. Vay và nợ thuê tài chính ngắn hạn', '3. Vay ngắn hạn'])
            long_debt = get_value(bal, ['8. Vay và nợ thuê tài chính dài hạn', '1. Vay dài hạn'])
            total_assets = get_value(bal, ['TỔNG CỘNG TÀI SẢN', '2. TỔNG CỘNG TÀI SẢN'])
            
            # --- Calculations ---
            nopat = pre_tax - total_tax
            invested_capital = equity + short_debt + long_debt
            
            roic = nopat / invested_capital if invested_capital > 0 else None
            roe = nopat / equity if equity > 0 else None
            roa = nopat / total_assets if total_assets > 0 else None

            payloads.append({
                'symbol': symbol,
                'industry': symbol_map.get(symbol),
                'period_type': period_type,
                'year': int(year),
                'quarter': 0, # Don gian hoa cho Yearly truoc
                'pre_tax_profit': pre_tax,
                'total_tax': total_tax,
                'nopat': nopat,
                'equity': equity,
                'invested_capital': invested_capital,
                'total_assets': total_assets,
                'short_term_debt': short_debt,
                'long_term_debt': long_debt,
                'roic': roic,
                'roe': roe,
                'roa': roa,
                'updated_at': pd.Timestamp.now().isoformat()
            })

        if payloads:
            supabase.table('financial_nopat').upsert(payloads).execute()
            logger.info(f"Updated NOPAT for {symbol} ({len(payloads)} periods)")

    except Exception as e:
        logger.error(f"Error processing {symbol}: {e}")

def process_all_symbols():
    # 1. Lay danh sach symbols va industry
    res = supabase.table('stock_symbols').select('symbol, icb_name2').execute()
    symbol_map = {item['symbol']: item['icb_name2'] for item in res.data}
    symbols = list(symbol_map.keys())
    
    total = len(symbols)
    logger.info(f"Processing {total} symbols for NOPAT calculation with MULTI-THREADING...")

    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    # Use 10 workers for speed
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_symbol, sym, symbol_map): sym for sym in symbols}
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            if completed % 50 == 0:
                logger.info(f"Progress: {completed}/{total} symbols processed.")
            try:
                future.result()
            except Exception as exc:
                logger.error(f"Thread exception: {exc}")

if __name__ == "__main__":
    process_all_symbols()
