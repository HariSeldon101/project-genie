import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.api.ts'],
    include: ['tests/api/**/*.test.ts'],
    testTimeout: 120000, // 2 minutes for API calls
    hookTimeout: 120000,
    isolate: true,
    threads: false, // Run sequentially to avoid rate limits
    maxConcurrency: 1, // One test at a time for API calls
    bail: 1, // Stop on first failure to save API credits
    env: {
      NODE_ENV: 'test',
      USE_MOCK_LLM: 'false', // Use real LLM
      MOCK_SUPABASE: 'true' // Still mock database
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
      '@/app': path.resolve(__dirname, './app'),
      '@/tests': path.resolve(__dirname, './tests')
    }
  }
})