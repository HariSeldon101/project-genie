/**
 * Test to compare PDF output vs Document Viewer output for PID documents
 * This ensures both formatters produce consistent content
 */

import { PIDFormatter as PDFPIDFormatter } from '../lib/pdf-generation/formatters/pid-formatter'
import { PIDFormatter as ViewerPIDFormatter } from '../lib/documents/formatters/pid-formatter'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import { marked } from 'marked'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ComparisonResult {
  section: string
  inPDF: boolean
  inViewer: boolean
  pdfContent?: string
  viewerContent?: string
  matches: boolean
  details?: string
}

/**
 * Extract text content from HTML, preserving structure
 */
function extractTextFromHTML(html: string): Record<string, string> {
  const $ = cheerio.load(html)
  const sections: Record<string, string> = {}
  
  // Extract main sections
  $('h2').each((_, elem) => {
    const $elem = $(elem)
    // Use the text content (without the number prefix) as the key
    const sectionText = $elem.text().trim()
    // Remove leading numbers like "1. " or "10. "
    const sectionTitle = sectionText.replace(/^\d+\.\s+/, '')
    let content = ''
    
    // Get all content until next h2
    let current = $elem.next()
    while (current.length && !current.is('h2')) {
      content += current.text().trim() + '\n'
      current = current.next()
    }
    
    sections[sectionTitle] = content
  })
  
  // Also extract subsections
  $('h3').each((_, elem) => {
    const $elem = $(elem)
    const subsectionText = $elem.text().trim()
    // Remove leading numbers like "3.1 " or "10.3 "
    const subsectionTitle = subsectionText.replace(/^\d+\.\d+\s+/, '')
    let content = ''
    
    // Get content until next h3 or h2
    let current = $elem.next()
    while (current.length && !current.is('h2') && !current.is('h3')) {
      content += current.text().trim() + '\n'
      current = current.next()
    }
    
    sections[subsectionTitle] = content
  })
  
  return sections
}

/**
 * Extract sections from markdown
 */
async function extractTextFromMarkdown(markdown: string): Promise<Record<string, string>> {
  // Parse markdown to HTML first
  const html = await marked(markdown)
  const $ = cheerio.load(html)
  const sections: Record<string, string> = {}
  
  // Extract main sections
  $('h2').each((_, elem) => {
    const $elem = $(elem)
    // Get the text and clean it up
    const sectionText = $elem.text().trim()
    // Remove leading numbers like "1. " or "10. " and also handle escaped dots like "1\\. "
    const sectionTitle = sectionText.replace(/^\d+\\?\.\s+/, '')
    let content = ''
    
    // Get all content until next h2
    let current = $elem.next()
    while (current.length && !current.is('h2')) {
      content += current.text().trim() + '\n'
      current = current.next()
    }
    
    sections[sectionTitle] = content
  })
  
  // Also extract subsections
  $('h3').each((_, elem) => {
    const $elem = $(elem)
    const subsectionText = $elem.text().trim()
    // Remove leading numbers like "3.1 " or "10.3 "
    const subsectionTitle = subsectionText.replace(/^\d+\.\d+\s+/, '')
    let content = ''
    
    // Get content until next h3 or h2
    let current = $elem.next()
    while (current.length && !current.is('h2') && !current.is('h3')) {
      content += current.text().trim() + '\n'
      current = current.next()
    }
    
    sections[subsectionTitle] = content
  })
  
  return sections
}

/**
 * Compare two sets of sections
 */
