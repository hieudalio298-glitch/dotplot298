# -*- coding: utf-8 -*-
"""
File: get_financial_nopat.py
Mo ta: Query du lieu tu bang financial_nopat trong Supabase
Author: Your Name
Date: 2026-02-10
"""

import os
import sys
from supabase import create_client, Client
import pandas as pd
from typing import Optional, List

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ===========================
# BƯỚC 1: Cấu hình Supabase
# ===========================
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cW1wZG1ia3ViaHp1Y2NxZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTI1ODYsImV4cCI6MjA4NTg2ODU4Nn0.VR41wyzivzdJnUaFxMmRXjij-pU_9rm8e7TesbimwG4"

# Khởi tạo Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ===========================
# BƯỚC 2: Các hàm query dữ liệu
# ===========================

def get_financial_data(
    symbol: str,
    period_type: str = "year",
    year: Optional[int] = None
) -> pd.DataFrame:
    """
    Lấy dữ liệu tài chính của 1 mã cổ phiếu
    
    Args:
        symbol: Mã cổ phiếu (VD: 'VNM', 'HPG')
        period_type: 'year' hoặc 'quarter'
        year: Năm cụ thể (optional, nếu không truyền sẽ lấy tất cả)
    
    Returns:
        pandas.DataFrame với dữ liệu tài chính
    """
    query = supabase.table('financial_nopat') \
        .select('*') \
        .eq('symbol', symbol) \
        .eq('period_type', period_type)
    
    if year:
        query = query.eq('year', year)
    
    # Order by year DESC, quarter DESC
    query = query.order('year', desc=True).order('quarter', desc=True)
    
    response = query.execute()
    
    # Chuyển sang DataFrame
    df = pd.DataFrame(response.data)
    return df


def get_top_roic(
    year: int = 2024,
    limit: int = 10,
    industry: Optional[str] = None
) -> pd.DataFrame:
    """
    Lấy top các công ty có ROIC cao nhất
    
    Args:
        year: Năm
        limit: Số lượng kết quả
        industry: Ngành (optional)
    
    Returns:
        DataFrame với top ROIC
    """
    query = supabase.table('financial_nopat') \
        .select('symbol, industry, nopat, invested_capital, roic, roe, roa') \
        .eq('period_type', 'year') \
        .eq('year', year) \
        .not_.is_('roic', 'null')
    
    if industry:
        query = query.eq('industry', industry)
    
    query = query.order('roic', desc=True).limit(limit)
    
    response = query.execute()
    df = pd.DataFrame(response.data)
    
    # Format % cho các ratios
    if not df.empty:
        df['roic_pct'] = (df['roic'] * 100).round(2)
        df['roe_pct'] = (df['roe'] * 100).round(2)
        df['roa_pct'] = (df['roa'] * 100).round(2)
        
        # Convert NOPAT, invested_capital sang tỷ VNĐ
        df['nopat_ty'] = (df['nopat'] / 1e9).round(1)
        df['invested_capital_ty'] = (df['invested_capital'] / 1e9).round(1)
    
    return df


def compare_companies(symbols: List[str], year: int = 2024) -> pd.DataFrame:
    """
    So sánh nhiều công ty
    
    Args:
        symbols: Danh sách mã cổ phiếu ['VNM', 'HPG', 'FPT']
        year: Năm so sánh
    
    Returns:
        DataFrame so sánh
    """
    query = supabase.table('financial_nopat') \
        .select('symbol, industry, year, nopat, equity, invested_capital, total_assets, roic, roe, roa') \
        .eq('period_type', 'year') \
        .eq('year', year) \
        .in_('symbol', symbols)
    
    response = query.execute()
    df = pd.DataFrame(response.data)
    
    if not df.empty:
        # Format
        df['nopat_ty'] = (df['nopat'] / 1e9).round(1)
        df['equity_ty'] = (df['equity'] / 1e9).round(1)
        df['roic_pct'] = (df['roic'] * 100).round(2)
        df['roe_pct'] = (df['roe'] * 100).round(2)
        df['roa_pct'] = (df['roa'] * 100).round(2)
    
    return df


def get_time_series(symbol: str, period_type: str = "year", start_year: Optional[int] = None) -> pd.DataFrame:
    """
    Lấy chuỗi thời gian của 1 mã
    
    Args:
        symbol: Mã cổ phiếu
        period_type: 'year' hoặc 'quarter'
        start_year: Năm bắt đầu (optional)
    
    Returns:
        DataFrame time series
    """
    query = supabase.table('financial_nopat') \
        .select('*') \
        .eq('symbol', symbol) \
        .eq('period_type', period_type)
    
    if start_year:
        query = query.gte('year', start_year)
    
    query = query.order('year', desc=False).order('quarter', desc=False)
    
    response = query.execute()
    df = pd.DataFrame(response.data)
    
    if not df.empty and period_type == 'year':
        # Format các cột quan trọng
        for col in ['nopat', 'equity', 'invested_capital', 'total_assets']:
            if col in df.columns:
                df[f'{col}_ty'] = (df[col] / 1e9).round(1)
        
        for col in ['roic', 'roe', 'roa']:
            if col in df.columns:
                df[f'{col}_pct'] = (df[col] * 100).round(2)
    
    return df


