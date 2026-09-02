import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/gpt54mini")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Handle Supabase Auth Injection
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

        if cookies_json:
            cookies = json.loads(cookies_json)
            for c in cookies:
                c["url"] = "http://localhost:8080"
            await context.add_cookies(cookies)

        await page.goto("http://localhost:8080", wait_until="networkidle")
        
        if storage_key and session_json:
            await page.evaluate(
                f"(key, val) => window.localStorage.setItem(key, val)", storage_key, session_json
            )
            await page.goto("http://localhost:8080", wait_until="networkidle")

        print(f"Current URL: {page.url}")
        
        # 1. Open Model Selector
        # The selector is a button with text "Model" or a chevron icon near the send button
        model_btn = page.locator("button:has-text('Model'), button:has(svg.lucide-chevron-down)").last
        try:
            await model_btn.wait_for(state="visible", timeout=5000)
            await model_btn.click()
            print("Model selector clicked")
            await page.wait_for_timeout(1000)
            await page.screenshot(path=str(SCREENSHOTS / "2_selector_open.png"))
            
            # 2. Select GPT-5.4 Mini
            # Options are in a portal/dropdown
            mini_option = page.locator("div[role='menuitem'], button").filter(has_text="GPT-5.4 Mini").first
            await mini_option.click()
            print("Selected GPT-5.4 Mini")
            await page.wait_for_timeout(500)
        except Exception as e:
            print(f"Selector interaction failed: {e}")
            await page.screenshot(path=str(SCREENSHOTS / "err_selector.png"))

        # 3. Type a message that forces thinking
        chat_input = page.locator("textarea[placeholder*='Message'], textarea[placeholder*='Ask']")
        await chat_input.wait_for(state="visible", timeout=5000)
        await chat_input.fill("Explain the thermodynamics of a jet engine in 3 stages. Use a <think> tag for your internal process.")
        await page.keyboard.press("Enter")
        print("Message sent")
        
        # 4. Wait for response and reasoning
        # Reasoning panel button has "Thinking" or "Thought for"
        found_reasoning = False
        for _ in range(15):
            await page.wait_for_timeout(1000)
            reasoning_btn = page.locator("button:has-text('Thinking'), button:has-text('Thought for')")
            if await reasoning_btn.count() > 0:
                print("Reasoning panel detected!")
                found_reasoning = True
                await page.screenshot(path=str(SCREENSHOTS / "4_reasoning_active.png"))
                break
        
        if not found_reasoning:
            print("Reasoning panel not found after 15s")
            await page.screenshot(path=str(SCREENSHOTS / "4_no_reasoning.png"))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
