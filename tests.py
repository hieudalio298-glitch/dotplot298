# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

# Setup Chrome options
options = Options()
# options.add_argument('--headless')  # Run with browser visible for debugging
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')

# Initialize driver
print("Initializing Chrome driver...")
driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)

try:
    url = "https://www.sbv.gov.vn/vi/lãi-suất-thị-trường-liên-ngân-hàng"
    print("Navigating to SBV page...")
    driver.get(url)
    
    # Wait for page to load
    print("Waiting for page to load...")
    time.sleep(5)
    
    # Save page HTML
    html = driver.page_source
    with open("sbv_page.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("[OK] Saved page HTML to sbv_page.html")
    
    # Take screenshot
    driver.save_screenshot("sbv_page.png")
    print("[OK] Saved screenshot to sbv_page.png")
    
    # Try to find date inputs by different methods
    print("\n[SEARCH] Looking for date input elements...")
    
    # Method 1: By name
    try:
        inputs = driver.find_elements("name", "_ir_WAR_irportlet_fromDate")
        print(f"  - Found {len(inputs)} elements with name='_ir_WAR_irportlet_fromDate'")
    except Exception as e:
        print(f"  - No elements with name='_ir_WAR_irportlet_fromDate'")
    
    # Method 2: By input type=date
    try:
        date_inputs = driver.find_elements("css selector", "input[type='date']")
        print(f"  - Found {len(date_inputs)} input[type='date'] elements")
        for i, inp in enumerate(date_inputs):
            print(f"    [{i}] id='{inp.get_attribute('id')}', name='{inp.get_attribute('name')}', class='{inp.get_attribute('class')}'")
    except Exception as e:
        print(f"  - Error finding date inputs")
    
    # Method 3: All input elements
    try:
        all_inputs = driver.find_elements("tag name", "input")
        print(f"  - Found {len(all_inputs)} total input elements")
        date_related = [inp for inp in all_inputs if 'date' in inp.get_attribute('type').lower() or 'date' in (inp.get_attribute('name') or '').lower()]
        print(f"  - Found {len(date_related)} date-related inputs:")
        for i, inp in enumerate(date_related):
            print(f"    [{i}] type='{inp.get_attribute('type')}', id='{inp.get_attribute('id')}', name='{inp.get_attribute('name')}'")
    except Exception as e:
        print(f"  - Error finding inputs")
    
    # Method 4: Find submit button
    try:
        submit_btns = driver.find_elements("css selector", "input[type='submit'], button[type='submit']")
        print(f"  - Found {len(submit_btns)} submit buttons")
        for i, btn in enumerate(submit_btns):
            print(f"    [{i}] text='{btn.text}', value='{btn.get_attribute('value')}', class='{btn.get_attribute('class')}'")
    except Exception as e:
        print(f"  - Error finding submit buttons")
    
    print("\n[OK] Inspection complete! Check sbv_page.html and sbv_page.png for details.")
    
finally:
    driver.quit()
    print("[OK] Browser closed")