#!/usr/bin/env npx tsx
/**
 * Script to refactor CompanyIntelligenceRepository phase data methods
 * to delegate to PhaseDataRepository instead of duplicating logic
 *
 * MANUAL REFACTORING APPROACH:
 * This script generates the replacement code but requires manual review
 * before applying to ensure correctness
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO_PATH = path.join(
  process.cwd(),
  'lib/repositories/company-intelligence-repository.ts'
)

// Read the file
const content = fs.readFileSync(REPO_PATH, 'utf-8')

console.log('='.repeat(80))
console.log('PHASE DATA DELEGATION REFACTORING PLAN')
console.log('='.repeat(80))
console.log()

// Find the methods that need refactoring
const methodsToRefactor = [
  'savePhaseData',
  'getPhaseData',
  'getAllPhaseData',
  'deletePhaseData'
]

console.log('📋 Methods that need refactoring to use delegation:')
methodsToRefactor.forEach(method => {
  const regex = new RegExp(`async ${method}\\(`, 'g')
  const matches = content.match(regex)
  if (matches) {
    console.log(`   ✅ Found: ${method} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`)
  } else {
    console.log(`   ❌ Not found: ${method}`)
  }
})

console.log()
console.log('📝 Replacement code for CompanyIntelligenceRepository:')
console.log('='.repeat(80))
console.log(`
  /**
   * ========================================
   * PHASE DATA METHODS - DELEGATED
   * ========================================
   * All phase data operations delegate to PhaseDataRepository
   * following SOLID principles (Single Responsibility)
   * This prevents duplication and maintains a single source of truth
   */

  /**
   * Save phase data for a session stage
   * DELEGATES TO: PhaseDataRepository
   */
  async savePhaseData(sessionId: string, stage: string, data: any): Promise<void> {
    return this.phaseDataRepo.savePhaseData(sessionId, stage, data)
  }

  /**
   * Get phase data for a specific stage
   * DELEGATES TO: PhaseDataRepository
   */
  async getPhaseData(sessionId: string, stage: string): Promise<any> {
    return this.phaseDataRepo.getPhaseData(sessionId, stage)
  }

  /**
   * Get all phase data for a session
   * DELEGATES TO: PhaseDataRepository
   */
  async getAllPhaseData(sessionId: string): Promise<Record<string, any>> {
    return this.phaseDataRepo.getAllPhaseData(sessionId)
  }

  /**
   * Delete phase data for a specific stage
   * DELEGATES TO: PhaseDataRepository
   */
  async deletePhaseData(sessionId: string, stage: string): Promise<void> {
    return this.phaseDataRepo.deletePhaseData(sessionId, stage)
  }

  /**
   * Cleanup old phase data keeping only recent stages
   * DELEGATES TO: PhaseDataRepository
   * (This method already delegates correctly)
   */
  async cleanupOldPhaseData(sessionId: string, keepStages: number = 2): Promise<void> {
    return this.phaseDataRepo.cleanupOldPhaseData(sessionId, keepStages)
  }
`)

console.log('='.repeat(80))
console.log()

// Check for the OLD method
if (content.includes('cleanupOldPhaseData_OLD')) {
  console.log('⚠️  Found deprecated method: cleanupOldPhaseData_OLD')
  console.log('   This should be removed entirely')
  console.log()
}

console.log('📋 Manual refactoring steps:')
console.log('1. Open lib/repositories/company-intelligence-repository.ts')
console.log('2. Locate each phase data method (savePhaseData, getPhaseData, etc.)')
console.log('3. Replace the entire method body with the delegation shown above')
console.log('4. Delete the cleanupOldPhaseData_OLD method if present')
console.log('5. Test the refactored code')
console.log()

console.log('🔍 Benefits of this refactoring:')
console.log('   - Eliminates ~200 lines of duplicate code')
console.log('   - Single source of truth for phase data operations')
console.log('   - Easier to maintain and test')
console.log('   - Follows SOLID principles')
console.log()

// Count approximate lines that will be removed
const savePhaseDataMatch = content.match(/async savePhaseData[\s\S]*?^\s*\}/m)
const getPhaseDataMatch = content.match(/async getPhaseData[\s\S]*?^\s*\}/m)
const getAllPhaseDataMatch = content.match(/async getAllPhaseData[\s\S]*?^\s*\}/m)
const deletePhaseDataMatch = content.match(/async deletePhaseData[\s\S]*?^\s*\}/m)

let totalLines = 0
if (savePhaseDataMatch) totalLines += savePhaseDataMatch[0].split('\n').length
if (getPhaseDataMatch) totalLines += getPhaseDataMatch[0].split('\n').length
if (getAllPhaseDataMatch) totalLines += getAllPhaseDataMatch[0].split('\n').length
if (deletePhaseDataMatch) totalLines += deletePhaseDataMatch[0].split('\n').length

console.log(`📊 Estimated code reduction: ~${totalLines} lines will be replaced with ~25 lines`)
console.log()

console.log('⚠️  IMPORTANT: This refactoring maintains 100% backward compatibility')
console.log('   No consuming code needs to change - the API remains identical')
console.log()

console.log('✅ After refactoring, run:')
console.log('   npm run type-check')
console.log('   npm run test')
console.log()

export {}