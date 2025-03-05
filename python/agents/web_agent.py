import sys
import os
import asyncio
from playwright.async_api import async_playwright

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.deepseek_client import deepseek_client

class WebAgent:
    def __init__(self):
        self.browser = None
        self.page = None

    async def start_browser(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=False)
        self.page = await self.browser.new_page()
        print("Browser started")
        return True

    # ... other browser methods ...

    async def analyze_webpage(self):
        """Analyze the current webpage using DeepSeek"""
        if not self.page:
            await self.start_browser()
        
        html = await self.page.content()
        prompt = f"Analyze this webpage and describe its main content and interactive elements:\n\n{html[:10000]}"
        
        analysis = deepseek_client.generate_completion(prompt)
        return analysis

    # ... rest of agent methods ...