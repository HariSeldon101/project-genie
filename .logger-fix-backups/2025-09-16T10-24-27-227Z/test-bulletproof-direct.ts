#!/usr/bin/env npx tsx
/**
 * Direct Database Test for Bulletproof Architecture
 * Tests the core components directly without API authentication
 */

import { SessionManager } from './lib/company-intelligence/core/session-manager'
import { UnifiedScraperExecutor } from './lib/company-intelligence/core/unified-scraper-executor'
import { DataAggregator } from './lib/company-intelligence/core/data-aggregator'
import { ExecutionLockManager } from './lib/company-intelligence/core/execution-lock-manager'
import { permanentLogger } from './lib/utils/permanent-logger'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') })
dotenv.config({ path: path.resolve('.env') })

const TEST_DOMAIN = 'bigfluffy.ai'
const TEST_COMPANY = 'BigFluffy'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow
  }
  console.log(`${typeColors[type]}${message}${colors.reset}`)
}

async function testSessionManager() {
  log('\n🔍 Testing SessionManager (Bulletproof Database Operations)...', 'info')
  
  try {
    const sessionManager = new SessionManager()
    
    // Test session creation
    log('  Creating session...', 'info')
    const session = await sessionManager.createSession(TEST_COMPANY, TEST_DOMAIN)
    
    if (!session) {
      throw new Error('Failed to create session')
    }
    
    log(`  ✅ Session created: ${session.id}`, 'success')
    log(`     Company: ${session.company_name}`, 'info')
    log(`     Domain: ${session.domain}`, 'info')
    log(`     Version: ${session.version}`, 'info')
    log(`     Phase: ${session.phase}`, 'info')
    
    // Test session retrieval
    log('  Testing session retrieval...', 'info')
    const retrieved = await sessionManager.getSession(session.id)
    
    if (!retrieved || retrieved.id !== session.id) {
      throw new Error('Failed to retrieve session')
    }
    
    log('  ✅ Session retrieved successfully', 'success')
    
    // Test optimistic locking
    log('  Testing optimistic locking...', 'info')
    const updated = await sessionManager.updateSession(
      session.id,
      { phase: 2 },
      session.version
    )
    
    if (!updated || updated.version !== session.version + 1) {
      throw new Error('Optimistic locking failed')
    }
    
    log(`  ✅ Optimistic locking works (version ${session.version} → ${updated.version})`, 'success')
    
    return session.id
  } catch (error) {
    log(`  ❌ SessionManager test failed: ${error}`, 'error')
    return null
  }
}

async function testUnifiedScraperExecutor(sessionId: string) {
  log('\n🔍 Testing UnifiedScraperExecutor (Coordinated Execution)...', 'info')
  
  try {
    const executor = new UnifiedScraperExecutor()
    
    // First, add some URLs to the session
    const sessionManager = new SessionManager()
    const session = await sessionManager.getSession(sessionId)
    if (session) {
      await sessionManager.updateSession(
        sessionId,
        { discovered_urls: [`https://${TEST_DOMAIN}`, `https://${TEST_DOMAIN}/about`] },
        session.version
      )
    }
    
    // Test execution
    log('  Executing scraper...', 'info')
    const result = await executor.execute({
      sessionId,
      domain: TEST_DOMAIN,
      scraperId: 'static',
      urls: [],  // Will be retrieved from session
      options: { maxPages: 1 }
    })
    
    if (!result.success) {
      throw new Error('Execution failed')
    }
    
    log('  ✅ Scraper executed successfully', 'success')
    log(`     Session: ${result.sessionId}`, 'info')
    log(`     Scraper: ${result.scraperId}`, 'info')
    log(`     New Pages: ${result.newData.pages}`, 'info')
    log(`     Data Points: ${result.newData.dataPoints}`, 'info')
    log(`     Duration: ${result.newData.duration}ms`, 'info')
    
    // Test available scrapers
    const scrapers = executor.getAvailableScrapers()
    log(`  ✅ Available scrapers: ${scrapers.map(s => s.id).join(', ')}`, 'success')
    
    return true
  } catch (error) {
    log(`  ❌ UnifiedScraperExecutor test failed: ${error}`, 'error')
    return false
  }
}

