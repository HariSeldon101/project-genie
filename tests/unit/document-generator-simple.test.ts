import { describe, it, expect, vi } from 'vitest'
import { testProjectData, expectedDocuments } from '@/tests/utils/test-data'

describe('DocumentGenerator Simple Tests', () => {
  describe('Document Count Validation', () => {
    it('should expect 5 documents for AGILE methodology', () => {
      expect(expectedDocuments.agile).toHaveLength(5)
      expect(expectedDocuments.agile).toContain('technical_landscape')
      expect(expectedDocuments.agile).toContain('comparable_projects')
    })
    
    it('should expect 6 documents for PRINCE2 methodology', () => {
      expect(expectedDocuments.prince2).toHaveLength(6)
      expect(expectedDocuments.prince2).toContain('technical_landscape')
      expect(expectedDocuments.prince2).toContain('comparable_projects')
    })
    
    it('should expect 5 documents for HYBRID methodology', () => {
      expect(expectedDocuments.hybrid).toHaveLength(5)
      expect(expectedDocuments.hybrid).toContain('technical_landscape')
      expect(expectedDocuments.hybrid).toContain('comparable_projects')
    })
  })
  
  describe('Test Data Validation', () => {
    it('should have valid AGILE project data', () => {
      expect(testProjectData.agile).toHaveProperty('projectName')
      expect(testProjectData.agile).toHaveProperty('methodology', 'agile')
      expect(testProjectData.agile).toHaveProperty('stakeholders')
      expect(testProjectData.agile.stakeholders).toHaveLength(3)
    })
    
    it('should have valid PRINCE2 project data', () => {
      expect(testProjectData.prince2).toHaveProperty('projectName')
      expect(testProjectData.prince2).toHaveProperty('methodology', 'prince2')
      expect(testProjectData.prince2).toHaveProperty('stakeholders')
      expect(testProjectData.prince2.stakeholders).toHaveLength(3)
    })
    
    it('should have valid HYBRID project data', () => {
      expect(testProjectData.hybrid).toHaveProperty('projectName')
      expect(testProjectData.hybrid).toHaveProperty('methodology', 'hybrid')
      expect(testProjectData.hybrid).toHaveProperty('stakeholders')
      expect(testProjectData.hybrid.stakeholders).toHaveLength(3)
    })
  })
  
  describe('Document Type Coverage', () => {
    it('should include all new document types in every methodology', () => {
      const newDocTypes = ['technical_landscape', 'comparable_projects']
      
      // Check AGILE
      newDocTypes.forEach(docType => {
        expect(expectedDocuments.agile).toContain(docType)
      })
      
      // Check PRINCE2
      newDocTypes.forEach(docType => {
        expect(expectedDocuments.prince2).toContain(docType)
      })
      
      // Check HYBRID
      newDocTypes.forEach(docType => {
        expect(expectedDocuments.hybrid).toContain(docType)
      })
    })
    
    it('should have methodology-specific documents', () => {
      // AGILE specific
      expect(expectedDocuments.agile).toContain('sprint_plan')
      expect(expectedDocuments.agile).not.toContain('pid')
      
      // PRINCE2 specific
      expect(expectedDocuments.prince2).toContain('pid')
      expect(expectedDocuments.prince2).toContain('project_plan')
      expect(expectedDocuments.prince2).not.toContain('sprint_plan')
      
      // HYBRID combines both
      expect(expectedDocuments.hybrid).toContain('charter')
      expect(expectedDocuments.hybrid).toContain('risk_register')
      expect(expectedDocuments.hybrid).toContain('backlog')
    })
  })
  
  describe('Mock Response Validation', () => {
    it('should have valid mock charter structure', async () => {
      const { mockLLMResponses } = await import('@/tests/utils/test-data')
      
      expect(mockLLMResponses.charter).toHaveProperty('projectName')
      expect(mockLLMResponses.charter).toHaveProperty('vision')
      expect(mockLLMResponses.charter).toHaveProperty('objectives')
      expect(mockLLMResponses.charter).toHaveProperty('scope')
      expect(mockLLMResponses.charter.stakeholders[0]).toHaveProperty('name', '[STAKEHOLDER_1]')
    })
    
    it('should have valid mock business case structure', async () => {
      const { mockLLMResponses } = await import('@/tests/utils/test-data')
      
      expect(mockLLMResponses.businessCase).toHaveProperty('executiveSummary')
      expect(mockLLMResponses.businessCase).toHaveProperty('businessNeed')
      expect(mockLLMResponses.businessCase).toHaveProperty('expectedBenefits')
      expect(mockLLMResponses.businessCase).toHaveProperty('costs')
    })
    
    it('should have valid mock technical landscape content', async () => {
      const { mockLLMResponses } = await import('@/tests/utils/test-data')
      
      expect(mockLLMResponses.technicalLandscape).toContain('Technical Landscape')
      expect(mockLLMResponses.technicalLandscape).toContain('Architecture')
      expect(mockLLMResponses.technicalLandscape).toContain('Technology Stack')
      expect(mockLLMResponses.technicalLandscape.length).toBeGreaterThan(100)
    })
    
    it('should have valid mock comparable projects content', async () => {
      const { mockLLMResponses } = await import('@/tests/utils/test-data')
      
      expect(mockLLMResponses.comparableProjects).toContain('Comparable Projects')
      expect(mockLLMResponses.comparableProjects).toContain('Similar Implementations')
      expect(mockLLMResponses.comparableProjects).toContain('Key Insights')
      expect(mockLLMResponses.comparableProjects.length).toBeGreaterThan(100)
    })
  })
})