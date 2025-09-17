import { describe, it, expect, beforeEach } from 'vitest'
import { DocumentGenerator } from '@/lib/documents/generator'
import { testProjectData, expectedDocuments } from '@/tests/utils/test-data'
import { 
  measurePerformance, 
  expectDocumentStructure,
  expectValidDocumentContent,
  expectNoPersonalInfo,
  assertDocumentCount,
  assertDocumentTypes
} from '@/tests/utils/test-helpers'

describe('End-to-End Document Generation Flow', () => {
  let generator: DocumentGenerator
  
  beforeEach(() => {
    // Use mock provider for consistent testing
    generator = new DocumentGenerator({ provider: 'mock' })
  })
  
  describe('Complete AGILE workflow', () => {
    it('should generate all 5 AGILE documents with correct structure', async () => {
      const { result: documents, durationSeconds } = await measurePerformance(
        () => generator.generateProjectDocuments(
          testProjectData.agile,
          testProjectData.agile.id
        )
      )
      
      // Performance check
      expect(durationSeconds).toBeLessThan(90) // Must complete within 90 seconds
      
      // Document count check
      assertDocumentCount(documents, 'agile')
      
      // Document types check
      assertDocumentTypes(documents, expectedDocuments.agile)
      
      // Structure validation
      documents.forEach(doc => {
        expectDocumentStructure(doc)
      })
      
      // Content validation
      const charter = documents.find(d => d.type === 'charter')
      expect(charter).toBeDefined()
      if (charter) {
        expectValidDocumentContent(charter.content, 'charter')
      }
      
      const techLandscape = documents.find(d => d.type === 'technical_landscape')
      expect(techLandscape).toBeDefined()
      if (techLandscape) {
        expectValidDocumentContent(techLandscape.content, 'technical_landscape')
      }
      
      const comparables = documents.find(d => d.type === 'comparable_projects')
      expect(comparables).toBeDefined()
      if (comparables) {
        expectValidDocumentContent(comparables.content, 'comparable_projects')
      }
    })
    
    it('should sanitize PII from all AGILE documents', async () => {
      const documents = await generator.generateProjectDocuments(
        testProjectData.agile,
        testProjectData.agile.id
      )
      
      documents.forEach(doc => {
        const contentStr = typeof doc.content === 'string' 
          ? doc.content 
          : JSON.stringify(doc.content)
        
        expectNoPersonalInfo(contentStr)
      })
    })
  })
  
  describe('Complete PRINCE2 workflow', () => {
    it('should generate all 6 PRINCE2 documents with correct structure', async () => {
      const { result: documents, durationSeconds } = await measurePerformance(
        () => generator.generateProjectDocuments(
          testProjectData.prince2,
          testProjectData.prince2.id
        )
      )
      
      // Performance check
      expect(durationSeconds).toBeLessThan(90)
      
      // Document count check
      assertDocumentCount(documents, 'prince2')
      
      // Document types check
      assertDocumentTypes(documents, expectedDocuments.prince2)
      
      // Structure validation
      documents.forEach(doc => {
        expectDocumentStructure(doc)
      })
      
      // Verify PRINCE2-specific documents
      const pid = documents.find(d => d.type === 'pid')
      expect(pid).toBeDefined()
      
      const businessCase = documents.find(d => d.type === 'business_case')
      expect(businessCase).toBeDefined()
      if (businessCase) {
        expectValidDocumentContent(businessCase.content, 'business_case')
      }
      
      const riskRegister = documents.find(d => d.type === 'risk_register')
      expect(riskRegister).toBeDefined()
      if (riskRegister) {
        expectValidDocumentContent(riskRegister.content, 'risk_register')
      }
    })
    
    it('should include both new document types for PRINCE2', async () => {
      const documents = await generator.generateProjectDocuments(
        testProjectData.prince2,
        testProjectData.prince2.id
      )
      
      const techLandscape = documents.find(d => d.type === 'technical_landscape')
      const comparables = documents.find(d => d.type === 'comparable_projects')
      
      expect(techLandscape).toBeDefined()
      expect(techLandscape?.title).toContain('Technical Landscape')
      
      expect(comparables).toBeDefined()
      expect(comparables?.title).toContain('Comparable Projects')
    })
  })
  
  describe('Complete HYBRID workflow', () => {
    it('should generate all 5 HYBRID documents combining both methodologies', async () => {
      const { result: documents, durationSeconds } = await measurePerformance(
        () => generator.generateProjectDocuments(
          testProjectData.hybrid,
          testProjectData.hybrid.id
        )
      )
      
      // Performance check
      expect(durationSeconds).toBeLessThan(90)
      
      // Document count check
      assertDocumentCount(documents, 'hybrid')
      
      // Document types check
      assertDocumentTypes(documents, expectedDocuments.hybrid)
      
      // Verify hybrid has elements from both methodologies
      const hasCharter = documents.some(d => d.type === 'charter')
      const hasRiskRegister = documents.some(d => d.type === 'risk_register')
      const hasBacklog = documents.some(d => d.type === 'backlog')
      
      expect(hasCharter).toBe(true) // From Agile
      expect(hasRiskRegister).toBe(true) // From PRINCE2
      expect(hasBacklog).toBe(true) // From Agile
    })
  })
  
  describe('Error recovery scenarios', () => {
    it('should handle partial generation failure gracefully', async () => {
      // Simulate a generator that fails on specific documents
      const partialFailGenerator = new DocumentGenerator({ provider: 'mock' })
      
      // Mock one document type to fail
      const originalMethod = partialFailGenerator.generateTechnicalLandscape
      let callCount = 0
      partialFailGenerator.generateTechnicalLandscape = async function(...args) {
        callCount++
        if (callCount === 1) {
          throw new Error('First attempt failed')
        }
        return originalMethod.apply(this, args)
      }
      
      const documents = await partialFailGenerator.generateProjectDocuments(
        testProjectData.agile,
        testProjectData.agile.id
      )
      
      // Should still return all documents (with retry or fallback)
      expect(documents.length).toBeGreaterThan(0)
      
      const techLandscape = documents.find(d => d.type === 'technical_landscape')
      expect(techLandscape).toBeDefined()
    })
    
    it('should use fallback content when all retries fail', async () => {
      const failingGenerator = new DocumentGenerator({ provider: 'mock' })
      
      // Force all technical landscape attempts to fail
      failingGenerator.generateTechnicalLandscape = async () => {
        throw new Error('All attempts failed')
      }
      
      const documents = await failingGenerator.generateProjectDocuments(
        testProjectData.agile,
        testProjectData.agile.id
      )
      
      const techLandscape = documents.find(d => d.type === 'technical_landscape')
      expect(techLandscape).toBeDefined()
      expect(techLandscape?.content).toContain('fallback')
    })
  })
  
  describe('Performance benchmarks', () => {
    it('should complete generation within acceptable time limits', async () => {
      const benchmarks = {
        agile: 90,
        prince2: 90,
        hybrid: 90
      }
      
      for (const [methodology, maxSeconds] of Object.entries(benchmarks)) {
        const projectData = testProjectData[methodology as keyof typeof testProjectData]
        
        const { durationSeconds } = await measurePerformance(
          () => generator.generateProjectDocuments(projectData, projectData.id)
        )
        
        expect(durationSeconds).toBeLessThan(maxSeconds)
      }
    })
    
    it('should handle concurrent generation requests', async () => {
      const promises = [
        generator.generateProjectDocuments(testProjectData.agile, 'proj-1'),
        generator.generateProjectDocuments(testProjectData.prince2, 'proj-2'),
        generator.generateProjectDocuments(testProjectData.hybrid, 'proj-3')
      ]
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(results[0]).toHaveLength(5) // Agile
      expect(results[1]).toHaveLength(6) // PRINCE2
      expect(results[2]).toHaveLength(5) // Hybrid
    })
  })
})