import pandas as pd

df = pd.read_csv('oil_roe_quarterly.csv')
df.set_index('Quarter', inplace=True)
df = df * 100
df = df.round(2).astype(str) + '%'
df = df.replace('nan%', '-')

md = "| Quý | " + " | ".join(df.columns) + " |\n"
md += "|---|" + "|".join(["---:"] * len(df.columns)) + "|\n"

for idx, row in df.iterrows():
    md += f"| **{idx}** | " + " | ".join(row) + " |\n"

with open(r'c:\Users\Lenovo\.gemini\antigravity\brain\d6eef25b-7529-4f5c-a952-140f5f433d80\roe_table.md', 'w', encoding='utf-8') as f:
    f.write(md)
print("SUCCESS")
