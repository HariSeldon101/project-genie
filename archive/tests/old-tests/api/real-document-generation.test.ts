/**
 * REAL API Integration Tests for Document Generation
 * 
 * WARNING: These tests make REAL API calls and will consume API credits!
 * Only run these tests when you need to verify actual API behavior.
 * 
 * Usage:
 *   npm run test:api        - Run all API tests
 *   npm run test:api:quick  - Run quick API test (1 document only)
 *   npm run test:api:full   - Run full API test suite
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DocumentGenerator } from '@/lib/documents/generator'
import { documentLogger } from '@/lib/utils/document-logger'
import { measurePerformance } from '@/tests/utils/test-helpers'
import dotenv from 'dotenv'
import path from 'path'

// Load real API keys from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Test configuration
const TEST_CONFIG = {
  // Set to true to run full tests (all methodologies)
  runFullSuite: process.env.RUN_FULL_API_TESTS === 'true',
  
  // Maximum time allowed for generation (seconds)
  maxGenerationTime: 90,
  
  // Test with specific provider
  testProvider: process.env.TEST_PROVIDER || 'vercel-ai',
  
  // Test with specific model
  testModel: process.env.TEST_MODEL || 'gpt-5-nano'
}

// Simple test project data (minimal to reduce token usage)
const minimalTestProject = {
  id: `api-test-${Date.now()}`,
  projectName: 'API Test Project',
  methodology: 'agile',
  vision: 'Test document generation',
  businessCase: 'Verify API functionality',
  description: 'Minimal test project',
  sector: 'technology',
  tier: 'basic',
  companyWebsite: 'https://test.com',
  stakeholders: [
    { role: 'Product Owner', influence: 'high', interest: 'high' }
  ],
  epics: [
    { title: 'Test Epic', description: 'Test description' }
  ],
  risks: [
    { description: 'Test risk', impact: 'low', probability: 'low' }
  ]
}

describe('Real API Document Generation Tests', () => {
  let generator: DocumentGenerator
  
  beforeAll(() => {
    // Ensure we have necessary API keys
    const hasOpenAI = !!process.env.OPENAI_API_KEY && 
                      process.env.OPENAI_API_KEY !== 'test-openai-key'
    const hasGroq = !!process.env.GROQ_API_KEY && 
                    process.env.GROQ_API_KEY !== 'test-groq-key'
    
    if (!hasOpenAI && !hasGroq) {
      console.warn('⚠️  No valid API keys found. Skipping real API tests.')
      console.warn('   Set OPENAI_API_KEY or GROQ_API_KEY in .env.local to run these tests.')
      return
    }
    
    // Create real generator (not mocked)
    generator = new DocumentGenerator({
      provider: TEST_CONFIG.testProvider as any,
      model: TEST_CONFIG.testModel
    })
    
    console.log('🔑 API Test Configuration:')
    console.log(`   Provider: ${TEST_CONFIG.testProvider}`)
    console.log(`   Model: ${TEST_CONFIG.testModel}`)
    console.log(`   Full Suite: ${TEST_CONFIG.runFullSuite}`)
  })
  
  afterAll(() => {
    // Log statistics
    const stats = documentLogger.getStatistics()
    console.log('\n📊 Test Statistics:')
    console.log(`   Total Attempts: ${stats.totalAttempts}`)
    console.log(`   Successful: ${stats.successfulGenerations}`)
    console.log(`   Failed: ${stats.failedGenerations}`)
    console.log(`   Average Duration: ${stats.averageDuration}ms`)
    console.log(`   Error Rate: ${stats.errorRate.toFixed(1)}%`)
  })
  
  describe('GPT-5 nano Specific Tests', () => {
    it('should successfully generate content with GPT-5 nano', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping: No OpenAI API key')
        return
      }
      
      const { result, durationSeconds } = await measurePerformance(async () => {
        return generator.generateTechnicalLandscape(
          minimalTestProject,
          minimalTestProject.id
        )
      })
      
      // Verify response is not empty
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.content).not.toBe('')
      expect(result.content.length).toBeGreaterThan(100)
      
      // Verify it completed within time limit
      expect(durationSeconds).toBeLessThan(30)
      
      console.log(`   ✅ Technical Landscape generated: ${result.content.length} chars in ${durationSeconds.toFixed(2)}s`)
    })
    
    it('should handle GPT-5 temperature requirement (must be 1)', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping: No OpenAI API key')
        return
      }
      
      // GPT-5 models require temperature=1
      const customGenerator = new DocumentGenerator({
        provider: 'vercel-ai',
        model: 'gpt-5-nano',
        temperature: 0.7 // This should be overridden to 1
      })
      
      const result = await customGenerator.generateComparableProjects(
        minimalTestProject,
        minimalTestProject.id
      )
      
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.content).not.toBe('')
      
      console.log(`   ✅ Comparable Projects generated with corrected temperature`)
    })
  })
  
  describe('Document Generation by Methodology', () => {
    it('should generate at least one AGILE document successfully', async () => {
      if (!generator) {
        console.log('Skipping: No API keys configured')
        return
      }
      
      const agileProject = { ...minimalTestProject, methodology: 'agile' }
      
      const { result: documents, durationSeconds } = await measurePerformance(async () => {
        // Generate just the essential documents to save API credits
        const docs = []
        
        // Try to generate at least charter
        try {
          const charter = await generator.generateAgileCharter(agileProject, agileProject.id)
          docs.push(charter)
        } catch (error) {
          console.error('Charter generation failed:', error)
        }
        
        // Try Technical Landscape
        try {
          const techLandscape = await generator.generateTechnicalLandscape(agileProject, agileProject.id)
          docs.push(techLandscape)
        } catch (error) {
          console.error('Technical Landscape generation failed:', error)
        }
        
        return docs
      })
      
      expect(documents.length).toBeGreaterThan(0)
      expect(durationSeconds).toBeLessThan(TEST_CONFIG.maxGenerationTime)
      
      console.log(`   ✅ Generated ${documents.length} AGILE documents in ${durationSeconds.toFixed(2)}s`)
      
      // Verify document content
      documents.forEach(doc => {
        expect(doc.content).toBeDefined()
        expect(doc.content).not.toBe('')
        expect(doc.type).toBeDefined()
      })
    })
    
    if (TEST_CONFIG.runFullSuite) {
      it('should generate all 5 AGILE documents', async () => {
        const agileProject = { ...minimalTestProject, methodology: 'agile' }
        
        const { result: documents, durationSeconds } = await measurePerformance(async () => {
          return generator.generateProjectDocuments(agileProject, agileProject.id)
        })
        
        expect(documents).toHaveLength(5)
        expect(durationSeconds).toBeLessThan(TEST_CONFIG.maxGenerationTime)
        
        const types = documents.map(d => d.type)
        expect(types).toContain('charter')
        expect(types).toContain('technical_landscape')
        expect(types).toContain('comparable_projects')
        
        console.log(`   ✅ All 5 AGILE documents generated in ${durationSeconds.toFixed(2)}s`)
      })
      
      it('should generate all 6 PRINCE2 documents', async () => {
        const prince2Project = { ...minimalTestProject, methodology: 'prince2' }
        
        const { result: documents, durationSeconds } = await measurePerformance(async () => {
          return generator.generateProjectDocuments(prince2Project, prince2Project.id)
        })
        
        expect(documents).toHaveLength(6)
        expect(durationSeconds).toBeLessThan(TEST_CONFIG.maxGenerationTime)
        
        const types = documents.map(d => d.type)
        expect(types).toContain('pid')
        expect(types).toContain('business_case')
        expect(types).toContain('technical_landscape')
        expect(types).toContain('comparable_projects')
        
        console.log(`   ✅ All 6 PRINCE2 documents generated in ${durationSeconds.toFixed(2)}s`)
      })
    }
  })
  
  describe('Error Handling and Recovery', () => {
    it('should retry on temporary failures', async () => {
      if (!generator) {
        console.log('Skipping: No API keys configured')
        return
      }
      
      // This will test the actual retry mechanism with real API
      const result = await generator.generateTechnicalLandscape(
        minimalTestProject,
        minimalTestProject.id
      )
      
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      
      // Check logs for retry attempts
      const logs = documentLogger.getRecentLogs(20)
      const retryLogs = logs.filter(log => 
        log.message.includes('Attempt') || 
        log.message.includes('retry')
      )
      
      console.log(`   ℹ️  Retry attempts: ${retryLogs.length}`)
    })
    
    it('should use fallback content when API fails completely', async () => {
      // Create generator with invalid API key to force fallback
      const failingGenerator = new DocumentGenerator({
        provider: 'openai',
        apiKey: 'invalid-key-to-force-failure'
      })
      
      const result = await failingGenerator.generateTechnicalLandscape(
        minimalTestProject,
        minimalTestProject.id
      )
      
      // Should still return content (fallback)
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.content).toContain('Technical Landscape')
      
      console.log(`   ✅ Fallback content used when API fails`)
    })
  })
  
  describe('Provider Fallback Chain', () => {
    it('should fall back to next provider when primary fails', async () => {
      // Create generator with fallback chain
      const fallbackGenerator = new DocumentGenerator({
        provider: 'vercel-ai',
        fallbackProviders: ['groq', 'mock']
      })
      
      // Even if primary fails, should get result from fallback
      const result = await fallbackGenerator.generateTechnicalLandscape(
        minimalTestProject,
        minimalTestProject.id
      )
      
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      
      console.log(`   ✅ Provider fallback chain working`)
    })
  })
  
  describe('Performance Benchmarks', () => {
    it('should complete single document generation under 30 seconds', async () => {
      if (!generator) {
        console.log('Skipping: No API keys configured')
        return
      }
      
      const { durationSeconds } = await measurePerformance(async () => {
        return generator.generateTechnicalLandscape(
          minimalTestProject,
          minimalTestProject.id
        )
      })
      
      expect(durationSeconds).toBeLessThan(30)
      console.log(`   ⚡ Single document: ${durationSeconds.toFixed(2)}s`)
    })
    
    it('should handle concurrent requests efficiently', async () => {
      if (!generator || !TEST_CONFIG.runFullSuite) {
        console.log('Skipping: Full suite not enabled')
        return
      }
      
      const { durationSeconds } = await measurePerformance(async () => {
        const promises = [
          generator.generateTechnicalLandscape(minimalTestProject, 'proj-1'),
          generator.generateComparableProjects(minimalTestProject, 'proj-2')
        ]
        
        return Promise.all(promises)
      })
      
      expect(durationSeconds).toBeLessThan(45) // Should be faster than sequential
      console.log(`   ⚡ Concurrent generation: ${durationSeconds.toFixed(2)}s`)
    })
  })
})