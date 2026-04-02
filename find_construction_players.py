
import os
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or "sb_publishable_udSp3L071S-ShERkLoCcjw_HO4JD4is"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_construction_top_players():
    # Fetch all data for this industry
    res = supabase.table('financial_nopat').select('symbol, year, roic, invested_capital').eq('industry', 'Xây dựng và Vật liệu').execute()
    df = pd.DataFrame(res.data)
    
    # Filter for years 2015-2025
    df = df[df['year'].between(2015, 2025)]
    
    # Find companies with full data and highest average ROIC or Market Cap
    stats = df.groupby('symbol').agg({
        'roic': 'mean',
        'invested_capital': 'last',
        'year': 'count'
    })
    
    # Only survivors
    top_players = stats[stats['year'] >= 10].sort_values('invested_capital', ascending=False).head(15)
    print("\n--- Top Players in Construction by Capital ---")
    print(top_players)
    
    top_roic = stats[stats['year'] >= 10].sort_values('roic', ascending=False).head(15)
    print("\n--- Top Players in Construction by Avg ROIC ---")
    print(top_roic)

if __name__ == "__main__":
    get_construction_top_players()
