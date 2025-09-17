#!/usr/bin/env tsx
/**
 * Simple test to verify sitemap TreeView rendering
 */

import { chromium } from 'playwright'

async function testSitemapUI() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  })
  
  const page = await browser.newPage()
  
  try {
    console.log('🚀 Testing Sitemap Discovery UI...')
    
    // Login
    console.log('📝 Logging in...')
    await page.goto('http://localhost:3001/login')
    await page.fill('input[type="email"]', 'stusandboxacc@gmail.com')
    await page.fill('input[type="password"]', 'Flibble1!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard')
    
    // Navigate to Company Intelligence
    console.log('🔍 Navigating to Company Intelligence...')
    await page.goto('http://localhost:3001/company-intelligence')
    await page.waitForLoadState('networkidle')
    
    // Enter domain
    console.log('🌐 Entering domain: bigfluffy.ai')
    await page.fill('input[placeholder*="domain"]', 'bigfluffy.ai')
    await page.press('input[placeholder*="domain"]', 'Enter')
    
    // Wait for site analysis
    console.log('⏳ Waiting for site analysis...')
    await page.waitForSelector('text=/Site type detected/i', { timeout: 30000 })
    console.log('✅ Site analysis complete')
    
    // Click approve for site analysis
    console.log('👍 Approving site analysis...')
    const approveButton = await page.waitForSelector('button:has-text("Approve")', { timeout: 10000 })
    await approveButton.click()
    
    // Wait for sitemap discovery
    console.log('🗺️ Waiting for sitemap discovery...')
    await page.waitForSelector('text=/Sitemap Discovery/i', { timeout: 10000 })
    
    // Wait for "Validating Pages" to complete
    console.log('⏳ Waiting for page validation...')
    await page.waitForSelector('text=/Validating Pages/i', { timeout: 30000 })
    
    // Check if TreeView is visible
    console.log('🌳 Checking for TreeView...')
    const treeViewExists = await page.isVisible('[class*="MuiTreeView"]', { timeout: 10000 })
    
    if (treeViewExists) {
      console.log('✅ SUCCESS: TreeView is rendering!')
      
      // Check for selection buttons
      const selectAllExists = await page.isVisible('button:has-text("Select All")')
      const confirmExists = await page.isVisible('button:has-text("Confirm Selection")')
      
      console.log(`✅ Select All button: ${selectAllExists ? 'Found' : 'Missing'}`)
      console.log(`✅ Confirm Selection button: ${confirmExists ? 'Found' : 'Missing'}`)
      
      // Check tooltips
      const badges = await page.$$('[class*="Badge"]')
      console.log(`📊 Found ${badges.length} badges`)
      
      // Hover over a badge to test tooltip
      if (badges.length > 0) {
        await badges[0].hover()
        await page.waitForTimeout(500)
        const tooltipVisible = await page.isVisible('.e-tooltip-wrap')
        console.log(`💡 Tooltip visible: ${tooltipVisible ? 'Yes' : 'No'}`)
      }
      
    } else {
      console.log('❌ FAILED: TreeView is not rendering!')
      
      // Check what's visible instead
      const progressVisible = await page.isVisible('text=/Validating Pages/i')
      const errorVisible = await page.isVisible('[role="alert"]')
      
      console.log(`Progress indicator visible: ${progressVisible}`)
      console.log(`Error message visible: ${errorVisible}`)
      
      if (errorVisible) {
        const errorText = await page.textContent('[role="alert"]')
        console.log(`Error: ${errorText}`)
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'sitemap-ui-test.png', fullPage: true })
    console.log('📸 Screenshot saved: sitemap-ui-test.png')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    await page.screenshot({ path: 'sitemap-ui-error.png', fullPage: true })
  } finally {
    console.log('🔚 Test complete. Browser will close in 5 seconds...')
    await page.waitForTimeout(5000)
    await browser.close()
  }
}

testSitemapUI().catch(console.error)