#!/bin/bash

# Automated Test Suite for Document Generation
# This script runs all tests without requiring manual intervention

echo "🧪 Document Generation Automated Test Suite"
echo "==========================================="
echo ""
echo "This suite tests:"
echo "✓ All 5 AGILE documents generation"
echo "✓ All 6 PRINCE2 documents generation" 
echo "✓ All 5 HYBRID documents generation"
echo "✓ Technical Landscape in all methodologies"
echo "✓ Comparable Projects in all methodologies"
echo "✓ GPT-5 nano configuration"
echo "✓ Retry logic and fallback content"
echo "✓ PII sanitization"
echo "✓ Performance benchmarks"
echo ""
echo "Starting tests..."
echo ""

# Set test environment
export NODE_ENV=test
export USE_MOCK_LLM=true
export MOCK_SUPABASE=true

# Run all test suites
echo "📁 Running Unit Tests..."
npm run test:unit 2>&1 | grep -E "(PASS|FAIL|✓|×|Test Files)" || true
echo ""

echo "📁 Running Integration Tests..."
npm run test:integration 2>&1 | grep -E "(PASS|FAIL|✓|×|Test Files)" || true
echo ""

echo "📁 Running E2E Tests..."
npm run test:e2e 2>&1 | grep -E "(PASS|FAIL|✓|×|Test Files)" || true
echo ""

echo "📁 Running Full Test Suite with Coverage..."
npm run test:all 2>&1 | tail -20
echo ""

echo "==========================================="
echo "✅ Test suite complete!"
echo ""
echo "To run tests interactively: npm run test:ui"
echo "To run specific tests: npm run test:unit"
echo "To watch for changes: npm run test:watch"