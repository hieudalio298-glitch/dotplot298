import asyncio
import sys
import json
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def fetch_from_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        )
        page = await context.new_page()
        print("Navigating to FireAnt...")
        await page.goto("https://fireant.vn/", wait_until="networkidle")
        
        # Evaluate JS to make the requests in the context of the page
        js_code = """
        async () => {
            try {
                let res_foreign = await fetch('https://restv2.fireant.vn/symbols/foreign-trading-value?exchange=HSX&type=Total&topType=BuySell&count=100');
                if (!res_foreign.ok) throw new Error("Foreign API returned " + res_foreign.status);
                let data_foreign = await res_foreign.json();
                
                let res_prop = await fetch('https://restv2.fireant.vn/symbols/proprietary-trading-value?exchange=HSX&type=Total&topType=BuySell&count=100');
                if (!res_prop.ok) throw new Error("Prop API returned " + res_prop.status);
                let data_prop = await res_prop.json();
                
                return { foreign: data_foreign, prop: data_prop };
            } catch (err) {
                return { error: err.toString() };
            }
        }
        """
        
        print("Evaluating fetch in page context...")
        result = await page.evaluate(js_code)
        
        if 'error' in result:
             print("Error from browser JS:", result['error'])
        else:
            def find_date(arr, d):
                if not isinstance(arr, list):
                    return arr # could be object
                for item in arr:
                    if item and isinstance(item, dict) and item.get('date', '').startswith(d):
                        return item
                if len(arr) > 0:
                     return f"Not found, top item date: {arr[0].get('date', 'Unknown')}"
                return None
                
            print("\n--- 2026-03-20 Data ---")
            foreign_20 = find_date(result.get('foreign', []), '2026-03-20')
            print("Foreign:")
            print(json.dumps(foreign_20, indent=2))
            
            prop_20 = find_date(result.get('prop', []), '2026-03-20')
            print("\nProp:")
            print(json.dumps(prop_20, indent=2))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(fetch_from_page())
