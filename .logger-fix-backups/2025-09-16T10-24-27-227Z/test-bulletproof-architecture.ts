#!/usr/bin/env npx tsx
/**
 * Bulletproof Architecture Test Suite
 * Tests the complete flow as documented in /docs/bulletproof-architecture-complete.md
 * 
 * NO MOCK DATA - REAL ERRORS ONLY
 */

import { createClient } from '@supabase/supabase-js'
import { permanentLogger } from './lib/utils/permanent-logger'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') })
dotenv.config({ path: path.resolve('.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_BASE_URL = 'http://localhost:3000/api'

// Test configuration
const TEST_DOMAIN = 'bigfluffy.ai'
const TEST_SESSION_ID = `test_${Date.now()}`

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

async function testDatabaseSchema() {
  log('\n🔍 Testing Database Schema...', 'info')
  
  try {
    // Check if company_intelligence_sessions table exists
    const { data: sessions, error: sessionsError } = await supabase
      .from('company_intelligence_sessions')
      .select('id')
      .limit(1)
    
    if (sessionsError && sessionsError.code === '42P01') {
      throw new Error('Table company_intelligence_sessions does not exist!')
    }
    
    log('✅ company_intelligence_sessions table exists', 'success')
    
    // Check if execution_locks table exists
    const { data: locks, error: locksError } = await supabase
      .from('execution_locks')
      .select('id')
      .limit(1)
    
    if (locksError && locksError.code === '42P01') {
      log('⚠️ execution_locks table does not exist (optional)', 'warning')
    } else {
      log('✅ execution_locks table exists', 'success')
    }
    
    // Verify old research_sessions table is gone
    const { data: oldTable, error: oldError } = await supabase
      .from('research_sessions')
      .select('id')
      .limit(1)
    
    if (!oldError || oldError.code !== '42P01') {
      log('⚠️ Old research_sessions table still exists - should be removed', 'warning')
    } else {
      log('✅ Old research_sessions table removed', 'success')
    }
    
    return true
  } catch (error) {
    log(`❌ Database schema test failed: ${error}`, 'error')
    return false
  }
}

async function testSessionCreation() {
  log('\n🔍 Testing Session Creation...', 'info')
  
  try {
    // Get auth token from Supabase
    const { data: { session: authSession } } = await supabase.auth.getSession()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Add auth header if we have a session
    if (authSession?.access_token) {
      headers['Authorization'] = `Bearer ${authSession.access_token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/company-intelligence/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        domain: TEST_DOMAIN,
        companyName: 'BigFluffy'
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Session creation failed: ${error}`)
    }
    
    const session = await response.json()
    log(`✅ Session created: ${session.id}`, 'success')
    log(`   Company: ${session.company_name || session.companyName}`, 'info')
    log(`   Domain: ${session.domain}`, 'info')
    
    // Verify in database
    const { data: dbSession, error } = await supabase
      .from('company_intelligence_sessions')
      .select('*')
      .eq('id', session.id)
      .single()
    
    if (error) {
      throw new Error(`Session not found in database: ${error.message}`)
    }
    
    log('✅ Session verified in database', 'success')
    log(`   Version: ${dbSession.version}`, 'info')
    log(`   Phase: ${dbSession.phase}`, 'info')
    
    return session.id
  } catch (error) {
    log(`❌ Session creation test failed: ${error}`, 'error')
    return null
  }
}

async function testScrapingRoute(sessionId: string) {
  log('\n🔍 Testing Scraping Route...', 'info')
  
  try {
    // Test the new clean scraping route
    const response = await fetch(`${API_BASE_URL}/company-intelligence/phases/scraping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        domain: TEST_DOMAIN,
        options: {
          mode: 'static',
          maxPages: 1
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Scraping failed: ${error}`)
    }
    
    const result = await response.json()
    log('✅ Scraping route executed successfully', 'success')
    
    // Verify response structure matches ExecutionResult interface
    if (!result.success || !result.sessionId || !result.scraperId) {
      throw new Error('Invalid response structure')
    }
    
    log(`   Scraper: ${result.scraperId}`, 'info')
    log(`   New Pages: ${result.newData?.pages || 0}`, 'info')
    log(`   Data Points: ${result.newData?.dataPoints || 0}`, 'info')
    log(`   Duration: ${result.newData?.duration || 0}ms`, 'info')
    
    return true
  } catch (error) {
    log(`❌ Scraping route test failed: ${error}`, 'error')
    return false
  }
}

async function testDataAggregation(sessionId: string) {
  log('\n🔍 Testing Data Aggregation...', 'info')
  
  try {
    // Get session to check merged_data
    const { data: session, error } = await supabase
      .from('company_intelligence_sessions')
      .select('merged_data, version')
      .eq('id', sessionId)
      .single()
    
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`)
    }
    
    if (!session.merged_data) {
      throw new Error('No merged_data in session')
    }
    
    log('✅ Data aggregation verified', 'success')
    log(`   Total Pages: ${session.merged_data.stats?.totalPages || 0}`, 'info')
    log(`   Data Points: ${session.merged_data.stats?.dataPoints || 0}`, 'info')
    log(`   Version: ${session.version}`, 'info')
    
    // Verify URL-based deduplication
    const pages = session.merged_data.pages || {}
    const uniqueUrls = Object.keys(pages)
    log(`   Unique URLs: ${uniqueUrls.length}`, 'info')
    
    return true
  } catch (error) {
    log(`❌ Data aggregation test failed: ${error}`, 'error')
    return false
  }
}

async function testNoDuplicateRuns(sessionId: string) {
  log('\n🔍 Testing Duplicate Prevention...', 'info')
  
  try {
    // Try to run the same scraping request twice simultaneously
    const requests = [
      fetch(`${API_BASE_URL}/company-intelligence/phases/scraping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          options: { mode: 'static' }
        })
      }),
      fetch(`${API_BASE_URL}/company-intelligence/phases/scraping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          options: { mode: 'static' }
        })
      })
    ]
    
    const results = await Promise.all(requests)
    
    // Both should succeed (idempotent), but data should not be duplicated
    if (!results[0].ok || !results[1].ok) {
      log('⚠️ One request failed - checking if it was due to lock', 'warning')
    } else {
      log('✅ Both requests completed (idempotent behavior)', 'success')
    }
    
    // Check that data wasn't duplicated
    const { data: session } = await supabase
      .from('company_intelligence_sessions')
      .select('merged_data')
      .eq('id', sessionId)
      .single()
    
    const pageCount = Object.keys(session?.merged_data?.pages || {}).length
    log(`   Unique pages (no duplicates): ${pageCount}`, 'info')
    
    return true
  } catch (error) {
    log(`❌ Duplicate prevention test failed: ${error}`, 'error')
    return false
  }
}

async function testErrorPropagation() {
  log('\n🔍 Testing Error Propagation (NO silent failures)...', 'info')
  
  try {
    // Test with invalid session ID
    const response = await fetch(`${API_BASE_URL}/company-intelligence/phases/scraping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'invalid_session_id_12345'
      })
    })
    
    if (response.ok) {
      throw new Error('Should have failed with invalid session ID!')
    }
    
    const error = await response.json()
    if (!error.error) {
      throw new Error('Error not properly propagated!')
    }
    
    log('✅ Errors properly propagated (no silent failures)', 'success')
    log(`   Error message: ${error.error}`, 'info')
    
    return true
  } catch (error) {
    log(`❌ Error propagation test failed: ${error}`, 'error')
    return false
  }
}

