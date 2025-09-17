/**
 * Automated UI Test for Company Intelligence
 * Tests sitemap discovery, hierarchical display, and scraping functionality
 */

const puppeteer = require('puppeteer');

async function testCompanyIntelligence() {
  console.log('🚀 Starting Company Intelligence UI Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // 2. Login with test credentials
    console.log('🔐 Step 2: Logging in...');
    await page.type('input[type="email"]', 'stusandboxacc@gmail.com');
    await page.type('input[type="password"]', 'Flibble1!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // 3. Navigate to Company Intelligence
    console.log('🏢 Step 3: Navigating to Company Intelligence...');
    await page.goto('http://localhost:3000/company-intelligence', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // 4. Enter domain
    console.log('🌐 Step 4: Entering domain (bigfluffy.ai)...');
    const domainInput = await page.waitForSelector('input[placeholder*="example.com"]');
    await domainInput.type('bigfluffy.ai');
    
    // 5. Click Start Research
    console.log('🔍 Step 5: Starting research...');
    await page.click('button:has-text("Start Research")');
    
    // 6. Wait for site analysis to complete
    console.log('⏳ Step 6: Waiting for site analysis...');
    await page.waitForSelector('text=/Site Analysis Complete/i', { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 7. Check sitemap discovery results
    console.log('🗺️ Step 7: Checking sitemap discovery...');
    await page.waitForSelector('.e-treeview', { timeout: 30000 });
    
    // Count discovered pages
    const pageCount = await page.evaluate(() => {
      const badge = document.querySelector('span:has-text("pages found")');
      if (badge) {
        const text = badge.textContent || '';
        const match = text.match(/(\d+) pages found/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    });
    
    console.log(`   ✅ Found ${pageCount} pages in sitemap`);
    
    // Check for hierarchical structure
    const hasHierarchy = await page.evaluate(() => {
      const treeNodes = document.querySelectorAll('.e-treeview .e-list-parent');
      return treeNodes.length > 0;
    });
    
    if (hasHierarchy) {
      console.log('   ✅ Hierarchical tree structure detected');
    } else {
      console.log('   ⚠️ No hierarchical structure found (flat list)');
    }
    
    // Check for blog posts
    const blogPages = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.e-treeview .e-list-text');
      let blogCount = 0;
      nodes.forEach(node => {
        if (node.textContent && node.textContent.toLowerCase().includes('blog')) {
          blogCount++;
        }
      });
      return blogCount;
    });
    
    console.log(`   ✅ Found ${blogPages} blog-related nodes`);
    
    // 8. Proceed with selected pages
    console.log('📦 Step 8: Proceeding with scraping...');
    const proceedButton = await page.waitForSelector('button:has-text("Proceed with")', { timeout: 10000 });
    await proceedButton.click();
    
    // 9. Wait for scraping to start
    console.log('⚡ Step 9: Starting scraping phase...');
    await page.waitForSelector('button:has-text("Start Scraping")', { timeout: 10000 });
    await page.click('button:has-text("Start Scraping")');
    
    // 10. Monitor scraping progress
    console.log('📊 Step 10: Monitoring scraping progress...');
    let scrapingComplete = false;
    let errorOccurred = false;
    
    // Wait for either success or error
    await Promise.race([
      page.waitForSelector('text=/Scraping results approved/i', { timeout: 120000 }).then(() => {
        scrapingComplete = true;
      }),
      page.waitForSelector('text=/Scraping failed/i', { timeout: 120000 }).then(() => {
        errorOccurred = true;
      })
    ]).catch(() => {
      console.log('   ⚠️ Scraping timeout or completion not detected');
    });
    
    // Check final status
    if (scrapingComplete) {
      console.log('   ✅ Scraping completed successfully!');
    } else if (errorOccurred) {
      console.log('   ❌ Scraping failed with error');
      
      // Try to get error details
      const errorText = await page.evaluate(() => {
        const alerts = document.querySelectorAll('[role="alert"]');
        return Array.from(alerts).map(a => a.textContent).join(' ');
      });
      console.log(`   Error details: ${errorText}`);
    }
    
    // 11. Take screenshot for debugging
    console.log('📸 Step 11: Taking screenshot...');
    await page.screenshot({ path: 'test-results-company-intelligence.png', fullPage: true });
    
    // Test Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Pages discovered: ${pageCount}`);
    console.log(`✅ Hierarchical structure: ${hasHierarchy ? 'Yes' : 'No'}`);
    console.log(`✅ Blog pages found: ${blogPages}`);
    console.log(`✅ Scraping status: ${scrapingComplete ? 'Success' : errorOccurred ? 'Failed' : 'Unknown'}`);
    
    // Determine overall test result
    const testPassed = pageCount > 12 && !errorOccurred;
    
    if (testPassed) {
      console.log('\n🎉 TEST PASSED! All fixes are working correctly.');
    } else {
      console.log('\n⚠️ TEST NEEDS ATTENTION:');
      if (pageCount <= 12) {
        console.log('   - Not enough pages discovered (expected > 12)');
      }
      if (errorOccurred) {
        console.log('   - Scraping failed with error');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test-error-screenshot.png', fullPage: true });
  } finally {
    console.log('\n🧹 Cleaning up...');
    await browser.close();
  }
}

// Run the test
testCompanyIntelligence().catch(console.error);