"""
Debug script to see what labels SBV returns
"""
import os
import sys
import pandas as pd
from datetime import date
from time import sleep
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def debug_sbv():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        driver.get("https://sbv.gov.vn/webcenter/portal/vi/menu/rm/ls/lsttlnh")
        sleep(3)
        
        # Latest data usually shown
        wait = WebDriverWait(driver, 10)
        table = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table[id*='t1']")))
        html = table.get_attribute('outerHTML')
        df = pd.read_html(html)[0]
        
        print("\n--- FULL DATAFRAME DUMP ---")
        print(df.to_string())
        print("---------------------------")
        
        cols = df.columns.tolist()
        print("\nColumns:", cols)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_sbv()
