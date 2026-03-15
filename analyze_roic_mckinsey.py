import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from supabase import create_client, Client
import os
import json
from dotenv import load_dotenv

# Load credentials
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

import sys
import io

# Fix for Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def fetch_financial_data():
    """Fetch pre-calculated financial data from financial_nopat table."""
    print("--- Fetching financial data from financial_nopat ---")
    all_data = []
    limit = 1000
    offset = 0
    
    while True:
        res = supabase.table('financial_nopat') \
            .select('symbol, industry, year, roic, invested_capital, nopat') \
            .eq('period_type', 'year') \
            .range(offset, offset + limit - 1) \
            .execute()
            
        if not res.data:
            break
            
        all_data.extend(res.data)
        
        offset += limit
        if len(res.data) < limit:
            break
            
    df = pd.DataFrame(all_data)
    
    # Filter years 2015-2025
    df['year'] = pd.to_numeric(df['year'], errors='coerce')
    df = df[df['year'].between(2015, 2025)]
    
    # Ensure numeric types
    for col in ['roic', 'invested_capital', 'nopat']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    return df

def calculate_roic_mckinsey(df):
    """
    Apply global filters for the McKinsey analysis:
    1. Clean ROIC values (remove extreme outliers).
    2. Survivorship Bias: Keep only companies that existed in 2015 and 2024.
    3. Clean Industries: Remove 'N/A', 'OTHER', and missing industry labels.
    """
    print("--- Applying McKinsey Deep Analysis Filters ---")
    
    # 1. Basic Cleaning
    df = df[(df['roic'] <= 1.5) & (df['roic'] >= -0.5)].copy()
    
    # 2. Industry Cleaning
    invalid_industries = ['N/A', 'OTHER', 'Unknown', 'None', 'nan']
    df['industry'] = df['industry'].astype(str)
    df = df[~df['industry'].str.upper().isin([x.upper() for x in invalid_industries])]
    df = df[df['industry'].notna() & (df['industry'] != 'None')]

    # 3. Survivorship Filter (Mandatory for Cohort Analysis)
    symbols_2015 = df[df['year'] == 2015]['symbol'].unique()
    symbols_2025 = df[df['year'] == 2025]['symbol'].unique()
    survivors = list(set(symbols_2015) & set(symbols_2025))
    
    print(f"   - Initial symbols: {df['symbol'].nunique()}")
    df = df[df['symbol'].isin(survivors)]
    print(f"   - Survivors (2015-2025): {df['symbol'].nunique()}")
    
    return df

def fetch_industries():
    # Redundant but kept for structure if needed
    res = supabase.table('stock_symbols').select('symbol, icb_name2').execute()
    return pd.DataFrame(res.data)

def plot_roic_decay(df, highlight_symbol='VNM'):
    print("📈 Generating ROIC Decay Chart...")
    
    # Filter for symbols with 2015 and 2025 data (Survivorship)
    symbols_2015 = df[df['year'] == 2015]['symbol'].unique()
    symbols_2025 = df[df['year'] == 2025]['symbol'].unique()
    survivors = list(set(symbols_2015) & set(symbols_2025))
    
    df_surv = df[df['symbol'].isin(survivors)].copy()
    
    # Quintiles in 2015
    df_2015 = df_surv[df_surv['year'] == 2015].copy()
    df_2015['quintile'] = pd.qcut(df_2015['roic'], 5, labels=[5, 4, 3, 2, 1]) # 1 is best
    
    symbol_quintiles = df_2015.set_index('symbol')['quintile'].to_dict()
    df_surv['quintile'] = df_surv['symbol'].map(symbol_quintiles)
    
    # Median ROIC per year per quintile
    decay = df_surv.groupby(['year', 'quintile'])['roic'].median().reset_index()
    
    fig = go.Figure()
    
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']
    labels = ["Quintile 1 (Top 20%)", "Quintile 2", "Quintile 3", "Quintile 4", "Quintile 5 (Bottom 20%)"]
    
    for q in range(1, 6):
        q_data = decay[decay['quintile'] == q]
        fig.add_trace(go.Scatter(
            x=q_data['year'], y=q_data['roic'] * 100,
            mode='lines+markers',
            name=labels[q-1],
            line=dict(width=2, color=colors[q-1])
        ))
        
    # Highlight specific symbol
    if highlight_symbol in survivors:
        sym_data = df_surv[df_surv['symbol'] == highlight_symbol]
        fig.add_trace(go.Scatter(
            x=sym_data['year'], y=sym_data['roic'] * 100,
            mode='lines+markers',
            name=f"Cổ phiếu: {highlight_symbol}",
            line=dict(width=5, color='darkred'),
            marker=dict(size=10, symbol='diamond')
        ))
        
    fig.update_layout(
        title=f"ROIC Decay Analysis (Cohort 2015-2025) - Highlight: {highlight_symbol}",
        xaxis_title="Năm",
        yaxis_title="ROIC (%)",
        template="plotly_dark",
        legend=dict(yanchor="top", y=0.99, xanchor="left", x=1.05)
    )
    
    filename = f"roic_decay_{highlight_symbol}.png"
    fig.write_image(filename, width=1200, height=700)
    print(f"✅ Decay chart saved: {filename}")