def get_panel_data_roic(start_year: int = 2015, end_year: int = 2024, min_years: Optional[int] = None) -> pd.DataFrame:
    """
    Lấy panel data ROIC cho hồi quy - CHỈ GIỮ các mã có đủ dữ liệu tất cả các năm
    
    Args:
        start_year: Năm bắt đầu (default: 2015)
        end_year: Năm kết thúc (default: 2024)
        min_years: Số năm tối thiểu phải có data (default: None = phải có tất cả)
    """
    all_data = []
    offset = 0
    page_size = 1000
    
    print(f"🔄 Đang tải dữ liệu từ Supabase (2015-2024)...")
    
    while True:
        query = supabase.table('financial_nopat') \
            .select('symbol, industry, year, roic') \
            .eq('period_type', 'year') \
            .gte('year', start_year) \
            .lte('year', end_year) \
            .not_.is_('roic', 'null') \
            .order('symbol') \
            .order('year') \
            .range(offset, offset + page_size - 1)
        
        response = query.execute()
        data = response.data
        all_data.extend(data)
        
        if len(data) < page_size:
            break
        offset += page_size
    
    df = pd.DataFrame(all_data)
    
    if df.empty:
        return pd.DataFrame()
    
    # Lọc symbols có đủ data TRƯỚC KHI pivot
    total_years = end_year - start_year + 1
    if min_years is None:
        min_years = total_years
    
    year_counts = df.groupby('symbol')['year'].nunique()
    valid_symbols = year_counts[year_counts >= min_years].index.tolist()
    
    df_filtered = df[df['symbol'].isin(valid_symbols)].copy()
    
    # Tạo pivot table
    pivot = df_filtered.pivot_table(
        index='symbol',
        columns='year',
        values='roic',
        aggfunc='first'
    )
    
    # Rename columns
    pivot.columns = [f'year_{int(year)}' for year in pivot.columns]
    
    # Thêm cột industry
    industry_map = df_filtered[['symbol', 'industry']].drop_duplicates().set_index('symbol')['industry']
    pivot['industry'] = pivot.index.map(industry_map)
    
    pivot = pivot.reset_index()
    
    print(f"📊 Panel Data Summary:")
    print(f"   - Tổng số mã có {min_years}+ năm dữ liệu: {len(pivot)}")
    print(f"   - Quan sát tổng cộng: {len(df_filtered)}")
    
    return pivot


def get_long_format_panel(start_year: int = 2015, end_year: int = 2024, min_years: Optional[int] = None) -> pd.DataFrame:
    """
    Lấy panel data dạng LONG
    """
    all_data = []
    offset = 0
    page_size = 1000
    
    print(f"🔄 Đang tải dữ liệu LONG format từ Supabase...")
    
    while True:
        query = supabase.table('financial_nopat') \
            .select('symbol, industry, year, roic, roe, roa, equity, invested_capital, total_assets, nopat') \
            .eq('period_type', 'year') \
            .gte('year', start_year) \
            .lte('year', end_year) \
            .not_.is_('roic', 'null') \
            .order('symbol') \
            .order('year') \
            .range(offset, offset + page_size - 1)
            
        response = query.execute()
        data = response.data
        all_data.extend(data)
        
        if len(data) < page_size:
            break
        offset += page_size
        
    df = pd.DataFrame(all_data)
    
    if df.empty:
        return pd.DataFrame()
    
    # Lọc symbols
    total_years = end_year - start_year + 1
    if min_years is None:
        min_years = total_years
    
    year_counts = df.groupby('symbol')['year'].nunique()
    valid_symbols = year_counts[year_counts >= min_years].index.tolist()
    
    df_complete = df[df['symbol'].isin(valid_symbols)].copy()
    
    # Format
    for col in ['equity', 'invested_capital', 'total_assets', 'nopat']:
        if col in df_complete.columns:
            df_complete[f'{col}_billion'] = (df_complete[col] / 1e9).round(2)
    
    for col in ['roic', 'roe', 'roa']:
        if col in df_complete.columns:
            df_complete[f'{col}_pct'] = (df_complete[col] * 100).round(2)
    
    print(f"📊 Long Format Panel Data Summary:")
    print(f"   - Tổng số mã có {min_years}+ năm: {df_complete['symbol'].nunique()}")
    print(f"   - Quan sát tổng cộng: {len(df_complete)}")
    
    return df_complete


