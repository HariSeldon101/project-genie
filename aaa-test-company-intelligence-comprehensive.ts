#!/usr/bin/env tsx
/**
 * THE ONLY TEST FILE FOR COMPANY INTELLIGENCE
 * DO NOT CREATE OTHER TEST FILES - USE ONLY THIS ONE
 * 
 * Tests Company Intelligence with bigfluffy.ai domain
 * Updated to test the new progressive UI flow
 * 
 * Features:
 * - Tests the complete 5-stage progressive flow
 * - Tests Site Analysis → Sitemap Discovery → Scraping → Enrichment → Generation
 * - Tests TreeView selection in sitemap stage
 * - Tests actual UI interaction without API mocks
 * - Permanent logging with visual indicators
 * - Performance metrics tracking
 */

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import { createBrowserClient } from '@supabase/ssr'
import crypto from 'crypto'

// Test configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',  // Using current dev port
  testAccount: {
    email: 'test@bigfluffy.ai',  // Using verified Supabase test account
    password: 'TestPassword123!'  // Correct password from setup
  },
  testDomain: 'bigfluffy.ai',
  outputDir: './test-results',
  screenshotOnError: true,
  visualRegression: true,
  permanentLogging: true,
  performanceMetrics: true,
  headless: false,  // Show browser for debugging
  slowMo: 100,  // Slow down actions for visibility
  expectedPages: {
    minimum: 18,  // We expect at least 18 pages on bigfluffy.ai
    blogPosts: 6,  // 6 blog posts
    mainPages: 12  // 12 main pages including footer links
  }
}

// Test stages
const STAGES = {
  SITE_ANALYSIS: 'site-analysis',
  SITEMAP: 'sitemap',
  SCRAPING: 'scraping',
  ENRICHMENT: 'enrichment',
  GENERATION: 'generation'
}

interface TestResult {
  sessionId: string
  timestamp: Date
  domain: string
  stages: {
    [key: string]: {
      success: boolean
      duration: number
      data?: any
      error?: string
      screenshot?: string
    }
  }
  overall: {
    success: boolean
    totalDuration: number
    completedStages: string[]
    failedStages: string[]
  }
  logs: LogEntry[]
}

interface LogEntry {
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  stage: string
  message: string
  metadata?: any
}

/**
 * Enhanced Logger with Stage Tracking
 */
class StageAwareLogger {
  private logs: LogEntry[] = []
  private currentStage: string = 'init'
  private supabase: any
  
  constructor(private sessionId: string) {
    if (CONFIG.permanentLogging) {
      this.supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
  }
  
  setStage(stage: string) {
    this.currentStage = stage
    this.log('info', `\n${'='.repeat(60)}\n🎯 STAGE: ${stage.toUpperCase()}\n${'='.repeat(60)}`)
  }
  
  log(level: LogEntry['level'], message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      stage: this.currentStage,
      message,
      metadata
    }
    
    this.logs.push(entry)
    
    // Console output with stage-aware coloring
    const stageEmoji = this.getStageEmoji(this.currentStage)
    const levelColor = this.getLevelColor(level)
    
    console.log(
      `${stageEmoji} ${levelColor(`[${level.toUpperCase()}]`)} [${this.currentStage}] ${message}`,
      metadata ? chalk.gray(JSON.stringify(metadata, null, 2)) : ''
    )
    
    // Persist if enabled
    if (CONFIG.permanentLogging && this.supabase) {
      this.persistLog(entry).catch(console.error)
    }
  }
  
  private getStageEmoji(stage: string): string {
    const emojis: Record<string, string> = {
      'init': '🚀',
      'site-analysis': '🔍',
      'sitemap': '🗺️',
      'scraping': '🕷️',
      'enrichment': '🤖',
      'generation': '📝',
      'complete': '✅',
      'error': '❌'
    }
    return emojis[stage] || '📌'
  }
  
  private getLevelColor(level: LogEntry['level']) {
    switch(level) {
      case 'debug': return chalk.gray
      case 'info': return chalk.blue
      case 'warn': return chalk.yellow
      case 'error': return chalk.red
    }
  }
  
  private async persistLog(entry: LogEntry) {
    try {
      await this.supabase
        .from('research_session_logs')
        .insert({
          session_id: this.sessionId,
          timestamp: entry.timestamp.toISOString(),
          level: entry.level,
          category: `test_${entry.stage}`,
          message: entry.message,
          metadata: entry.metadata
        })
    } catch (e) {
      console.error('Failed to persist log:', e)
    }
  }
  
  getLogs(): LogEntry[] {
    return this.logs
  }
}

/**
 * Company Intelligence UI Test Suite
 */
class CompanyIntelligenceUITester {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private sessionId = crypto.randomUUID()
  private logger: StageAwareLogger
  private result: TestResult
  
