import { chromium, Browser, Page } from 'playwright'
import { permanentLogger } from './lib/utils/permanent-logger'
import * as fs from 'fs'
import * as path from 'path'

// Create screenshots directory
const SCREENSHOTS_DIR = `test-results-ui-improvements-${Date.now()}`
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function captureUIImprovements() {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log('🚀 Starting UI Improvements Screenshot Capture')
    console.log('===============================================')
    
    // Launch browser
    browser = await chromium.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Login using Google OAuth
    console.log('📝 Logging in...')
    await page.goto('http://localhost:3000')
    
    // Click login button
    const loginButton = await page.$('text=/Sign In/i, text=/Login/i, text=/Get Started/i')
    if (loginButton) {
      await loginButton.click()
    }
    
    // Wait for redirect to dashboard (assuming already logged in via session)
    await page.waitForTimeout(2000)
    
    // Check if we're on dashboard, if not try to navigate directly
    const url = page.url()
    if (!url.includes('/dashboard') && !url.includes('/company-intelligence')) {
      await page.goto('http://localhost:3000/dashboard')
    }

    // Navigate to Company Intelligence
    console.log('🔍 Navigating to Company Intelligence...')
    await page.goto('http://localhost:3000/company-intelligence')
    await page.waitForSelector('input[placeholder*="Enter company domain"]', { timeout: 10000 })

    // Enter domain
    await page.fill('input[placeholder*="Enter company domain"]', 'bigfluffy.ai')
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '1-domain-entered.png'),
      fullPage: true 
    })

    // Start analysis
    await page.press('input[placeholder*="Enter company domain"]', 'Enter')
    
    // Wait for site analysis
    console.log('📊 Waiting for site analysis...')
    await page.waitForSelector('text=/Site Type Detected/i', { timeout: 30000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '2-site-analysis-complete.png'),
      fullPage: true 
    })

    // Wait for sitemap
    console.log('🗺️ Waiting for sitemap...')
    await page.waitForSelector('text=/Approve Sitemap Discovery/i', { timeout: 30000 })
    
    // Capture tooltips on hover
    console.log('💡 Capturing tooltips...')
    
    // Hover over badges to show tooltips
    const badges = await page.$$('[class*="badge"]')
    if (badges.length > 0) {
      await badges[0].hover()
      await page.waitForTimeout(500)
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '3-tooltip-badge.png'),
        fullPage: true 
      })
    }

    // Hover over buttons to show tooltips
    const approveButton = await page.$('text=/Approve Sitemap Discovery/i')
    if (approveButton) {
      await approveButton.hover()
      await page.waitForTimeout(500)
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '4-tooltip-approve-button.png'),
        fullPage: true 
      })
    }

    // Click approve
    await page.click('text=/Approve Sitemap Discovery/i')
    
    // Wait for scraping phase
    console.log('🔄 Waiting for scraping phase...')
    await page.waitForSelector('text=/Additive Scraping Session/i', { timeout: 30000 })
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '5-scraping-control.png'),
      fullPage: true 
    })

    // Run a scraper
    console.log('🚀 Running static scraper...')
    const staticScraperButton = await page.$('text=/Static HTML \\(Cheerio\\)/i')
    if (staticScraperButton) {
      await staticScraperButton.click()
      
      // Wait for scraping to complete
      await page.waitForSelector('text=/Scraping History/i', { timeout: 60000 })
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '6-scraping-complete.png'),
        fullPage: true 
      })

      // Expand history to see details
      const expandButton = await page.$('[aria-label*="expand"], button:has(svg[class*="ChevronDown"])')
      if (expandButton) {
        await expandButton.click()
        await page.waitForTimeout(500)
        await page.screenshot({ 
          path: path.join(SCREENSHOTS_DIR, '7-expanded-details.png'),
          fullPage: true 
        })
      }

      // Look for View Links button
      const viewLinksButton = await page.$('text=/View Links/i')
      if (viewLinksButton) {
        console.log('✅ View Links button found!')
        await viewLinksButton.click()
        await page.waitForTimeout(500)
        await page.screenshot({ 
          path: path.join(SCREENSHOTS_DIR, '8-view-links-clicked.png'),
          fullPage: true 
        })
      } else {
        console.log('⚠️ View Links button not found')
      }
    }

    console.log('✅ Screenshots captured successfully!')
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (page) {
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'error-state.png'),
        fullPage: true 
      })
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Run the test
captureUIImprovements().catch(console.error)