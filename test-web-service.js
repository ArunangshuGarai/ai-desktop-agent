// Update test-web-service.js

const webService = require('./src/services/webService');

async function testWebService() {
  try {
    console.log('Starting browser...');
    await webService.startBrowser();
    
    console.log('Navigating to Google...');
    const navResult = await webService.navigateToUrl('google.com');
    console.log('Navigation result:', navResult);
    
    // Add a small delay to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Searching for "AI Desktop Agent"...');
    // First try to interact with the search box
    const typeResult = await webService.interactWithElement('input[name="q"]', 'type', 'AI Desktop Agent');
    console.log('Type result:', typeResult.success ? 'Success' : 'Failed');
    
    // If the typing succeeded, press Enter
    if (typeResult.success) {
      await webService.page.keyboard.press('Enter');
    } else {
      console.log('Trying alternative approach for search...');
      // Try to find any input field that looks like a search box
      await webService.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
        const searchInput = inputs.find(i => 
          i.placeholder?.toLowerCase().includes('search') || 
          i.title?.toLowerCase().includes('search') ||
          i.name === 'q'
        );
        if (searchInput) {
          searchInput.value = 'AI Desktop Agent';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      
      // Press Enter to search
      await webService.page.keyboard.press('Enter');
    }
    
    // Wait for search results to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Taking screenshot of results...');
    const screenshot = await webService.takeScreenshot('search_results.png');
    console.log('Screenshot saved to:', screenshot.path);
    
    console.log('Closing browser...');
    await webService.closeBrowser();
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    
    // Try to close browser even if test fails
    try {
      if (webService.browser) {
        await webService.closeBrowser();
      }
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
  }
}

// Execute the test
testWebService();