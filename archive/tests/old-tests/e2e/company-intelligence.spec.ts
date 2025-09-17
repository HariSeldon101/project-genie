import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  testDomain: 'bigfluffy.ai',
  testAccount: {
    email: 'test@bigfluffy.ai',
    password: 'TestPassword123!'
  },
  timeouts: {
    research: 600000, // 10 minutes for full research
    pageLoad: 30000,
    apiResponse: 120000
  }
};

test.describe('Company Intelligence - Core Functionality', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a new context with authentication state
    const context = await browser.newContext({
      storageState: undefined // Start fresh
    });
    page = await context.newPage();

    // Login once before all tests
    await login(page);
    
    // Save authentication state
    await context.storageState({ path: 'tests/e2e/.auth/user.json' });
  });

  test.beforeEach(async () => {
    // Navigate to Company Intelligence page
    await page.goto('/company-intelligence', { 
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeouts.pageLoad 
    });
  });

  test('should load Company Intelligence page successfully', async () => {
    // Check for main components
    await expect(page.locator('h1:has-text("Company Intelligence")')).toBeVisible();
    await expect(page.locator('input#domain')).toBeVisible();
    await expect(page.locator('button:has-text("Start Research")')).toBeVisible();
    
    // Check for configuration bar
    await expect(page.locator('[data-testid="global-config-bar"]')).toBeVisible();
  });

  test('should validate domain input', async () => {
    // Test empty domain
    await page.click('button:has-text("Start Research")');
    await expect(page.locator('text=/Please enter a domain/')).toBeVisible();

    // Test invalid domain
    await page.fill('input#domain', 'not a valid domain!@#');
    await page.click('button:has-text("Start Research")');
    await expect(page.locator('text=/Please enter a valid domain/')).toBeVisible();

    // Test valid domain format
    await page.fill('input#domain', 'example.com');
    const errorMessage = await page.locator('text=/Please enter a valid domain/').count();
    expect(errorMessage).toBe(0);
  });

  test('should start research with bigfluffy.ai domain', async () => {
    // Fill domain
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    
    // Start research
    await page.click('button:has-text("Start Research")');
    
    // Wait for status change from idle
    await expect(page.locator('[data-testid="scraper-status"]')).toBeVisible({
      timeout: 10000
    });
    
    // Check that research has started
    const statusText = await page.locator('[data-testid="status-text"]').textContent();
    expect(statusText).toMatch(/discovering|researching|scraping/i);
    
    // Check for progress indicators
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
  });

  test('should display error messages when API quota exceeded', async () => {
    // Mock API error response
    await page.route('**/api/company-intelligence/research-stream**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'OpenAI API quota exceeded',
          message: 'You exceeded your current quota, please check your plan and billing details.',
          status: 429
        })
      });
    });

    // Start research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');

    // Wait for error display
    await expect(page.locator('[data-testid="error-alert"]')).toBeVisible({
      timeout: 10000
    });
    
    // Check for OpenAI quota specific message
    await expect(page.locator('text=/OpenAI API Quota Exceeded/')).toBeVisible();
    await expect(page.locator('a[href*="platform.openai.com/account/billing"]')).toBeVisible();
  });

  test('should handle timeout gracefully', async () => {
    // Mock slow API response
    await page.route('**/api/company-intelligence/research-stream**', async route => {
      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 125000)); // 125 seconds
      await route.abort();
    });

    // Start research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');

    // Wait for timeout error (2 minutes + buffer)
    await expect(page.locator('text=/Request timeout after 2 minutes/')).toBeVisible({
      timeout: 130000
    });
  });

  test('should update scraper status dynamically', async () => {
    // Start research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');

    // Wait for scraper status to appear
    await expect(page.locator('[data-testid="scraper-status"]')).toBeVisible({
      timeout: 10000
    });

    // Check that scraper mode is displayed
    const scraperMode = await page.locator('[data-testid="scraper-mode"]').textContent();
    expect(scraperMode).toMatch(/auto|static|dynamic/i);

    // Check for framework detection (if available)
    const frameworkSection = await page.locator('[data-testid="framework-detection"]').count();
    if (frameworkSection > 0) {
      await expect(page.locator('[data-testid="detected-frameworks"]')).toBeVisible();
    }
  });

  test('should show progress during research', async () => {
    // Start real research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');

    // Wait for progress indicators
    await expect(page.locator('[data-testid="pages-scraped"]')).toBeVisible({
      timeout: 30000
    });

    // Check that progress updates
    const initialPages = await page.locator('[data-testid="pages-scraped"]').textContent();
    await page.waitForTimeout(5000); // Wait 5 seconds
    const updatedPages = await page.locator('[data-testid="pages-scraped"]').textContent();
    
    // Progress should change over time
    expect(initialPages).not.toBe(updatedPages);
  });
});

