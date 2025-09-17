import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const RESULTS_DIR = `ui-verification-${Date.now()}`
fs.mkdirSync(RESULTS_DIR, { recursive: true })

interface TestResult {
  feature: string
  status: 'pass' | 'fail'
  details: string
  screenshot?: string
}

const results: TestResult[] = []

async function verifyUIFeatures() {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log('🚀 UI Features Verification Test')
    console.log('================================')
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Go to Company Intelligence page
    console.log('📍 Navigating to Company Intelligence...')
    await page.goto('http://localhost:3000/company-intelligence')
    await page.waitForTimeout(2000)

    // Test 1: Check for tooltips on page elements
    console.log('🔍 Test 1: Verifying tooltips...')
    try {
      // Look for TooltipWrapper components
      const elementsWithTooltips = await page.$$('[data-radix-tooltip-trigger], [aria-describedby*="tooltip"]')
      
      if (elementsWithTooltips.length > 0) {
        // Hover over first element
        await elementsWithTooltips[0].hover()
        await page.waitForTimeout(1000)
        
        // Check if tooltip appears
        const tooltipContent = await page.$('[role="tooltip"], [data-radix-tooltip-content]')
        
        if (tooltipContent) {
          const screenshotPath = path.join(RESULTS_DIR, 'tooltip-visible.png')
          await page.screenshot({ path: screenshotPath, fullPage: true })
          results.push({
            feature: 'Tooltips',
            status: 'pass',
            details: `Found ${elementsWithTooltips.length} elements with tooltips`,
            screenshot: screenshotPath
          })
          console.log('✅ Tooltips: PASSED')
        } else {
          results.push({
            feature: 'Tooltips',
            status: 'fail',
            details: 'Tooltip content not visible on hover'
          })
          console.log('❌ Tooltips: FAILED - Content not visible')
        }
      } else {
        results.push({
          feature: 'Tooltips',
          status: 'fail',
          details: 'No elements with tooltips found'
        })
        console.log('❌ Tooltips: FAILED - No tooltip elements found')
      }
    } catch (error) {
      results.push({
        feature: 'Tooltips',
        status: 'fail',
        details: `Error: ${error}`
      })
      console.log('❌ Tooltips: ERROR')
    }

    // Test 2: Enter domain and proceed to scraping
    console.log('🔍 Test 2: Testing domain entry and scraping flow...')
    try {
      const input = await page.$('input[placeholder*="domain"], input[placeholder*="company"], input[type="text"]')
      if (input) {
        await input.fill('bigfluffy.ai')
        await page.keyboard.press('Enter')
        
        // Wait for analysis
        await page.waitForSelector('text=/Site Type|Analysis|Sitemap/i', { timeout: 30000 })
        
        // Look for Approve button
        const approveButton = await page.$('button:has-text("Approve"), button:has-text("Continue")')
        if (approveButton) {
          await approveButton.click()
          await page.waitForTimeout(3000)
        }
        
        // Check if we reached scraping phase
        const scrapingSection = await page.$('text=/Scraping|Scraper/i')
        if (scrapingSection) {
          results.push({
            feature: 'Domain Entry Flow',
            status: 'pass',
            details: 'Successfully navigated to scraping phase'
          })
          console.log('✅ Domain Entry Flow: PASSED')
        } else {
          results.push({
            feature: 'Domain Entry Flow',
            status: 'fail',
            details: 'Did not reach scraping phase'
          })
          console.log('❌ Domain Entry Flow: FAILED')
        }
      }
    } catch (error) {
      results.push({
        feature: 'Domain Entry Flow',
        status: 'fail',
        details: `Error: ${error}`
      })
      console.log('❌ Domain Entry Flow: ERROR')
    }

    // Test 3: Check for View Links button after scraping
    console.log('🔍 Test 3: Checking View Links button...')
    try {
      // Try to run a scraper first
      const scraperButton = await page.$('button:has-text("Static"), button:has-text("Cheerio")')
      if (scraperButton) {
        await scraperButton.click()
        console.log('   Running scraper...')
        
        // Wait for scraping to complete
        await page.waitForSelector('text=/complete|finished|done/i', { timeout: 60000 })
        await page.waitForTimeout(2000)
        
        // Look for View Links button
        const viewLinksButton = await page.$('button:has-text("View Links")')
        
        if (viewLinksButton) {
          const screenshotPath = path.join(RESULTS_DIR, 'view-links-button.png')
          await page.screenshot({ path: screenshotPath, fullPage: true })
          
          // Click it to verify it works
          await viewLinksButton.click()
          await page.waitForTimeout(1000)
          
          const afterClickPath = path.join(RESULTS_DIR, 'view-links-expanded.png')
          await page.screenshot({ path: afterClickPath, fullPage: true })
          
          results.push({
            feature: 'View Links Button',
            status: 'pass',
            details: 'View Links button found and functional',
            screenshot: screenshotPath
          })
          console.log('✅ View Links Button: PASSED')
        } else {
          results.push({
            feature: 'View Links Button',
            status: 'fail',
            details: 'View Links button not found after scraping'
          })
          console.log('❌ View Links Button: NOT FOUND')
        }
      } else {
        results.push({
          feature: 'View Links Button',
          status: 'fail',
          details: 'Could not run scraper to test View Links'
        })
        console.log('❌ View Links Button: Could not test')
      }
    } catch (error) {
      results.push({
        feature: 'View Links Button',
        status: 'fail',
        details: `Error: ${error}`
      })
      console.log('❌ View Links Button: ERROR')
    }

    // Test 4: Check for progress indicators
    console.log('🔍 Test 4: Checking progress indicators...')
    try {
      const progressElements = await page.$$('[role="progressbar"], .progress, [class*="progress"]')
      
      if (progressElements.length > 0) {
        const screenshotPath = path.join(RESULTS_DIR, 'progress-indicators.png')
        await page.screenshot({ path: screenshotPath, fullPage: true })
        
        results.push({
          feature: 'Progress Indicators',
          status: 'pass',
          details: `Found ${progressElements.length} progress indicators`,
          screenshot: screenshotPath
        })
        console.log('✅ Progress Indicators: PASSED')
      } else {
        results.push({
          feature: 'Progress Indicators',
          status: 'fail',
          details: 'No progress indicators found'
        })
        console.log('❌ Progress Indicators: NOT FOUND')
      }
    } catch (error) {
      results.push({
        feature: 'Progress Indicators',
        status: 'fail',
        details: `Error: ${error}`
      })
      console.log('❌ Progress Indicators: ERROR')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    if (browser) {
      await browser.close()
    }
    
    // Generate summary report
    generateReport()
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST RESULTS SUMMARY')
  console.log('='.repeat(50))
  
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${results.length}`)
  console.log('')
  
  // Detailed results
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌'
    console.log(`${icon} ${result.feature}: ${result.status.toUpperCase()}`)
    console.log(`   ${result.details}`)
    if (result.screenshot) {
      console.log(`   Screenshot: ${result.screenshot}`)
    }
  })
  
  // Save JSON report
  const reportPath = path.join(RESULTS_DIR, 'test-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n📁 Full report saved to: ${reportPath}`)
  console.log(`📁 Screenshots saved to: ${RESULTS_DIR}`)
}

// Run the test
verifyUIFeatures().catch(console.error)