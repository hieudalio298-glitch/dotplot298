import re

file_path = "vnindex_bubble_chart.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Search for the title text
match = re.search(r'"text":"<b>Bubble Chart VNIndex.*?\((\d{4}-\d{2}-\d{2})\)</b>"', content)
if match:
    print(f"Found Title Date: {match.group(1)}")
else:
    # Try searching for a simpler pattern if the above fails
    match = re.search(r'Bubble Chart VNIndex .*?\((.*?)\)', content)
    if match:
        print(f"Found Potential Title Date: {match.group(1)}")
    else:
        print("Title date NOT found in HTML.")