function compareSections(
  pdfSections: Record<string, string>,
  viewerSections: Record<string, string>
): ComparisonResult[] {
  const results: ComparisonResult[] = []
  const allSections = new Set([
    ...Object.keys(pdfSections),
    ...Object.keys(viewerSections)
  ])
  
  // Expected PID sections based on PRINCE2 standard
  const expectedSections = [
    'Executive Summary',
    'Project Background',
    'Project Definition',
    'Objectives',
    'Scope',
    'Deliverables',
    'Constraints',
    'Assumptions',
    'Dependencies',
    'Interfaces',
    'Business Case',
    'Organization Structure',
    'Quality Management Approach',
    'Configuration Management Approach',
    'Risk Management Approach',
    'Communication Management Approach',
    'Project Plan',
    'Project Controls',
    'Tailoring'
  ]
  
  // Check all expected sections
  for (const section of expectedSections) {
    const pdfHasSection = Object.keys(pdfSections).some(key => 
      key.toLowerCase().includes(section.toLowerCase())
    )
    const viewerHasSection = Object.keys(viewerSections).some(key => 
      key.toLowerCase().includes(section.toLowerCase())
    )
    
    const pdfKey = Object.keys(pdfSections).find(key => 
      key.toLowerCase().includes(section.toLowerCase())
    )
    const viewerKey = Object.keys(viewerSections).find(key => 
      key.toLowerCase().includes(section.toLowerCase())
    )
    
    const pdfContent = pdfKey ? pdfSections[pdfKey] : undefined
    const viewerContent = viewerKey ? viewerSections[viewerKey] : undefined
    
    // Check if content is similar (allowing for formatting differences)
    const matches = pdfHasSection && viewerHasSection && 
      pdfContent && viewerContent &&
      normalizeContent(pdfContent) === normalizeContent(viewerContent)
    
    results.push({
      section,
      inPDF: pdfHasSection,
      inViewer: viewerHasSection,
      pdfContent: pdfContent?.substring(0, 200),
      viewerContent: viewerContent?.substring(0, 200),
      matches,
      details: !pdfHasSection ? 'Missing in PDF' : 
               !viewerHasSection ? 'Missing in Viewer' :
               !matches ? 'Content differs' : 'OK'
    })
  }
  
  return results
}

/**
 * Normalize content for comparison (remove extra whitespace, etc.)
 */