def plot_transition_matrix(df):
    print("🔄 Generating Transition Matrix...")
    
    df_2015 = df[df['year'] == 2015][['symbol', 'roic']].copy()
    df_2024 = df[df['year'] == 2024][['symbol', 'roic']].copy()
    
    # Bucketized labels
    bins = [-np.inf, 0.05, 0.10, 0.15, 0.20, np.inf]
    labels = ['< 5%', '5% - 10%', '10% - 15%', '15% - 20%', '> 20%']
    
    df_2015['bucket'] = pd.cut(df_2015['roic'], bins=bins, labels=labels)
    df_2024['bucket'] = pd.cut(df_2024['roic'], bins=bins, labels=labels)
    
    merged = pd.merge(df_2015, df_2024, on='symbol', suffixes=('_2015', '_2024')).dropna()
    
    matrix = pd.crosstab(merged['bucket_2015'], merged['bucket_2024'], normalize='index') * 100
    
    fig = px.imshow(
        matrix,
        labels=dict(x="2024 ROIC", y="2015 ROIC", color="Xác suất (%)"),
        x=labels, y=labels,
        text_auto=".1f",
        color_continuous_scale="Viridis",
        title="Ma trận chuyển dịch ROIC (2015 -> 2024)"
    )
    
    fig.update_layout(template="plotly_dark")
    fig.write_image("roic_transition_matrix_mckinsey.png", width=800, height=600)
    print("✅ Transition matrix saved.")

def plot_roic_distribution(df):
    print("📊 Generating ROIC Distribution by Year...")
    
    # Filter and categorize for cleaner visualization
    df_clean = df.copy()
    df_clean['roic_pct'] = df_clean['roic'] * 100
    
    # We use a box plot with points to show the density and outliers
    fig = px.box(
        df_clean, 
        x='year', 
        y='roic_pct',
        points="outliers", # show outliers
        color='year',
        title="Biến động Phân phối ROIC Toàn thị trường (2015-2025)",
        labels={'year': 'Năm', 'roic_pct': 'ROIC (%)'},
        template="plotly_dark"
    )
    
    # Limit Y-axis to focus on the bulk of the data (-50% to 100%)
    fig.update_layout(
        yaxis=dict(range=[-30, 80]),
        showlegend=False
    )
    
    filename = "roic_distribution_by_year.png"
    fig.write_image(filename, width=1200, height=700)
    print(f"✅ Distribution plot saved: {filename}")

def plot_industry_comparison(df):
    print("🏢 Generating Industry ROIC Comparison...")
    
    # Exclude financials for a fair comparison of non-financial metrics
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    
    # Calculate Industry Medians
    industry_medians = df_filtered.groupby(['year', 'industry'])['roic'].median().reset_index()
    
    # Calculate Overall Market Median (including all non-financials)
    market_median = df_filtered.groupby('year')['roic'].median().reset_index()
    market_median['industry'] = 'TRUNG VỊ THỊ TRƯỜNG'
    
    # Combine for plotting
    plot_data = pd.concat([industry_medians, market_median])
    plot_data['roic_pct'] = plot_data['roic'] * 100
    
    # Create the plot
    fig = px.line(
        plot_data, 
        x='year', 
        y='roic_pct', 
        color='industry',
        title="So sánh ROIC Trung vị theo Ngành vs. Trung vị Toàn thị trường",
        labels={'year': 'Năm', 'roic_pct': 'ROIC (%)', 'industry': 'Ngành'},
        template="plotly_dark",
        category_orders={"industry": ["TRUNG VỊ THỊ TRƯỜNG"] + sorted(df_filtered['industry'].dropna().unique())}
    )
    
    # Style the Market Median line to stand out
    fig.update_traces(
        patch={"line": {"width": 6, "dash": "dash", "color": "white"}}, 
        selector={"name": "TRUNG VỊ THỊ TRƯỜNG"}
    )
    
    filename = "roic_industry_comparison.png"
    fig.write_image(filename, width=1200, height=800)
    print(f"✅ Industry comparison saved: {filename}")