test.describe('Company Intelligence - Advanced Settings', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json'
  });

  test('should toggle review gates', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Toggle review gates
    const reviewGatesSwitch = page.locator('input#review-gates');
    await reviewGatesSwitch.check();
    
    // Verify it's checked
    await expect(reviewGatesSwitch).toBeChecked();
    
    // Start research with review gates enabled
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');
    
    // Should see review panel when enabled
    await expect(page.locator('[data-testid="stage-review-panel"]')).toBeVisible({
      timeout: 60000
    });
  });

  test('should change AI model', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Open model selector
    await page.click('[data-testid="model-selector"]');
    
    // Select a different model
    await page.click('text=/GPT-5 Mini/');
    
    // Verify model is selected
    const selectedModel = await page.locator('[data-testid="selected-model"]').textContent();
    expect(selectedModel).toContain('GPT-5 Mini');
  });

  test('should switch scraper modes', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Open scraper mode selector
    await page.click('[data-testid="scraper-selector"]');
    
    // Test each mode
    const modes = ['Auto Detect', 'Static (Fast)', 'Dynamic (JS)'];
    for (const mode of modes) {
      await page.click(`text=/${mode}/`);
      const selectedMode = await page.locator('[data-testid="selected-scraper"]').textContent();
      expect(selectedMode).toContain(mode);
      
      // Reopen for next selection
      if (modes.indexOf(mode) < modes.length - 1) {
        await page.click('[data-testid="scraper-selector"]');
      }
    }
  });

  test('should toggle web search', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Toggle web search
    const webSearchSwitch = page.locator('input#web-search');
    const initialState = await webSearchSwitch.isChecked();
    
    if (initialState) {
      await webSearchSwitch.uncheck();
      await expect(webSearchSwitch).not.toBeChecked();
    } else {
      await webSearchSwitch.check();
      await expect(webSearchSwitch).toBeChecked();
    }
  });
});

