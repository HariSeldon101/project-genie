import { describe, it, expect, beforeEach } from 'vitest'
import { ResponseNormalizer } from '@/lib/llm/response-normalizer'

describe('ResponseNormalizer', () => {
  let normalizer: ResponseNormalizer

  beforeEach(() => {
    normalizer = new ResponseNormalizer()
  })

  describe('parseAndNormalize', () => {
    it('should handle properly formatted JSON', () => {
      const input = JSON.stringify({
        executiveSummary: 'Test summary',
        visionAndObjectives: { vision: 'Test vision', objectives: [] }
      })

      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test summary')
      expect(result.visionAndObjectives.vision).toBe('Test vision')
    })

    it('should convert PascalCase to camelCase', () => {
      const input = JSON.stringify({
        'ExecutiveSummary': 'Test summary',
        'VisionAndObjectives': { 'Vision': 'Test vision' }
      })

      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test summary')
      expect(result.visionAndObjectives.vision).toBe('Test vision')
    })

    it('should convert space-separated to camelCase', () => {
      const input = JSON.stringify({
        'Executive Summary': 'Test summary',
        'Vision and Objectives': { 'Vision': 'Test vision' },
        'Success Criteria': ['criterion1', 'criterion2']
      })

      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test summary')
      expect(result.visionAndObjectives).toBeDefined()
      expect(result.successCriteria).toEqual(['criterion1', 'criterion2'])
    })

    it('should handle nested objects and arrays', () => {
      const input = JSON.stringify({
        'Project Definition': {
          'Background': 'Test background',
          'Objectives': ['obj1', 'obj2'],
          'Scope': {
            'In Scope': ['item1'],
            'Out of Scope': ['item2']
          }
        }
      })

      const result = normalizer.parseAndNormalize(input)
      
      expect(result.projectDefinition.background).toBe('Test background')
      expect(result.projectDefinition.objectives).toEqual(['obj1', 'obj2'])
      expect(result.projectDefinition.scope.inScope).toEqual(['item1'])
      expect(result.projectDefinition.scope.outOfScope).toEqual(['item2'])
    })

    it('should extract JSON from markdown code blocks', () => {
      const input = '```json\n{"executiveSummary": "Test"}\n```'
      
      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test')
    })

    it('should handle JSON with extra text around it', () => {
      const input = 'Here is the JSON response:\n{"executiveSummary": "Test"}\nEnd of response.'
      
      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test')
    })

    it('should handle malformed JSON with missing closing braces', () => {
      const input = '{"executiveSummary": "Test", "scope": {"inScope": ["item1"]'
      
      const result = normalizer.parseAndNormalize(input)
      
      expect(result.executiveSummary).toBe('Test')
      expect(result.scope.inScope).toEqual(['item1'])
    })
  })

  describe('normalizeAgileCharter', () => {
    it('should normalize GPT-5 style Agile Charter response', () => {
      const gpt5Response = JSON.stringify({
        'Executive Summary': 'Project summary',
        'Project Vision & Objectives': {
          'Vision': 'Project vision',
          'Objectives': [
            'Objective 1',
            'Objective 2'
          ]
        },
        'Success Criteria & KPIs': {
          'KPIs': [
            { name: 'KPI 1', metric: 'Metric 1', target: 'Target 1' }
          ]
        },
        'Scope Statement': {
          'In Scope': ['Item 1'],
          'Out of Scope': ['Item 2']
        },
        'Key Deliverables': [
          { name: 'Deliverable 1', due_date: '2025-01-01' }
        ],
        'Stakeholder Analysis': {
          'matrix': [
            { stakeholder: 'User', role: 'Tester', interest: 'high', influence: 'medium' }
          ]
        },
        'Team Structure & Roles': [
          { role: 'Developer', responsibilities: 'Code' }
        ],
        'High-Level Timeline': {
          'Phases': [
            { name: 'Phase 1', duration: '2 weeks' }
          ]
        },
        'Initial Risk Assessment': {
          'Top Risks': [
            { id: 'R1', description: 'Risk 1', likelihood: 'low', impact: 'high' }
          ]
        },
        'Assumptions & Dependencies': {
          'Assumptions': ['Assumption 1'],
          'Dependencies': [{ type: 'external', description: 'Dep 1' }]
        },
        'Communication Plan': {
          'Cadence': {
            'Weekly': [{ type: 'Standup', frequency: 'Daily' }]
          }
        },
        'Definition of Done': ['All tests pass', 'Code reviewed']
      })

      const result = normalizer.normalizeAgileCharter(gpt5Response)
      
      expect(result.executiveSummary).toBe('Project summary')
      expect(result.visionAndObjectives).toBeDefined()
      expect(result.scope.inScope).toEqual(['Item 1'])
      expect(result.scope.outOfScope).toEqual(['Item 2'])
      expect(result.deliverables).toHaveLength(1)
      expect(result.stakeholderAnalysis).toBeDefined()
      expect(result.teamStructure).toBeDefined()
      expect(result.timeline).toBeDefined()
      expect(result.risks).toBeDefined()
      expect(result.dependencies).toBeDefined()
      expect(result.communicationPlan).toBeDefined()
      expect(result.definitionOfDone).toEqual(['All tests pass', 'Code reviewed'])
    })

    it('should add default values for missing required fields', () => {
      const partialResponse = JSON.stringify({
        'Executive Summary': 'Test summary'
      })

      const result = normalizer.normalizeAgileCharter(partialResponse)
      
      expect(result.executiveSummary).toBe('Test summary')
      expect(result.visionAndObjectives).toBeDefined()
      expect(result.scope).toBeDefined()
      expect(result.deliverables).toEqual([])
      expect(result.stakeholderAnalysis).toEqual([])
      expect(result.teamStructure.productOwner).toBe('[PRODUCT_OWNER]')
      expect(result.teamStructure.scrumMaster).toBe('[SCRUM_MASTER]')
      expect(result.timeline.sprints).toBe(4)
      expect(result.risks).toEqual([])
      expect(result.dependencies).toEqual([])
      expect(result.communicationPlan.ceremonies).toEqual([])
      expect(result.definitionOfDone).toEqual([])
    })
  })

  describe('normalizeProductBacklog', () => {
    it('should handle array of stories', () => {
      const response = JSON.stringify([
        { id: '1', epic: 'Epic1', userStory: 'Story 1' },
        { id: '2', epic: 'Epic1', userStory: 'Story 2' }
      ])

      const result = normalizer.normalizeProductBacklog(response)
      
      expect(result.stories).toHaveLength(2)
      expect(result.stories[0].userStory).toBe('Story 1')
      expect(result.epics).toEqual([])
    })

    it('should handle proper backlog structure', () => {
      const response = JSON.stringify({
        stories: [
          { id: '1', epic: 'Epic1', userStory: 'Story 1', storyPoints: 3 }
        ],
        epics: [
          { id: 'E1', name: 'Epic 1', description: 'Epic desc' }
        ]
      })

      const result = normalizer.normalizeProductBacklog(response)
      
      expect(result.stories).toHaveLength(1)
      expect(result.stories[0].storyPoints).toBe(3)
      expect(result.epics).toHaveLength(1)
      expect(result.epics[0].name).toBe('Epic 1')
    })
  })

  describe('applyFieldMappings', () => {
    it('should apply custom field mappings', () => {
      const input = {
        'Project Vision & Objectives': { vision: 'Test' },
        'Success Criteria & KPIs': { kpis: [] }
      }

      const mappings = {
        'Project Vision & Objectives': 'visionAndObjectives',
        'Success Criteria & KPIs': 'successCriteria'
      }

      const result = normalizer.applyFieldMappings(input, mappings)
      
      expect(result.visionAndObjectives).toBeDefined()
      expect(result.visionAndObjectives.vision).toBe('Test')
      expect(result.successCriteria).toBeDefined()
      expect(result['Project Vision & Objectives']).toBeUndefined()
    })
  })

  describe('ensureRequiredFields', () => {
    it('should add missing required fields with defaults', () => {
      const input = { existingField: 'value' }
      
      const requiredFields = {
        requiredField1: 'default1',
        requiredField2: [],
        existingField: 'should not override'
      }

      const result = normalizer.ensureRequiredFields(input, requiredFields)
      
      expect(result.existingField).toBe('value')
      expect(result.requiredField1).toBe('default1')
      expect(result.requiredField2).toEqual([])
    })
  })
})