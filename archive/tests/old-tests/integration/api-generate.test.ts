import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/generate/route'
import { testProjectData } from '@/tests/utils/test-data'
import { createMockRequest, createMockResponse } from '@/tests/utils/test-helpers'

// Mock the DocumentGenerator
vi.mock('@/lib/documents/generator', () => ({
  DocumentGenerator: vi.fn().mockImplementation(() => ({
    generateProjectDocuments: vi.fn().mockResolvedValue([
      { id: '1', type: 'charter', title: 'Charter', content: 'content', version: 1 },
      { id: '2', type: 'technical_landscape', title: 'Tech Landscape', content: 'content', version: 1 },
      { id: '3', type: 'comparable_projects', title: 'Comparables', content: 'content', version: 1 }
    ]),
    getProviderInfo: vi.fn().mockReturnValue({ provider: 'mock', model: 'test' })
  }))
}))

// Mock DocumentStorage
vi.mock('@/lib/documents/storage', () => ({
  DocumentStorage: vi.fn().mockImplementation(() => ({
    storeDocuments: vi.fn().mockResolvedValue(['artifact-1', 'artifact-2', 'artifact-3'])
  }))
}))

describe('API /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('POST endpoint', () => {
    it('should generate documents for authenticated user', async () => {
      const request = createMockRequest(
        {
          projectId: testProjectData.agile.id,
          projectData: testProjectData.agile
        },
        {
          'authorization': 'Bearer test-token'
        }
      )
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('documents')
      expect(data).toHaveProperty('provider')
      expect(data).toHaveProperty('model')
      expect(data.documents).toHaveLength(3)
    })
    
    it('should reject unauthenticated requests without forceProvider', async () => {
      const request = createMockRequest({
        projectId: testProjectData.agile.id,
        projectData: testProjectData.agile
      })
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
    
    it('should allow test mode with forceProvider', async () => {
      const request = createMockRequest({
        projectId: testProjectData.agile.id,
        projectData: testProjectData.agile,
        forceProvider: 'mock'
      })
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('documents')
    })
    
    it('should validate required fields', async () => {
      const request = createMockRequest(
        { projectData: testProjectData.agile },
        { 'authorization': 'Bearer test-token' }
      )
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing projectId')
    })
    
    it('should handle generation timeout', async () => {
      // Mock timeout scenario
      const { DocumentGenerator } = await import('@/lib/documents/generator')
      ;(DocumentGenerator as any).mockImplementation(() => ({
        generateProjectDocuments: vi.fn().mockImplementation(
          () => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        ),
        getProviderInfo: vi.fn().mockReturnValue({ provider: 'mock', model: 'test' })
      }))
      
      const request = createMockRequest(
        {
          projectId: testProjectData.agile.id,
          projectData: testProjectData.agile
        },
        { 'authorization': 'Bearer test-token' }
      )
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
    
    it('should log security events', async () => {
      const mockLogSecurityEvent = vi.fn()
      
      vi.mock('@/lib/llm/sanitizer', () => ({
        DataSanitizer: vi.fn().mockImplementation(() => ({
          logSecurityEvent: mockLogSecurityEvent
        }))
      }))
      
      const request = createMockRequest(
        {
          projectId: testProjectData.agile.id,
          projectData: testProjectData.agile
        },
        { 'authorization': 'Bearer test-token' }
      )
      
      await POST(request as any)
      
      // Should log start and completion events
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'DOCUMENT_GENERATION_STARTED',
        expect.any(Object)
      )
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'DOCUMENT_GENERATION_COMPLETED',
        expect.any(Object)
      )
    })
    
    it('should support all methodologies', async () => {
      const methodologies = ['agile', 'prince2', 'hybrid'] as const
      
      for (const methodology of methodologies) {
        const request = createMockRequest(
          {
            projectId: testProjectData[methodology].id,
            projectData: testProjectData[methodology]
          },
          { 'authorization': 'Bearer test-token' }
        )
        
        const response = await POST(request as any)
        const data = await response.json()
        
        expect(response.status).toBe(200)
        expect(data.documents).toBeDefined()
      }
    })
    
    it('should include debug info in response', async () => {
      const request = createMockRequest(
        {
          projectId: testProjectData.agile.id,
          projectData: testProjectData.agile
        },
        { 'authorization': 'Bearer test-token' }
      )
      
      const response = await POST(request as any)
      const data = await response.json()
      
      expect(data).toHaveProperty('debugInfo')
      expect(data.debugInfo).toHaveProperty('generationTime')
      expect(data.debugInfo).toHaveProperty('timestamp')
    })
  })
})