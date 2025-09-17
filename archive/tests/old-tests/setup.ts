import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test') })

// Set up global test environment
beforeAll(() => {
  // Ensure we're in test mode
  process.env.NODE_ENV = 'test'
  process.env.USE_MOCK_LLM = 'true'
  process.env.MOCK_SUPABASE = 'true'
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    // Keep error for debugging
    error: console.error,
  }
})

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup
  vi.restoreAllMocks()
})

// Mock fetch globally for API tests
global.fetch = vi.fn()

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      getSession: vi.fn().mockResolvedValue({ 
        data: { 
          session: { 
            access_token: 'test-token',
            user: { id: 'test-user-id' }
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

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'test-id' })
}))