async function testDataAggregator() {
  log('\n🔍 Testing DataAggregator (URL-based Deduplication)...', 'info')
  
  try {
    const aggregator = new DataAggregator()
    
    // Test data aggregation with duplicate URLs
    const existingData = {
      pages: new Map([
        ['https://example.com', { url: 'https://example.com', title: 'Home' }]
      ]),
      stats: {
        totalPages: 1,
        totalLinks: 5,
        uniqueTechnologies: 2,
        phaseCounts: { 'phase1': 1 },
        dataPoints: 10
      },
      extractedData: {
        titles: ['Home'],
        descriptions: [],
        technologies: ['React', 'Node.js'],
        emails: [],
        phones: [],
        addresses: [],
        socialLinks: [],
        people: [],
        products: [],
        services: [],
        pricing: []
      }
    }
    
    const newData = {
      pages: [
        { url: 'https://example.com', title: 'Home Updated' },  // Duplicate URL
        { url: 'https://example.com/about', title: 'About' }   // New URL
      ]
    }
    
    const aggregated = aggregator.aggregateData(existingData, newData, 'phase2')
    
    log('  ✅ Data aggregated successfully', 'success')
    log(`     Total Pages: ${aggregated.stats.totalPages} (no duplicates)`, 'info')
    log(`     Phase Counts: ${JSON.stringify(aggregated.stats.phaseCounts)}`, 'info')
    log(`     Data Points: ${aggregated.stats.dataPoints}`, 'info')
    
    // Verify URL-based deduplication
    if (aggregated.pages.size !== 2) {
      throw new Error(`Expected 2 unique URLs, got ${aggregated.pages.size}`)
    }
    
    log('  ✅ URL-based deduplication working correctly', 'success')
    
    return true
  } catch (error) {
    log(`  ❌ DataAggregator test failed: ${error}`, 'error')
    return false
  }
}

async function testExecutionLockManager(sessionId: string) {
  log('\n🔍 Testing ExecutionLockManager (Duplicate Prevention)...', 'info')
  
  try {
    const lockManager = new ExecutionLockManager()
    
    const urls = [`https://${TEST_DOMAIN}`]
    
    // Test lock acquisition
    log('  Acquiring lock...', 'info')
    const lock1 = await lockManager.acquireLock(sessionId, 'test-scraper', urls)
    
    if (!lock1) {
      throw new Error('Failed to acquire lock')
    }
    
    log(`  ✅ Lock acquired: ${lock1.id}`, 'success')
    
    // Test duplicate prevention
    log('  Testing duplicate prevention...', 'info')
    const lock2 = await lockManager.acquireLock(sessionId, 'test-scraper', urls)
    
    if (lock2) {
      throw new Error('Should not acquire duplicate lock!')
    }
    
    log('  ✅ Duplicate lock prevented', 'success')
    
    // Test lock release
    log('  Releasing lock...', 'info')
    const released = await lockManager.releaseLock(lock1.id)
    
    if (!released) {
      throw new Error('Failed to release lock')
    }
    
    log('  ✅ Lock released successfully', 'success')
    
    // Test can acquire after release
    const lock3 = await lockManager.acquireLock(sessionId, 'test-scraper', urls)
    
    if (!lock3) {
      throw new Error('Should be able to acquire after release')
    }
    
    log('  ✅ Can acquire new lock after release', 'success')
    
    // Cleanup
    await lockManager.releaseLock(lock3.id)
    
    return true
  } catch (error) {
    log(`  ❌ ExecutionLockManager test failed: ${error}`, 'error')
    return false
  }
}

async function cleanupTestSession(sessionId: string | null) {
  if (!sessionId) return
  
  try {
    const sessionManager = new SessionManager()
    const session = await sessionManager.getSession(sessionId)
    if (session) {
      // Delete through database
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      await supabase
        .from('company_intelligence_sessions')
        .delete()
        .eq('id', sessionId)
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'info')
  log('🚀 BULLETPROOF ARCHITECTURE DIRECT TEST', 'info')
  log('Testing core components without API authentication', 'info')
  log('='.repeat(60), 'info')
  
  permanentLogger.info('Starting direct component tests', {
    category: 'DIRECT_TEST',
    timestamp: new Date().toISOString()
  })
  
  let sessionId: string | null = null
  const results: Record<string, boolean> = {}
  
  // Run tests
  sessionId = await testSessionManager()
  results.sessionManager = !!sessionId
  
  if (sessionId) {
    results.unifiedScraperExecutor = await testUnifiedScraperExecutor(sessionId)
    results.executionLockManager = await testExecutionLockManager(sessionId)
  }
  
  results.dataAggregator = await testDataAggregator()
  
  // Cleanup
  await cleanupTestSession(sessionId)
  
  // Summary
  log('\n' + '='.repeat(60), 'info')
  log('📊 TEST RESULTS SUMMARY', 'info')
  log('='.repeat(60), 'info')
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌'
    const color = passed ? 'success' : 'error'
    log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`, color)
  })
  
  log('\n' + '='.repeat(60), 'info')
  const allPassed = passed === total
  const finalMessage = allPassed 
    ? '🎉 ALL TESTS PASSED! Bulletproof architecture components are working!'
    : `⚠️ ${passed}/${total} tests passed. Some components need attention.`
  
  log(finalMessage, allPassed ? 'success' : 'warning')
  log('='.repeat(60), 'info')
  
  permanentLogger.info('Tests completed', { category: 'DIRECT_TEST', passed,
    total,
    results })
  
  process.exit(allPassed ? 0 : 1)
}

// Run the tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error}`, 'error')
  process.exit(1)
})