/**
 * Automated test to compare document viewer and PDF output
 * Ensures consistency across all rendering methods
 */

import { UnifiedPIDFormatter } from '@/lib/documents/formatters/unified-pid-formatter'
import { UnifiedBusinessCaseFormatter } from '@/lib/documents/formatters/unified-business-case-formatter'
import { createUnifiedFormatter } from '@/lib/pdf-generation/unified-formatter-adapter'
import { JSDOM } from 'jsdom'
import DOMPurify from 'isomorphic-dompurify'

// Sample test data
const samplePIDData = {
  projectDefinition: {
    background: 'Test project background',
    objectives: ['Objective 1', 'Objective 2'],
    deliverables: ['Deliverable 1', 'Deliverable 2'],
    scope: 'Project scope description',
    exclusions: ['Exclusion 1', 'Exclusion 2']
  },
  businessCase: {
    reasons: 'Business reasons',
    options: ['Option 1', 'Option 2'],
    expectedBenefits: ['Benefit 1', 'Benefit 2'],
    costs: { total: '£100k', breakdown: 'Development: £80k, Testing: £20k' },
    risks: ['Risk 1', 'Risk 2']
  },
  organizationStructure: {
    projectBoard: { executive: 'John Doe', seniorUser: 'Jane Smith' },
    projectManager: 'Bob Johnson',
    teamManagers: ['Alice Brown', 'Charlie White']
  }
}

const sampleBusinessCaseData = {
  executiveSummary: 'Executive summary of the business case',
  reasons: 'Strategic reasons for the project',
  businessOptions: [
    {
      option: 'Option 1',
      description: 'Do nothing',
      costs: '£0',
      benefits: 'None',
      risks: 'High risk'
    },
    {
      option: 'Option 2',
      description: 'Full implementation',
      costs: '£500k',
      benefits: 'High benefits',
      risks: 'Medium risk'
    }
  ],
  expectedBenefits: [
    {
      benefit: 'Cost reduction',
      measurable: true,
      measurement: 'Operational costs',
      target: '30% reduction'
    }
  ],
  costs: {
    development: '£300k',
    operational: '£100k',
    maintenance: '£50k',
    total: '£450k'
  }
}

const testMetadata = {
  projectName: 'Test Project',
  companyName: 'Test Company',
  version: '1.0',
  date: '01 January 2024'
}

/**
 * Extract text content from HTML, removing tags and normalizing whitespace
 */
function extractTextFromHTML(html: string): string {
  const dom = new JSDOM(html)
  const document = dom.window.document
  
  // Remove style tags and scripts
  const styles = document.querySelectorAll('style, script')
  styles.forEach(el => el.remove())
  
  // Get text content
  const text = document.body?.textContent || ''
  
  // Normalize whitespace
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

/**
 * Extract structured data from HTML (tables, lists, etc.)
 */
function extractStructuredData(html: string): {
  headings: string[]
  tables: Array<{ headers: string[], rows: string[][] }>
  lists: string[][]
} {
  const dom = new JSDOM(html)
  const document = dom.window.document
  
  // Extract headings
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
    .map(h => h.textContent?.trim() || '')
  
  // Extract tables
  const tables = Array.from(document.querySelectorAll('table')).map(table => {
    const headers = Array.from(table.querySelectorAll('th'))
      .map(th => th.textContent?.trim() || '')
    
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td'))
        .map(td => td.textContent?.trim() || '')
    )
    
    return { headers, rows }
  })
  
  // Extract lists
  const lists = Array.from(document.querySelectorAll('ul, ol')).map(list =>
    Array.from(list.querySelectorAll('li'))
      .map(li => li.textContent?.trim() || '')
  )
  
  return { headings, tables, lists }
}

/**
 * Compare two HTML outputs for consistency
 */
function compareHTMLOutputs(html1: string, html2: string): {
  match: boolean
  differences: string[]
} {
  const text1 = extractTextFromHTML(html1)
  const text2 = extractTextFromHTML(html2)
  
  const data1 = extractStructuredData(html1)
  const data2 = extractStructuredData(html2)
  
  const differences: string[] = []
  
  // Compare headings
  if (data1.headings.length !== data2.headings.length) {
    differences.push(`Heading count mismatch: ${data1.headings.length} vs ${data2.headings.length}`)
  }
  
  data1.headings.forEach((h, i) => {
    if (h !== data2.headings[i]) {
      differences.push(`Heading mismatch at position ${i}: "${h}" vs "${data2.headings[i]}"`)
    }
  })
  
  // Compare tables
  if (data1.tables.length !== data2.tables.length) {
    differences.push(`Table count mismatch: ${data1.tables.length} vs ${data2.tables.length}`)
  }
  
  // Compare lists
  if (data1.lists.length !== data2.lists.length) {
    differences.push(`List count mismatch: ${data1.lists.length} vs ${data2.lists.length}`)
  }
  
  // Basic text similarity check (allowing for minor formatting differences)
  const similarity = calculateSimilarity(text1, text2)
  if (similarity < 0.95) {
    differences.push(`Text content similarity below threshold: ${(similarity * 100).toFixed(2)}%`)
  }
  
  return {
    match: differences.length === 0,
    differences
  }
}

