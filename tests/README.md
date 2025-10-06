# Document Generation Test Suite

## Overview

This test suite provides comprehensive testing for the document generation system, including both mock tests (for fast, reliable CI/CD) and real API tests (for verifying actual behavior).

## Test Structure

```
tests/
├── unit/                 # Fast unit tests with mocks
├── integration/          # API endpoint tests (mocked)
├── e2e/                  # End-to-end workflow tests (mocked)
├── api/                  # REAL API integration tests
├── utils/                # Test utilities and helpers
├── setup.ts              # Mock test setup
├── setup.api.ts          # Real API test setup
├── run-all-tests.sh      # Run mock test suite
└── run-api-tests.sh      # Run real API tests
```

## Two Testing Approaches

### 1. Mock Tests (Default)
Fast, reliable tests that don't consume API credits. Perfect for:
- Continuous Integration (CI/CD)
- Pre-commit hooks
- Regular development
- Testing logic and flow

```bash
npm test              # Run all mock tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
npm run test:watch    # Watch mode for development
```

### 2. Real API Tests
Tests with actual API calls to verify real-world behavior. Use for:
- Verifying GPT-5 nano works correctly
- Testing provider fallback chains
- Debugging API-specific issues
- Pre-release validation

```bash
npm run test:api:quick  # Quick test (2-3 API calls)
npm run test:api:full   # Full test suite (10-15 API calls)
npm run test:api:watch  # Watch mode (use carefully!)
```

## What Gets Tested

### Document Generation
- ✅ All 5 AGILE documents (Charter, Backlog, Sprint Plan, Technical Landscape, Comparable Projects)
- ✅ All 6 PRINCE2 documents (PID, Business Case, Risk Register, Project Plan, Technical Landscape, Comparable Projects)
- ✅ All 5 HYBRID documents (Charter, Risk Register, Backlog, Technical Landscape, Comparable Projects)

### API Behavior (Real Tests Only)
- ✅ GPT-5 nano configuration (temperature=1, max_completion_tokens)
- ✅ Empty response handling
- ✅ Timeout scenarios (90 second limit)
- ✅ Retry logic (3 attempts)
- ✅ Provider fallback chain (vercel-ai → openai → mock)
- ✅ Rate limiting handling

### Data Security
- ✅ PII sanitization
- ✅ Placeholder token usage ([STAKEHOLDER_1], etc.)
- ✅ Security event logging

### Performance
- ✅ Single document < 30 seconds
- ✅ Full generation < 90 seconds
- ✅ Concurrent request handling
- ✅ Memory usage

## Running Tests

### Quick Start (Mock Tests)
```bash
# Run all tests with coverage
npm run test:all

# Run specific test suite
npm run test:unit

# Interactive UI
npm run test:ui
```

### Real API Testing
```bash
# Interactive menu
./tests/run-api-tests.sh

# Direct commands
npm run test:api:quick   # Minimal API calls
npm run test:api:full    # Complete test suite
```

## Environment Setup

### For Mock Tests
No configuration needed! Tests run with mock providers automatically.

### For Real API Tests
Add to `.env.local`:
```env
OPENAI_API_KEY=sk-...      # For GPT-5 nano
GROQ_API_KEY=gsk_...        # For fallback testing
DEEPSEEK_API_KEY=sk-...     # Optional alternative
```

## Test Results

### Mock Tests
- **Speed**: < 2 minutes for full suite
- **Reliability**: 100% deterministic
- **Coverage**: 80%+ code coverage
- **Cost**: Free

### Real API Tests
- **Speed**: 1-5 minutes depending on mode
- **Reliability**: Depends on API availability
- **Coverage**: Actual API behavior
- **Cost**: ~$0.01-0.05 per full run (GPT-5 nano)

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:all  # Mock tests only
```

### Pre-commit Hook
```bash
# .husky/pre-commit
npm run test:unit
```

## Debugging

### View Test Logs
```bash
# Real-time logging
npm run test:api:watch

# Check document logger
cat tests/api-test-results.log

# Debug specific test
npm run test:debug
```

### Common Issues

**GPT-5 nano returns empty response**
- Check temperature is set to 1
- Verify max_completion_tokens (not max_tokens)
- Check API key is valid

**Tests timeout**
- Reduce token limits in test project data
- Check API rate limits
- Use quick mode instead of full

**Fallback not working**
- Verify fallback providers have valid keys
- Check provider order in config
- Review error logs for specific failures

## Best Practices

1. **Use mock tests for development** - They're fast and free
2. **Run API tests before releases** - Verify real behavior
3. **Monitor API usage** - Check your provider dashboard
4. **Keep test data minimal** - Reduce token consumption
5. **Run API tests sequentially** - Avoid rate limits
6. **Use quick mode first** - Validate setup before full run

## Test Metrics

Current test coverage:
- **Unit Tests**: 15 tests
- **Integration Tests**: 10 tests  
- **E2E Tests**: 12 tests
- **API Tests**: 8 tests (real)

Total: **45 test scenarios**

## Contributing

When adding new tests:
1. Add mock version in appropriate directory
2. Add real API test if behavior differs
3. Update this README
4. Run full suite before committing