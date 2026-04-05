import asyncio
import sys
from playwright.async_api import async_playwright
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

async def scrape_fireant_dom():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Using a mobile user-agent sometimes bypasses complex ad/auth popups, but desktop is fine.
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print("Navigating to FireAnt Trading Statistics...")
        await page.goto("https://fireant.vn/dashboard/market/trading-statistics", wait_until="networkidle")
        await page.wait_for_timeout(3000) # Ensure React renders
        
        try:
            # We want to extract text from the page
            # Look for Nước ngoài (Foreign)
            await page.evaluate("""() => {
                 let buttons = Array.from(document.querySelectorAll('button, div, span'));
                 let btn = buttons.find(b => b.textContent && b.textContent.includes('Nước ngoài'));
                 if (btn) btn.click();
            }""")
            await page.wait_for_timeout(2000)
            
            # Extract all text to find the foreign values
            page_text_foreign = await page.evaluate("document.body.innerText")
            lines_f = [line.strip() for line in page_text_foreign.split('\\n') if line.strip()]
            print("\\n--- Dữ liệu Khối ngoại (Text Extracted) ---")
            for i, line in enumerate(lines_f):
                if 'Giá trị bán' in line or 'Giá trị mua' in line or '8.0' in line or '9.0' in line or '1,906' in line:
                    start = max(0, i-2)
                    end = min(len(lines_f), i+3)
                    print(f"[{i}]:", " / ".join(lines_f[start:end]))
                    
            # Look for Tự doanh (Proprietary)
            await page.evaluate("""() => {
                 let buttons = Array.from(document.querySelectorAll('button, div, span'));
                 let btn = buttons.find(b => b.textContent && b.textContent.includes('Tự doanh'));
                 if (btn) btn.click();
            }""")
            await page.wait_for_timeout(2000)
            
            page_text_prop = await page.evaluate("document.body.innerText")
            lines_p = [line.strip() for line in page_text_prop.split('\\n') if line.strip()]
            print("\\n--- Dữ liệu Tự doanh (Text Extracted) ---")
            for i, line in enumerate(lines_p):
                if 'Khớp lệnh' in line or 'Thỏa thuận' in line or '755' in line:
                    start = max(0, i-2)
                    end = min(len(lines_p), i+3)
                    print(f"[{i}]:", " / ".join(lines_p[start:end]))

        except Exception as e:
            print("Error scraping DOM:", e)
            
        await browser.close()
        
if __name__ == "__main__":
    asyncio.run(scrape_fireant_dom())