# ===========================
# BƯỚC 3: Ví dụ sử dụng
# ===========================

if __name__ == "__main__":
    print("=" * 60)
    print("QUERY DỮ LIỆU TỪ FINANCIAL_NOPAT")
    print("=" * 60)
    
    # Ví dụ 1: Lấy dữ liệu VNM theo năm
    print("\n📊 VÍ DỤ 1: Lấy dữ liệu VNM (yearly)")
    print("-" * 60)
    vnm_data = get_financial_data('VNM', period_type='year')
    print(vnm_data[['year', 'nopat', 'equity', 'roic', 'roe', 'roa']].head(5))
    
    # Ví dụ 2: Top 10 ROIC năm 2024
    print("\n📈 VÍ DỤ 2: Top 10 ROIC cao nhất 2024")
    print("-" * 60)
    top_roic = get_top_roic(year=2024, limit=10)
    print(top_roic[['symbol', 'industry', 'nopat_ty', 'roic_pct', 'roe_pct']].to_string(index=False))
    
    # Ví dụ 3: So sánh VNM, HPG, FPT
    print("\n🔍 VÍ DỤ 3: So sánh VNM, HPG, FPT năm 2024")
    print("-" * 60)
    comparison = compare_companies(['VNM', 'HPG', 'FPT'], year=2024)
    print(comparison[['symbol', 'industry', 'nopat_ty', 'equity_ty', 'roic_pct', 'roe_pct']].to_string(index=False))
    
    # Ví dụ 4: Time series VNM từ 2020
    print("\n📉 VÍ DỤ 4: Time series VNM từ 2020")
    print("-" * 60)
    vnm_ts = get_time_series('VNM', period_type='year', start_year=2020)
    print(vnm_ts[['year', 'nopat_ty', 'equity_ty', 'roic_pct', 'roe_pct', 'roa_pct']].to_string(index=False))
    
    # Ví dụ 5: Top 5 ROE ngành "Thực phẩm và đồ uống"
    print("\n🍔 VÍ DỤ 5: Top 5 ROE ngành Thực phẩm và đồ uống")
    print("-" * 60)
    top_food = get_top_roic(year=2024, limit=5, industry="Thực phẩm và đồ uống")
    print(top_food[['symbol', 'nopat_ty', 'roe_pct', 'roic_pct']].to_string(index=False))
    
    # Ví dụ 6: Panel data ROIC dạng WIDE (cho regression)
    print("\n📊 VÍ DỤ 6: Panel Data ROIC 2015-2024 (Wide Format - for Regression)")
    print("-" * 60)
    panel_wide = get_panel_data_roic(start_year=2015, end_year=2024)  # 2015-2024 = 10 năm
    print(f"\nShape: {panel_wide.shape} (rows x columns)")
    print(f"Columns: {list(panel_wide.columns[:5])}... + {len(panel_wide.columns) - 5} more")
    print("\nFirst 3 symbols:")
    print(panel_wide.head(3).to_string(index=False))
    
    # Ví dụ 6.1: Nếu muốn lấy thêm năm 2025 nhưng chấp nhận thiếu
    print("\n📊 VÍ DỤ 6.1: Panel 2015-2025 nhưng chấp nhận ít nhất 9 năm")
    print("-" * 60)
    panel_flexible = get_panel_data_roic(start_year=2015, end_year=2025, min_years=9) 
    print(f"Total symbols: {len(panel_flexible)}")
    
    # Ví dụ 7: Panel data dạng LONG (cho regression/plotting)
    print("\n📉 VÍ DỤ 7: Panel Data LONG Format 2015-2024 (for sklearn/statsmodels)")
    print("-" * 60)
    panel_long = get_long_format_panel(start_year=2015, end_year=2024)
    print(f"\nShape: {panel_long.shape}")
    print("\nFirst 10 observations:")
    print(panel_long[['symbol', 'industry', 'year', 'roic_pct', 'roe_pct', 'roa_pct']].head(10).to_string(index=False))
    
    # Lưu ra file để sử dụng cho regression
    print("\n💾 Lưu panel data...")
    panel_wide.to_csv('panel_roic_wide_2015_2024.csv', index=False, encoding='utf-8-sig')
    panel_long.to_csv('panel_roic_long_2015_2024.csv', index=False, encoding='utf-8-sig')
    print("   ✅ Đã lưu: panel_roic_wide_2015_2024.csv")
    print("   ✅ Đã lưu: panel_roic_long_2015_2024.csv")
    print(f"   📈 {len(panel_wide)} mã có đủ data 10 năm (2015-2024)")
    
    print("\n" + "=" * 60)
    print("✅ HOÀN THÀNH!")
    print("=" * 60)
