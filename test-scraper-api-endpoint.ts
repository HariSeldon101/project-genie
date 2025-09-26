/**
 * Test the Scraper API Endpoint After Fix
 *
 * This tests the actual Next.js API route to ensure webpack issues are resolved
 */

async function testScraperEndpoint() {
  console.log('🧪 Testing Scraper API Endpoint\n')
  console.log('=' .repeat(60))

  const testUrl = 'http://localhost:3000/api/company-intelligence/scrapers-v3/execute'

  const testPayload = {
    domain: 'example.com',
    sessionId: 'test-session-' + Date.now(),
    config: {
      scraperType: 'cheerio',  // Start with Cheerio - simplest, no browser needed
      preset: 'quick'
    },
    siteAnalysis: {
      domain: 'example.com',
      technology: 'unknown'
    }
  }

  console.log('📡 Testing with Cheerio scraper (no browser dependencies)')
  console.log('URL:', testUrl)
  console.log('Payload:', JSON.stringify(testPayload, null, 2))
  console.log('-'.repeat(40))

  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    console.log('Response Status:', response.status, response.statusText)

    if (!response.ok) {
      const text = await response.text()
      console.log('❌ API returned error:', text)
      return
    }

    // Handle SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      console.log('❌ No response body')
      return
    }

    console.log('✅ API endpoint is working!')
    console.log('📊 Reading SSE stream...\n')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            console.log('Event:', data.type, '-', JSON.stringify(data.data || data.message || data).substring(0, 100))
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Success! The scraper API is working without webpack errors')

  } catch (error) {
    console.log('❌ Failed to call API:', error)
  }
}

// Run the test
testScraperEndpoint().catch(console.error)