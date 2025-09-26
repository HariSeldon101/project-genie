#!/usr/bin/env node

/**
 * Direct test of the discovery API to see console.log output
 */

async function testDiscovery() {
  const domain = 'bigfluffy.ai'

  console.log('\n🚀 Testing discovery for:', domain)
  console.log('=' .repeat(60))

  try {
    // First, get authentication
    const authResponse = await fetch('http://localhost:3000/api/auth/user', {
      method: 'GET',
      headers: {
        'Cookie': 'supabase-auth-token=' // Will use anon key
      }
    })

    console.log('Auth response status:', authResponse.status)

    // Call the discovery endpoint
    console.log('\n📡 Calling /api/company-intelligence/fetch-sitemap...\n')

    const response = await fetch('http://localhost:3000/api/company-intelligence/fetch-sitemap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        domain: domain,
        maxUrls: 100,
        validateUrls: false,
        enableIntelligence: false
      })
    })

    console.log('\n📨 Response Status:', response.status)
    console.log('Response Headers:', Object.fromEntries(response.headers))

    if (!response.ok) {
      const error = await response.text()
      console.error('\n❌ Error Response:', error)
      return
    }

    const result = await response.json()

    console.log('\n✅ Discovery Result:')
    console.log('  - Domain:', result.domain)
    console.log('  - Pages found:', result.pages?.length || 0)
    console.log('  - Sitemap found:', result.sitemapFound)
    console.log('  - Success:', result.success)
    console.log('  - Session ID:', result.sessionId)

    if (result.pages?.length > 0) {
      console.log('\n📄 First 5 URLs discovered:')
      result.pages.slice(0, 5).forEach((page, i) => {
        console.log(`  ${i + 1}. ${page.url || page}`)
      })
    }

    if (result.timing) {
      console.log('\n⏱️  Timing:')
      console.log('  - Parse:', result.timing.parseMs, 'ms')
      console.log('  - Discovery:', result.timing.discoveryMs, 'ms')
      console.log('  - Total:', result.timing.totalMs, 'ms')
    }

  } catch (error) {
    console.error('\n💥 Failed to test discovery:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
console.log('🧪 Discovery API Direct Test')
testDiscovery()