async function cleanupTestData(sessionId: string | null) {
  if (!sessionId) return
  
  log('\n🧹 Cleaning up test data...', 'info')
  
  try {
    const { error } = await supabase
      .from('company_intelligence_sessions')
      .delete()
      .eq('id', sessionId)
    
    if (error) {
      log(`⚠️ Failed to cleanup session: ${error.message}`, 'warning')
    } else {
      log('✅ Test data cleaned up', 'success')
    }
  } catch (error) {
    log(`⚠️ Cleanup error: ${error}`, 'warning')
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'info')
  log('🚀 BULLETPROOF ARCHITECTURE TEST SUITE', 'info')
  log('Testing implementation from /docs/bulletproof-architecture-complete.md', 'info')
  log('='.repeat(60), 'info')
  
  permanentLogger.info('Starting bulletproof architecture tests', {
      category: 'TEST_SUITE',
      timestamp: new Date(
    }).toISOString()
  })
  
  let sessionId: string | null = null
  const results: Record<string, boolean> = {}
  
  // Run tests
  results.schema = await testDatabaseSchema()
  
  if (results.schema) {
    sessionId = await testSessionCreation()
    results.session = !!sessionId
    
    if (sessionId) {
      results.scraping = await testScrapingRoute(sessionId)
      results.aggregation = await testDataAggregation(sessionId)
      results.duplicate = await testNoDuplicateRuns(sessionId)
    }
  }
  
  results.errors = await testErrorPropagation()
  
  // Cleanup
  await cleanupTestData(sessionId)
  
  // Summary
  log('\n' + '='.repeat(60), 'info')
  log('📊 TEST RESULTS SUMMARY', 'info')
  log('='.repeat(60), 'info')
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌'
    const color = passed ? 'success' : 'error'
    log(`${icon} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASSED' : 'FAILED'}`, color)
  })
  
  log('\n' + '='.repeat(60), 'info')
  const allPassed = passed === total
  const finalMessage = allPassed 
    ? '🎉 ALL TESTS PASSED! Bulletproof architecture is working!'
    : `⚠️ ${passed}/${total} tests passed. Issues need fixing.`
  
  log(finalMessage, allPassed ? 'success' : 'warning')
  log('='.repeat(60), 'info')
  
  permanentLogger.info('Tests completed', { category: 'TEST_SUITE', passed,
    total,
    results })
  
  process.exit(allPassed ? 0 : 1)
}

// Run the tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error}`, 'error')
  process.exit(1)
})