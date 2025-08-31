import { vi } from 'vitest'
import { mockLLMResponses } from './test-data'

export class MockLLMProvider {
  name = 'mock'
  
  async generateText(prompt: any): Promise<string> {
    // Determine what type of document is being requested based on prompt
    if (prompt.user.includes('Technical Landscape') || prompt.user.includes('technical landscape')) {
      return mockLLMResponses.technicalLandscape
    }
    if (prompt.user.includes('Comparable Projects') || prompt.user.includes('comparable projects')) {
      return mockLLMResponses.comparableProjects
    }
    if (prompt.user.includes('business case')) {
      return JSON.stringify(mockLLMResponses.businessCase)
    }
    if (prompt.user.includes('charter')) {
      return JSON.stringify(mockLLMResponses.charter)
    }
    
    // Default response
    return 'Mock generated content for testing'
  }
  
  async generateJSON<T>(prompt: any, schema: any): Promise<T> {
    // Return appropriate mock based on schema or prompt
    if (prompt.user.includes('charter')) {
      return mockLLMResponses.charter as T
    }
    if (prompt.user.includes('business case')) {
      return mockLLMResponses.businessCase as T
    }
    
    // Return a generic mock object
    return { content: 'Mock JSON response' } as T
  }
  
  countTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

export const createMockDocumentGenerator = () => {
  return {
    generateProjectDocuments: vi.fn().mockResolvedValue([
      {
        id: 'doc-1',
        type: 'charter',
        title: 'Project Charter',
        content: mockLLMResponses.charter,
        version: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'doc-2',
        type: 'technical_landscape',
        title: 'Technical Landscape',
        content: mockLLMResponses.technicalLandscape,
        version: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'doc-3',
        type: 'comparable_projects',
        title: 'Comparable Projects',
        content: mockLLMResponses.comparableProjects,
        version: 1,
        created_at: new Date().toISOString()
      }
    ]),
    
    generateAgileCharter: vi.fn().mockResolvedValue({
      type: 'charter',
      content: mockLLMResponses.charter
    }),
    
    generateProductBacklog: vi.fn().mockResolvedValue({
      type: 'backlog',
      content: { stories: [] }
    }),
    
    generateTechnicalLandscape: vi.fn().mockResolvedValue({
      type: 'technical_landscape',
      content: mockLLMResponses.technicalLandscape
    }),
    
    generateComparableProjects: vi.fn().mockResolvedValue({
      type: 'comparable_projects',
      content: mockLLMResponses.comparableProjects
    }),
    
    getProviderInfo: vi.fn().mockReturnValue({
      provider: 'mock',
      model: 'test-model'
    })
  }
}

export const createMockLLMGateway = () => {
  return {
    generateText: vi.fn().mockImplementation(async (prompt) => {
      const provider = new MockLLMProvider()
      return provider.generateText(prompt)
    }),
    
    generateJSON: vi.fn().mockImplementation(async (prompt, schema) => {
      const provider = new MockLLMProvider()
      return provider.generateJSON(prompt, schema)
    }),
    
    buildContextPrompt: vi.fn().mockReturnValue({
      system: 'Mock system prompt',
      user: 'Mock user prompt'
    }),
    
    estimateTokens: vi.fn().mockReturnValue(1000),
    estimateCost: vi.fn().mockReturnValue(5),
    healthCheck: vi.fn().mockResolvedValue(true)
  }
}

export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id' }
          }
        },
        error: null
      })
    },
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
      execute: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}