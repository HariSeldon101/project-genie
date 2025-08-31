import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '*.config.ts',
        '*.config.js',
        '.next/**',
        'scripts/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,
    threads: true,
    mockReset: true,
    restoreMocks: true,
    env: {
      NODE_ENV: 'test',
      USE_MOCK_LLM: 'true',
      MOCK_SUPABASE: 'true'
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