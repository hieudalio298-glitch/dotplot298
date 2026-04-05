import asyncio
import json
from playwright.async_api import async_playwright

async def get_market_flow():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # We can intercept requests to grab the JSON directly
        # or we can evaluate JS on the page
        page = await browser.new_page()
        
        # We will capture responses from the API
        foreign_data = []
        prop_data = []
        
        async def handle_response(response):
            try:
                if 'foreign-trading-value' in response.url and 'Total' in response.url:
                    data = await response.json()
                    foreign_data.append(data)
                elif 'proprietary-trading-value' in response.url and 'Total' in response.url:
                    data = await response.json()
                    prop_data.append(data)
            except Exception:
                pass

        page.on("response", handle_response)
        
        print("Navigating to FireAnt...")
        await page.goto("https://fireant.vn/dashboard/market/trading-statistics", wait_until="networkidle")
        
        # Wait a bit for the XHRs to complete
        await page.wait_for_timeout(3000)
        
        # Click the "Tự doanh" tab to trigger that request
        try:
             # Look for the 'Tự doanh' button
             await page.get_by_text("Tự doanh", exact=True).click(timeout=3000)
             await page.wait_for_timeout(2000)
        except Exception as e:
             print("Could not click Tự doanh:", e)

        print("\n--- Khối Ngoại ---")
        if foreign_data:
            print(json.dumps(foreign_data[0][0], indent=2))
        else:
            print("No foreign data intercepted")
            
        print("\n--- Tự Doanh ---")
        if prop_data:
            print(json.dumps(prop_data[0][0], indent=2))
        else:
            print("No prop data intercepted")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(get_market_flow())
