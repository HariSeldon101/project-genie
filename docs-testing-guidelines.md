# Testing Guidelines

## 🚨 CRITICAL: MANDATORY TESTING REQUIREMENTS
**TESTING IS NOT OPTIONAL - IT IS MANDATORY FOR ALL DEVELOPMENT**

### ❌ ABSOLUTELY FORBIDDEN:
1. **NEVER CREATE AD-HOC TEST FILES** - Only enhance existing test files
2. **NEVER CREATE NEW TEST FILES** - Update existing ones to match UI evolution
3. **NEVER SKIP TESTING** - Tests must run before EVERY commit
4. **NEVER DECREASE COVERAGE** - Only increase or maintain
5. **NEVER MARK AS "FIXED" UNTIL TESTS PASS** - Always verify fixes work

### ✅ MANDATORY TESTING RULES:
1. **ONLY USE test-company-intelligence-comprehensive.ts** for Company Intelligence testing
2. **ENHANCE EXISTING TESTS** when UI changes - don't create new test files
3. **RUN TESTS BEFORE COMMITS** - Configure pre-commit hooks
4. **MAINTAIN 100% COVERAGE** for all UI components

## Test Commands

### Primary Testing Commands
```bash
# Company Intelligence comprehensive test
npx tsx test-company-intelligence-comprehensive.ts

# E2E Tests
npm run test:e2e

# All Tests (run before commit)
npm run test:all

# Unit Tests
npm run test:unit

# Integration Tests
npm run test:integration
```

### Default Test Configuration
- **Default test domain**: bigfluffy.ai
- **Test timeout**: 30 seconds per test
- **Retry attempts**: 3 for flaky tests
- **Parallel execution**: Enabled for unit tests

## Test Accounts

### Available Test Accounts in Supabase
```
Primary:
- stusandboxacc@gmail.com (Google OAuth)
- test@project-genie.com (Email/Password)

Secondary:
- test@bigfluffy.ai
- test@projectgenie.dev

Admin:
- admin@test.com (Admin role for testing)
```

## Pre-commit Hook Setup

### Install Pre-commit Hook
```bash
# Create .husky/pre-commit file
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before commit
npm run test:all || {
  echo "❌ Tests failed. Commit aborted."
  exit 1
}

# Run linting
npm run lint || {
  echo "❌ Linting failed. Commit aborted."
  exit 1
}

# Type check
npm run type-check || {
  echo "❌ Type check failed. Commit aborted."
  exit 1
}
```

## Test Structure Pattern

### Component Test Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { ComponentName } from '@/components/component-name'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
    permanentLogger.breadcrumb('test_setup', 'Setting up test')
  })
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks()
  })
  
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
  
  it('should handle user interactions', async () => {
    render(<ComponentName onAction={mockAction} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockAction).toHaveBeenCalled()
    })
  })
  
  it('should display error state', () => {
    render(<ComponentName error="Test error" />)
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })
  
  it('should have proper accessibility', () => {
    const { container } = render(<ComponentName />)
    // Check for ARIA labels
    expect(screen.getByLabelText('Submit')).toBeInTheDocument()
    // Check for semantic HTML
    expect(container.querySelector('main')).toBeInTheDocument()
  })
})
```

### API Route Test Template
```typescript
import { POST } from '@/app/api/endpoint/route'
import { NextRequest } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

jest.mock('@/lib/repositories/entity-repository')

describe('API Endpoint', () => {
  it('should handle valid requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
  })
  
  it('should handle errors properly', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    })
    
    const response = await POST(request)
    
    expect(response.status).toBe(400)
    expect(permanentLogger.captureError).toHaveBeenCalled()
  })
})
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    // Login if needed
    await page.fill('[name="email"]', 'test@project-genie.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
  })
  
  test('should complete full user journey', async ({ page }) => {
    // Navigate to feature
    await page.click('text=Dashboard')
    await expect(page).toHaveURL(/.*dashboard/)
    
    // Interact with feature
    await page.click('button:has-text("Create New")')
    await page.fill('[name="title"]', 'Test Title')
    await page.click('button:has-text("Save")')
    
    // Verify result
    await expect(page.locator('text=Test Title')).toBeVisible()
  })
  
  test('should handle errors gracefully', async ({ page }) => {
    // Trigger error condition
    await page.route('/api/data', route => {
      route.abort()
    })
    
    await page.click('button:has-text("Load Data")')
    
    // Verify error handling
    await expect(page.locator('text=Failed to load')).toBeVisible()
  })
})
```

## Testing Best Practices

### 1. Test Real Behaviors, Not Implementation
```typescript
// ❌ BAD - Testing implementation details
expect(component.state.isLoading).toBe(true)

