import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS_DIR = `test-screenshots-${Date.now()}`
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function captureScreenshots() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    })
    const page = await context.newPage()

    console.log('🚀 Starting screenshot capture...')
    
    // Go directly to Company Intelligence
    await page.goto('http://localhost:3000/company-intelligence')
    await page.waitForTimeout(3000)
    
    // Take screenshot of the page
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '1-company-intelligence-page.png'),
      fullPage: true 
    })
    console.log('✅ Captured Company Intelligence page')

    // Try to enter domain if input is available
    const input = await page.$('input[placeholder*="domain"], input[placeholder*="company"], input[type="text"]')
    if (input) {
      await input.fill('bigfluffy.ai')
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '2-domain-entered.png'),
        fullPage: true 
      })
      console.log('✅ Captured domain entry')
      
      // Press Enter to start
      await page.keyboard.press('Enter')
      await page.waitForTimeout(5000)
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '3-after-enter.png'),
        fullPage: true 
      })
      console.log('✅ Captured after Enter press')
    }

    // Look for any tooltips by hovering over elements
    const elements = await page.$$('button, [class*="badge"], [class*="card"]')
    console.log(`Found ${elements.length} elements to check for tooltips`)
    
    for (let i = 0; i < Math.min(3, elements.length); i++) {
      await elements[i].hover()
      await page.waitForTimeout(1000)
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, `tooltip-${i + 1}.png`),
        fullPage: true 
      })
      console.log(`✅ Captured tooltip ${i + 1}`)
    }

    console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}`)
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await browser.close()
  }
}

captureScreenshots().catch(console.error)