const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class WebService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.pythonProcess = null;
    this.screenshots = path.join(process.cwd(), 'screenshots');
    // Ensure screenshots directory exists
    fs.ensureDirSync(this.screenshots);
  }

  /**
   * Start or connect to a browser instance
   */
  async startBrowser() {
    try {
      if (this.browser) {
        return { success: true, message: 'Browser already running' };
      }

      this.browser = await chromium.launch({ 
        headless: false,
        slowMo: 50 // Slow down operations for visibility
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1280, height: 800 });
      
      console.log('Browser started successfully');
      return { success: true };
    } catch (error) {
      console.error('Error starting browser:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Navigate to a URL
   */
  async navigateToUrl(url) {
    try {
      if (!this.browser || !this.page) {
        await this.startBrowser();
      }
      
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      const title = await this.page.title();
      const screenshotPath = path.join(this.screenshots, `nav_${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath });
      
      console.log(`Navigated to ${url}, page title: ${title}`);
      return { 
        success: true, 
        title, 
        url: this.page.url(),
        screenshot: screenshotPath
      };
    } catch (error) {
      console.error('Error navigating to URL:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhancement for webNavigationService.js
async navigateToWebsite(url) {
  // Launch browser
  await guiAutomationService.executeCommand(`start chrome ${url}`);
  
  // Wait for page to load
  let loaded = false;
  let attempts = 0;
  
  while (!loaded && attempts < 5) {
    await this.sleep(2000);
    const screenshot = await visionService.captureActiveWindow();
    const analysis = await visionService.analyzeScreenWithAI(`Checking if ${url} is loaded`);
    
    loaded = analysis.pageLoaded;
    attempts++;
  }
  
  return { success: loaded };
}

  /**
   * Interact with a page element
   */
  // Update the interactWithElement method in src/services/webService.js:

async interactWithElement(selector, action, value = '') {
    try {
      if (!this.browser || !this.page) {
        return { success: false, error: 'Browser not started' };
      }
      
      // Take screenshot before action to debug
      const beforeScreenshotPath = path.join(this.screenshots, `before_action_${Date.now()}.png`);
      await this.page.screenshot({ path: beforeScreenshotPath });
      
      console.log(`Looking for element: ${selector}`);
      
      // Try different wait strategies with longer timeout
      try {
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
      } catch (waitError) {
        console.log(`Element not found with standard wait. Checking page content...`);
        
        // Check for Google consent page and handle it
        if (await this.page.content().then(html => html.includes('consent.google.com'))) {
          console.log('Detected Google consent page, attempting to accept...');
          try {
            // Try various consent buttons (these selectors may need updating)
            const consentButtons = [
              'button[id="L2AGLb"]', // "I agree" button
              'button[aria-label="Accept all"]',
              'button:has-text("Accept all")',
              'button:has-text("I agree")'
            ];
            
            for (const buttonSelector of consentButtons) {
              const buttonVisible = await this.page.isVisible(buttonSelector).catch(() => false);
              if (buttonVisible) {
                await this.page.click(buttonSelector);
                console.log(`Clicked consent button: ${buttonSelector}`);
                // Wait for navigation after consent
                await this.page.waitForLoadState('domcontentloaded');
                break;
              }
            }
            
            // Try again to find the original selector
            await this.page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
          } catch (consentError) {
            console.log('Failed to handle consent page:', consentError.message);
          }
        }
        
        // For Google search specifically
        if (selector === 'input[name="q"]' && await this.page.title().then(title => title.includes('Google'))) {
          console.log('Trying alternative Google search selectors...');
          // Try alternative selectors for Google search
          const alternatives = [
            'input[title="Search"]',
            'input[type="text"]',
            'textarea[name="q"]', // Google sometimes uses a textarea instead of input
            'textarea[title="Search"]',
            '.gLFyf', // Google's search class
            '[aria-label="Search"]'
          ];
          
          for (const alt of alternatives) {
            console.log(`Trying alternative selector: ${alt}`);
            if (await this.page.isVisible(alt).catch(() => false)) {
              console.log(`Found alternative selector: ${alt}`);
              selector = alt; // Use this selector instead
              break;
            }
          }
        }
      }
      
      // Log page title and URL for debugging
      console.log(`Current page: "${await this.page.title()}" at ${this.page.url()}`);
      
      let result;
      switch (action) {
        case 'click':
          await this.page.click(selector);
          result = { success: true, action: 'click', selector };
          break;
        
        case 'type':
          await this.page.fill(selector, value);
          result = { success: true, action: 'type', selector, value };
          break;
        
        case 'select':
          await this.page.selectOption(selector, value);
          result = { success: true, action: 'select', selector, value };
          break;
          
        case 'check':
          await this.page.check(selector);
          result = { success: true, action: 'check', selector };
          break;
          
        case 'uncheck':
          await this.page.uncheck(selector);
          result = { success: true, action: 'uncheck', selector };
          break;
          
        case 'getText':
          const text = await this.page.textContent(selector);
          result = { success: true, action: 'getText', selector, text };
          break;
          
        default:
          return { success: false, error: `Unsupported action: ${action}` };
      }
      
      // Take screenshot after action
      const screenshotPath = path.join(this.screenshots, `action_${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;
      
      return result;
    } catch (error) {
      console.error(`Error interacting with element ${selector}:`, error);
      
      // Take error screenshot
      try {
        const errorScreenshotPath = path.join(this.screenshots, `error_${Date.now()}.png`);
        await this.page.screenshot({ path: errorScreenshotPath });
        console.log(`Error screenshot saved to: ${errorScreenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract data from the page
   */
  async extractData(selector) {
    try {
      if (!this.browser || !this.page) {
        return { success: false, error: 'Browser not started' };
      }
      
      let data;
      if (selector) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        data = await this.page.textContent(selector);
      } else {
        // Extract page title and URL if no selector provided
        data = {
          title: await this.page.title(),
          url: this.page.url(),
          content: await this.page.content()
        };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error extracting data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Take a screenshot of the current page
   */
  async takeScreenshot(filename = `screenshot_${Date.now()}.png`) {
    try {
      if (!this.browser || !this.page) {
        return { success: false, error: 'Browser not started' };
      }
      
      const screenshotPath = path.join(this.screenshots, filename);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      
      return { success: true, path: screenshotPath };
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close the browser
   */
  async closeBrowser() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        return { success: true, message: 'Browser closed' };
      }
      return { success: false, message: 'No browser instance to close' };
    } catch (error) {
      console.error('Error closing browser:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WebService();