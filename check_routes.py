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

        # Handle Supabase auth if needed, but first let's just check the routes as guest
        # or see if they redirect.
        
        routes_to_check = [
            "http://localhost:8080/workspaces/code-review",
            "http://localhost:8080/workspaces/code-review/blueprint",
            "http://localhost:8080/workspaces/code-review/tasks",
            "http://localhost:8080/workspaces/code-review/files",
            "http://localhost:8080/workspaces/code-review/activity",
            "http://localhost:8080/integrations"
        ]

        for route in routes_to_check:
            print(f"Checking {route}...")
            try:
                response = await page.goto(route, wait_until="domcontentloaded", timeout=10000)
                status = response.status if response else "No Response"
                print(f"  Status: {status}")
                
                # Check for "Not Found" or specific error text
                content = await page.content()
                if "Not Found" in content or "404" in content:
                    print(f"  [!] Potential 404 detected on {route}")
                
                # Check console logs
                # (Logs are automatically captured by the environment but we can also print them here)
            except Exception as e:
                print(f"  [!] Error checking {route}: {str(e)}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
