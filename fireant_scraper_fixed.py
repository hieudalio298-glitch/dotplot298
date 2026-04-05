import asyncio
import json
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def get_market_flow():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        foreign_data = []
        prop_data = []
        
        async def handle_response(response):
            try:
                # We specifically look for the endpoints we saw the browser subagent hitting
                if 'foreign-trading-value' in response.url:
                    data = await response.json()
                    foreign_data.append(data)
                elif 'proprietary-trading-value' in response.url:
                    data = await response.json()
                    prop_data.append(data)
            except Exception:
                pass

        page.on("response", handle_response)
        
        print("Navigating to FireAnt...")
        await page.goto("https://fireant.vn/dashboard/market/trading-statistics", wait_until="networkidle")
        
        # Wait a bit for the XHRs to complete
        await page.wait_for_timeout(3000)
        
        # We can also just run evaluate to grab the tokens from localStorage if we wanted, but interception is easier
        
        # Try to dismiss ads
        try:
             await page.evaluate("""() => { 
                let ads = document.querySelectorAll('.bp5-portal'); 
                ads.forEach(ad => ad.remove()); 
             }""")
        except:
             pass

        print("Clicking buttons to trigger XHRs...")
        try:
             # Look for the 'Tự doanh' button (we use JS to click safely)
             await page.evaluate("""() => {
                 let buttons = Array.from(document.querySelectorAll('button, div'));
                 let btn = buttons.find(b => b.textContent && b.textContent.includes('Tự doanh'));
                 if (btn) btn.click();
             }""")
             await page.wait_for_timeout(2000)
             
             # Also click Nước ngoài
             await page.evaluate("""() => {
                 let buttons = Array.from(document.querySelectorAll('button, div'));
                 let btn = buttons.find(b => b.textContent && b.textContent.includes('Nước ngoài'));
                 if (btn) btn.click();
             }""")
             await page.wait_for_timeout(2000)
        except Exception as e:
             print("Could not click buttons:", e)

        print("\n--- Khối Ngoại ---")
        if foreign_data:
            print(json.dumps(foreign_data[0][:3], indent=2))
        else:
            print("No foreign data intercepted")
            
        print("\n--- Tự Doanh ---")
        if prop_data:
            print(json.dumps(prop_data[0][:3], indent=2))
        else:
            print("No prop data intercepted")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(get_market_flow())
