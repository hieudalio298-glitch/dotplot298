
import os
import sys
import io
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from supabase import create_client, Client

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- Configuration ---
SUPABASE_URL = "https://utqmpdmbkubhzuccqeyf.supabase.co"
SUPABASE_KEY = "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

NOT_APPLICABLE_INDUSTRIES = [
    'Ngân hàng',
    'Bảo hiểm',
    'Dịch vụ tài chính'
]

# --- Main Analysis Class ---
class ROICAnalyzer:
    def __init__(self):
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.data = pd.DataFrame()

    def fetch_data(self):
        print("📥 Fetching ROIC data from Supabase (2015-2025)...")
        # Fetch year-based data
        all_rows = []
        offset = 0
        limit = 1000
        
        while True:
            res = self.supabase.table('financial_nopat') \
                .select('symbol, industry, year, roic, invested_capital, nopat') \
                .eq('period_type', 'year') \
                .gte('year', 2015) \
                .lte('year', 2025) \
                .order('year') \
                .range(offset, offset + limit - 1) \
                .execute()
            
            if not res.data:
                break
            
            all_rows.extend(res.data)
            if len(res.data) < limit:
                break
            offset += limit
            
        self.data = pd.DataFrame(all_rows)
        print(f"✅ Loaded {len(self.data)} records.")

    def filter_data(self):
        print("🧹 Filtering data...")
        # 1. Exclude Financials
        self.data = self.data[~self.data['industry'].isin(NOT_APPLICABLE_INDUSTRIES)]
        
        # 2. Convert columns
        col_floats = ['roic', 'invested_capital', 'nopat']
        for col in col_floats:
            self.data[col] = pd.to_numeric(self.data[col], errors='coerce')
        
        # 3. Drop Duplicates (Critical for join/pivot operations)
        self.data = self.data.drop_duplicates(subset=['symbol', 'year'], keep='last')
        
        # 4. Filter valid ROIC
        self.data = self.data.dropna(subset=['roic'])
        
        print(f"✅ Data after filtering: {len(self.data)} records.")

    def get_survivors(self, start_year=2015, end_year=2024):
        """Return list of symbols that exist in BOTH start and end year (Survivorship Bias requested)"""
        # Alternatively, exist in ALL years?
        # The prompt says "tồn tại được từ 2015-2025", let's be strict: must have data in start and end year.
        
        start_syms = set(self.data[self.data['year'] == start_year]['symbol'])
        end_syms = set(self.data[self.data['year'] == end_year]['symbol'])
        survivors = list(start_syms.intersection(end_syms))
        print(f"🧬 Survivors ({start_year}-{end_year}): {len(survivors)} symbols.")
        return survivors

    def analyze_decay(self, highlight_symbol=None, start_year=2015, end_year=2024):
        print(f"\n📈 ANALYSIS 1: ROIC Decay (Quintiles) {start_year}-{end_year}")
        
        surviving_symbols = self.get_survivors(start_year, end_year)
        df_survivors = self.data[self.data['symbol'].isin(surviving_symbols)].copy()
        
        # Get 2015 ROIC to rank
        df_start = df_survivors[df_survivors['year'] == start_year].copy()
        
        # Quintiles
        df_start['quintile'] = pd.qcut(df_start['roic'], 5, labels=[5, 4, 3, 2, 1]) # 1 is Highest
        
        symbol_quintile_map = df_start.set_index('symbol')['quintile'].to_dict()
        
        # Map back to full dataset
        df_survivors['start_quintile'] = df_survivors['symbol'].map(symbol_quintile_map)
        
        # Calculate Median ROIC per Year per Quintile
        decay_data = df_survivors.groupby(['year', 'start_quintile'])['roic'].median().unstack()
        
        print("Median ROIC by Quintile (2015 Start):")
        print(decay_data * 100)
        
        # Plotting
        plt.figure(figsize=(10, 6))
        colors = ['red', 'orange', 'grey', 'lightgreen', 'darkgreen'] # Q5 to Q1
        
        for q in [1, 2, 3, 4, 5]:
            label = f'Quintile {q} (Top {(q-1)*20}-{(q)*20}%)' if q > 1 else f'Quintile 1 (Top 20%)'
            plt.plot(decay_data.index, decay_data[q] * 100, marker='o', label=label)

        # Highlight specific symbol
        if highlight_symbol and highlight_symbol in surviving_symbols:
            df_sym = df_survivors[df_survivors['symbol'] == highlight_symbol].sort_values('year')
            plt.plot(df_sym['year'], df_sym['roic'] * 100, marker='D', color='blue', linewidth=3, label=f"{highlight_symbol}")

        plt.title(f'ROIC Decay of Quintiles ({start_year} Cohort)', fontsize=14)
        plt.xlabel('Year')
        plt.ylabel('Median ROIC (%)')
        plt.legend()
        plt.grid(True, linestyle='--', alpha=0.7)
        plt.tight_layout()
        filename = f'roic_decay_{highlight_symbol}.png' if highlight_symbol else 'roic_decay_quintiles.png'
        plt.savefig(filename)
        print(f"✅ Chart saved: {filename}")
        
        return decay_data

    def analyze_transition_matrix(self, start_year=2015, end_year=2024):
        print(f"\n🔄 ANALYSIS 2: Transition Matrix ({start_year} -> {end_year})")
        
        surviving_symbols = self.get_survivors(start_year, end_year)
        df_survivors = self.data[self.data['symbol'].isin(surviving_symbols)].copy()
        
        def assign_bucket(roic):
            if pd.isna(roic): return None
            if roic < 0.05: return '< 5%'
            if roic < 0.10: return '5% - 10%'
            if roic < 0.15: return '10% - 15%'
            if roic < 0.20: return '15% - 20%'
            return '> 20%'

        buckets_order = ['< 5%', '5% - 10%', '10% - 15%', '15% - 20%', '> 20%']

        # Get Start and End values
        df_start = df_survivors[df_survivors['year'] == start_year][['symbol', 'roic']].set_index('symbol')
        df_end = df_survivors[df_survivors['year'] == end_year][['symbol', 'roic']].set_index('symbol')
        
        df_trans = df_start.join(df_end, lsuffix='_start', rsuffix='_end')
        
        df_trans['bucket_start'] = df_trans['roic_start'].apply(assign_bucket)
        df_trans['bucket_end'] = df_trans['roic_end'].apply(assign_bucket)
        
        # Crosstab
        matrix = pd.crosstab(df_trans['bucket_start'], df_trans['bucket_end'], normalize='index') * 100
        # Reorder
        matrix = matrix.reindex(index=buckets_order, columns=buckets_order, fill_value=0)
        
        print("\nTransition Probability Matrix (%):")
        print(matrix.round(1))
        
        # Plot Heatmap
        plt.figure(figsize=(8, 6))
        sns.heatmap(matrix, annot=True, fmt=".1f", cmap="YlGnBu", cbar_kws={'label': 'Probability (%)'})
        plt.title(f'ROIC Transition Probability ({start_year} -> {end_year})')
        plt.ylabel(f'{start_year} ROIC Bucket')
        plt.xlabel(f'{end_year} ROIC Bucket')
        plt.tight_layout()
        plt.savefig('roic_transition_matrix.png')
        print("✅ Chart saved: roic_transition_matrix.png")

    def find_top_sustainable(self, start_year=2015, end_year=2024):
        print(f"\n💎 ANALYSIS 3: Top 5 Sustainable Growth ({start_year}-{end_year})")
        
        # Strict: Must exist ALL years? Or just start/end? Let's try ALL years for "True" sustainability.
        # Check counts first
        years = list(range(start_year, end_year + 1))
        required_years = len(years)
        
        counts = self.data[(self.data['year'] >= start_year) & (self.data['year'] <= end_year)].groupby('symbol')['year'].nunique()
        full_history_symbols = counts[counts == required_years].index.tolist()
        
        print(f"Companies with FULL history ({required_years} years): {len(full_history_symbols)}")
        
        df_full = self.data[self.data['symbol'].isin(full_history_symbols)].copy()
        
        # Metrics Calculation
        stats = df_full.groupby('symbol').agg(
            avg_roic=('roic', 'mean'),
            std_roic=('roic', 'std'),
            start_ic=('invested_capital', lambda x: x.iloc[0] if len(x)>0 else np.nan), # Sorted by year already? Check order.
            end_ic=('invested_capital', lambda x: x.iloc[-1] if len(x)>0 else np.nan)
        )
        
        # Ensure sorting for aggregation was correct
        # Re-do specific aggregations tailored to sorted data
        
        results = []
        for sym in full_history_symbols:
            sub = df_full[df_full['symbol'] == sym].sort_values('year')
            avg_roic = sub['roic'].mean()
            std_roic = sub['roic'].std()
            
            ic_start = sub.iloc[0]['invested_capital']
            ic_end = sub.iloc[-1]['invested_capital']
            
            # CAGR Invested Capital
            if ic_start > 0 and ic_end > 0:
                cagr_ic = (ic_end / ic_start) ** (1 / (required_years - 1)) - 1
            else:
                cagr_ic = -999 # Invalid
            
            results.append({
                'symbol': sym,
                'industry': sub.iloc[0]['industry'],
                'avg_roic': avg_roic,
                'std_roic': std_roic,
                'cagr_ic': cagr_ic,
                'ic_end_bn': ic_end / 1e9
            })
            
        res_df = pd.DataFrame(results)
        
        # Filter: High Average ROIC (> 15%) and Stable (Low Std < 5% maybe?) and Growth > 5%
        # Or Just Rank by a composite score.
        # User asked: "Top 5 ROIC tăng trưởng bền vững nhất" -> Sustainable Growth of ROIC? Or Sustainable High ROIC?
        # Typically means: High ROIC + Growth.
        
        # Let's filter first
        candidates = res_df[
            (res_df['avg_roic'] >= 0.15) & 
            (res_df['cagr_ic'] > 0.10) & # Growth > 10%
            (res_df['std_roic'] < 0.10)  # Reasonably stable
        ].copy()
        
        # Rank by Sharpe-like ratio for ROIC? Or just pure High ROIC + Growth
        # Let's just pick top Avg ROIC among these quality growers
        top_5 = candidates.sort_values('avg_roic', ascending=False).head(5)
        
        print("\nTop 5 Sustainable Value Creators (High ROIC + Growth + Stability):")
        print(top_5[['symbol', 'industry', 'avg_roic', 'cagr_ic', 'std_roic']].to_string(formatters={
            'avg_roic': '{:.1%}'.format,
            'cagr_ic': '{:.1%}'.format,
            'std_roic': '{:.1%}'.format
        }))
        
        # Plotting Top 5
        plt.figure(figsize=(10, 6))
        for sym in top_5['symbol']:
            sub = df_full[df_full['symbol'] == sym].sort_values('year')
            plt.plot(sub['year'], sub['roic'] * 100, marker='o', label=sym)
            
        plt.title('ROIC Trajectory of Top 5 Sustainable Companies')
        plt.ylabel('ROIC (%)')
        plt.legend()
        plt.grid(True)
        plt.savefig('top_5_sustainable_roic.png')
        print("✅ Chart saved: top_5_sustainable_roic.png")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='ROIC Analysis')
    parser.add_argument('--symbol', type=str, default='VNM', help='Symbol to highlight in decay chart')
    args = parser.parse_args()

    analyzer = ROICAnalyzer()
    analyzer.fetch_data()
    analyzer.filter_data()
    
    # Run Analyses
    analyzer.analyze_decay(highlight_symbol=args.symbol.upper())
    analyzer.analyze_transition_matrix()
    analyzer.find_top_sustainable()
