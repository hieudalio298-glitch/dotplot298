import pandas as pd
import json

df = pd.read_csv('panel_roic_long_2015_2024.csv')
industries = df['industry'].unique().tolist()
oil_industries = [ind for ind in industries if isinstance(ind, str) and 'dầu khí' in ind.lower()]

results = {}
for ind in oil_industries:
    stocks = df[df['industry'] == ind]['symbol'].unique().tolist()
    results[ind] = stocks

with open('oil_stocks.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