def plot_specific_industry_vs_market(df, target_industry="Xây dựng và Vật liệu"):
    print(f"🏗️ Comparing ROIC: {target_industry} vs Market...")
    
    # Exclude financials for market baseline
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    
    # Calculate Target Industry Median
    industry_data = df_filtered[df_filtered['industry'] == target_industry]
    industry_median = industry_data.groupby('year')['roic'].median().reset_index()
    industry_median['label'] = target_industry.upper()
    
    # Calculate Overall Market Median
    market_median = df_filtered.groupby('year')['roic'].median().reset_index()
    market_median['label'] = 'TRUNG VỊ THỊ TRƯỜNG (PHI TÀI CHÍNH)'
    
    # Combine
    plot_data = pd.concat([industry_median, market_median])
    plot_data['roic_pct'] = plot_data['roic'] * 100
    
    # Create Plot
    fig = px.line(
        plot_data, 
        x='year', 
        y='roic_pct', 
        color='label',
        title=f"Hiệu quả vốn (ROIC): {target_industry} vs Toàn thị trường",
        labels={'year': 'Năm', 'roic_pct': 'ROIC (%)', 'label': 'Nhóm'},
        markers=True,
        template="plotly_dark",
        color_discrete_map={
            target_industry.upper(): "#ff7f0e",
            'TRUNG VỊ THỊ TRƯỜNG (PHI TÀI CHÍNH)': "#ffffff"
        }
    )
    
    fig.update_traces(line=dict(width=4))
    
    # Add annotation for the gap in latest year
    last_year = plot_data['year'].max()
    ind_val = plot_data[(plot_data['year'] == last_year) & (plot_data['label'] == target_industry.upper())]['roic_pct'].values[0]
    mkt_val = plot_data[(plot_data['year'] == last_year) & (plot_data['label'] == 'TRUNG VỊ THỊ TRƯỜNG (PHI TÀI CHÍNH)')]['roic_pct'].values[0]
    gap = ind_val - mkt_val
    
    fig.add_annotation(
        x=last_year, y=ind_val,
        text=f"Chênh lệch: {gap:+.1f}%",
        showarrow=True, arrowhead=1, yshift=10
    )
    
    filename = f"roic_comparison_{target_industry.replace(' ', '_')}.png"
    fig.write_image(filename, width=1000, height=600)
    print(f"✅ Specific comparison saved: {filename}")

def plot_top_30_roic(df):
    print("🏆 Identifying and Plotting Top 30 ROIC Stocks...")
    
    # Use the most recent year available in the data
    latest_year = df['year'].max()
    df_latest = df[df['year'] == latest_year].copy()
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_latest = df_latest[~df_latest['industry'].isin(financials)]
    
    # Find Top 30
    top_30 = df_latest.sort_values('roic', ascending=False).head(30)
    top_30['roic_pct'] = top_30['roic'] * 100
    
    # Calculate Market Median for reference line
    market_median_val = df_latest['roic'].median() * 100
    
    # Create Bar Chart
    fig = px.bar(
        top_30,
        x='symbol',
        y='roic_pct',
        color='roic_pct',
        text_auto='.1f',
        title=f"Top 30 Cổ phiếu có ROIC cao nhất thị trường (Năm {latest_year})",
        labels={'symbol': 'Mã CP', 'roic_pct': 'ROIC (%)'},
        template="plotly_dark",
        color_continuous_scale='Viridis'
    )
    
    # Add Market Median Line
    fig.add_hline(
        y=market_median_val, 
        line_dash="dash", 
        line_color="red",
        annotation_text=f"Trung vị Thị trường: {market_median_val:.1f}%",
        annotation_position="bottom right"
    )
    
    fig.update_layout(xaxis={'categoryorder':'total descending'})
    
    filename = "top_30_roic_stocks.png"
    fig.write_image(filename, width=1400, height=700)
    print(f"✅ Top 30 plot saved: {filename}")

    filename = "roic_variation_within_industries.png"
    fig.write_image(filename, width=1400, height=800)
    print(f"✅ Variation plot saved: {filename}")

