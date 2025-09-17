#!/bin/bash

# Real API Test Runner
# WARNING: This script makes REAL API calls and consumes credits!

echo "🚨 REAL API TEST SUITE 🚨"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will make REAL API calls!"
echo "   - Consumes API credits"
echo "   - Tests with actual GPT-5 nano"
echo "   - Verifies real document generation"
echo ""
echo "Test modes available:"
echo "  1. Quick test (2-3 API calls only)"
echo "  2. Full test (all methodologies)"
echo "  3. Cancel"
echo ""
read -p "Select mode (1/2/3): " mode

case $mode in
  1)
    echo ""
    echo "Running QUICK API tests..."
    echo "This will make approximately 2-3 API calls"
    echo ""
    npm run test:api:quick
    ;;
  2)
    echo ""
    echo "⚠️  Running FULL API test suite!"
    echo "This will make approximately 10-15 API calls"
    read -p "Are you sure? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
      npm run test:api:full
    else
      echo "Cancelled."
      exit 0
    fi
    ;;
  3)
    echo "Cancelled."
    exit 0
    ;;
  *)
    echo "Invalid selection"
    exit 1
    ;;
esac

echo ""
echo "=================================="
echo "API tests complete!"
echo ""
echo "💡 Tips:"
echo "  - Check logs at: tests/api-test-results.log"
echo "  - Monitor API usage in your provider dashboard"
echo "  - Use mock tests (npm test) for regular development"