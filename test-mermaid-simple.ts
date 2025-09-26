#!/usr/bin/env npx tsx

/**
 * Simple Mermaid Test - Check basic functionality
 */

import { validateMermaidSyntax } from './lib/utils/mermaid-helpers'

async function runTests() {
  console.log('\n🧪 Testing Mermaid Validation\n')

  // Test 1: Valid flowchart
  const flowchart = `flowchart TD
    A[Start] --> B[Process]
    B --> C[End]`

  const result1 = await validateMermaidSyntax(flowchart)
  console.log('Flowchart validation:', result1.isValid ? '✅ PASS' : '❌ FAIL')
  if (!result1.isValid) console.log('  Errors:', result1.errors)

  // Test 2: Valid pie chart
  const pie = `pie title Budget
    "Development" : 45
    "Testing" : 20
    "Infrastructure" : 35`

  const result2 = await validateMermaidSyntax(pie)
  console.log('Pie chart validation:', result2.isValid ? '✅ PASS' : '❌ FAIL')
  if (!result2.isValid) console.log('  Errors:', result2.errors)

  // Test 3: Valid timeline
  const timeline = `timeline
    title Project Timeline
    2024 Q1 : Project Start
    2024 Q2 : Phase 1 Complete
    2024 Q3 : Mid-year Review
    2024 Q4 : Project Complete`

  const result3 = await validateMermaidSyntax(timeline)
  console.log('Timeline validation:', result3.isValid ? '✅ PASS' : '❌ FAIL')
  if (!result3.isValid) console.log('  Errors:', result3.errors)

  // Test 4: Valid gantt
  const gantt = `gantt
    title Project Schedule
    dateFormat YYYY-MM-DD
    section Development
    Planning           :done, 2024-01-01, 30d
    Implementation     :active, 2024-02-01, 60d
    Testing           :2024-04-01, 30d`

  const result4 = await validateMermaidSyntax(gantt)
  console.log('Gantt validation:', result4.isValid ? '✅ PASS' : '❌ FAIL')
  if (!result4.isValid) console.log('  Errors:', result4.errors)

  // Test 5: Invalid diagram (should fail)
  const invalid = `invalid diagram syntax here`
  const result5 = await validateMermaidSyntax(invalid)
  console.log('Invalid diagram validation:', !result5.isValid ? '✅ PASS (correctly failed)' : '❌ FAIL (should have failed)')

  console.log('\n✨ Basic validation tests complete!\n')
}

runTests().catch(console.error)