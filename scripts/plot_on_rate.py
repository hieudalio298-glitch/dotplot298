import matplotlib.pyplot as plt
from supabase import create_client
import os
from dotenv import load_dotenv
import pandas as pd

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv('VITE_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
supabase = create_client(supabase_url, supabase_key)

# Fetch data
print("Fetching interbank ON rates data...")
response = supabase.table("interbank_rates").select("date, on_rate").order("date").execute()

if not response.data:
    print("No data found!")
    exit()

# Convert to DataFrame
df = pd.DataFrame(response.data)
df['date'] = pd.to_datetime(df['date'])
df = df.dropna(subset=['on_rate'])  # Remove null values
df = df.sort_values('date')

print(f"Retrieved {len(df)} records from {df['date'].min()} to {df['date'].max()}")
print(f"ON Rate range: {df['on_rate'].min():.2f}% - {df['on_rate'].max():.2f}%")

# Create the plot
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(14, 6))

# Plot the data
ax.plot(df['date'], df['on_rate'], 
        color='#00e676', 
        linewidth=2, 
        marker='o', 
        markersize=3,
        label='ON Rate')

# Customize the plot
ax.set_title('Diễn biến Lãi suất Overnight (ON) - Thị trường Liên Ngân hàng', 
             fontsize=16, 
             fontweight='bold',
             pad=20)
ax.set_xlabel('Ngày', fontsize=12, fontweight='bold')
ax.set_ylabel('Lãi suất (%)', fontsize=12, fontweight='bold')
ax.grid(True, alpha=0.3, linestyle='--')
ax.legend(loc='upper right', fontsize=10)

# Format y-axis to show percentage
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f'{y:.2f}%'))

# Rotate x-axis labels for better readability
plt.xticks(rotation=45, ha='right')

# Add some statistics as text
stats_text = f'''
Số liệu thống kê:
- Thời gian: {df['date'].min().strftime('%d/%m/%Y')} - {df['date'].max().strftime('%d/%m/%Y')}
- Số ngày: {len(df)} ngày
- Trung bình: {df['on_rate'].mean():.2f}%
- Cao nhất: {df['on_rate'].max():.2f}%
- Thấp nhất: {df['on_rate'].min():.2f}%
'''

ax.text(0.02, 0.98, stats_text,
        transform=ax.transAxes,
        fontsize=9,
        verticalalignment='top',
        bbox=dict(boxstyle='round', facecolor='#1a1a1a', alpha=0.8, edgecolor='#00e676'))

# Tight layout
plt.tight_layout()

# Save the figure
output_file = 'on_rate_chart.png'
plt.savefig(output_file, dpi=150, bbox_inches='tight', facecolor='#1a1a1a')
print(f"\n[OK] Chart saved to: {output_file}")

# Show the plot
plt.show()
