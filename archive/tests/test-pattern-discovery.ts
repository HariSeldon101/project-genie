#!/usr/bin/env tsx
/**
 * Quick test to verify Pattern Discovery is working
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function testPatternDiscovery() {
  console.log('Testing Pattern Discovery fix...')
  
  const response = await fetch('http://localhost:3002/api/company-intelligence/fetch-sitemap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain: 'bigfluffy.ai',
      enableIntelligence: false
    })
  })

  if (!response.ok) {
    console.error('❌ Request failed:', response.status)
    return
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  if (!reader) {
    console.error('❌ No response body')
    return
  }

  let buffer = ''
  const phaseCounts: Record<string, number> = {}
  
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
          console.log('📡 Event:', data.type, data.phase || '', data.message || '')
          
          if (data.type === 'phase-complete') {
            console.log(`✅ ${data.phase}: ${data.pagesFound} pages found`)
            phaseCounts[data.phase] = data.pagesFound
          } else if (data.type === 'phase-start') {
            console.log(`🚀 Starting ${data.phase}...`)
          } else if (data.type === 'error') {
            console.error(`❌ Error: ${data.message}`)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
  
  console.log('\n📊 Final Results:')
  console.log('================')
  for (const [phase, count] of Object.entries(phaseCounts)) {
    const icon = count > 0 ? '✅' : '❌'
    console.log(`${icon} ${phase}: ${count} pages`)
  }
  
  // Check if Pattern Discovery found pages
  if (phaseCounts['pattern-discovery'] && phaseCounts['pattern-discovery'] > 0) {
    console.log('\n🎉 SUCCESS: Pattern Discovery is working!')
  } else {
    console.log('\n❌ FAILED: Pattern Discovery still returning 0 pages')
  }
}

testPatternDiscovery().catch(console.error)