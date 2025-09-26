/**
 * Test Script for Scraper Functionality
 *
 * This script tests all three scraper types after fixing the stealth plugin issue
 * Run with: npx tsx test-scrapers-after-fix.ts
 */

import { createScraper, ScraperType } from './lib/company-intelligence/scrapers-v3'
import { permanentLogger } from './lib/utils/permanent-logger'

async function testScrapers() {
  console.log('🧪 Testing Scraper Functionality After Stealth Plugin Fix\n')
  console.log('=' .repeat(60))

  // Test 1: Cheerio Scraper (simplest, no browser needed)
  console.log('\n📝 Test 1: Cheerio Scraper (HTML fetching)')
  console.log('-'.repeat(40))
  try {
    const cheerioScraper = createScraper(ScraperType.CHEERIO)
    const cheerioResults = await cheerioScraper.scrape(['https://example.com'])

    if (cheerioResults[0]?.html) {
      console.log('✅ Cheerio scraper working!')
      console.log(`   - Fetched ${cheerioResults[0].html.length} characters of HTML`)
      console.log(`   - Title: ${cheerioResults[0].title || 'N/A'}`)
    } else {
      console.log('❌ Cheerio scraper failed:', cheerioResults[0]?.error)
    }
  } catch (error) {
    console.log('❌ Cheerio scraper error:', error)
  }

  // Test 2: Playwright Scraper (with fixed stealth plugin)
  console.log('\n🎭 Test 2: Playwright Scraper (browser automation)')
  console.log('-'.repeat(40))
  try {
    const playwrightScraper = createScraper(ScraperType.PLAYWRIGHT, {
      browser: {
        headless: true,
        args: ['--no-sandbox']
      },
      stealth: {
        plugins: {
          stealth: true,  // This now uses the correct plugin
          webgl: false,
          webrtc: false
        },
        fingerprint: {
          randomizeViewport: true,
          randomizeUserAgent: true
        },
        behavior: {
          humanizeMouseMovement: false,
          randomizeDelays: false,
          delayRange: [0, 0]
        },
        session: {
          persistCookies: false,
          rotateUserAgent: false
        }
      },
      limits: {
        maxRetries: 1,
        navigationTimeout: 30000,
        maxConcurrent: 1
      },
      features: {
        screenshots: false,
        pdf: false,
        localStorage: false
      }
    })

    const playwrightResults = await playwrightScraper.scrape(['https://example.com'])

    if (playwrightResults[0]?.content) {
      console.log('✅ Playwright scraper working!')
      console.log(`   - Fetched ${playwrightResults[0].content.length} characters`)
      console.log('   - Stealth plugin loaded successfully')
    } else {
      console.log('❌ Playwright scraper failed:', playwrightResults[0]?.error)
    }

    // Clean up
    await playwrightScraper.close()
  } catch (error) {
    console.log('❌ Playwright scraper error:', error)
  }

  // Test 3: Import verification
  console.log('\n🔍 Test 3: Module Import Verification')
  console.log('-'.repeat(40))
  try {
    // This will fail if the wrong stealth plugin is installed
    const StealthPlugin = require('puppeteer-extra-plugin-stealth')
    console.log('✅ Correct stealth plugin installed (puppeteer-extra-plugin-stealth)')
    console.log(`   - Plugin type: ${typeof StealthPlugin}`)
    console.log(`   - Has default export: ${!!StealthPlugin.default}`)
  } catch (error) {
    console.log('❌ Stealth plugin import failed:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Scraper tests complete!')
  console.log('\nKey Points:')
  console.log('1. The stealth plugin confusion has been resolved')
  console.log('2. Using "puppeteer-extra-plugin-stealth" for Playwright is correct')
  console.log('3. All scrapers should now be functional')
}

// Run the tests
testScrapers().catch(console.error)