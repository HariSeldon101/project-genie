import { chromium } from 'playwright'

async function testScrapingUI() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  // Go to login page
  await page.goto('http://localhost:3000/auth')
  
  // Login
  await page.fill('input[name="email"]', 'test@bigfluffy.ai')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  
  // Wait for navigation
  await page.waitForTimeout(2000)
  
  // Go to company intelligence
  await page.goto('http://localhost:3000/company-intelligence')
  
  // Enter domain
  await page.fill('input[placeholder*="domain"]', 'bigfluffy.ai')
  await page.press('input[placeholder*="domain"]', 'Enter')
  
  // Wait for analysis
  await page.waitForTimeout(5000)
  
  // Check for scraping UI
  const scrapingUI = await page.$('text=/Available Scrapers/')
  if (scrapingUI) {
    console.log('✅ Additive scraping UI found!')
  } else {
    console.log('❌ Additive scraping UI not found')
  }
  
  // Take screenshot
  await page.screenshot({ path: 'test-scraping-ui.png', fullPage: true })
  
  await browser.close()
}

testScrapingUI().catch(console.error)
