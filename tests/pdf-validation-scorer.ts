/**
 * PDF Validation and Scoring System
 * 
 * This comprehensive validation system scores PDFs against expected content
 * and structure, particularly for PRINCE2-compliant PID documents.
 * 
 * Scoring Criteria (100 points total):
 * - Section Presence: 60 points (5 points per required section)
 * - Content Quality: 20 points (no [object Object], proper formatting)
 * - Structure: 10 points (proper hierarchy, TOC, page breaks)
 * - Completeness: 10 points (all subsections present)
 */

import fs from 'fs/promises'
import path from 'path'
import pdf from 'pdf-parse'
import * as cheerio from 'cheerio'
import { marked } from 'marked'
import chalk from 'chalk'

// Expected PRINCE2 PID sections
const REQUIRED_PID_SECTIONS = [
  'Executive Summary',
  'Project Background',
  'Project Definition',
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

// Expected subsections within Project Definition
const PROJECT_DEFINITION_SUBSECTIONS = [
  'Objectives',
  'Scope',
  'Deliverables',
  'Constraints',
  'Assumptions',
  'Dependencies',
  'Interfaces'
]

interface ValidationResult {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  details: {
    sectionPresence: SectionValidation
    contentQuality: ContentValidation
    structure: StructureValidation
    completeness: CompletenessValidation
  }
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

interface SectionValidation {
  score: number
  maxScore: number
  foundSections: string[]
  missingSections: string[]
  details: Array<{
    section: string
    found: boolean
    content?: string
  }>
}

interface ContentValidation {
  score: number
  maxScore: number
  hasRenderingErrors: boolean
  errorLocations: string[]
  contentLength: number
  tablesFound: number
  listsFound: number
}

interface StructureValidation {
  score: number
  maxScore: number
  hasTOC: boolean
  hasProperHierarchy: boolean
  hasPageBreaks: boolean
  pageCount: number
}

interface CompletenessValidation {
  score: number
  maxScore: number
  subsectionsFound: string[]
  subsectionsMissing: string[]
}

export class PDFValidationScorer {
  private verbose: boolean
  private pdfContent: string = ''
  private pdfPages: number = 0
  
  constructor(verbose: boolean = true) {
    this.verbose = verbose
  }
  
  /**
   * Validate a PDF file
   */
  async validatePDFFile(pdfPath: string): Promise<ValidationResult> {
    this.log('🔍 Starting PDF Validation', 'info')
    this.log(`📄 PDF Path: ${pdfPath}`, 'info')
    
    try {
      // Read PDF file
      const pdfBuffer = await fs.readFile(pdfPath)
      return await this.validatePDFBuffer(pdfBuffer)
    } catch (error) {
      this.log(`❌ Error reading PDF file: ${error}`, 'error')
      throw error
    }
  }
  
  /**
   * Validate a PDF buffer
   */
  async validatePDFBuffer(pdfBuffer: Buffer): Promise<ValidationResult> {
    this.log(`📊 PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`, 'info')
    
    // Parse PDF
    const pdfData = await pdf(pdfBuffer)
    this.pdfContent = pdfData.text
    this.pdfPages = pdfData.numpages
    
    this.log(`📖 Pages: ${this.pdfPages}`, 'info')
    this.log(`📝 Text Length: ${this.pdfContent.length} characters`, 'info')
    
    // Run validations
    const sectionValidation = this.validateSections()
    const contentValidation = this.validateContent()
    const structureValidation = this.validateStructure()
    const completenessValidation = this.validateCompleteness()
    
    // Calculate total score
    const totalScore = 
      sectionValidation.score +
      contentValidation.score +
      structureValidation.score +
      completenessValidation.score
    
    const maxScore = 
      sectionValidation.maxScore +
      contentValidation.maxScore +
      structureValidation.maxScore +
      completenessValidation.maxScore
    
    const percentage = Math.round((totalScore / maxScore) * 100)
    const passed = percentage >= 80
    
    // Compile errors, warnings, and recommendations
    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    
    // Section errors
    if (sectionValidation.missingSections.length > 0) {
      errors.push(`Missing ${sectionValidation.missingSections.length} required sections: ${sectionValidation.missingSections.join(', ')}`)
    }
    
    // Content errors
    if (contentValidation.hasRenderingErrors) {
      errors.push(`Found ${contentValidation.errorLocations.length} rendering errors ([object Object])`)
      contentValidation.errorLocations.forEach(loc => {
        warnings.push(`Rendering error at: "${loc}"`)
      })
    }
    
    // Structure warnings
    if (!structureValidation.hasTOC) {
      warnings.push('Table of Contents not found or improperly formatted')
    }
    
    if (!structureValidation.hasProperHierarchy) {
      warnings.push('Document hierarchy issues detected (missing H1/H2 structure)')
    }
    
    // Completeness warnings
    if (completenessValidation.subsectionsMissing.length > 0) {
      warnings.push(`Missing ${completenessValidation.subsectionsMissing.length} subsections in Project Definition`)
    }
    
    // Recommendations
    if (percentage < 95) {
      recommendations.push('Consider using UnifiedPIDFormatter for consistent structure')
    }
    
    if (contentValidation.tablesFound < 3) {
      recommendations.push('Add more tables for better data presentation')
    }
    
    if (this.pdfPages < 5) {
      recommendations.push('Document seems too short, ensure all content is included')
    }
    
    const result: ValidationResult = {
      score: totalScore,
      maxScore,
      percentage,
      passed,
      details: {
        sectionPresence: sectionValidation,
        contentQuality: contentValidation,
        structure: structureValidation,
        completeness: completenessValidation
      },
      errors,
      warnings,
      recommendations
    }
    
    this.printValidationReport(result)
    
    return result
  }
  
  /**
   * Validate section presence
   */
  private validateSections(): SectionValidation {
    this.log('\n📋 Validating Section Presence...', 'section')
    
    const maxScore = 60
    let score = 0
    const foundSections: string[] = []
    const missingSections: string[] = []
    const details: SectionValidation['details'] = []
    
    const pointsPerSection = maxScore / REQUIRED_PID_SECTIONS.length
    
    for (const section of REQUIRED_PID_SECTIONS) {
      // Check if section exists in various formats
      const variations = [
        section,
        section.toLowerCase(),
        section.replace(/ /g, '_'),
        section.replace(/ /g, '-'),
        `\\d+\\.?\\s*${section}` // With numbering
      ]
      
      let found = false
      let content = ''
      
      for (const variation of variations) {
        const regex = new RegExp(variation, 'i')
        if (regex.test(this.pdfContent)) {
          found = true
          // Extract content after section heading (up to 200 chars)
          const match = this.pdfContent.match(new RegExp(`${variation}[:\\s]*(.{0,200})`, 'i'))
          if (match) {
            content = match[1].trim()
          }
          break
        }
      }
      
      if (found) {
        score += pointsPerSection
        foundSections.push(section)
        this.log(`  ✅ ${section} - Found`, 'success')
      } else {
        missingSections.push(section)
        this.log(`  ❌ ${section} - Missing`, 'error')
      }
      
      details.push({ section, found, content })
    }
    
    this.log(`  Score: ${score}/${maxScore}`, 'info')
    
    return {
      score,
      maxScore,
      foundSections,
      missingSections,
      details
    }
  }
  
  /**
   * Validate content quality
   */
  private validateContent(): ContentValidation {
    this.log('\n🔍 Validating Content Quality...', 'section')
    
    const maxScore = 20
    let score = maxScore
    
    // Check for rendering errors
    const renderingErrorRegex = /\[object Object\]/g
    const errorMatches = this.pdfContent.match(renderingErrorRegex) || []
    const hasRenderingErrors = errorMatches.length > 0
    
    if (hasRenderingErrors) {
      score -= 10
      this.log(`  ❌ Found ${errorMatches.length} [object Object] errors`, 'error')
    } else {
      this.log(`  ✅ No [object Object] errors found`, 'success')
    }
    
    // Find error locations (context)
    const errorLocations: string[] = []
    if (hasRenderingErrors) {
      const lines = this.pdfContent.split('\n')
      lines.forEach((line, index) => {
        if (line.includes('[object Object]')) {
          const context = line.substring(0, 100)
          errorLocations.push(`Line ${index + 1}: ${context}...`)
        }
      })
    }
    
    // Check for tables
    const tableIndicators = ['Cost Type', 'Milestone', 'Stakeholder', 'Risk', 'Benefits']
    const tablesFound = tableIndicators.filter(indicator => 
      this.pdfContent.includes(indicator)
    ).length
    
    if (tablesFound < 2) {
      score -= 5
      this.log(`  ⚠️  Only ${tablesFound} tables found (expected at least 2)`, 'warning')
    } else {
      this.log(`  ✅ Found ${tablesFound} tables`, 'success')
    }
    
    // Check for lists
    const bulletPoints = (this.pdfContent.match(/[•·▪▫◦‣⁃]/g) || []).length
    const numberedItems = (this.pdfContent.match(/^\d+\./gm) || []).length
    const listsFound = bulletPoints + numberedItems
    
    if (listsFound < 10) {
      score -= 5
      this.log(`  ⚠️  Only ${listsFound} list items found`, 'warning')
    } else {
      this.log(`  ✅ Found ${listsFound} list items`, 'success')
    }
    
    this.log(`  Content length: ${this.pdfContent.length} characters`, 'info')
    this.log(`  Score: ${score}/${maxScore}`, 'info')
    
    return {
      score,
      maxScore,
      hasRenderingErrors,
      errorLocations,
      contentLength: this.pdfContent.length,
      tablesFound,
      listsFound
    }
  }
  
  /**
   * Validate document structure
   */
  private validateStructure(): StructureValidation {
    this.log('\n🏗️  Validating Document Structure...', 'section')
    
    const maxScore = 10
    let score = 0
    
    // Check for Table of Contents
    const hasTOC = /Table of Contents/i.test(this.pdfContent) || 
                   /Contents/i.test(this.pdfContent.substring(0, 2000))
    
    if (hasTOC) {
      score += 4
      this.log('  ✅ Table of Contents found', 'success')
    } else {
      this.log('  ❌ Table of Contents missing', 'error')
    }
    
    // Check for proper hierarchy (numbered sections)
    const hasNumberedSections = /\d+\.\s+\w+/g.test(this.pdfContent)
    const hasProperHierarchy = hasNumberedSections
    
    if (hasProperHierarchy) {
      score += 3
      this.log('  ✅ Proper section numbering found', 'success')
    } else {
      this.log('  ⚠️  Section numbering could be improved', 'warning')
    }
    
    // Check for page breaks (multiple pages)
    const hasPageBreaks = this.pdfPages > 1
    
    if (hasPageBreaks) {
      score += 3
      this.log(`  ✅ Document has ${this.pdfPages} pages`, 'success')
    } else {
      this.log('  ❌ Document is single page (no page breaks)', 'error')
    }
    
    this.log(`  Score: ${score}/${maxScore}`, 'info')
    
    return {
      score,
      maxScore,
      hasTOC,
      hasProperHierarchy,
      hasPageBreaks,
      pageCount: this.pdfPages
    }
  }
  
  /**
   * Validate completeness (subsections)
   */
  private validateCompleteness(): CompletenessValidation {
    this.log('\n✅ Validating Completeness...', 'section')
    
    const maxScore = 10
    let score = 0
    const subsectionsFound: string[] = []
    const subsectionsMissing: string[] = []
    
    const pointsPerSubsection = maxScore / PROJECT_DEFINITION_SUBSECTIONS.length
    
    // Check if we're in Project Definition section
    const hasProjectDefinition = /Project Definition/i.test(this.pdfContent)
    
    if (hasProjectDefinition) {
      for (const subsection of PROJECT_DEFINITION_SUBSECTIONS) {
        const variations = [
          subsection,
          `\\d+\\.\\d+\\s*${subsection}`,
          subsection.toLowerCase()
        ]
        
        let found = false
        for (const variation of variations) {
          const regex = new RegExp(variation, 'i')
          if (regex.test(this.pdfContent)) {
            found = true
            break
          }
        }
        
        if (found) {
          score += pointsPerSubsection
          subsectionsFound.push(subsection)
          this.log(`  ✅ ${subsection} subsection found`, 'success')
        } else {
          subsectionsMissing.push(subsection)
          this.log(`  ⚠️  ${subsection} subsection missing`, 'warning')
        }
      }
    } else {
      this.log('  ⚠️  Project Definition section not found - cannot validate subsections', 'warning')
      score = maxScore * 0.5 // Partial credit
    }
    
    this.log(`  Score: ${score}/${maxScore}`, 'info')
    
    return {
      score,
      maxScore,
      subsectionsFound,
      subsectionsMissing
    }
  }
  
  /**
   * Print validation report
   */
  private printValidationReport(result: ValidationResult): void {
    console.log('\n' + '='.repeat(80))
    console.log(chalk.bold.cyan('📊 PDF VALIDATION REPORT'))
    console.log('='.repeat(80))
    
    // Overall Score
    const scoreColor = result.percentage >= 80 ? chalk.green : 
                      result.percentage >= 60 ? chalk.yellow : 
                      chalk.red
    
    console.log(chalk.bold('\n🎯 Overall Score:'))
    console.log(`   ${scoreColor.bold(`${result.score}/${result.maxScore} (${result.percentage}%)`)}`)
    console.log(`   Status: ${result.passed ? chalk.green.bold('✅ PASSED') : chalk.red.bold('❌ FAILED')}`)
    
    // Category Breakdown
    console.log(chalk.bold('\n📈 Category Breakdown:'))
    console.log(`   Section Presence:    ${this.formatScore(result.details.sectionPresence.score, result.details.sectionPresence.maxScore)}`)
    console.log(`   Content Quality:     ${this.formatScore(result.details.contentQuality.score, result.details.contentQuality.maxScore)}`)
    console.log(`   Document Structure:  ${this.formatScore(result.details.structure.score, result.details.structure.maxScore)}`)
    console.log(`   Completeness:        ${this.formatScore(result.details.completeness.score, result.details.completeness.maxScore)}`)
    
    // Errors
    if (result.errors.length > 0) {
      console.log(chalk.bold.red('\n❌ Errors:'))
      result.errors.forEach(error => {
        console.log(`   • ${error}`)
      })
    }
    
    // Warnings
    if (result.warnings.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  Warnings:'))
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`)
      })
    }
    
    // Recommendations
    if (result.recommendations.length > 0) {
      console.log(chalk.bold.blue('\n💡 Recommendations:'))
      result.recommendations.forEach(rec => {
        console.log(`   • ${rec}`)
      })
    }
    
    // Section Details
    console.log(chalk.bold('\n📋 Section Details:'))
    console.log(`   Found: ${result.details.sectionPresence.foundSections.length}/${REQUIRED_PID_SECTIONS.length} sections`)
    if (result.details.sectionPresence.missingSections.length > 0) {
      console.log(chalk.red(`   Missing: ${result.details.sectionPresence.missingSections.join(', ')}`))
    }
    
    console.log('\n' + '='.repeat(80))
  }
  
  /**
   * Format score for display
   */
  private formatScore(score: number, maxScore: number): string {
    const percentage = Math.round((score / maxScore) * 100)
    const color = percentage >= 80 ? chalk.green : 
                 percentage >= 60 ? chalk.yellow : 
                 chalk.red
    return color(`${score}/${maxScore} (${percentage}%)`)
  }
  
  /**
   * Log with verbosity control
   */
  private log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'section' = 'info'): void {
    if (!this.verbose && type === 'info') return
    
    switch (type) {
      case 'section':
        console.log(chalk.bold.blue(message))
        break
      case 'success':
        console.log(chalk.green(message))
        break
      case 'warning':
        console.log(chalk.yellow(message))
        break
      case 'error':
        console.log(chalk.red(message))
        break
      default:
        console.log(message)
    }
  }
  
  /**
   * Compare PDF with viewer output
   */
  async comparePDFWithViewer(
    pdfPath: string,
    viewerMarkdown: string
  ): Promise<{
    pdfValidation: ValidationResult
    similarityScore: number
    comparison: string[]
  }> {
    this.log('\n🔄 Comparing PDF with Viewer Output', 'section')
    
    // Validate PDF
    const pdfValidation = await this.validatePDFFile(pdfPath)
    
    // Parse viewer markdown to text
    const viewerHTML = await marked(viewerMarkdown)
    const $ = cheerio.load(viewerHTML)
    const viewerText = $.text()
    
    // Calculate similarity
    const commonWords = this.calculateCommonWords(this.pdfContent, viewerText)
    const similarityScore = Math.round((commonWords / Math.max(
      this.pdfContent.split(/\s+/).length,
      viewerText.split(/\s+/).length
    )) * 100)
    
    // Compare sections
    const comparison: string[] = []
    
    for (const section of REQUIRED_PID_SECTIONS) {
      const inPDF = new RegExp(section, 'i').test(this.pdfContent)
      const inViewer = new RegExp(section, 'i').test(viewerText)
      
      if (inPDF && inViewer) {
        comparison.push(`✅ ${section}: Present in both`)
      } else if (inPDF && !inViewer) {
        comparison.push(`⚠️  ${section}: Only in PDF`)
      } else if (!inPDF && inViewer) {
        comparison.push(`❌ ${section}: Only in Viewer (missing from PDF)`)
      } else {
        comparison.push(`❌ ${section}: Missing from both`)
      }
    }
    
    this.log(`\n📊 Similarity Score: ${similarityScore}%`, 'info')
    
    return {
      pdfValidation,
      similarityScore,
      comparison
    }
  }
  
  /**
   * Calculate common words between two texts
   */
  private calculateCommonWords(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    
    let common = 0
    words1.forEach(word => {
      if (words2.has(word)) common++
    })
    
    return common
  }
}

// Export for use in tests
export async function validatePDF(pdfPath: string, verbose: boolean = true): Promise<ValidationResult> {
  const validator = new PDFValidationScorer(verbose)
  return validator.validatePDFFile(pdfPath)
}

// CLI usage
if (require.main === module) {
  const pdfPath = process.argv[2]
  
  if (!pdfPath) {
    console.error('Usage: npx tsx pdf-validation-scorer.ts <pdf-path>')
    process.exit(1)
  }
  
  validatePDF(pdfPath)
    .then(result => {
      process.exit(result.passed ? 0 : 1)
    })
    .catch(error => {
      console.error('Validation failed:', error)
      process.exit(1)
    })
}