// ✅ GOOD - Testing user-visible behavior
expect(screen.getByRole('progressbar')).toBeInTheDocument()
```

### 2. Use Testing Library Queries Correctly
```typescript
// Priority order for queries:
// 1. getByRole (best for accessibility)
screen.getByRole('button', { name: 'Submit' })

// 2. getByLabelText (for form fields)
screen.getByLabelText('Email Address')

// 3. getByText (for non-interactive elements)
screen.getByText('Welcome')

// 4. getByTestId (last resort)
screen.getByTestId('custom-element')
```

### 3. Test Error Scenarios
```typescript
it('should handle network errors', async () => {
  // Mock network failure
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
  
  render(<DataComponent />)
  
  await waitFor(() => {
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })
  
  // Verify error was logged
  expect(permanentLogger.captureError).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Error),
    expect.any(Object)
  )
})
```

### 4. Test Accessibility
```typescript
it('should be keyboard navigable', async () => {
  render(<FormComponent />)
  
  const firstInput = screen.getByLabelText('Name')
  const secondInput = screen.getByLabelText('Email')
  const submitButton = screen.getByRole('button', { name: 'Submit' })
  
  // Tab navigation
  firstInput.focus()
  userEvent.tab()
  expect(secondInput).toHaveFocus()
  
  userEvent.tab()
  expect(submitButton).toHaveFocus()
  
  // Enter key submission
  userEvent.keyboard('{Enter}')
  expect(mockSubmit).toHaveBeenCalled()
})
```

### 5. Test Mobile Responsiveness
```typescript
it('should be responsive on mobile', () => {
  // Set mobile viewport
  global.innerWidth = 375
  
  render(<ResponsiveComponent />)
  
  // Mobile-specific elements should be visible
  expect(screen.getByTestId('mobile-menu')).toBeInTheDocument()
  
  // Desktop elements should be hidden
  expect(screen.queryByTestId('desktop-nav')).not.toBeInTheDocument()
})
```

## Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%
- **UI Components**: 100%

### Running Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Check coverage thresholds
npm run test:coverage -- --coverage-threshold=80
```

## Test Data Management

### Mock Data Guidelines
```typescript
// Create reusable test fixtures
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}

// Use factories for dynamic data
export function createMockEntity(overrides = {}) {
  return {
    id: nanoid(),
    name: 'Test Entity',
    status: 'active',
    created_at: new Date().toISOString(),
    ...overrides
  }
}
```

### Database Seeding for E2E Tests
```typescript
// seed-test-db.ts
import { createClient } from '@supabase/supabase-js'

async function seedTestDatabase() {
  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_KEY!
  )
  
  // Clear existing test data
  await supabase.from('entities').delete().match({ test_data: true })
  
  // Insert test data
  await supabase.from('entities').insert([
    { name: 'Test Entity 1', test_data: true },
    { name: 'Test Entity 2', test_data: true }
  ])
}
```

## Debugging Failed Tests

### Common Issues and Solutions

#### 1. Async Test Failures
```typescript
// ❌ BAD - Missing await
it('should load data', () => {
  render(<AsyncComponent />)
  expect(screen.getByText('Data')).toBeInTheDocument() // Fails!
})

// ✅ GOOD - Proper async handling
it('should load data', async () => {
  render(<AsyncComponent />)
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})
```

#### 2. State Update Warnings
```typescript
// Wrap state updates in act()
import { act } from '@testing-library/react'

it('should update state', async () => {
  const { result } = renderHook(() => useCustomHook())
  
  await act(async () => {
    result.current.updateState('new value')
  })
  
  expect(result.current.state).toBe('new value')
})
```

#### 3. Memory Leaks
```typescript
// Clean up after tests
afterEach(() => {
  jest.clearAllMocks()
  jest.clearAllTimers()
  cleanup() // From @testing-library/react
})
```

## CI/CD Integration

### GitHub Actions Test Workflow
```yaml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:all
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Review Checklist

Before submitting code:
- [ ] All tests pass locally
- [ ] No console errors or warnings
- [ ] Coverage meets minimum thresholds
- [ ] New features have corresponding tests
- [ ] Error scenarios are tested
- [ ] Accessibility tests included
- [ ] Mobile responsiveness verified
- [ ] E2E tests updated if UI changed
- [ ] Test data cleaned up properly
- [ ] No hardcoded test values
