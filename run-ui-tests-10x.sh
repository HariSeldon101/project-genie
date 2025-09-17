#!/bin/bash

# Run UI Tests 10 Times with Screenshot Capture
# This script runs the comprehensive UI test 10 times and captures screenshots

echo "🚀 Starting 10x UI Test Run with Screenshot Capture"
echo "================================================"

# Create results directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="test-results-10x-${TIMESTAMP}"
mkdir -p "${RESULTS_DIR}"

# Summary file
SUMMARY_FILE="${RESULTS_DIR}/test-summary.txt"
echo "Test Run Summary - $(date)" > "${SUMMARY_FILE}"
echo "================================" >> "${SUMMARY_FILE}"

# Counter for successful runs
SUCCESS_COUNT=0
FAIL_COUNT=0

# Run test 10 times
for i in {1..10}; do
    echo ""
    echo "🔄 Test Run ${i}/10 starting..."
    echo "--------------------------------"
    
    # Create iteration directory
    ITER_DIR="${RESULTS_DIR}/run-${i}"
    mkdir -p "${ITER_DIR}"
    
    # Run the test and capture output
    OUTPUT_FILE="${ITER_DIR}/output.log"
    
    echo "Running test iteration ${i}..." 
    npx tsx test-company-intelligence-comprehensive.ts --headless --fast > "${OUTPUT_FILE}" 2>&1
    TEST_EXIT_CODE=$?
    
    # Check if test passed or failed
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo "✅ Test Run ${i}: PASSED"
        echo "Run ${i}: PASSED" >> "${SUMMARY_FILE}"
        ((SUCCESS_COUNT++))
        
        # Copy screenshots from latest test-results folder
        LATEST_RESULTS=$(ls -td test-results/*/ 2>/dev/null | head -1)
        if [ -n "${LATEST_RESULTS}" ]; then
            echo "   Copying screenshots from ${LATEST_RESULTS}"
            cp -r "${LATEST_RESULTS}"*.png "${ITER_DIR}/" 2>/dev/null || true
            
            # List captured screenshots
            SCREENSHOTS=$(ls "${ITER_DIR}"/*.png 2>/dev/null | wc -l)
            echo "   Captured ${SCREENSHOTS} screenshots"
        fi
    else
        echo "❌ Test Run ${i}: FAILED"
        echo "Run ${i}: FAILED (exit code: ${TEST_EXIT_CODE})" >> "${SUMMARY_FILE}"
        ((FAIL_COUNT++))
        
        # Still try to copy any screenshots that were captured
        LATEST_RESULTS=$(ls -td test-results/*/ 2>/dev/null | head -1)
        if [ -n "${LATEST_RESULTS}" ]; then
            cp -r "${LATEST_RESULTS}"*.png "${ITER_DIR}/" 2>/dev/null || true
        fi
    fi
    
    # Extract key information from output
    echo "   Extracting test metrics..."
    grep -E "(✅|❌|⚠️|TEST:|PASS:|FAIL:)" "${OUTPUT_FILE}" | tail -20 > "${ITER_DIR}/key-results.txt"
    
    # Small delay between runs
    if [ $i -lt 10 ]; then
        echo "   Waiting 3 seconds before next run..."
        sleep 3
    fi
done

echo ""
echo "============================================"
echo "📊 FINAL RESULTS"
echo "============================================"
echo "✅ Successful Runs: ${SUCCESS_COUNT}/10"
echo "❌ Failed Runs: ${FAIL_COUNT}/10"
echo ""
echo "Results saved to: ${RESULTS_DIR}"
echo ""

# Write final summary
echo "" >> "${SUMMARY_FILE}"
echo "Final Statistics:" >> "${SUMMARY_FILE}"
echo "=================" >> "${SUMMARY_FILE}"
echo "Success Rate: ${SUCCESS_COUNT}/10 ($(( SUCCESS_COUNT * 10 ))%)" >> "${SUMMARY_FILE}"
echo "Failure Rate: ${FAIL_COUNT}/10 ($(( FAIL_COUNT * 10 ))%)" >> "${SUMMARY_FILE}"

# Count total screenshots
TOTAL_SCREENSHOTS=$(find "${RESULTS_DIR}" -name "*.png" 2>/dev/null | wc -l)
echo "Total Screenshots Captured: ${TOTAL_SCREENSHOTS}" >> "${SUMMARY_FILE}"

# List all screenshot files
echo "" >> "${SUMMARY_FILE}"
echo "Screenshots Captured:" >> "${SUMMARY_FILE}"
echo "===================" >> "${SUMMARY_FILE}"
find "${RESULTS_DIR}" -name "*.png" -exec basename {} \; | sort | uniq -c >> "${SUMMARY_FILE}"

cat "${SUMMARY_FILE}"

echo ""
echo "✅ Test suite completed!"
echo "📁 Full results available in: ${RESULTS_DIR}"