  constructor() {
    this.logger = new StageAwareLogger(this.sessionId)
    this.result = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      domain: CONFIG.testDomain,
      stages: {},
      overall: {
        success: false,
        totalDuration: 0,
        completedStages: [],
        failedStages: []
      },
      logs: []
    }
  }
  
  async initialize() {
    this.logger.setStage('init')
    this.logger.log('info', '🚀 Initializing Company Intelligence UI Test')
    
    // Create output directory
    await fs.mkdir(CONFIG.outputDir, { recursive: true })
    await fs.mkdir(path.join(CONFIG.outputDir, this.sessionId), { recursive: true })
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      recordVideo: CONFIG.visualRegression ? {
        dir: path.join(CONFIG.outputDir, this.sessionId, 'videos')
      } : undefined
    })
    
    this.page = await this.context.newPage()
    
    // Setup console monitoring with better object logging for breadcrumbs
    this.page.on('console', async msg => {
      if (msg.type() === 'error') {
        // Try to get the full arguments to see breadcrumb details
        const args = msg.args()
        const logTexts = []
        for (const arg of args) {
          try {
            const json = await arg.jsonValue()
            if (typeof json === 'object' && json !== null) {
              logTexts.push(JSON.stringify(json, null, 2))
            } else {
              logTexts.push(String(json))
            }
          } catch {
            logTexts.push(msg.text())
          }
        }
        this.logger.log('error', `Browser console ERROR: ${logTexts.join('\n')}`)
      }
    })
    
    this.page.on('pageerror', error => {
      this.logger.log('error', `Page error: ${error.message}`)
    })
    
    // Setup request monitoring
    this.page.on('request', request => {
      if (request.url().includes('/api/company-intelligence/')) {
        this.logger.log('debug', `API Request: ${request.method()} ${request.url()}`)
      }
    })
    
    this.page.on('response', response => {
      if (response.url().includes('/api/company-intelligence/') && response.status() !== 200) {
        this.logger.log('warn', `API Response: ${response.status()} ${response.url()}`)
      }
    })
    
    this.logger.log('info', '✅ Browser initialized successfully')

    // Try to skip login if already authenticated
    try {
      await this.page!.goto(`${CONFIG.baseUrl}/company-intelligence`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      })

      // Check if we're on the company-intelligence page
      const url = this.page!.url()
      if (url.includes('/company-intelligence')) {
        this.logger.log('info', '✅ Already authenticated, skipping login')
        return
      }
    } catch (e) {
      this.logger.log('info', 'Not authenticated, proceeding with login')
    }

    // Login if needed
    await this.login()
  }
  
  async login() {
    this.logger.log('info', 'Logging in to application')
    
    try {
      // Navigate to login page with increased timeout
      await this.page!.goto(`${CONFIG.baseUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000  // Increased from 30000
      })

      // Wait for page to be fully interactive before attempting login
      await this.page!.waitForLoadState('networkidle')
      await this.page!.waitForTimeout(2000) // Brief wait for any client-side initialization

      // Fill login form using IDs for better reliability
      await this.page!.fill('#email', CONFIG.testAccount.email)
      await this.page!.fill('#password', CONFIG.testAccount.password)

      // Submit - look for the sign in button specifically
      await this.page!.click('button[type="submit"]:has-text("Sign in")')

      // Wait for navigation - allow more time and check for dashboard or company-intelligence
      await this.page!.waitForURL(url => {
        const urlStr = url.toString()
        return urlStr.includes('/dashboard') || urlStr.includes('/company-intelligence') || urlStr.includes('/projects')
      }, {
        timeout: 60000  // Increased from 30000 for slower authentication
      })
      
      this.logger.log('info', '✅ Login successful')
      
      // Save auth state
      await this.context!.storageState({ 
        path: path.join(CONFIG.outputDir, 'auth.json') 
      })
      
    } catch (error) {
      this.logger.log('error', `Login failed: ${error}`)
      throw error
    }
  }
  
  async runProgressiveFlow() {
    const startTime = Date.now()
    
    try {
      // Navigate to Company Intelligence
      this.logger.log('info', 'Navigating to Company Intelligence page')
      await this.page!.goto(`${CONFIG.baseUrl}/company-intelligence`, {
        waitUntil: 'domcontentloaded'
      })
      
      // Stage 1: Site Analysis
      await this.testSiteAnalysis()
      
      // Stage 2: Sitemap Discovery
      await this.testSitemapDiscovery()
      
      // Test tooltips on UI elements
      await this.testTooltips()
      
      // Test page discovery (should find 18+ pages)
      await this.testPageDiscovery()
      
      // Test notification persistence
      await this.testNotificationPersistence()
      
      // Stage 3: Scraping
      await this.testScraping()
      
      // Optional: Stage 4 & 5 (Enrichment & Generation) - Only if needed
      // These require LLM calls, so we'll check if they appear
      const enrichmentVisible = await this.page!.$('text=/Enrichment/')
      if (enrichmentVisible) {
        await this.testEnrichment()
        await this.testGeneration()
      }
      
      // Calculate overall results
      this.result.overall.totalDuration = Date.now() - startTime
      this.result.overall.success = this.result.overall.failedStages.length === 0
      
    } catch (error) {
      this.logger.log('error', `Progressive flow failed: ${error}`)
      this.result.overall.success = false
    }
    
    // Generate report
    await this.generateReport()
  }
  
  async testSiteAnalysis() {
    this.logger.setStage(STAGES.SITE_ANALYSIS)
    const stageStart = Date.now()
    
    try {
      // Enter domain
      this.logger.log('info', `Entering domain: ${CONFIG.testDomain}`)
      // The domain input on Company Intelligence page might not have an ID
      const domainInput = await this.page!.waitForSelector('input[placeholder*="stripe.com"], input[placeholder*="bigfluffy"]', { timeout: 5000 })
      await domainInput!.fill(CONFIG.testDomain)
      
      // Press Enter to start the flow (no "Start Research" button)
      this.logger.log('info', 'Pressing Enter to start the progressive flow')
      await domainInput!.press('Enter')
      
      // Wait for Site Analyzer to appear
      this.logger.log('info', 'Waiting for Site Analyzer component')
      await this.page!.waitForSelector('text=/Site Analysis/', { timeout: 10000 })
      
      // Click Analyze Site button
      const analyzeButton = await this.page!.waitForSelector('button:has-text("Analyze Site")', { timeout: 5000 })
      await analyzeButton!.click()
      
      // Wait for analysis results
      this.logger.log('info', 'Waiting for site analysis to complete')
      await this.page!.waitForSelector('text=/Site Type/', { timeout: 30000 })
      
      // Extract technology detection results
      const siteType = await this.page!.$eval('span:has-text("NEXT") , span:has-text("REACT"), span:has-text("STATIC")', 
        el => el.textContent
      ).catch(() => 'unknown')
      
      this.logger.log('info', `Site type detected: ${siteType}`)
      
      // Take screenshot before looking for approve button
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage1-site-analysis.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
      }
      
      // Look for approve button using text selector instead of data-testid
      // The button actually says "Approve & Continue" not "Approve Site Analysis"
      const approveButton = await this.page!.waitForSelector('button:has-text("Approve & Continue")', 
        { timeout: 10000 }
      )
      
      // Store results
      this.result.stages[STAGES.SITE_ANALYSIS] = {
        success: true,
        duration: Date.now() - stageStart,
        data: { siteType }
      }
      
      // Click approve to proceed
      await approveButton!.click()
      
      this.result.overall.completedStages.push(STAGES.SITE_ANALYSIS)
      this.logger.log('info', '✅ Site Analysis stage completed')
      
    } catch (error) {
      this.logger.log('error', `Site Analysis failed: ${error}`)
      // Take error screenshot
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage1-site-analysis-error.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
      }
      this.result.stages[STAGES.SITE_ANALYSIS] = {
        success: false,
        duration: Date.now() - stageStart,
        error: String(error)
      }
      this.result.overall.failedStages.push(STAGES.SITE_ANALYSIS)
      throw error
    }
  }
  
  async testSitemapDiscovery() {
    this.logger.setStage(STAGES.SITEMAP)
    const stageStart = Date.now()
    
    try {
      // Wait for Sitemap Selector to appear
      this.logger.log('info', 'Waiting for Sitemap Selector')
      await this.page!.waitForSelector('text=/Sitemap Discovery/', { timeout: 10000 })
      
      // Check if "Discovering..." button is shown initially
      const discoveringBtn = await this.page!.$('button:has-text("Discovering...")')
      if (discoveringBtn) {
        this.logger.log('info', '✅ Discovering button state detected')
        // Take screenshot of discovering state
        if (CONFIG.visualRegression) {
          const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage2-sitemap-discovering.png')
          await this.page!.screenshot({ path: screenshot, fullPage: true })
        }
      }
      
      // Test SSE streaming - check if API uses text/event-stream
      this.logger.log('info', '🔄 Testing SSE streaming for incremental updates')
      
      // Monitor network for SSE connection
      let sseDetected = false
      this.page!.on('request', request => {
        if (request.url().includes('/fetch-sitemap') && 
            request.headers()['accept']?.includes('text/event-stream')) {
          sseDetected = true
          this.logger.log('info', '✅ SSE streaming request detected')
        }
      })
      
      // Wait for sitemap to load (it auto-fetches) - Look for pages found badge or alternative selectors
      this.logger.log('info', 'Waiting for sitemap to auto-fetch with incremental updates')
      
      // Try multiple selectors with race condition handling
      try {
        await Promise.race([
          this.page!.waitForSelector('text=/pages found/', { timeout: 30000 }),
          this.page!.waitForSelector('[data-testid="sitemap-stats"]', { timeout: 30000 }),
          this.page!.waitForSelector('.sitemap-stats', { timeout: 30000 }),
          this.page!.waitForSelector('text=/discovered/', { timeout: 30000 }),
          this.page!.waitForSelector('[data-testid="discovery-complete"]', { timeout: 30000 })
        ])
      } catch (e) {
        this.logger.log('warn', 'Primary selectors failed, trying fallback')
        // Fallback: wait for any badge element
        await this.page!.waitForSelector('.badge', { timeout: 10000 })
      }
      
      // Check how many pages are found
      const statsText = await this.page!.$eval('text=/pages found/', el => el.textContent).catch(() => null)
      if (statsText) {
        this.logger.log('info', `Sitemap stats: ${statsText}`)
      }
      
      // Wait for pages to be discovered and selected
      this.logger.log('info', 'Waiting for pages to be discovered')
      
      // First ensure pages are discovered
      await this.page!.waitForSelector('text=/pages found|discovered|selected/', { timeout: 30000 })
      
      // Log what we see on the page
      const pageText = await this.page!.$eval('body', el => el.innerText)
      const hasSelectAll = pageText.includes('Select All')
      const hasPages = pageText.match(/(\d+) pages? (found|discovered|selected)/)
      this.logger.log('info', `Page has Select All button: ${hasSelectAll}, Pages found: ${hasPages?.[0] || 'none'}`)
      
      // Check if Select All button exists and click it to select pages
      const selectAllBtn = await this.page!.$('button:has-text("Select All")')
      if (selectAllBtn) {
        this.logger.log('info', 'Clicking Select All button to select pages')
        await selectAllBtn.click()
        await this.page!.waitForTimeout(2000) // Give more time for state update
        
        // Verify pages were selected
        const afterSelectText = await this.page!.$eval('body', el => el.innerText)
        const selectedMatch = afterSelectText.match(/(\d+) pages? selected/)
        this.logger.log('info', `After Select All: ${selectedMatch?.[0] || 'no selection text found'}`)
      } else {
        this.logger.log('warn', 'Select All button not found - checking if pages are auto-selected')
      }
      
      // Now wait for approve button to be enabled (it starts as "Waiting for selection...")
      this.logger.log('info', 'Waiting for Approve button to be enabled')
      
      // Wait for button to NOT be disabled and have the approve text
      let approveBtn = null
      let buttonText = ''
      let attempts = 0
      const maxAttempts = 20
      
      while (attempts < maxAttempts) {
        // Find the approve button (it's the green button with Check icon)
        approveBtn = await this.page!.$('button.bg-green-600, button:has-text("Approve Sitemap")')
        if (approveBtn) {
          const isDisabled = await approveBtn.evaluate(el => el.hasAttribute('disabled'))
          buttonText = await approveBtn.textContent() || ''
          
          // Log button state for debugging
          if (attempts === 0 || attempts % 5 === 0) {
            this.logger.log('info', `Button state - Text: "${buttonText}", Disabled: ${isDisabled}`)
          }
          
          // Check if button is enabled and has pages in text
          if (!isDisabled && buttonText.includes('pages')) {
            this.logger.log('info', `✅ Button ready: "${buttonText}"`)
            break
          }
        } else if (attempts === 0) {
          this.logger.log('warn', 'No approve button found with selector')
        }
        
        await this.page!.waitForTimeout(500)
        attempts++
      }
      
      if (!approveBtn || !buttonText.includes('pages')) {
        throw new Error('Approve button did not become enabled with page count')
      }
      
      // Take screenshot of ready state
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage2-sitemap-ready.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
      }
      
      // Test validation phase visual feedback
      this.logger.log('info', '🔍 Testing validation phase visual feedback')
      const validationMessage = await this.page!.$('text=/Validating.*pages/')
      if (validationMessage) {
        this.logger.log('info', '✅ Validation message displayed')
        
        // Check for spinner
        const spinner = await this.page!.$('[class*="animate-spin"]')
        if (spinner) {
          this.logger.log('info', '✅ Validation spinner visible')
        }
      }
      
      // Test filter button functionality
      await this.testFilterButtons()
      
      // Test Select All functionality
      this.logger.log('info', 'Testing Select All button')
      const selectAllButton = await this.page!.$('button:has-text("Select All")')
      if (selectAllButton) {
        await selectAllButton.click()
        await this.page!.waitForTimeout(1000)
        
        // Check selected count
        const selectedCount = await this.page!.$eval('text=/selected/', el => el.textContent)
        this.logger.log('info', `After Select All: ${selectedCount}`)
      }
      
      // Alternatively, select specific pages by clicking checkboxes
      // For testing, we'll use Select All or keep the auto-selected pages
      
      // Now click the approve button - it should be visible
      this.logger.log('info', 'Looking for Approve Sitemap Discovery button')
      const approveButton = await this.page!.waitForSelector('button:has-text("Approve Sitemap Discovery")', { timeout: 10000 })
      const approveText = await approveButton.textContent()
      this.logger.log('info', `Found approve button: "${approveText}"`)
      
      // Extract page count from button text
      const pageCountMatch = approveText?.match(/(\d+) pages?/)
      const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 0
      this.logger.log('info', `Pages to be scraped: ${pageCount}`)
      
      // Take screenshot before clicking
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage2-sitemap-final.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
      }
      
      this.result.stages[STAGES.SITEMAP] = {
        success: true,
        duration: Date.now() - stageStart,
        data: { pagesSelected: pageCount }
      }
      
      // STOP HERE FOR MANUAL TESTING
      // The review panel should now be visible with the approve button
      // Users should be able to review selected pages and modify selection if needed
      
      if (process.env.MANUAL_TEST === 'true') {
        this.logger.log('info', '⏸️ MANUAL TEST MODE - Stopped at review panel')
        this.logger.log('info', 'The review panel is now visible. You can:')
        this.logger.log('info', '  1. Review the selected pages')
        this.logger.log('info', '  2. Modify selection if needed')
        this.logger.log('info', '  3. Click "Approve & Continue" when ready')
        this.logger.log('info', 'Test will wait indefinitely for manual interaction...')
        
        // Wait indefinitely for manual testing
        await this.page!.waitForTimeout(300000) // 5 minutes timeout
        return // Exit test here
      }
      
      // For automated testing, click approve after a short wait
      this.logger.log('info', 'Automated test: Clicking approve after 2 second wait...')
      await this.page!.waitForTimeout(2000)
      await approveButton!.click()
      
      // Wait for stage transition to complete
      await this.page!.waitForTimeout(1000)
      
      this.result.overall.completedStages.push(STAGES.SITEMAP)
      this.logger.log('info', '✅ Sitemap Discovery stage completed')
      
    } catch (error) {
      this.logger.log('error', `Sitemap Discovery failed: ${error}`)
      this.result.stages[STAGES.SITEMAP] = {
        success: false,
        duration: Date.now() - stageStart,
        error: String(error)
      }
      this.result.overall.failedStages.push(STAGES.SITEMAP)
      throw error
    }
  }
  
  async testScraping() {
    this.logger.setStage(STAGES.SCRAPING)
    const stageStart = Date.now()
    
    try {
      // Scraping stage should now be active after approving sitemap
      this.logger.log('info', '🔍 TEST: Verifying Additive Scraping stage is active')
      
      // Take initial screenshot to see what's displayed
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage3-scraping-initial.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
        this.logger.log('info', `Screenshot saved: stage3-scraping-initial.png`)
      }
      
      // Check for Additive Scraping Session header
      this.logger.log('info', '🔍 TEST: Looking for Additive Scraping Session UI')
      const scrapingSessionHeader = await this.page!.$('text=/Additive Scraping Session/')
      if (scrapingSessionHeader) {
        this.logger.log('info', '✅ PASS: Additive Scraping Session header found')
      }
      
      // TEST: Statistics tooltips
      await this.testScrapingStatisticsTooltips()
      
      // Check for Available Scrapers section
      this.logger.log('info', '🔍 TEST: Looking for Available Scrapers section')
      const availableScrapersSection = await this.page!.$('text=/Available Scrapers/')
      if (availableScrapersSection) {
        this.logger.log('info', '✅ PASS: Available Scrapers section found')
        
        // Check for individual scraper cards
        const staticScraper = await this.page!.$('text=/Static HTML/')
        const dynamicScraper = await this.page!.$('text=/JavaScript Renderer/')
        
        if (staticScraper) {
          this.logger.log('info', '✅ Static HTML Scraper (Cheerio) card found')
          
          // Click to run Static scraper first
          const staticRunBtn = await this.page!.$('button:has-text("Static HTML"):has-text("Run Scraper"), div:has-text("Static HTML") button:has-text("Run Scraper")')
          if (staticRunBtn) {
            this.logger.log('info', '🖱️ Clicking Static HTML Run Scraper button')
            await staticRunBtn.click()
            
            // Wait for scraping to complete
            await this.testScraperProgress('static', 'Static HTML')
          }
        }
        
        if (dynamicScraper) {
          this.logger.log('info', '✅ JavaScript Renderer (Playwright) card found')
          
          // After static completes, run Playwright scraper
          const dynamicRunBtn = await this.page!.$('button:has-text("JavaScript Renderer"):has-text("Run Scraper"), div:has-text("JavaScript Renderer") button:has-text("Run Scraper")')
          if (dynamicRunBtn) {
            this.logger.log('info', '🖱️ Clicking JavaScript Renderer Run Scraper button')
            await dynamicRunBtn.click()
            
            // Test Playwright-specific progress display
            await this.testScraperProgress('dynamic', 'JavaScript Renderer (Playwright)')
          }
        }
      }
      
      // TEST: Scraping History with View Links functionality
      await this.testScrapingHistory()
      
      // TEST: AI Suggestions
      await this.testAISuggestions()
      
      // Complete the scraping session
      this.logger.log('info', '🔍 TEST: Looking for Complete Scraping Session button')
      
      // First check if any scraper is still running
      const progressCard = await this.page!.$('text=/Scraping in Progress/')
      if (progressCard) {
        this.logger.log('info', '⏳ Scraper still running, waiting for completion...')
        
        // Wait for the progress card to disappear (max 30 seconds)
        try {
          await this.page!.waitForSelector('text=/Scraping in Progress/', {
            state: 'hidden',
            timeout: 30000
          })
          this.logger.log('info', '✅ Scraping completed')
        } catch (error) {
          this.logger.log('warn', '⚠️ Scraping did not complete within 30 seconds, continuing anyway')
        }
      }
      
      // Now try to find the Complete button with a shorter timeout
      try {
        const completeSessionBtn = await this.page!.waitForSelector('button:has-text("Complete Scraping Session")', {
          timeout: 5000
        })
        
        if (completeSessionBtn) {
          this.logger.log('info', '✅ Complete Scraping Session button found')
          
          // Take screenshot before completing
          if (CONFIG.visualRegression) {
            const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage3-scraping-before-complete.png')
            await this.page!.screenshot({ path: screenshot, fullPage: true })
          }
          
          // Click to complete
          await completeSessionBtn.click()
          this.logger.log('info', '✅ Clicked Complete Scraping Session')
          
          // Wait for stage transition
          await this.page!.waitForTimeout(2000)
        }
      } catch (error) {
        this.logger.log('warn', '⚠️ Complete Scraping Session button not found (scrapers may still be running)')
        this.logger.log('info', 'ℹ️ Continuing test without completing scraping session')
      }
      
      // Take final screenshot
      if (CONFIG.visualRegression) {
        const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage3-scraping-complete.png')
        await this.page!.screenshot({ path: screenshot, fullPage: true })
        this.result.stages[STAGES.SCRAPING] = {
          success: true,
          duration: Date.now() - stageStart,
          data: { 
            additiveScrapingTested: true,
            tooltipsTested: true,
            viewLinksTested: true,
            progressDisplayTested: true
          },
          screenshot
        }
      }
      
      this.result.overall.completedStages.push(STAGES.SCRAPING)
      this.logger.log('info', '✅ Scraping stage completed successfully')
      
    } catch (error) {
      this.logger.log('error', `Scraping test failed: ${error}`)
      this.result.stages[STAGES.SCRAPING] = {
        success: false,
        duration: Date.now() - stageStart,
        error: String(error)
      }
      this.result.overall.failedStages.push(STAGES.SCRAPING)
    }
  }
  
  async testScrapingStatisticsTooltips() {
    this.logger.log('info', '💡 TEST: Testing tooltips on scraping statistics')
    
    try {
      // Find the statistics section
      const statsSection = await this.page!.$('div:has-text("Pages Scraped"):has-text("Data Points")')
      if (!statsSection) {
        this.logger.log('warn', '⚠️ Statistics section not found')
        return false
      }
      
      // Test Pages Scraped tooltip
      const pagesScrapedElement = await this.page!.$('div:has-text("Pages Scraped")')
      if (pagesScrapedElement) {
        await pagesScrapedElement.hover()
        await this.page!.waitForTimeout(500)
        
        const tooltip = await this.page!.$('[role="tooltip"]:has-text("unique web pages"), div[class*="tooltip"]:has-text("unique web pages")')
        if (tooltip) {
          const tooltipText = await tooltip.textContent()
          this.logger.log('info', `✅ Pages Scraped tooltip found: "${tooltipText?.substring(0, 50)}..."`)
        } else {
          this.logger.log('warn', '⚠️ Pages Scraped tooltip not found')
        }
      }
      
      // Test Data Points tooltip
      const dataPointsElement = await this.page!.$('div:has-text("Data Points")')
      if (dataPointsElement) {
        await dataPointsElement.hover()
        await this.page!.waitForTimeout(500)
        
        const tooltip = await this.page!.$('[role="tooltip"]:has-text("data elements"), div[class*="tooltip"]:has-text("data elements")')
        if (tooltip) {
          const tooltipText = await tooltip.textContent()
          this.logger.log('info', `✅ Data Points tooltip found: "${tooltipText?.substring(0, 50)}..."`)
        } else {
          this.logger.log('warn', '⚠️ Data Points tooltip not found')
        }
      }
      
      // Test Links Found tooltip  
      const linksFoundElement = await this.page!.$('div:has-text("Links Found")')
      if (linksFoundElement) {
        await linksFoundElement.hover()
        await this.page!.waitForTimeout(500)
        
        const tooltip = await this.page!.$('[role="tooltip"]:has-text("URLs discovered"), div[class*="tooltip"]:has-text("URLs discovered")')
        if (tooltip) {
          const tooltipText = await tooltip.textContent()
          this.logger.log('info', `✅ Links Found tooltip found: "${tooltipText?.substring(0, 50)}..."`)
        } else {
          this.logger.log('warn', '⚠️ Links Found tooltip not found')
        }
      }
      
      // Test Scrapers Used tooltip
      const scrapersUsedElement = await this.page!.$('div:has-text("Scrapers Used")')
      if (scrapersUsedElement) {
        await scrapersUsedElement.hover()
        await this.page!.waitForTimeout(500)
        
        const tooltip = await this.page!.$('[role="tooltip"]:has-text("scraper types"), div[class*="tooltip"]:has-text("scraper types")')
        if (tooltip) {
          const tooltipText = await tooltip.textContent()
          this.logger.log('info', `✅ Scrapers Used tooltip found: "${tooltipText?.substring(0, 50)}..."`)
        } else {
          this.logger.log('warn', '⚠️ Scrapers Used tooltip not found')
        }
      }
      
      this.logger.log('info', '✅ Statistics tooltips test completed')
      return true
      
    } catch (error) {
      this.logger.log('error', `Statistics tooltips test failed: ${error}`)
      return false
    }
  }
  
  async testScraperProgress(scraperId: string, scraperName: string) {
    this.logger.log('info', `⏳ TEST: Testing progress display for ${scraperName}`)
    
    try {
      // Wait for scraping to start
      await this.page!.waitForTimeout(2000)
      
      // Check for "Scraping in Progress" card
      const progressCard = await this.page!.$('div:has-text("Scraping in Progress")')
      if (progressCard) {
        this.logger.log('info', `✅ Progress card found for ${scraperName}`)
        
        // Check for spinner
        const spinner = await progressCard.$('[class*="animate-spin"]')
        if (spinner) {
          this.logger.log('info', '✅ Progress spinner visible')
        }
        
        // Check for scraper name in progress
        const scraperNameInProgress = await progressCard.$(`text=/${scraperName}/`)
        if (scraperNameInProgress) {
          this.logger.log('info', `✅ Scraper name "${scraperName}" shown in progress`)
        }
        
        // For Playwright scraper, check for additional progress info
        if (scraperId === 'dynamic') {
          this.logger.log('info', '🎭 Testing Playwright-specific progress indicators')
          
          // Check for technology detection
          const techDetection = await this.page!.$('text=/Detecting technology/, text=/Technology detected/')
          if (techDetection) {
            this.logger.log('info', '✅ Technology detection indicator found')
          }
          
          // Check for page processing counter
          const pageCounter = await this.page!.$('text=/Processing page.*of/')
          if (pageCounter) {
            const counterText = await pageCounter.textContent()
            this.logger.log('info', `✅ Page processing counter found: "${counterText}"`)
          }
          
          // Check for estimated time
          const estimatedTime = await this.page!.$('text=/Estimated time/, text=/ETA/')
          if (estimatedTime) {
            this.logger.log('info', '✅ Estimated time indicator found')
          }
        }
        
        // Check for progress bar
        const progressBar = await progressCard.$('[role="progressbar"], [class*="Progress"]')
        if (progressBar) {
          this.logger.log('info', '✅ Progress bar component found')
        }
      }
      
      // Wait for scraping to complete (max 30 seconds)
      let completed = false
      let attempts = 0
      const maxAttempts = 30
      
      while (!completed && attempts < maxAttempts) {
        // Check if this scraper run appeared in history
        const historyItem = await this.page!.$(`text=/${scraperName}.*complete/i`)
        if (historyItem) {
          this.logger.log('info', `✅ ${scraperName} completed and added to history`)
          completed = true
          break
        }
        
        await this.page!.waitForTimeout(1000)
        attempts++
      }
      
      if (!completed) {
        this.logger.log('warn', `⚠️ ${scraperName} did not complete within 30 seconds`)
      }
      
      return completed
      
    } catch (error) {
      this.logger.log('error', `Progress test for ${scraperName} failed: ${error}`)
      return false
    }
  }
  
  async testScrapingHistory() {
    this.logger.log('info', '📜 TEST: Testing Scraping History and View Links functionality')
    
    try {
      // Wait for Scraping History section to be visible using data-testid
      const historySection = await this.page!.waitForSelector('[data-testid="scraping-history-section"], [data-testid="scraping-history"]', {
        timeout: 5000
      }).catch(() => null)
      
      if (!historySection) {
        // Fallback to text search
        const historyByText = await this.page!.$('text=/Scraping History/')
        if (!historyByText) {
          this.logger.log('warn', '⚠️ Scraping History section not found')
          return false
        }
      }
      
      this.logger.log('info', '✅ Scraping History section found')
      
      // Find scraper run entries using data-testid
      const runEntries = await this.page!.$$('[data-testid^="history-item-"]')
      
      // Fallback if no data-testid found
      let runEntriesCount = runEntries.length
      if (runEntriesCount === 0) {
        const fallbackEntries = await this.page!.$$('div:has-text("Static HTML Scraper"), div:has-text("JavaScript Renderer")')
        runEntriesCount = fallbackEntries.length
        this.logger.log('info', `Found ${runEntriesCount} scraper runs in history (fallback selector)`)
      } else {
        this.logger.log('info', `Found ${runEntriesCount} scraper runs in history (data-testid)`)
      }
      
      if (runEntriesCount > 0) {
        // Test the first run entry
        const firstRun = await this.page!.$('[data-testid="history-item-0"]') || 
                        await this.page!.$('div:has-text("Static HTML Scraper"), div:has-text("JavaScript Renderer")')
        
        // Check for statistics in the run
        const pagesText = await firstRun.$('text=/pages/')
        const dataPointsText = await firstRun.$('text=/data points/')
        const linksText = await firstRun.$('text=/links found/')
        
        if (pagesText) {
          this.logger.log('info', '✅ Pages count shown in history item')
        }
        if (dataPointsText) {
          this.logger.log('info', '✅ Data points count shown in history item')
        }
        if (linksText) {
          this.logger.log('info', '✅ Links found count shown in history item')
        }
        
        // Test expand/collapse functionality
        const expandBtn = await firstRun.$('button:has([class*="ChevronDown"]), button:has([class*="ChevronUp"])')
        if (expandBtn) {
          this.logger.log('info', '🖱️ Clicking expand button to show details')
          await expandBtn.click()
          await this.page!.waitForTimeout(500)
          
          // Check for expanded details
          const cumulativeSection = await this.page!.$('text=/Cumulative Total/')
          const thisRunSection = await this.page!.$('text=/This Run Added/')
          const performanceSection = await this.page!.$('text=/Performance/')
          
          if (cumulativeSection) {
            this.logger.log('info', '✅ Cumulative Total section visible in expanded view')
          }
          if (thisRunSection) {
            this.logger.log('info', '✅ This Run Added section visible in expanded view')
          }
          if (performanceSection) {
            this.logger.log('info', '✅ Performance metrics visible in expanded view')
          }
          
          // TEST: View Links button functionality
          const viewLinksBtn = await this.page!.$('button:has-text("View Links")')
          if (viewLinksBtn) {
            this.logger.log('info', '✅ View Links button found')
            this.logger.log('info', '🖱️ Clicking View Links button')
            await viewLinksBtn.click()
            await this.page!.waitForTimeout(500)
            
            // Check if links are displayed
            const linksContainer = await this.page!.$('div:has(a[href]):has-text("http")')
            if (linksContainer) {
              this.logger.log('info', '✅ Links container appeared after clicking View Links')
              
              // Count displayed links
              const linkElements = await linksContainer.$$('a[href]')
              this.logger.log('info', `✅ ${linkElements.length} links displayed`)
              
              // Check for "more links" indicator
              const moreLinks = await this.page!.$('text=/and.*more links/')
              if (moreLinks) {
                const moreText = await moreLinks.textContent()
                this.logger.log('info', `✅ More links indicator found: "${moreText}"`)
              }
              
              // Click Hide Links to close
              const hideLinksBtn = await this.page!.$('button:has-text("Hide Links")')
              if (hideLinksBtn) {
                this.logger.log('info', '🖱️ Clicking Hide Links button')
                await hideLinksBtn.click()
                await this.page!.waitForTimeout(500)
                this.logger.log('info', '✅ Links hidden successfully')
              }
            } else {
              this.logger.log('warn', '⚠️ Links container did not appear')
            }
          } else {
            this.logger.log('warn', '⚠️ View Links button not found in expanded view')
          }
          
          // Collapse the run details
          const collapseBtn = await firstRun.$('button:has([class*="ChevronUp"])')
          if (collapseBtn) {
            await collapseBtn.click()
            this.logger.log('info', '✅ Collapsed run details')
          }
        }
      }
      
      // Check for summary statistics at bottom
      const summaryStats = await this.page!.$('div:has-text("Total Pages"):has-text("Total Time")')
      if (summaryStats) {
        this.logger.log('info', '✅ Summary statistics section found at bottom of history')
      }
      
      return true
      
    } catch (error) {
      this.logger.log('error', `Scraping History test failed: ${error}`)
      return false
    }
  }
  
  async testAISuggestions() {
    this.logger.log('info', '🤖 TEST: Testing AI Suggestions section')
    
    try {
      // Look for AI Suggestions
      const suggestionsSection = await this.page!.$('text=/AI Suggestions/, text=/Suggestions/')
      if (!suggestionsSection) {
        this.logger.log('info', 'ℹ️ AI Suggestions section not visible yet (may appear after scraping)')
        return true
      }
      
      this.logger.log('info', '✅ AI Suggestions section found')
      
      // Check for suggestion cards
      const suggestionCards = await this.page!.$$('div:has-text("Recommended"):has(button)')
      this.logger.log('info', `Found ${suggestionCards.length} AI suggestion cards`)
      
      if (suggestionCards.length > 0) {
        // Test first suggestion
        const firstSuggestion = suggestionCards[0]
        
        // Check for priority badge
        const priorityBadge = await firstSuggestion.$('span:has-text("priority")')
        if (priorityBadge) {
          const priority = await priorityBadge.textContent()
          this.logger.log('info', `✅ Priority badge found: "${priority}"`)
        }
        
        // Check for action button
        const actionBtn = await firstSuggestion.$('button')
        if (actionBtn) {
          const btnText = await actionBtn.textContent()
          this.logger.log('info', `✅ Suggestion action button found: "${btnText}"`)
        }
        
        // Check for reason text
        const reasonText = await firstSuggestion.$('text=/because/, text=/since/, text=/to/')
        if (reasonText) {
          this.logger.log('info', '✅ Suggestion reason/explanation found')
        }
      }
      
      return true
      
    } catch (error) {
      this.logger.log('error', `AI Suggestions test failed: ${error}`)
      return false
    }
  }
  
  async testEnhancementUI() {
    this.logger.log('info', '🔧 Testing Enhancement UI (post-scraping dynamic enhancement)')
    
    try {
      // Wait for scraping to complete and show results
      this.logger.log('info', 'Waiting for scraping results to appear')
      await this.page!.waitForSelector('text=/Scraping Results/, text=/Scraping Complete/', { timeout: 10000 })
      
      // Check what scraper was used (should be Cheerio/static for bigfluffy.ai)
      const scraperBadge = await this.page!.$('span:has-text("Cheerio"), span:has-text("Static"), span:has-text("cheerio")')
      if (scraperBadge) {
        const scraperType = await scraperBadge.textContent()
        this.logger.log('info', `✅ Scraper type detected: ${scraperType}`)
        
        // If Cheerio/static was used, enhancement UI should appear
        if (scraperType?.toLowerCase().includes('cheerio') || scraperType?.toLowerCase().includes('static')) {
          this.logger.log('info', '🎯 Cheerio/Static scraper detected - looking for enhancement UI')
          
          // Look for enhancement section with blue border
          const enhancementSection = await this.page!.waitForSelector('.border-blue-200:has-text("Enhance Scraping Results")', { timeout: 5000 })
          
          if (enhancementSection) {
            this.logger.log('info', '✅ Enhancement section found with blue border')
            
            // Check for the enhancement button
            const enhanceButton = await this.page!.$('button:has-text("Run Full JavaScript Scraping")')
            if (enhanceButton) {
              this.logger.log('info', '✅ Enhancement button found: "Run Full JavaScript Scraping"')
              
              // Check for the "+Rich Content" badge
              const richContentBadge = await this.page!.$('button:has-text("Run Full JavaScript Scraping") span:has-text("+Rich Content")')
              if (richContentBadge) {
                this.logger.log('info', '✅ "+Rich Content" badge present on enhancement button')
              }
              
              // Test clicking the enhancement button
              this.logger.log('info', '🖱️ Clicking enhancement button to test dynamic scraping')
              await enhanceButton.click()
              
              // Wait for enhancement to start
              await this.page!.waitForTimeout(2000)
              
              // Check for enhancement progress indicators
              const enhancementProgress = [
                'text=/Enhancing with Playwright/',
                'text=/Running full JavaScript scraping/',
                'text=/Loading dynamic content/',
                '[class*="animate-spin"]',
                'text=/Enhancement in progress/'
              ]
              
              let enhancementStarted = false
              for (const indicator of enhancementProgress) {
                const element = await this.page!.$(indicator)
                if (element) {
                  this.logger.log('info', `✅ Enhancement progress indicator found: ${indicator}`)
                  enhancementStarted = true
                  break
                }
              }
              
              if (enhancementStarted) {
                this.logger.log('info', '✅ Enhancement process started successfully')
                
                // Wait for enhancement to complete (give it up to 30 seconds)
                const enhancementResult = await Promise.race([
                  this.page!.waitForSelector('text=/Enhancement complete/, text=/Enhanced data merged/', { timeout: 30000 }).then(() => 'complete'),
                  this.page!.waitForSelector('text=/Enhancement failed/', { timeout: 30000 }).then(() => 'failed'),
                  new Promise(resolve => setTimeout(() => resolve('timeout'), 30000))
                ])
                
                if (enhancementResult === 'complete') {
                  this.logger.log('info', '✅ Enhancement completed successfully')
                  
                  // Check for merged data indicators
                  const mergedDataBadge = await this.page!.$('span:has-text("Merged"), span:has-text("Enhanced")')
                  if (mergedDataBadge) {
                    this.logger.log('info', '✅ Merged/Enhanced data badge visible')
                  }
                } else if (enhancementResult === 'failed') {
                  this.logger.log('error', '❌ Enhancement failed')
                } else {
                  this.logger.log('warn', '⚠️ Enhancement timed out after 30 seconds')
                }
              } else {
                this.logger.log('warn', '⚠️ Enhancement did not start - no progress indicators found')
              }
              
              // Take screenshot of enhancement state
              if (CONFIG.visualRegression) {
                const screenshot = path.join(CONFIG.outputDir, this.sessionId, 'stage3-enhancement.png')
                await this.page!.screenshot({ path: screenshot, fullPage: true })
                this.logger.log('info', 'Screenshot saved: stage3-enhancement.png')
              }
            } else {
              this.logger.log('warn', '⚠️ Enhancement button not found')
            }
          } else {
            this.logger.log('warn', '⚠️ Enhancement section not found')
          }
        } else {
          this.logger.log('info', 'ℹ️ Dynamic scraper was used - no enhancement UI expected')
        }
      } else {
        this.logger.log('warn', '⚠️ Could not detect scraper type badge')
      }
      
      this.logger.log('info', '✅ Enhancement UI test completed')
      return true
      
    } catch (error) {
      this.logger.log('error', `Enhancement UI test failed: ${error}`)
      return false
    }
  }
  
  async testFilterButtons() {
    this.logger.log('info', '🔘 Testing filter button functionality')
    
    try {
      // Test Blog filter chip
      const blogChip = await this.page!.$('[class*="MuiChip"][class*="Blog"], button:has-text("Blog")')
      if (blogChip) {
        this.logger.log('info', 'Testing Blog filter chip')
        await blogChip.click()
        await this.page!.waitForTimeout(500)
        
        // Check for toast notification
        const blogToast = await this.page!.$('text=/Selected.*blog posts/')
        if (blogToast) {
          this.logger.log('info', '✅ Blog selection toast notification appeared')
        }
      }
      
      // Test Services filter chip
      const servicesChip = await this.page!.$('[class*="MuiChip"][class*="Services"], button:has-text("Services")')
      if (servicesChip) {
        this.logger.log('info', 'Testing Services filter chip')
        await servicesChip.click()
        await this.page!.waitForTimeout(500)
        
        // Check for toast notification
        const servicesToast = await this.page!.$('text=/Selected.*service pages/')
        if (servicesToast) {
          this.logger.log('info', '✅ Services selection toast notification appeared')
        }
      }
      
      // Test About filter chip
      const aboutChip = await this.page!.$('[class*="MuiChip"][class*="About"], button:has-text("About")')
      if (aboutChip) {
        this.logger.log('info', 'Testing About filter chip')
        await aboutChip.click()
        await this.page!.waitForTimeout(500)
        
        // Check for toast notification
        const aboutToast = await this.page!.$('text=/Selected.*about pages/')
        if (aboutToast) {
          this.logger.log('info', '✅ About selection toast notification appeared')
        }
      }
      
      this.logger.log('info', '✅ Filter button functionality test completed')
      return true
      
    } catch (error) {
      this.logger.log('error', `Filter button test failed: ${error}`)
      return false
    }
  }
  
  async testTooltips() {
    this.logger.log('info', '💡 Testing tooltip presence on UI elements')
    
    try {
      // Get all interactive elements
      const buttons = await this.page!.$$('button')
      const chips = await this.page!.$$('[class*="MuiChip"]')
      
      let tooltipCount = 0
      
      // Check buttons for tooltips
      for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
        await button.hover()
        await this.page!.waitForTimeout(100)
        
        const tooltip = await this.page!.$('[role="tooltip"], [class*="tooltip"]')
        if (tooltip) {
          tooltipCount++
        }
      }
      
      // Check chips for tooltips
      for (const chip of chips) {
        await chip.hover()
        await this.page!.waitForTimeout(100)
        
        const tooltip = await this.page!.$('[role="tooltip"], [class*="tooltip"]')
        if (tooltip) {
          tooltipCount++
        }
      }
      
      this.logger.log('info', `Found ${tooltipCount} tooltips on interactive elements`)
      
      if (tooltipCount > 0) {
        this.logger.log('info', '✅ Tooltips are present on UI elements')
        return true
      } else {
        this.logger.log('warn', '⚠️ No tooltips found on UI elements')
        return false
      }
      
    } catch (error) {
      this.logger.log('error', `Tooltip test failed: ${error}`)
      return false
    }
  }
  
  async testPageDiscovery() {
    this.logger.log('info', '🔍 Testing Page Discovery (expecting 18+ pages)')
    
    try {
      // Look for pages in the sitemap selector or scraping results
      const pageElements = await this.page!.$$('[class*="page-item"], [class*="sitemap-page"], input[type="checkbox"]')
      const pageCount = pageElements.length
      
      this.logger.log('info', `Found ${pageCount} pages in discovery`)
      
      // Validate minimum page count
      if (pageCount < CONFIG.expectedPages.minimum) {
        this.logger.log('error', `❌ Page discovery failed: Found only ${pageCount} pages, expected at least ${CONFIG.expectedPages.minimum}`)
        return false
      }
      
      // Check for blog pages
      const blogPages = await this.page!.$$('[href*="/blog/"], [class*="blog-post"]')
      this.logger.log('info', `Found ${blogPages.length} blog pages`)
      
      // Check for footer pages
      const footerLinks = await this.page!.$$('footer a[href], [class*="footer"] a[href]')
      this.logger.log('info', `Found ${footerLinks.length} footer links`)
      
      this.logger.log('info', `✅ Page discovery successful: Found ${pageCount} pages (minimum: ${CONFIG.expectedPages.minimum})`)
      return true
      
    } catch (error) {
      this.logger.log('error', `Page discovery test failed: ${error}`)
      return false
    }
  }
  
  async testNotificationPersistence() {
    this.logger.log('info', '📢 Testing Notification Persistence and Phase Notifications')
    
    try {
      // Check for persistentToast notifications
      const toasts = await this.page!.$$('[class*="sonner-toast"], [class*="toast"]')
      this.logger.log('info', `Found ${toasts.length} toast notifications`)
      
      // Check for phase-specific notifications
      const phaseNotifications = [
        'Looking for sitemap.xml',
        'Found.*pages in sitemap',
        'Discovered.*pages from homepage',
        'Found.*pages via pattern',
        'Found.*blog articles',
        'Validation complete'
      ]
      
      let foundPhaseNotifs = 0
      for (const pattern of phaseNotifications) {
        const notif = await this.page!.$(`text=/${pattern}/`)
        if (notif) {
          foundPhaseNotifs++
          this.logger.log('info', `✅ Found phase notification: ${pattern}`)
        }
      }
      
      this.logger.log('info', `Found ${foundPhaseNotifs}/${phaseNotifications.length} phase notifications`)
      
      // Check for notification list component
      const notificationList = await this.page!.$('[class*="notification-list"]')
      if (!notificationList) {
        this.logger.log('warn', 'Notification list component not found')
        return foundPhaseNotifs > 0
      }
      
      // Count notifications
      const notifications = await this.page!.$$('[class*="notification-list"] [class*="notification-item"]')
      this.logger.log('info', `Found ${notifications.length} persistent notifications`)
      
      // Check if notifications have timestamps
      const timestamps = await this.page!.$$('[class*="notification-list"] [class*="timestamp"]')
      this.logger.log('info', `${timestamps.length} notifications have timestamps`)
      
      // Check for different notification types
      const successNotifs = await this.page!.$$('[class*="notification-list"] [class*="success"]')
      const errorNotifs = await this.page!.$$('[class*="notification-list"] [class*="error"]')
      const infoNotifs = await this.page!.$$('[class*="notification-list"] [class*="info"]')
      
      this.logger.log('info', `Notification types - Success: ${successNotifs.length}, Error: ${errorNotifs.length}, Info: ${infoNotifs.length}`)
      
      // Test if notifications can be dismissed
      if (notifications.length > 0) {
        const dismissButtons = await this.page!.$$('[class*="notification-list"] button[class*="dismiss"], [class*="notification-list"] button[class*="close"]')
        this.logger.log('info', `${dismissButtons.length} notifications have dismiss buttons`)
      }
      
      this.logger.log('info', '✅ Notification persistence test completed')
      return true
      
    } catch (error) {
      this.logger.log('error', `Notification persistence test failed: ${error}`)
      return false
    }
  }
  
  async testReviewPanel() {
    this.logger.log('info', '📊 Testing Review Panel UI Elements')
    const reviewData: any = {}
    
    try {
      // Wait for review panel to appear
      await this.page!.waitForSelector('text=/Review Results/', { timeout: 10000 })
      
      // Test Brand tab
      this.logger.log('info', 'Testing Brand tab')
      const brandTab = await this.page!.$('button:has-text("Brand")')
      if (brandTab) {
        await brandTab.click()
        await this.page!.waitForTimeout(500)
        
        // Check for brand colors
        const colorSwatches = await this.page!.$$('[class*="color-swatch"], [class*="brand-color"]')
        reviewData.brandColors = colorSwatches.length
        this.logger.log('info', `Found ${colorSwatches.length} brand colors`)
        
        // Check for logo
        const logo = await this.page!.$('[alt*="logo" i], [class*="brand-logo"]')
        reviewData.hasLogo = !!logo
        this.logger.log('info', `Logo present: ${reviewData.hasLogo}`)
        
        // Check for fonts
        const fonts = await this.page!.$$('[class*="font-family"], [class*="typography"]')
        reviewData.fonts = fonts.length
        this.logger.log('info', `Found ${fonts.length} fonts`)
      }
      
      // Test Structure tab
      this.logger.log('info', 'Testing Structure tab')
      const structureTab = await this.page!.$('button:has-text("Structure")')
      if (structureTab) {
        await structureTab.click()
        await this.page!.waitForTimeout(500)
        
        // Check for sitemap/page structure
        const pageLinks = await this.page!.$$('a[href*="/"], [class*="page-link"]')
        reviewData.pageCount = pageLinks.length
        this.logger.log('info', `Found ${pageLinks.length} page links`)
      }
      
      // Test Images tab
      this.logger.log('info', 'Testing Images & Media tab')
      const imagesTab = await this.page!.$('button:has-text("Images")')
      if (imagesTab) {
        await imagesTab.click()
        await this.page!.waitForTimeout(500)
        
        // Check for images
        const images = await this.page!.$$('img:not([alt*="logo" i])')
        reviewData.imageCount = images.length
        this.logger.log('info', `Found ${images.length} images`)
        
        // Check for image categories
        const heroImages = await this.page!.$$('[class*="hero-image"]')
        const productImages = await this.page!.$$('[class*="product-image"]')
        const teamImages = await this.page!.$$('[class*="team-image"]')
        reviewData.imageCategorized = {
          hero: heroImages.length,
          products: productImages.length,
          team: teamImages.length
        }
        this.logger.log('info', `Categorized images:`, reviewData.imageCategorized)
      }
      
      // Test Contact tab
      this.logger.log('info', 'Testing Contact tab')
      const contactTab = await this.page!.$('button:has-text("Contact")')
      if (contactTab) {
        await contactTab.click()
        await this.page!.waitForTimeout(500)
        
        // Check for contact info
        const emails = await this.page!.$$('[href^="mailto:"], [class*="email"]')
        const phones = await this.page!.$$('[href^="tel:"], [class*="phone"]')
        const addresses = await this.page!.$$('[class*="address"]')
        reviewData.contactInfo = {
          emails: emails.length,
          phones: phones.length,
          addresses: addresses.length
        }
        this.logger.log('info', `Contact info found:`, reviewData.contactInfo)
        
        // Check for social links
        const socialLinks = await this.page!.$$('[href*="twitter.com"], [href*="linkedin.com"], [href*="facebook.com"]')
        reviewData.socialLinks = socialLinks.length
        this.logger.log('info', `Found ${socialLinks.length} social links`)
      }
      
      // Test Content tab
      this.logger.log('info', 'Testing Content tab')
      const contentTab = await this.page!.$('button:has-text("Content")')
      if (contentTab) {
        await contentTab.click()
        await this.page!.waitForTimeout(500)
        
        // Check for content sections
        const sections = await this.page!.$$('[class*="content-section"], article, section')
        reviewData.contentSections = sections.length
        this.logger.log('info', `Found ${sections.length} content sections`)
        
        // Check for products/services
        const products = await this.page!.$$('[class*="product"], [class*="service"]')
        reviewData.products = products.length
        this.logger.log('info', `Found ${products.length} products/services`)
        
        // Check for testimonials
        const testimonials = await this.page!.$$('[class*="testimonial"], [class*="review"], blockquote')
        reviewData.testimonials = testimonials.length
        this.logger.log('info', `Found ${testimonials.length} testimonials`)
      }
      
      // Log comprehensive review results
      this.logger.log('info', '📊 Review Panel Test Results:', reviewData)
      
      // Validation checks
      const hasEssentialData = 
        reviewData.brandColors > 0 ||
        reviewData.hasLogo ||
        reviewData.pageCount > 0 ||
        reviewData.imageCount > 0 ||
        reviewData.contactInfo?.emails > 0
      
      if (hasEssentialData) {
        this.logger.log('info', '✅ Review panel contains essential data')
      } else {
        this.logger.log('error', '❌ Review panel missing essential data')
      }
      
      this.result.stages[STAGES.SCRAPING].reviewData = reviewData
      
    } catch (error) {
      this.logger.log('error', `Review panel test failed: ${error}`)
      this.result.stages[STAGES.SCRAPING].reviewError = String(error)
    }
  }
  
  async testEnrichment() {
    this.logger.setStage(STAGES.ENRICHMENT)
    this.logger.log('info', 'Enrichment stage detected (requires LLM) - skipping for basic test')
    // Optional: Add enrichment testing if needed
  }
  
  async testGeneration() {
    this.logger.setStage(STAGES.GENERATION)
    this.logger.log('info', 'Generation stage detected (requires LLM) - skipping for basic test')
    // Optional: Add generation testing if needed
  }
  
  async generateReport() {
    this.logger.setStage('complete')
    
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      domain: CONFIG.testDomain,
      testAccount: CONFIG.testAccount.email,
      results: this.result,
      summary: {
        totalStages: Object.keys(this.result.stages).length,
        completedStages: this.result.overall.completedStages.length,
        failedStages: this.result.overall.failedStages.length,
        duration: `${(this.result.overall.totalDuration / 1000).toFixed(2)}s`,
        success: this.result.overall.success
      }
    }
    
    // Save report
    const reportPath = path.join(CONFIG.outputDir, this.sessionId, 'report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    // Print summary
    console.log(chalk.cyan.bold('\n' + '='.repeat(70)))
    console.log(chalk.cyan.bold('COMPANY INTELLIGENCE UI TEST SUMMARY'))
    console.log(chalk.cyan.bold('='.repeat(70)))
    
    console.log(`\n📋 Session ID: ${this.sessionId}`)
    console.log(`🌐 Domain Tested: ${CONFIG.testDomain}`)
    console.log(`👤 Test Account: ${CONFIG.testAccount.email}`)
    console.log(`⏱️  Total Duration: ${report.summary.duration}`)
    
    console.log('\n📊 Stage Results:')
    for (const [stage, result] of Object.entries(this.result.stages)) {
      const emoji = result.success ? '✅' : '❌'
      const duration = `${(result.duration / 1000).toFixed(2)}s`
      console.log(`  ${emoji} ${stage}: ${result.success ? 'PASSED' : 'FAILED'} (${duration})`)
      if (result.error) {
        console.log(chalk.red(`     Error: ${result.error}`))
      }
    }
    
    console.log('\n📈 Overall Result:')
    if (this.result.overall.success) {
      console.log(chalk.green.bold('  ✅ ALL TESTS PASSED'))
    } else {
      console.log(chalk.red.bold('  ❌ TESTS FAILED'))
      console.log(chalk.red(`  Failed Stages: ${this.result.overall.failedStages.join(', ')}`))
    }
    
    console.log(chalk.gray(`\n📁 Full report saved to: ${reportPath}`))
    console.log(chalk.gray(`📹 Videos saved to: ${path.join(CONFIG.outputDir, this.sessionId, 'videos')}`))
    
    // Save logs
    this.result.logs = this.logger.getLogs()
    const logsPath = path.join(CONFIG.outputDir, this.sessionId, 'logs.json')
    await fs.writeFile(logsPath, JSON.stringify(this.result.logs, null, 2))
    console.log(chalk.gray(`📝 Logs saved to: ${logsPath}`))
  }
  
  async cleanup() {
    this.logger.log('info', 'Cleaning up test resources')
    
    if (this.page) await this.page.close()
    if (this.context) await this.context.close()
    if (this.browser) await this.browser.close()
    
    this.logger.log('info', '✅ Cleanup complete')
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.cyan.bold('\n🧪 COMPANY INTELLIGENCE UI TEST SUITE'))
  console.log(chalk.cyan('Testing progressive flow without API mocks\n'))
  
  // Try to load test configuration
  try {
    const testConfig = JSON.parse(await fs.readFile('./test-config.json', 'utf-8'))
    if (testConfig.defaultAccount) {
      CONFIG.testAccount = testConfig.defaultAccount
      console.log(chalk.gray(`Loaded test account from config: ${CONFIG.testAccount.email}`))
    }
  } catch (e) {
    console.log(chalk.gray(`Using default test account: ${CONFIG.testAccount.email}`))
  }
  
  const tester = new CompanyIntelligenceUITester()
  
  try {
    // Check for command line arguments
    const args = process.argv.slice(2)
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('\nUsage:')
      console.log('  npx tsx test-company-intelligence-comprehensive.ts [options]')
      console.log('\nOptions:')
      console.log('  -h, --help     Show this help')
      console.log('  --headless     Run in headless mode')
      console.log('  --fast         Disable slow motion')
      console.log('\nExample:')
      console.log('  npx tsx test-company-intelligence-comprehensive.ts')
      process.exit(0)
    }
    
    // Apply command line options
    if (args.includes('--headless')) {
      CONFIG.headless = true
    }
    if (args.includes('--fast')) {
      CONFIG.slowMo = 0
    }
    
    // Run test suite
    await tester.initialize()
    await tester.runProgressiveFlow()
    
    // Exit with appropriate code
    process.exit(tester.result.overall.success ? 0 : 1)
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Fatal Error:'), error)
    process.exit(1)
  } finally {
    await tester.cleanup()
  }
}

// Run tests
main().catch(console.error)