def plot_mckinsey_style_variation(df):
    print("💎 Generating McKinsey-Style ROIC Variation Chart...")
    
    latest_year = df['year'].max()
    df_latest = df[df['year'] == latest_year].copy()
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_latest = df_latest[~df_latest['industry'].isin(financials)]
    df_latest['roic_pct'] = df_latest['roic'] * 100
    
    # Filter for industries with at least 5 companies for meaningful quartiles
    counts = df_latest['industry'].value_counts()
    valid_industries = counts[counts >= 5].index
    df_filtered = df_latest[df_latest['industry'].isin(valid_industries)]
    
    # Calculate stats
    stats = df_filtered.groupby('industry')['roic_pct'].agg([
        ('q1', lambda x: x.quantile(0.25)),
        ('median', 'median'),
        ('q3', lambda x: x.quantile(0.75))
    ]).reset_index()
    
    # Sort by Median descending as in the McKinsey chart
    stats = stats.sort_values('median', ascending=True) # Plotly Y-axis goes bottom to top, so True for top-to-bottom visual
    
    fig = go.Figure()
    
    # Add horizontal background bars (shaded rows)
    for i, row in enumerate(stats.itertuples()):
        if i % 2 == 0:
            fig.add_shape(
                type="rect", x0=-20, y0=i-0.5, x1=120, y1=i+0.5,
                fillcolor="rgba(200, 200, 200, 0.1)", line=dict(width=0), layer="below"
            )

    # Add connecting lines (Q1 to Q3)
    for i, row in enumerate(stats.itertuples()):
        fig.add_trace(go.Scatter(
            x=[row.q1, row.q3], y=[i, i],
            mode='lines',
            line=dict(color='#5d6d7e', width=1.5),
            showlegend=False,
            hoverinfo='skip'
        ))

    # Add Q1 - Dark Square
    fig.add_trace(go.Scatter(
        x=stats['q1'], y=list(range(len(stats))),
        mode='markers',
        marker=dict(symbol='square', size=10, color='#1b4f72'),
        name='1st Quartile'
    ))

    # Add Median - Light Open Square
    fig.add_trace(go.Scatter(
        x=stats['median'], y=list(range(len(stats))),
        mode='markers',
        marker=dict(symbol='square-open', size=10, color='#3498db', line=dict(width=2)),
        name='Median'
    ))

    # Add Q3 - Dark Circle
    fig.add_trace(go.Scatter(
        x=stats['q3'], y=list(range(len(stats))),
        mode='markers',
        marker=dict(symbol='circle', size=10, color='#1b4f72'),
        name='3rd Quartile'
    ))

    fig.update_layout(
        title=f"Variation in ROIC within Industries (Năm {latest_year})<br><sup>McKinsey Consulting Style</sup>",
        xaxis=dict(title="ROIC (%)", range=[-10, 80], gridcolor='rgba(255,255,255,0.1)'),
        yaxis=dict(
            tickmode='array',
            tickvals=list(range(len(stats))),
            ticktext=stats['industry'],
            gridcolor='rgba(255,255,255,0.05)'
        ),
        template="plotly_dark",
        height=800,
        width=1000,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )

    filename = "mckinsey_style_variation.png"
    fig.write_image(filename)
    print(f"✅ McKinsey-style variation plot saved: {filename}")