/**
 * Calculate text similarity using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Test PID document consistency
 */
export async function testPIDConsistency(): Promise<{
  passed: boolean
  report: string
}> {
  console.log('Testing PID document consistency...')
  
  // Generate HTML from document viewer formatter
  const viewerFormatter = new UnifiedPIDFormatter(samplePIDData, testMetadata)
  const viewerHTML = viewerFormatter.generateHTML()
  
  // Generate HTML from PDF formatter adapter
  const pdfFormatter = createUnifiedFormatter(
    'pid',
    testMetadata.projectName,
    testMetadata.companyName,
    {
      title: 'Test PID',
      type: 'pid',
      projectName: testMetadata.projectName,
      companyName: testMetadata.companyName,
      version: 1,
      createdAt: new Date()
    }
  )
  
  // Extract just the content HTML (without PDF wrapper)
  const pdfHTML = pdfFormatter.formatToHTML(samplePIDData)
  const pdfContentMatch = pdfHTML.match(/<div class="pdf-content">([\s\S]*?)<\/div>\s*<\/body>/i)
  const pdfContent = pdfContentMatch ? pdfContentMatch[1] : pdfHTML
  
  // Compare outputs
  const comparison = compareHTMLOutputs(viewerHTML, pdfContent)
  
  const report = `
PID Document Consistency Test
=============================
Test Result: ${comparison.match ? 'PASSED ✅' : 'FAILED ❌'}

Viewer HTML Length: ${viewerHTML.length} characters
PDF HTML Length: ${pdfContent.length} characters

${comparison.differences.length > 0 ? 'Differences Found:\n' + comparison.differences.join('\n') : 'No differences found - outputs are consistent!'}
  `.trim()
  
  return {
    passed: comparison.match,
    report
  }
}

/**
 * Test Business Case document consistency
 */
export async function testBusinessCaseConsistency(): Promise<{
  passed: boolean
  report: string
}> {
  console.log('Testing Business Case document consistency...')
  
  // Generate HTML from document viewer formatter
  const viewerFormatter = new UnifiedBusinessCaseFormatter(sampleBusinessCaseData, testMetadata)
  const viewerHTML = viewerFormatter.generateHTML()
  
  // Generate HTML from PDF formatter adapter
  const pdfFormatter = createUnifiedFormatter(
    'business_case',
    testMetadata.projectName,
    testMetadata.companyName,
    {
      title: 'Test Business Case',
      type: 'business_case',
      projectName: testMetadata.projectName,
      companyName: testMetadata.companyName,
      version: 1,
      createdAt: new Date()
    }
  )
  
  // Extract just the content HTML (without PDF wrapper)
  const pdfHTML = pdfFormatter.formatToHTML(sampleBusinessCaseData)
  const pdfContentMatch = pdfHTML.match(/<div class="pdf-content">([\s\S]*?)<\/div>\s*<\/body>/i)
  const pdfContent = pdfContentMatch ? pdfContentMatch[1] : pdfHTML
  
  // Compare outputs
  const comparison = compareHTMLOutputs(viewerHTML, pdfContent)
  
  const report = `
Business Case Document Consistency Test
========================================
Test Result: ${comparison.match ? 'PASSED ✅' : 'FAILED ❌'}

Viewer HTML Length: ${viewerHTML.length} characters
PDF HTML Length: ${pdfContent.length} characters

${comparison.differences.length > 0 ? 'Differences Found:\n' + comparison.differences.join('\n') : 'No differences found - outputs are consistent!'}
  `.trim()
  
  return {
    passed: comparison.match,
    report
  }
}

/**
 * Run all consistency tests
 */
export async function runAllTests(): Promise<void> {
  console.log('Running document consistency tests...\n')
  
  const pidResult = await testPIDConsistency()
  console.log(pidResult.report)
  console.log('\n' + '='.repeat(50) + '\n')
  
  const bcResult = await testBusinessCaseConsistency()
  console.log(bcResult.report)
  console.log('\n' + '='.repeat(50) + '\n')
  
  const allPassed = pidResult.passed && bcResult.passed
  
  console.log(`
Overall Test Results
====================
PID Test: ${pidResult.passed ? 'PASSED ✅' : 'FAILED ❌'}
Business Case Test: ${bcResult.passed ? 'PASSED ✅' : 'FAILED ❌'}

Overall: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}
  `.trim())
  
  process.exit(allPassed ? 0 : 1)
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}