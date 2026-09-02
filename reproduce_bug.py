import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/reproduce_model_bug/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        
        # Inject session if available
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        if storage_key and session_json:
            await page.goto("http://localhost:8080")
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )

        page = await context.new_page()
        
        # Monitor network requests
        requests = []
        page.on("request", lambda request: requests.append({
            "url": request.url,
            "method": request.method,
            "post_data": request.post_data
        }) if "/api/ai-stream" in request.url else None)

        await page.goto("http://localhost:8080", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_initial.png"))

        # 1. Select Nemotron-3 Nano
        # Find the model selector trigger (contains ChevronDown and model name)
        selector = page.locator("button:has(span:text('Nemotron-3 Nano')), button:has(span:text('Auto Selection'))")
        await selector.click()
        await page.screenshot(path=str(SCREENSHOTS / "2_selector_open.png"))
        
        # Select Nemotron-3 Nano from dropdown
        await page.get_by_role("menuitem", name="Nemotron-3 Nano").click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(SCREENSHOTS / "3_nemotron_selected.png"))

        # Send first message
        await page.get_by_placeholder("Ask Crux anything...").fill("Hello Nemotron")
        await page.keyboard.press("Enter")
        
        # Wait for request
        await page.wait_for_timeout(2000)
        
        # 2. Change to GLM-5.2
        await selector.click()
        await page.get_by_role("menuitem", name="GLM-5.2").click()
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(SCREENSHOTS / "4_glm_selected.png"))

        # Send second message
        await page.get_by_placeholder("Ask Crux anything...").fill("Hello GLM")
        await page.keyboard.press("Enter")
        
        # Wait for request
        await page.wait_for_timeout(2000)

        # Output captured requests
        print(json.dumps(requests, indent=2))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
