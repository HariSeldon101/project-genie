#!/usr/bin/env tsx
/**
 * Test file specifically for Sitemap Discovery SSE monitoring
 * Tests that Pattern Discovery and Blog phases properly report page counts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { chromium, Browser, Page } from 'playwright'
import chalk from 'chalk'

const CONFIG = {
  baseUrl: 'http://localhost:3002',
  testDomain: 'bigfluffy.ai',
  headless: false,
  expectedCounts: {
    pattern: { min: 1 },  // Should find at least 1 page
    blog: { min: 1 }       // Should find at least 1 blog post
  }
}

class SitemapDiscoveryTest {
  private browser?: Browser
  private page?: Page
  private sseEvents: any[] = []
  private phaseCounts: Record<string, number> = {}

  async run() {
    console.log(chalk.cyan('🧪 SITEMAP DISCOVERY SSE TEST'))
    console.log(chalk.gray('Testing Pattern Discovery and Blog phase counts\n'))

    try {
      await this.setup()
      await this.login()
      await this.navigateToCompanyIntelligence()
      await this.startDiscovery()
      await this.monitorSSEEvents()
      await this.validateResults()
      
      console.log(chalk.green('\n✅ All tests passed!'))
    } catch (error) {
      console.error(chalk.red('\n❌ Test failed:'), error)
      process.exit(1)
    } finally {
      await this.cleanup()
    }
  }

  private async setup() {
    console.log(chalk.yellow('Setting up browser...'))
    this.browser = await chromium.launch({ 
      headless: CONFIG.headless,
      slowMo: 100
    })
    this.page = await this.browser.newPage()

    // Monitor network requests to capture SSE events
    this.page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('fetch-sitemap') && response.headers()['content-type']?.includes('text/event-stream')) {
        console.log(chalk.blue('📡 SSE Connection established'))
      }
    })

    // Inject JavaScript to monitor SSE events in the browser
    await this.page.addInitScript(() => {
      (window as any).sseEvents = [];
      (window as any).phaseCounts = {};
      
      // Override EventSource to capture events
      const OriginalEventSource = window.EventSource;
      (window as any).EventSource = class extends OriginalEventSource {
        constructor(url: string, config?: any) {
          super(url, config);
          
          this.addEventListener('message', (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              (window as any).sseEvents.push(data);
              
              // Track phase-complete events
              if (data.type === 'phase-complete' && data.phase && data.pagesFound !== undefined) {
                (window as any).phaseCounts[data.phase] = data.pagesFound;
                console.log(`[SSE] ${data.phase}: ${data.pagesFound} pages`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          });
        }
      };
    });
  }

  private async login() {
    console.log(chalk.yellow('Logging in...'))
    await this.page!.goto(`${CONFIG.baseUrl}/login`)
    
    // Use test account credentials
    await this.page!.fill('input[type="email"]', 'test@bigfluffy.ai')
    await this.page!.fill('input[type="password"]', 'TestPassword123!')
    await this.page!.click('button[type="submit"]')
    
    // Wait for redirect
    await this.page!.waitForURL('**/dashboard', { timeout: 10000 })
    console.log(chalk.green('✓ Logged in successfully'))
  }

  private async navigateToCompanyIntelligence() {
    console.log(chalk.yellow('Navigating to Company Intelligence...'))
    await this.page!.goto(`${CONFIG.baseUrl}/company-intelligence`)
    await this.page!.waitForSelector('input[placeholder*="bigfluffy.ai"]', { timeout: 10000 })
    console.log(chalk.green('✓ Company Intelligence page loaded'))
  }

  private async startDiscovery() {
    console.log(chalk.yellow(`Starting discovery for ${CONFIG.testDomain}...`))
    
    // Enter domain and start
    const domainInput = await this.page!.waitForSelector('input[placeholder*="bigfluffy.ai"]')
    await domainInput!.fill(CONFIG.testDomain)
    await domainInput!.press('Enter')
    
    // Wait for Site Analysis
    await this.page!.waitForSelector('text=/Site Analysis/', { timeout: 10000 })
    const analyzeButton = await this.page!.waitForSelector('button:has-text("Analyze Site")')
    await analyzeButton!.click()
    
    // Wait for analysis to complete
    await this.page!.waitForSelector('text=/Site Type/', { timeout: 30000 })
    
    // Continue to Sitemap Discovery
    const continueButton = await this.page!.waitForSelector('button:has-text("Continue")')
    await continueButton!.click()
    
    console.log(chalk.green('✓ Sitemap discovery started'))
  }

  private async monitorSSEEvents() {
    console.log(chalk.yellow('\n📊 Monitoring SSE events...\n'))
    
    // Wait for all phases to complete (max 60 seconds)
    const startTime = Date.now()
    const timeout = 60000
    
    while (Date.now() - startTime < timeout) {
      // Get events from browser context
      const events = await this.page!.evaluate(() => (window as any).sseEvents || [])
      const counts = await this.page!.evaluate(() => (window as any).phaseCounts || {})
      
      this.sseEvents = events
      this.phaseCounts = counts
      
      // Check if validation phase is complete
      const validationComplete = events.some((e: any) => 
        e.type === 'phase-complete' && e.phase === 'validation'
      )
      
      if (validationComplete) {
        console.log(chalk.green('\n✓ All phases complete'))
        break
      }
      
      // Log current phase
      const currentPhase = events.filter((e: any) => e.type === 'phase-start').pop()
      if (currentPhase) {
        process.stdout.write(chalk.gray(`\rCurrent phase: ${currentPhase.phase}...`))
      }
      
      await this.page!.waitForTimeout(1000)
    }
    
    // Log all phase counts
    console.log(chalk.cyan('\n📈 Phase Counts:'))
    for (const [phase, count] of Object.entries(this.phaseCounts)) {
      const icon = count > 0 ? '✅' : '❌'
      console.log(`  ${icon} ${phase}: ${count} pages`)
    }
  }

  private async validateResults() {
    console.log(chalk.yellow('\n🔍 Validating results...'))
    
    // Check Pattern Discovery
    const patternCount = this.phaseCounts['pattern-discovery'] || 0
    if (patternCount < CONFIG.expectedCounts.pattern.min) {
      throw new Error(`Pattern Discovery found ${patternCount} pages, expected at least ${CONFIG.expectedCounts.pattern.min}`)
    }
    console.log(chalk.green(`✓ Pattern Discovery: ${patternCount} pages (expected ≥ ${CONFIG.expectedCounts.pattern.min})`))
    
    // Check Blog & Articles
    const blogCount = this.phaseCounts['blog-crawl'] || 0
    if (blogCount < CONFIG.expectedCounts.blog.min) {
      throw new Error(`Blog & Articles found ${blogCount} pages, expected at least ${CONFIG.expectedCounts.blog.min}`)
    }
    console.log(chalk.green(`✓ Blog & Articles: ${blogCount} pages (expected ≥ ${CONFIG.expectedCounts.blog.min})`))
    
    // Verify counts are displayed in UI
    const patternElement = await this.page!.$('text=/Pattern Discovery/ >> .. >> text=/pages/')
    const blogElement = await this.page!.$('text=/Blog & Articles/ >> .. >> text=/pages/')
    
    if (!patternElement) {
      console.warn(chalk.yellow('⚠️  Pattern Discovery count not visible in UI'))
    }
    if (!blogElement) {
      console.warn(chalk.yellow('⚠️  Blog & Articles count not visible in UI'))
    }
    
    // Log all SSE events for debugging
    console.log(chalk.gray(`\n📝 Total SSE events received: ${this.sseEvents.length}`))
    const phaseCompleteEvents = this.sseEvents.filter(e => e.type === 'phase-complete')
    console.log(chalk.gray(`   Phase complete events: ${phaseCompleteEvents.length}`))
  }

  private async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Run the test
const test = new SitemapDiscoveryTest()
test.run().catch(console.error)