function normalizeContent(content: string): string {
  return content
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Main comparison function
 */
async function comparePIDFormatters(documentId?: string) {
  console.log('🔍 Starting PID Formatter Comparison Test\n')
  console.log('=' .repeat(80))
  
  try {
    // Get a PID document from the database
    let query = supabase
      .from('artifacts')
      .select('*')
      .eq('type', 'pid')
      .not('content', 'is', null)
    
    if (documentId) {
      query = query.eq('id', documentId)
    } else {
      query = query.limit(1)
    }
    
    const { data: documents, error } = await query
    
    if (error) {
      console.error('❌ Error fetching document:', error)
      return
    }
    
    if (!documents || documents.length === 0) {
      console.error('❌ No PID documents found in database')
      return
    }
    
    const document = documents[0]
    console.log(`📄 Testing with document: ${document.title || document.id}`)
    console.log(`   Project: ${document.project_name || 'Unknown'}`)
    console.log(`   Created: ${new Date(document.created_at).toLocaleDateString()}\n`)
    
    // Parse content
    const content = typeof document.content === 'string' 
      ? JSON.parse(document.content) 
      : document.content
    
    // Prepare metadata and options for formatters
    const projectName = document.project_name || 'Digital Banking Transformation Initiative'
    const companyName = 'Your Company'
    const pdfMetadata = {
      type: 'pid',
      createdAt: document.created_at,
      version: document.version || 1,
      author: 'Project Genie'
    }
    
    // Generate outputs from both formatters
    console.log('🔧 Generating PDF output...')
    const pdfFormatter = new PDFPIDFormatter(
      projectName,
      companyName,
      pdfMetadata,
      {}, // PDF options
      {} // HTML options
    )
    const pdfHTML = pdfFormatter.formatToHTML(content)
    
    console.log('🔧 Generating Viewer output...')
    const viewerMetadata = {
      projectName,
      companyName,
      version: String(document.version || 1),
      date: new Date(document.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }
    const viewerFormatter = new ViewerPIDFormatter(content, viewerMetadata)
    const viewerMarkdown = viewerFormatter.format()
    
    // Save outputs for manual inspection
    const outputDir = path.join(process.cwd(), 'tests', 'output')
    await fs.mkdir(outputDir, { recursive: true })
    
    await fs.writeFile(
      path.join(outputDir, 'pdf-output.html'),
      pdfHTML
    )
    await fs.writeFile(
      path.join(outputDir, 'viewer-output.md'),
      viewerMarkdown
    )
    
    console.log(`\n✅ Outputs saved to tests/output/`)
    
    // Extract sections from both outputs
    console.log('\n📊 Extracting sections for comparison...')
    const pdfSections = extractTextFromHTML(pdfHTML)
    const viewerSections = await extractTextFromMarkdown(viewerMarkdown)
    
    console.log(`   PDF sections found: ${Object.keys(pdfSections).length}`)
    console.log(`   Viewer sections found: ${Object.keys(viewerSections).length}`)
    
    // Compare sections
    console.log('\n📈 Comparison Results:')
    console.log('=' .repeat(80))
    
    const results = compareSections(pdfSections, viewerSections)
    
    // Display results in a table format
    console.log('\n%-30s | %-10s | %-10s | %-20s'.replace(/%(-?\d+)s/g, (_, width) => {
      return ' '.repeat(Math.abs(parseInt(width)))
    }))
    console.log('%-30s | %-10s | %-10s | %-20s', 'Section', 'In PDF', 'In Viewer', 'Status')
    console.log('-'.repeat(80))
    
    let missingInPDF = 0
    let missingInViewer = 0
    let contentDiffers = 0
    let matching = 0
    
    for (const result of results) {
      const pdfStatus = result.inPDF ? '✅ Yes' : '❌ No'
      const viewerStatus = result.inViewer ? '✅ Yes' : '❌ No'
      
      console.log(
        '%-30s | %-10s | %-10s | %-20s',
        result.section.substring(0, 30),
        pdfStatus,
        viewerStatus,
        result.details || ''
      )
      
      if (!result.inPDF) missingInPDF++
      if (!result.inViewer) missingInViewer++
      if (result.inPDF && result.inViewer && !result.matches) contentDiffers++
      if (result.matches) matching++
    }
    
    // Summary
    console.log('\n' + '=' .repeat(80))
    console.log('📊 Summary:')
    console.log(`   ✅ Matching sections: ${matching}`)
    console.log(`   ❌ Missing in PDF: ${missingInPDF}`)
    console.log(`   ❌ Missing in Viewer: ${missingInViewer}`)
    console.log(`   ⚠️  Content differs: ${contentDiffers}`)
    console.log(`   📄 Total sections checked: ${results.length}`)
    
    // Overall status
    console.log('\n' + '=' .repeat(80))
    if (missingInPDF === 0 && missingInViewer === 0 && contentDiffers === 0) {
      console.log('✅ SUCCESS: PDF and Viewer outputs match perfectly!')
    } else {
      console.log('⚠️  ISSUES FOUND: Outputs do not match. Review the details above.')
      console.log('\nNext steps:')
      if (missingInPDF > 0) {
        console.log('  1. Add missing sections to PDF formatter')
      }
      if (missingInViewer > 0) {
        console.log('  2. Check why viewer has extra sections')
      }
      if (contentDiffers > 0) {
        console.log('  3. Align content formatting between formatters')
      }
    }
    
    return results
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the comparison if this file is executed directly
if (require.main === module) {
  // Check for document ID argument
  const documentId = process.argv[2]
  
  comparePIDFormatters(documentId)
    .then(() => {
      console.log('\n✅ Comparison test completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Test failed:', error)
      process.exit(1)
    })
}

export { comparePIDFormatters, ComparisonResult }