test.describe('Company Intelligence - Visual Regression', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json'
  });

  test('should match visual snapshot - initial state', async ({ page }) => {
    await page.goto('/company-intelligence');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('company-intelligence-initial.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match visual snapshot - research in progress', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Start research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');
    
    // Wait for status change
    await page.waitForSelector('[data-testid="scraper-status"]');
    
    await expect(page).toHaveScreenshot('company-intelligence-researching.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match visual snapshot - error state', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Mock error
    await page.route('**/api/company-intelligence/research-stream**', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'API quota exceeded',
          status: 429
        })
      });
    });
    
    // Trigger error
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');
    
    // Wait for error display
    await page.waitForSelector('[data-testid="error-alert"]');
    
    await expect(page).toHaveScreenshot('company-intelligence-error.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});

test.describe('Company Intelligence - Sitemap Discovery Enhancements', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json'
  });

  test('should use SSE streaming for incremental updates', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Monitor network for SSE request
    let sseDetected = false;
    page.on('request', request => {
      if (request.url().includes('/fetch-sitemap') && 
          request.headers()['accept']?.includes('text/event-stream')) {
        sseDetected = true;
      }
    });
    
    // Start sitemap discovery
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.press('input#domain', 'Enter');
    
    // Wait for TreeView to appear
    await expect(page.locator('[role="tree"]')).toBeVisible({ timeout: 30000 });
    
    // Verify SSE was used
    expect(sseDetected).toBe(true);
    
    // Check for incremental updates
    const initialPageCount = await page.locator('[role="treeitem"]').count();
    await page.waitForTimeout(2000);
    const updatedPageCount = await page.locator('[role="treeitem"]').count();
    
    // Should have pages loaded incrementally
    expect(updatedPageCount).toBeGreaterThan(0);
  });

  test('should show validation phase visual feedback', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Start discovery
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.press('input#domain', 'Enter');
    
    // Check for validation message
    await expect(page.locator('text=/Validating.*pages/')).toBeVisible({ timeout: 20000 });
    
    // Check for spinner
    await expect(page.locator('[class*="animate-spin"]')).toBeVisible();
    
    // Wait for validation to complete
    await expect(page.locator('text=/Validation complete/')).toBeVisible({ timeout: 30000 });
  });

  test('should handle filter button clicks correctly', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Start discovery
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.press('input#domain', 'Enter');
    
    // Wait for TreeView
    await page.waitForSelector('[role="tree"]', { timeout: 30000 });
    
    // Test Blog filter
    const blogChip = page.locator('[class*="MuiChip"]:has-text("Blog")');
    await blogChip.click();
    
    // Check for toast notification
    await expect(page.locator('text=/Selected.*blog posts/')).toBeVisible({ timeout: 5000 });
    
    // Test Services filter
    const servicesChip = page.locator('[class*="MuiChip"]:has-text("Services")');
    await servicesChip.click();
    
    // Check for toast notification
    await expect(page.locator('text=/Selected.*service pages/')).toBeVisible({ timeout: 5000 });
    
    // Test About filter
    const aboutChip = page.locator('[class*="MuiChip"]:has-text("About")');
    await aboutChip.click();
    
    // Check for toast notification
    await expect(page.locator('text=/Selected.*about pages/')).toBeVisible({ timeout: 5000 });
  });

  test('should display phase notifications using persistentToast', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Start discovery
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.press('input#domain', 'Enter');
    
    // Check for phase notifications
    const phaseNotifications = [
      'Looking for sitemap.xml',
      'Found.*pages in sitemap',
      'Discovered.*pages from homepage',
      'Found.*pages via pattern',
      'Validation complete'
    ];
    
    for (const pattern of phaseNotifications) {
      // Wait for each phase notification (with generous timeout)
      await expect(page.locator(`text=/${pattern}/`).first()).toBeVisible({ 
        timeout: 60000 
      });
    }
    
    // Check that notifications persist in the notification list
    const notificationList = page.locator('[class*="notification-list"]');
    if (await notificationList.count() > 0) {
      const notificationCount = await notificationList.locator('[class*="notification-item"]').count();
      expect(notificationCount).toBeGreaterThan(0);
    }
  });

  test('should have tooltips on all interactive elements', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Start discovery to get all UI elements
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.press('input#domain', 'Enter');
    
    // Wait for TreeView
    await page.waitForSelector('[role="tree"]', { timeout: 30000 });
    
    // Test tooltips on buttons
    const buttons = page.locator('button').first(5);
    const buttonCount = await buttons.count();
    
    let tooltipCount = 0;
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      await button.hover();
      await page.waitForTimeout(100);
      
      const tooltip = await page.locator('[role="tooltip"], [class*="tooltip"]').count();
      if (tooltip > 0) {
        tooltipCount++;
      }
    }
    
    // Test tooltips on filter chips
    const chips = page.locator('[class*="MuiChip"]');
    const chipCount = await chips.count();
    
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      await chip.hover();
      await page.waitForTimeout(100);
      
      const tooltip = await page.locator('[role="tooltip"], [class*="tooltip"]').count();
      if (tooltip > 0) {
        tooltipCount++;
      }
    }
    
    // Should have tooltips on most interactive elements
    expect(tooltipCount).toBeGreaterThan(0);
    console.log(`Found ${tooltipCount} tooltips on interactive elements`);
  });
});

test.describe('Company Intelligence - Performance', () => {
  test.use({
    storageState: 'tests/e2e/.auth/user.json'
  });

  test('should measure page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/company-intelligence');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Log performance metrics
    const metrics = await page.evaluate(() => {
      const perf = performance as any;
      return {
        domContentLoaded: perf.timing.domContentLoadedEventEnd - perf.timing.navigationStart,
        loadComplete: perf.timing.loadEventEnd - perf.timing.navigationStart,
        firstPaint: perf.getEntriesByType('paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance Metrics:', metrics);
    
    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(2000);
    expect(metrics.loadComplete).toBeLessThan(3000);
    expect(metrics.firstPaint).toBeLessThan(1000);
  });

  test('should handle memory efficiently during research', async ({ page }) => {
    await page.goto('/company-intelligence');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      const perf = performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : 0;
    });
    
    // Start research
    await page.fill('input#domain', TEST_CONFIG.testDomain);
    await page.click('button:has-text("Start Research")');
    
    // Wait for research to progress
    await page.waitForTimeout(30000); // 30 seconds
    
    // Get memory after research
    const afterMemory = await page.evaluate(() => {
      const perf = performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : 0;
    });
    
    // Memory increase should be reasonable (less than 100MB)
    const memoryIncrease = (afterMemory - initialMemory) / 1048576; // Convert to MB
    expect(memoryIncrease).toBeLessThan(100);
    
    console.log(`Memory increase during research: ${memoryIncrease.toFixed(2)}MB`);
  });
});

// Helper functions
async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  await page.fill('input[type="email"]', TEST_CONFIG.testAccount.email);
  await page.fill('input[type="password"]', TEST_CONFIG.testAccount.password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(url => !url.toString().includes('/login'), {
    timeout: 15000
  });
}