import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Monitor network requests
        requests = []
        page.on("request", lambda request: requests.append({
            "url": request.url,
            "method": request.method,
            "post_data": request.post_data
        }) if "/api/ai-stream" in request.url else None)

        # 1. Establish origin
        await page.goto("http://localhost:8080")
        
        # Helper to send a message
        async def send_message(text):
            # Wait for textarea to be enabled (not maintenance mode)
            textarea = page.locator("textarea")
            await textarea.wait_for(state="visible", timeout=10000)
            
            # If maintenance mode is active, the placeholder will say so.
            # We'll try to force fill if it's not disabled.
            placeholder = await textarea.get_attribute("placeholder")
            print(f"Current placeholder: {placeholder}")
            
            await textarea.fill(text)
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(3000)

        # Test 1: Nemotron-3 Nano
        print("\n--- Test 1: Nemotron-3 Nano ---")
        await page.evaluate("""
            const key = "arch:intelligence";
            const current = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({...current, preferred_model: 'nemotron_3_nano'}));
            window.dispatchEvent(new CustomEvent("arch:intelligence", { detail: {...current, preferred_model: 'nemotron_3_nano'} }));
        """)
        await send_message("Test Nemotron")

        # Test 2: GLM-5.2
        print("\n--- Test 2: GLM-5.2 ---")
        await page.evaluate("""
            const key = "arch:intelligence";
            const current = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({...current, preferred_model: 'glm_52'}));
            window.dispatchEvent(new CustomEvent("arch:intelligence", { detail: {...current, preferred_model: 'glm_52'} }));
        """)
        await send_message("Test GLM")

        # Output captured requests
        print("\n--- RESULTS ---")
        for i, req in enumerate(requests):
            print(f"Request {i+1} payload:")
            if req['post_data']:
                try:
                    data = json.loads(req['post_data'])
                    print(json.dumps({
                        "preferredModelOverride": data.get("preferredModelOverride"),
                        "chain": data.get("chain")
                    }, indent=2))
                except:
                    print("Error parsing JSON")
            else:
                print("No post data")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
