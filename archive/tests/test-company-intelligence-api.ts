/**
 * API-Level Test for Company Intelligence
 * Run with: npx tsx test-company-intelligence-api.ts
 */

import { permanentLogger } from './lib/utils/permanent-logger'

const BASE_URL = 'http://localhost:3000'
const TEST_DOMAIN = 'bigfluffy.ai'

interface TestResult {
  step: string
  success: boolean
  message: string
  data?: any
}

const results: TestResult[] = []

async function log(step: string, success: boolean, message: string, data?: any) {
  console.log(`${success ? '✅' : '❌'} ${step}: ${message}`)
  if (data) {
    console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 200))
  }
  results.push({ step, success, message, data })
}

async function testSitemapDiscovery() {
  console.log('\n🗺️ Testing Sitemap Discovery...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/company-intelligence/fetch-sitemap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        domain: TEST_DOMAIN,
        enableIntelligence: true 
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Check results
    const pageCount = data.pages?.length || 0
    const hasBlogPages = data.pages?.some((p: any) => p.url.includes('/blog'))
    const hasNestedStructure = data.pages?.some((p: any) => p.url.split('/').length > 4)
    
    log('Sitemap Fetch', true, `Found ${pageCount} pages`, {
      pageCount,
      sitemapFound: data.sitemapFound,
      hasBlogPages,
      hasNestedStructure
    })
    
    // Validate expectations
    if (pageCount < 10) {
      log('Page Count Check', false, `Expected more than 10 pages, got ${pageCount}`)
    } else {
      log('Page Count Check', true, `Good! Found ${pageCount} pages`)
    }
    
    if (!hasBlogPages) {
      log('Blog Pages Check', false, 'No blog pages found')
    } else {
      const blogCount = data.pages.filter((p: any) => p.url.includes('/blog')).length
      log('Blog Pages Check', true, `Found ${blogCount} blog pages`)
    }
    
    return data.pages
    
  } catch (error) {
    log('Sitemap Discovery', false, `Failed: ${error}`)
    return []
  }
}

async function testScraping(pages: any[]) {
  console.log('\n⚡ Testing Scraping Phase...')
  
  if (pages.length === 0) {
    log('Scraping', false, 'No pages to scrape')
    return
  }
  
  const testPages = pages.slice(0, 12).map(p => p.url || p)
  const sessionId = `test_session_${Date.now()}`
  
  try {
    const response = await fetch(`${BASE_URL}/api/company-intelligence/phases/scraping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        domain: TEST_DOMAIN,
        pages: testPages,
        options: {
          mode: 'multi-phase',
          maxPages: 12,
          timeout: 120000,
          stream: false
        }
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    
    // Check scraping results
    const success = data.success
    const pagesScraped = data.result?.data?.pages?.length || 0
    const hasBrandAssets = !!data.result?.data?.brandAssets
    const metrics = data.result?.metrics
    
    log('Scraping Execution', success, `Scraped ${pagesScraped} pages`, {
      success,
      pagesScraped,
      hasBrandAssets,
      metrics
    })
    
    // Validate brand assets
    if (hasBrandAssets) {
      const brandAssets = data.result.data.brandAssets
      log('Brand Assets', true, 'Brand assets collected', {
        hasLogo: !!brandAssets.logo,
        colorCount: brandAssets.colors?.length || 0,
        fontCount: brandAssets.fonts?.length || 0
      })
    } else {
      log('Brand Assets', false, 'No brand assets found')
    }
    
    return data
    
  } catch (error) {
    log('Scraping Phase', false, `Failed: ${error}`)
    
    // Check if it's the supabase error we fixed
    if (error instanceof Error && error.message.includes('supabase is not defined')) {
      log('Supabase Fix', false, '❌ The supabase undefined error still exists!')
    }
    
    return null
  }
}

async function testSiteAnalysis() {
  console.log('\n🔍 Testing Site Analysis...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/company-intelligence/analyze-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: TEST_DOMAIN })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    log('Site Analysis', true, `Detected: ${data.siteType || 'unknown'}`, {
      siteType: data.siteType,
      hasJavaScript: data.hasJavaScript,
      renderingMode: data.renderingMode
    })
    
    return data
    
  } catch (error) {
    log('Site Analysis', false, `Failed: ${error}`)
    return null
  }
}

async function runTests() {
  console.log('🚀 Starting Company Intelligence API Tests')
  console.log('=' .repeat(50))
  console.log(`Testing domain: ${TEST_DOMAIN}`)
  console.log(`Server: ${BASE_URL}`)
  console.log('=' .repeat(50))
  
  // Run tests in sequence
  const siteAnalysis = await testSiteAnalysis()
  const pages = await testSitemapDiscovery()
  const scrapingResult = await testScraping(pages)
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('=' .repeat(50))
  
  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length
  
  console.log(`✅ Passed: ${successCount}`)
  console.log(`❌ Failed: ${failureCount}`)
  
  // Check critical fixes
  console.log('\n🔧 Critical Fixes Status:')
  
  const supabaseFixed = !results.some(r => r.message.includes('supabase is not defined'))
  console.log(`1. Supabase undefined error: ${supabaseFixed ? '✅ FIXED' : '❌ NOT FIXED'}`)
  
  const manyPagesFound = pages.length > 12
  console.log(`2. Sitemap discovery (>12 pages): ${manyPagesFound ? '✅ WORKING' : '❌ NEEDS FIX'}`)
  
  const scrapingWorks = scrapingResult?.success === true
  console.log(`3. Scraping functionality: ${scrapingWorks ? '✅ WORKING' : '❌ BROKEN'}`)
  
  // Overall result
  const allCriticalFixed = supabaseFixed && scrapingWorks
  console.log('\n' + '=' .repeat(50))
  if (allCriticalFixed) {
    console.log('🎉 ALL CRITICAL FIXES ARE WORKING!')
  } else {
    console.log('⚠️ SOME FIXES STILL NEEDED')
  }
  console.log('=' .repeat(50))
}

// Run the tests
runTests().catch(console.error)