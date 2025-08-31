import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'

// Load real environment variables for API testing
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Set up API test environment
beforeAll(() => {
  // Ensure we're in test mode but using real APIs
  process.env.NODE_ENV = 'test'
  process.env.USE_MOCK_LLM = 'false'
  process.env.MOCK_SUPABASE = 'true'
  
  // Check for API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY && 
                    process.env.OPENAI_API_KEY !== 'test-openai-key'
  const hasGroq = !!process.env.GROQ_API_KEY && 
                  process.env.GROQ_API_KEY !== 'test-groq-key'
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY && 
                      process.env.DEEPSEEK_API_KEY !== 'test-deepseek-key'
  
  console.log('\n🔑 API Test Environment:')
  console.log(`   OpenAI: ${hasOpenAI ? '✅ Available' : '❌ Not configured'}`)
  console.log(`   Groq: ${hasGroq ? '✅ Available' : '❌ Not configured'}`)
  console.log(`   DeepSeek: ${hasDeepSeek ? '✅ Available' : '❌ Not configured'}`)
  console.log('')
  
  if (!hasOpenAI && !hasGroq && !hasDeepSeek) {
    console.warn('⚠️  WARNING: No API keys found!')
    console.warn('   Tests will use mock providers only.')
    console.warn('   Add API keys to .env.local to test real API calls.')
    process.env.USE_MOCK_LLM = 'true'
  }
  
  // Set conservative limits for API testing
  process.env.LLM_MAX_TOKENS = '2000' // Limit token usage
  process.env.LLM_TEMPERATURE = '1' // Required for GPT-5
  
  // Enable detailed logging for debugging
  process.env.DEBUG = 'true'
})

afterEach(() => {
  // Clear any test-specific mocks
  vi.clearAllMocks()
})

afterAll(() => {
  // Log final test summary
  console.log('\n✅ API tests completed')
  
  // Restore mocks
  vi.restoreAllMocks()
})

// Mock Supabase even for API tests (we're testing LLM, not database)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: { id: 'api-test-user' } }, 
        error: null 
      }),
      getSession: vi.fn().mockResolvedValue({ 
        data: { 
          session: { 
            access_token: 'api-test-token',
            user: { id: 'api-test-user' }
          } 
        }, 
        error: null 
      })
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      execute: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}))