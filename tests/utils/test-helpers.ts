import { expect } from 'vitest'

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now()
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await delay(interval)
  }
}

export const expectDocumentStructure = (document: any) => {
  expect(document).toHaveProperty('id')
  expect(document).toHaveProperty('type')
  expect(document).toHaveProperty('title')
  expect(document).toHaveProperty('content')
  expect(document).toHaveProperty('version')
  expect(document).toHaveProperty('created_at')
}

export const expectValidDocumentContent = (content: any, type: string) => {
  expect(content).toBeDefined()
  
  switch (type) {
    case 'charter':
      expect(content).toHaveProperty('projectName')
      expect(content).toHaveProperty('vision')
      expect(content).toHaveProperty('objectives')
      expect(content).toHaveProperty('scope')
      break
      
    case 'business_case':
      expect(content).toHaveProperty('executiveSummary')
      expect(content).toHaveProperty('businessNeed')
      expect(content).toHaveProperty('expectedBenefits')
      break
      
    case 'technical_landscape':
    case 'comparable_projects':
      expect(typeof content).toBe('string')
      expect(content.length).toBeGreaterThan(100)
      break
      
    case 'backlog':
      expect(content).toHaveProperty('stories')
      expect(Array.isArray(content.stories)).toBe(true)
      break
      
    case 'risk_register':
      expect(content).toHaveProperty('risks')
      expect(Array.isArray(content.risks)).toBe(true)
      break
  }
}

export const expectNoPersonalInfo = (content: string) => {
  // Check for common PII patterns
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/
  const ssnRegex = /\d{3}-\d{2}-\d{4}/
  
  expect(content).not.toMatch(emailRegex)
  expect(content).not.toMatch(phoneRegex)
  expect(content).not.toMatch(ssnRegex)
  
  // Check for placeholder tokens instead
  expect(content).toMatch(/\[STAKEHOLDER_\d+\]|\[SENIOR_USER\]|\[EXECUTIVE\]/)
}

export const measurePerformance = async (fn: () => Promise<any>) => {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  
  return {
    result,
    duration: endTime - startTime,
    durationSeconds: (endTime - startTime) / 1000
  }
}

export const createTestContext = () => {
  return {
    projectId: `test-${Date.now()}`,
    userId: 'test-user-id',
    timestamp: new Date().toISOString()
  }
}

export const assertDocumentCount = (
  documents: any[],
  methodology: 'agile' | 'prince2' | 'hybrid'
) => {
  const expectedCounts = {
    agile: 5,
    prince2: 6,
    hybrid: 5
  }
  
  expect(documents).toHaveLength(expectedCounts[methodology])
}

export const assertDocumentTypes = (
  documents: any[],
  expectedTypes: string[]
) => {
  const actualTypes = documents.map(doc => doc.type).sort()
  const expected = expectedTypes.sort()
  
  expect(actualTypes).toEqual(expected)
}

export const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => headers[name] || null
    }
  } as any
}

export const createMockResponse = () => {
  const response = {
    status: 200,
    body: null as any,
    headers: new Map()
  }
  
  return {
    json: (data: any, init?: ResponseInit) => {
      response.status = init?.status || 200
      response.body = data
      return Response.json(data, init)
    },
    status: (code: number) => {
      response.status = code
      return response
    },
    getResponse: () => response
  }
}