def plot_industry_spread_evolution(df):
    print("⏳ Generating Industry ROIC Spread Evolution for ALL industries (2015-2024)...")
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    df_filtered['roic_pct'] = df_filtered['roic'] * 100
    
    # Calculate stats per year per industry
    stats = df_filtered.groupby(['year', 'industry'])['roic_pct'].agg([
        ('q1', lambda x: x.quantile(0.25)),
        ('median', 'median'),
        ('q3', lambda x: x.quantile(0.75))
    ]).reset_index()
    
    # Filter industries with at least 3 companies
    counts = df_filtered['industry'].value_counts()
    all_industries = counts[counts >= 3].index.tolist()
    all_industries.sort()
    
    num_industries = len(all_industries)
    cols = 4
    rows = (num_industries + cols - 1) // cols
    
    fig = make_subplots(rows=rows, cols=cols, subplot_titles=all_industries, vertical_spacing=0.05, horizontal_spacing=0.05)
    
    for i, industry in enumerate(all_industries):
        row = (i // cols) + 1
        col = (i % cols) + 1
        
        ind_stats = stats[stats['industry'] == industry]
        if ind_stats.empty: continue

        # Add IQR Ribbon (Shaded Area)
        fig.add_trace(go.Scatter(
            x=list(ind_stats['year']) + list(ind_stats['year'][::-1]),
            y=list(ind_stats['q3']) + list(ind_stats['q1'][::-1]),
            fill='toself',
            fillcolor='rgba(0, 176, 246, 0.2)',
            line=dict(color='rgba(255,255,255,0)'),
            hoverinfo="skip",
            showlegend=False
        ), row=row, col=col)
        
        # Add Median Line
        fig.add_trace(go.Scatter(
            x=ind_stats['year'], y=ind_stats['median'],
            mode='lines+markers',
            line=dict(color='#00B0F6', width=2),
            name=f'{industry} Median',
            showlegend=False,
            marker=dict(size=4)
        ), row=row, col=col)
        
    fig.update_layout(
        title="Tiến hóa Phân hóa ROIC (Q1-Median-Q3) Toàn bộ các Ngành (2015-2025)",
        height=rows * 250,
        width=1600,
        template="plotly_dark",
        margin=dict(t=100, b=50, l=50, r=50)
    )
    
    # Update all y-axes to have same range for comparison
    fig.update_yaxes(range=[-10, 50], tickfont=dict(size=8))
    fig.update_xaxes(tickfont=dict(size=8))
    
    filename = "all_industries_spread_evolution.png"
    fig.write_image(filename)
    print(f"✅ All industries spread evolution saved: {filename}")

def plot_roic_quintiles_evolution(df):
    print("💎 Generating Premium ROIC Quintiles Evolution (2015-2025)...")
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    df_filtered['roic_pct'] = df_filtered['roic'] * 100
    
    # Calculate quintiles per year
    all_quintiles = []
    for year in sorted(df_filtered['year'].unique()):
        year_data = df_filtered[df_filtered['year'] == year].copy()
        if len(year_data) < 5: continue
        
        # Divide into 5 quintiles (1 = Top 20%, 5 = Bottom 20%)
        year_data['quintile'] = pd.qcut(year_data['roic_pct'], 5, labels=[5, 4, 3, 2, 1])
        
        # Calculate median for each quintile
        q_stats = year_data.groupby('quintile')['roic_pct'].median().reset_index()
        q_stats['year'] = year
        all_quintiles.append(q_stats)
        
    plot_data = pd.concat(all_quintiles)
    plot_data['quintile'] = plot_data['quintile'].astype(int)
    
    # Professional Color Palette (HBR/McKinsey style)
    colors = {
        1: "#003f5c", # Deep Navy
        2: "#58508d",
        3: "#bc5090",
        4: "#ff6361",
        5: "#ffa600"  # Vibrant Orange
    }
    
    names = {
        1: "Top 20% (Elite)",
        2: "Upper Middle",
        3: "Market Median Tier",
        4: "Lower Middle",
        5: "Bottom 20%"
    }
    
    fig = go.Figure()

    # Add lines for each quintile
    for q in [1, 2, 3, 4, 5]:
        q_df = plot_data[plot_data['quintile'] == q]
        fig.add_trace(go.Scatter(
            x=q_df['year'], 
            y=q_df['roic_pct'],
            mode='lines+markers',
            name=names[q],
            line=dict(color=colors[q], width=4 if q==1 else 2.5),
            marker=dict(size=8 if q==1 else 6)
        ))

    # Add annotation for the gap
    latest_year = plot_data['year'].max()
    top_val = plot_data[(plot_data['year'] == latest_year) & (plot_data['quintile'] == 1)]['roic_pct'].values[0]
    bot_val = plot_data[(plot_data['year'] == latest_year) & (plot_data['quintile'] == 5)]['roic_pct'].values[0]
    gap = top_val - bot_val
    
    fig.add_annotation(
        x=latest_year, y=(top_val + bot_val)/2,
        text=f"Khoảng cách hiệu quả: {gap:.1f}%",
        showarrow=False,
        xshift=100,
        font=dict(size=14, color="white"),
        bgcolor="rgba(0,0,0,0.5)"
    )

    fig.update_layout(
        title={
            'text': "Sự phân hóa hiệu quả vốn (ROIC) theo 5 nhóm Ngũ phân vị (2015-2025)",
            'y':0.95, 'x':0.5, 'xanchor': 'center', 'yanchor': 'top',
            'font': {'size': 24}
        },
        xaxis_title="Năm",
        yaxis_title="ROIC Trung vị (%)",
        template="plotly_dark",
        height=700,
        width=1200,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        hovermode="x unified"
    )
    
    fig.update_yaxes(gridcolor='rgba(255,255,255,0.1)', zerolinecolor='rgba(255,255,255,0.2)')
    fig.update_xaxes(gridcolor='rgba(255,255,255,0.1)')

    filename = "roic_quintiles_evolution.png"
    fig.write_image(filename)
    print(f"✅ Quintiles evolution plot saved: {filename}")

    filename = "roic_quintiles_evolution.png"
    fig.write_image(filename)
    print(f"✅ Quintiles evolution plot saved: {filename}")

def plot_bigcap_moat_analysis(df):
    print("🏰 Analyzing Moat: Big Caps vs Market Quintiles...")
    
    symbols_to_track = ['HPG', 'VNM', 'DGC', 'PNJ', 'MWG', 'VJC', 'SAB', 'MSN', 'GAS', 'GVR', 'PLX']
    
    # Exclude financials for market baseline
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    df_filtered['roic_pct'] = df_filtered['roic'] * 100
    
    # 1. Calculate Market Quintiles for Background
    all_quintiles = []
    for year in sorted(df_filtered['year'].unique()):
        year_data = df_filtered[df_filtered['year'] == year].copy()
        if len(year_data) < 10: continue
        # We only need Top 20%, Median, and Bottom 20% for cleaner background
        year_data['market_q'] = pd.qcut(year_data['roic_pct'], 5, labels=['Q5', 'Q4', 'Q3', 'Q2', 'Q1'])
        q_stats = year_data.groupby('market_q')['roic_pct'].median().reset_index()
        q_stats['year'] = year
        all_quintiles.append(q_stats)
    
    q_df = pd.concat(all_quintiles)
    
    fig = go.Figure()

    # 2. Add Background Bands (Area charts for the quintiles)
    # Top 20% Layer
    top_q = q_df[q_df['market_q'] == 'Q1']
    mid_q = q_df[q_df['market_q'] == 'Q3']
    
    fig.add_trace(go.Scatter(
        x=top_q['year'], y=top_q['roic_pct'],
        mode='lines',
        line=dict(width=0),
        name='Top 20% (Elite Zone)',
        fill=None,
        showlegend=True
    ))
    
    fig.add_trace(go.Scatter(
        x=mid_q['year'], y=mid_q['roic_pct'],
        mode='lines',
        line=dict(width=0),
        fill='tonexty',
        fillcolor='rgba(255, 255, 255, 0.05)',
        name='Above Average Zone',
        showlegend=True
    ))

    # 3. Add Individual Big Cap Lines
    # Use a diverse color palette for markers
    colors = px.colors.qualitative.Light24
    
    for i, sym in enumerate(symbols_to_track):
        sym_data = df_filtered[df_filtered['symbol'] == sym].sort_values('year')
        if sym_data.empty: continue
        
        fig.add_trace(go.Scatter(
            x=sym_data['year'],
            y=sym_data['roic_pct'],
            mode='lines+markers',
            name=sym,
            line=dict(width=3 if sym in ['VNM', 'HPG', 'DGC'] else 1.5),
            marker=dict(size=8 if sym in ['VNM', 'HPG', 'DGC'] else 5),
            opacity=0.9 if sym in ['VNM', 'HPG', 'DGC'] else 0.6
        ))

    fig.update_layout(
        title={
            'text': "Big Cap Moat Analysis: ROIC vs Market Tiers (2015-2024)",
            'y':0.95, 'x':0.5, 'xanchor': 'center', 'yanchor': 'top',
            'font': {'size': 22}
        },
        xaxis_title="Năm",
        yaxis_title="ROIC (%)",
        template="plotly_dark",
        height=800,
        width=1300,
        legend=dict(orientation="v", yanchor="top", y=1, xanchor="left", x=1.02),
        hovermode="x unified"
    )
    
    # Focus on the relevant ROIC range
    fig.update_yaxes(range=[-10, 60])
    
    # Add horizontal line at 15% (Common Moat Benchmark)
    fig.add_hline(y=15, line_dash="dash", line_color="rgba(255,255,255,0.3)", 
                 annotation_text="Moat Benchmark (15%)", annotation_position="top left")

    filename = "big_cap_moat_analysis.png"
    fig.write_image(filename)
    print(f"✅ Big Cap Moat plot saved: {filename}")

    filename = "big_cap_moat_analysis.png"
    fig.write_image(filename)
    print(f"✅ Big Cap Moat plot saved: {filename}")

def plot_big_cap_group_vs_market(df):
    print("📈 Comparing Big Cap Group Median vs Market Median...")
    
    symbols_to_track = ['HPG', 'VNM', 'DGC', 'PNJ', 'MWG', 'VJC', 'SAB', 'MSN', 'GAS', 'GVR', 'PLX']
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    df_filtered['roic_pct'] = df_filtered['roic'] * 100
    
    # 1. Market Median
    market_median = df_filtered.groupby('year')['roic_pct'].median().reset_index()
    market_median['group'] = 'TRUNG VỊ THỊ TRƯỜNG'
    
    # 2. Big Cap Group Median
    bigcap_data = df_filtered[df_filtered['symbol'].isin(symbols_to_track)]
    bigcap_median = bigcap_data.groupby('year')['roic_pct'].median().reset_index()
    bigcap_median['group'] = 'TRUNG VỊ NHÓM BIG CAP (11 MÃ)'
    
    # Combine
    plot_data = pd.concat([market_median, bigcap_median])
    
    fig = px.line(
        plot_data, x='year', y='roic_pct', color='group',
        title="Hiệu quả vốn: Nhóm Big Cap vs. Trung vị Toàn thị trường (2015-2025)",
        labels={'year': 'Năm', 'roic_pct': 'ROIC (%)', 'group': 'Nhóm'},
        markers=True,
        template="plotly_dark",
        color_discrete_map={
            'TRUNG VỊ NHÓM BIG CAP (11 MÃ)': '#00B0F6',
            'TRUNG VỊ THỊ TRƯỜNG': '#ffffff'
        }
    )
    
    fig.update_traces(line=dict(width=4))
    
    # Add gap annotation for the latest year
    last_year = plot_data['year'].max()
    mkt_val = plot_data[(plot_data['year'] == last_year) & (plot_data['group'] == 'TRUNG VỊ THỊ TRƯỜNG')]['roic_pct'].values[0]
    grp_val = plot_data[(plot_data['year'] == last_year) & (plot_data['group'] == 'TRUNG VỊ NHÓM BIG CAP (11 MÃ)')]['roic_pct'].values[0]
    gap = grp_val - mkt_val
    
    fig.add_annotation(
        x=last_year, y=grp_val,
        text=f"Phần bù hiệu quả: +{gap:.1f}%",
        showarrow=True, arrowhead=1, yshift=15,
        font=dict(size=14, color="#00B0F6")
    )

    filename = "big_cap_vs_market_median.png"
    fig.write_image(filename, width=1000, height=600)
    print(f"✅ Group comparison plot saved: {filename}")

def plot_industry_roic_heatmap(df):
    print("🔥 Generating Industry ROIC Improvement Heatmap (2015-2025)...")
    
    # Exclude financials
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df_filtered = df[~df['industry'].isin(financials)].copy()
    df_filtered['roic_pct'] = df_filtered['roic'] * 100
    
    # 1. Calculate Industry Medians per year
    industry_medians = df_filtered.groupby(['year', 'industry'])['roic_pct'].median().reset_index()
    
    # Pivot for Heatmap
    heatmap_data = industry_medians.pivot(index='industry', columns='year', values='roic_pct')
    
    # Calculate Improvement (2025 vs 2015)
    first_year = heatmap_data.columns.min()
    last_year = heatmap_data.columns.max()
    heatmap_data['improvement'] = heatmap_data[last_year] - heatmap_data[first_year]
    
    # Sort industries by improvement (Highest growth at top)
    heatmap_data = heatmap_data.sort_values('improvement', ascending=False)
    
    # Drop the improvement column for plotting but keep it for logic
    plot_data = heatmap_data.drop(columns=['improvement'])
    
    # Create Heatmap
    fig = px.imshow(
        plot_data,
        labels=dict(x="Năm", y="Ngành", color="ROIC (%)"),
        x=plot_data.columns,
        y=plot_data.index,
        color_continuous_scale='YlGn', # Yellow to Green (Sequential)
        aspect="auto",
        title="Tiến hóa Hiệu quả vốn (ROIC): Sự cải thiện theo từng Ngành (2015-2025)",
        text_auto=".1f"
    )
    
    fig.update_layout(
        template="plotly_dark",
        height=900,
        width=1400,
        xaxis_title="Năm",
        yaxis_title="Ngành (Sắp xếp theo mức độ cải thiện 2015 -> 2025)",
        coloraxis_colorbar=dict(title="ROIC (%)")
    )

    filename = "industry_roic_heatmap.png"
    fig.write_image(filename)
    print(f"✅ Industry ROIC improvement heatmap saved: {filename}")

def plot_construction_industry_deep_dive(df):
    print("🏗️ Deep-diving into Construction Industry (Xây dựng và Vật liệu)...")
    
    industry_name = 'Xây dựng và Vật liệu'
    df_ind = df[df['industry'] == industry_name].copy()
    df_ind['roic_pct'] = df_ind['roic'] * 100
    
    # Identify top players by invested capital in the latest year
    latest_year = df_ind['year'].max()
    top_players = df_ind[df_ind['year'] == latest_year].sort_values('invested_capital', ascending=False).head(10)['symbol'].tolist()
    
    # Also add some high ROIC players if not in top capital
    high_roic_players = df_ind[df_ind['year'] == latest_year].sort_values('roic_pct', ascending=False).head(5)['symbol'].tolist()
    
    symbols_to_plot = list(set(top_players + high_roic_players))
    df_plot = df_ind[df_ind['symbol'].isin(symbols_to_plot)]
    
    # Calculate Industry Median
    industry_median = df_ind.groupby('year')['roic_pct'].median().reset_index()
    industry_median['symbol'] = '--- TRUNG VỊ NGÀNH ---'
    
    # Combine
    plot_data = pd.concat([df_plot, industry_median])
    
    fig = px.line(
        plot_data, x='year', y='roic_pct', color='symbol',
        title=f"Phân tích Lợi thế Cạnh tranh: Top doanh nghiệp Ngành {industry_name} (2015-2025)",
        labels={'year': 'Năm', 'roic_pct': 'ROIC (%)', 'symbol': 'Doanh nghiệp'},
        markers=True,
        template="plotly_dark"
    )
    
    # Highlight the industry median line
    fig.update_traces(line=dict(width=5, dash='dash'), selector=dict(name='--- TRUNG VỊ NGÀNH ---'))
    
    fig.update_layout(
        height=700,
        width=1200,
        yaxis_title="ROIC (%)",
        hovermode="x unified"
    )

    filename = "construction_roic_deep_dive.png"
    fig.write_image(filename)
    print(f"✅ Construction deep-dive plot saved: {filename}")

def alpha_screener(df, industries):
    print("--- Screening for Alpha Stocks ---")
    
    # Merge with industries to exclude financials
    df = df.merge(industries, on='symbol', how='left')
    financials = ['Ngân hàng', 'Bảo hiểm', 'Dịch vụ tài chính']
    df = df[~df['icb_name2'].isin(financials)]
    
    # Ensure full history
    counts = df.groupby('symbol')['year'].count()
    survivors = counts[counts >= 11].index
    df_full = df[df['symbol'].isin(survivors)]
    
    # Scoring
    stats = df_full.groupby('symbol').agg({
        'roic': ['mean', 'std'],
        'invested_capital': 'last'
    })
    stats.columns = ['avg_roic', 'std_roic', 'last_cap']
    
    # Find ones with high ROIC and low std
    # Criterion: Avg ROIC > 15% and Low CV (Std/Mean)
    stats['cv'] = stats['std_roic'] / stats['avg_roic']
    
    top_5 = stats[stats['avg_roic'] > 0.15].sort_values('cv').head(5)
    
    print("\n💎 TOP 5 SIÊU CỔ PHIẾU (Alpha Screener):")
    print(top_5)
    
    # Plot top 5
    top_symbols = top_5.index.tolist()
    df_plot = df_full[df_full['symbol'].isin(top_symbols)]
    
    fig = px.line(
        df_plot, x='year', y='roic', color='symbol',
        title="Top 5 Siêu cổ phiếu: ROIC Cao & Ổn định (2015-2025)",
        markers=True, template="plotly_dark"
    )
    fig.update_layout(yaxis_tickformat='.1%')
    fig.write_image("alpha_screener_mckinsey.png", width=1000, height=600)
    fig.write_html("alpha_screener_mckinsey.html")
    
    return top_5.reset_index()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='McKinsey ROIC Quant Analysis')
    parser.add_argument('--symbol', type=str, default='VNM', help='Highlight symbol')
    args = parser.parse_args()

    # Pipeline
    raw_df = fetch_financial_data()
    clean_df = calculate_roic_mckinsey(raw_df)
    industries = fetch_industries()
    
    plot_roic_decay(clean_df, highlight_symbol=args.symbol.upper())
    plot_transition_matrix(clean_df)
    plot_roic_distribution(clean_df)
    plot_industry_comparison(clean_df)
    plot_specific_industry_vs_market(clean_df, "Xây dựng và Vật liệu")
    plot_top_30_roic(clean_df)
    plot_mckinsey_style_variation(clean_df)
    plot_industry_spread_evolution(clean_df)
    plot_roic_quintiles_evolution(clean_df)
    plot_bigcap_moat_analysis(clean_df)
    plot_big_cap_group_vs_market(clean_df)
    plot_industry_roic_heatmap(clean_df)
    plot_construction_industry_deep_dive(clean_df)
    alpha_screener(clean_df, industries)
    
    print("\n🚀 Analysis Complete. Charts generated using Plotly.")
