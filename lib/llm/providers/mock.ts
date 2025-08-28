import { BaseProvider } from './base'
import { LLMPrompt, LLMConfig } from '../types'
import { z } from 'zod'

/**
 * Mock LLM Provider for testing without API credits
 * Generates realistic-looking sample documents
 */
export class MockProvider extends BaseProvider {
  name = 'mock'

  async generateText(prompt: LLMPrompt): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Return mock text based on prompt content
    if (prompt.user.includes('Project Initiation')) {
      return this.generateMockPID()
    } else if (prompt.user.includes('Project Charter')) {
      return this.generateMockCharter()
    } else if (prompt.user.includes('Product Backlog')) {
      return this.generateMockBacklog()
    } else if (prompt.user.includes('Risk Register')) {
      return this.generateMockRiskRegister()
    }
    
    return 'Mock generated document content with [STAKEHOLDER_1] as Project Manager.'
  }

  async generateJSON<T>(prompt: LLMPrompt, schema: z.ZodSchema<T>): Promise<T> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Generate mock data based on prompt
    let mockData: any = {}
    
    if (prompt.user.includes('Project Initiation')) {
      mockData = {
        projectBackground: 'This digital transformation initiative aims to modernize our technology infrastructure.',
        projectDefinition: {
          objectives: [
            'Modernize legacy systems',
            'Improve operational efficiency by 40%',
            'Enhance customer experience'
          ],
          scope: 'The project covers all core business systems including CRM, ERP, and customer portals.',
          deliverables: [
            'New cloud-based infrastructure',
            'Migrated applications',
            'Training materials',
            'Documentation'
          ],
          exclusions: ['Third-party integrations will be handled in Phase 2']
        },
        businessCase: {
          reasons: 'Current systems are outdated and causing operational inefficiencies.',
          benefits: [
            'Reduced operational costs by 30%',
            'Improved system reliability',
            'Better customer satisfaction scores'
          ],
          risks: [
            'Technical complexity',
            'Change resistance',
            'Budget overruns'
          ],
          costBenefit: 'ROI expected within 18 months'
        },
        projectProductDescription: 'A modern, cloud-based technology platform supporting all business operations.',
        projectApproach: {
          deliveryStrategy: 'Phased rollout with pilot groups',
          workPackages: [
            'Infrastructure setup',
            'Application migration',
            'Data migration',
            'Testing and validation',
            'Training and rollout'
          ]
        },
        projectManagementStructure: {
          roles: [
            { role: 'Project Manager', responsibility: 'Overall project delivery', placeholder: '[STAKEHOLDER_1]' },
            { role: 'Technical Lead', responsibility: 'Technical architecture and implementation', placeholder: '[STAKEHOLDER_2]' },
            { role: 'Business Analyst', responsibility: 'Requirements and stakeholder management', placeholder: '[STAKEHOLDER_3]' }
          ],
          reportingLines: 'Reports to Project Board monthly'
        },
        qualityManagement: {
          strategy: 'Quality gates at each phase',
          standards: ['ISO 9001', 'Industry best practices'],
          reviewProcess: 'Weekly quality reviews with stakeholders'
        },
        communicationPlan: {
          stakeholderEngagement: 'Monthly steering committee meetings',
          channels: ['Email updates', 'Project portal', 'Town halls'],
          frequency: 'Weekly status reports, monthly executive briefings'
        },
        initialRiskAssessment: [
          { risk: 'Data migration complexity', probability: 'High', impact: 'High', mitigation: 'Phased migration approach' },
          { risk: 'User adoption', probability: 'Medium', impact: 'High', mitigation: 'Comprehensive training program' }
        ]
      }
    } else if (prompt.user.includes('Project Charter')) {
      mockData = {
        vision: 'To become the industry leader in digital innovation',
        objectives: [
          'Deliver modern digital solutions',
          'Improve customer satisfaction by 25%',
          'Reduce time-to-market by 50%'
        ],
        scope: {
          inScope: ['Core platform development', 'User training', 'Data migration'],
          outOfScope: ['Third-party integrations', 'Legacy system decommission']
        },
        deliverables: [
          { name: 'Platform MVP', description: 'Minimum viable product with core features', dueDate: '2024-Q2' },
          { name: 'Full Platform', description: 'Complete platform with all features', dueDate: '2024-Q4' }
        ],
        stakeholders: [
          { role: '[EXECUTIVE]', interest: 'High', influence: 'High' },
          { role: '[SENIOR_USER]', interest: 'High', influence: 'Medium' },
          { role: '[SENIOR_SUPPLIER]', interest: 'Medium', influence: 'High' }
        ],
        timeline: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          milestones: [
            { name: 'Project Kickoff', date: '2024-01-15' },
            { name: 'Design Complete', date: '2024-03-30' },
            { name: 'MVP Launch', date: '2024-06-30' },
            { name: 'Final Delivery', date: '2024-12-15' }
          ]
        },
        budget: {
          total: 1500000,
          breakdown: {
            development: 800000,
            infrastructure: 300000,
            training: 100000,
            contingency: 300000
          }
        },
        constraints: ['Fixed deadline', 'Limited budget', 'Resource availability'],
        assumptions: ['Stakeholder availability', 'Stable requirements', 'No major scope changes'],
        successCriteria: ['On-time delivery', 'Within budget', 'User satisfaction > 80%']
      }
    } else if (prompt.user.includes('Product Backlog')) {
      mockData = {
        stories: [
          {
            id: 'US-001',
            title: 'User Authentication',
            description: 'As a user, I want to securely log in so that I can access my account',
            acceptanceCriteria: ['Secure login', 'Password reset', 'MFA support'],
            priority: 'High',
            storyPoints: 8,
            sprint: 1
          },
          {
            id: 'US-002',
            title: 'Dashboard View',
            description: 'As a user, I want to see a dashboard so that I can monitor key metrics',
            acceptanceCriteria: ['Real-time data', 'Customizable widgets', 'Export functionality'],
            priority: 'High',
            storyPoints: 13,
            sprint: 2
          },
          {
            id: 'US-003',
            title: 'Report Generation',
            description: 'As a manager, I want to generate reports so that I can share insights',
            acceptanceCriteria: ['Multiple formats', 'Scheduled reports', 'Custom templates'],
            priority: 'Medium',
            storyPoints: 21,
            sprint: 3
          }
        ],
        epics: [
          {
            name: 'User Management',
            description: 'Complete user management system',
            stories: ['US-001', 'US-004', 'US-005']
          },
          {
            name: 'Analytics Platform',
            description: 'Analytics and reporting capabilities',
            stories: ['US-002', 'US-003', 'US-006']
          }
        ],
        sprints: [
          {
            number: 1,
            goal: 'Basic authentication and setup',
            capacity: 40,
            plannedStoryPoints: 35
          },
          {
            number: 2,
            goal: 'Core functionality',
            capacity: 45,
            plannedStoryPoints: 42
          }
        ]
      }
    } else if (prompt.user.includes('Risk Register')) {
      mockData = {
        risks: [
          {
            id: 'R001',
            category: 'Technical',
            description: 'System integration complexity',
            probability: 'High',
            impact: 'High',
            score: 9,
            mitigation: 'Incremental integration approach with thorough testing',
            owner: '[STAKEHOLDER_2]',
            status: 'Active'
          },
          {
            id: 'R002',
            category: 'Resource',
            description: 'Key personnel availability',
            probability: 'Medium',
            impact: 'High',
            score: 6,
            mitigation: 'Cross-training and documentation',
            owner: '[STAKEHOLDER_1]',
            status: 'Active'
          },
          {
            id: 'R003',
            category: 'Business',
            description: 'Changing requirements',
            probability: 'Medium',
            impact: 'Medium',
            score: 4,
            mitigation: 'Regular stakeholder reviews and change control process',
            owner: '[STAKEHOLDER_3]',
            status: 'Monitoring'
          }
        ],
        summary: {
          totalRisks: 3,
          highRisks: 1,
          mediumRisks: 2,
          lowRisks: 0,
          mitigatedRisks: 0
        }
      }
    } else {
      // Try to generate data based on the schema structure
      try {
        mockData = this.generateFromSchema(schema)
      } catch (schemaError) {
        // Default mock structure as fallback
        mockData = {
          title: 'Mock Document',
          content: 'This is a mock generated document for testing purposes.',
          metadata: {
            generated: new Date().toISOString(),
            provider: 'mock',
            placeholders: ['[STAKEHOLDER_1]', '[STAKEHOLDER_2]', '[EXECUTIVE]']
          }
        }
      }
    }
    
    // Validate against schema if provided
    try {
      return schema.parse(mockData)
    } catch (error) {
      console.log('Mock data validation failed, attempting to generate valid structure from schema')
      // Try to generate valid structure from schema
      try {
        const validData = this.generateFromSchema(schema)
        return schema.parse(validData)
      } catch (schemaGenError) {
        console.error('Could not generate valid mock data for schema:', schemaGenError)
        // Return the mock data anyway
        return mockData as T
      }
    }
  }

  countTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }

  /**
   * Generate mock data based on a Zod schema
   */
  private generateFromSchema(schema: any): any {
    if (!schema || !schema._def) {
      throw new Error('Invalid schema provided')
    }

    const typeName = schema._def.typeName

    // Handle ZodObject
    if (typeName === 'ZodObject') {
      const result: any = {}
      const shape = schema.shape || schema._def.shape()
      
      for (const key in shape) {
        result[key] = this.generateFromSchema(shape[key])
      }
      
      return result
    }

    // Handle ZodString
    if (typeName === 'ZodString') {
      // Return contextual strings based on field name
      return 'Mock generated text content'
    }

    // Handle ZodArray
    if (typeName === 'ZodArray') {
      const elementSchema = schema._def.type
      // Generate 2-3 items for arrays
      const count = Math.floor(Math.random() * 2) + 2
      const result = []
      for (let i = 0; i < count; i++) {
        result.push(this.generateFromSchema(elementSchema))
      }
      return result
    }

    // Handle ZodBoolean
    if (typeName === 'ZodBoolean') {
      return Math.random() > 0.5
    }

    // Handle ZodNumber
    if (typeName === 'ZodNumber') {
      return Math.floor(Math.random() * 100)
    }

    // Handle ZodOptional
    if (typeName === 'ZodOptional') {
      // 70% chance of providing optional values
      if (Math.random() > 0.3) {
        return this.generateFromSchema(schema._def.innerType)
      }
      return undefined
    }

    // Handle ZodAny
    if (typeName === 'ZodAny') {
      return 'Mock any value'
    }

    // Default fallback
    return 'Mock value'
  }

  private generateMockPID(): string {
    return `
# Project Initiation Document

## Executive Summary
This project aims to deliver transformative value through strategic implementation.

## Project Definition
- **Objectives**: Deliver on time, within budget, meeting all requirements
- **Scope**: All defined deliverables as agreed with [SENIOR_USER]
- **Key Deliverables**: As specified in the project charter

## Business Case
The project is justified by significant ROI and strategic alignment.

## Approach
Phased delivery with regular checkpoints, managed by [STAKEHOLDER_1].

## Project Management Structure
- Executive: [EXECUTIVE]
- Senior User: [SENIOR_USER]  
- Senior Supplier: [SENIOR_SUPPLIER]
- Project Manager: [STAKEHOLDER_1]

## Quality Management
Regular quality gates and reviews to ensure standards are met.
    `.trim()
  }

  private generateMockCharter(): string {
    return `
# Project Charter

## Vision
Delivering excellence through innovation and collaboration.

## Objectives
1. Meet all defined success criteria
2. Deliver within approved budget
3. Achieve stakeholder satisfaction

## Stakeholders
- [EXECUTIVE] - Project Sponsor
- [STAKEHOLDER_1] - Project Manager
- [STAKEHOLDER_2] - Technical Lead
- [STAKEHOLDER_3] - Business Analyst

## Timeline
Project duration: 6 months with quarterly milestones.

## Success Criteria
- On-time delivery
- Budget adherence  
- Quality standards met
- Stakeholder approval
    `.trim()
  }

  private generateMockBacklog(): string {
    return `
# Product Backlog

## Sprint 1
- User Story 1: Authentication system
- User Story 2: Basic dashboard
- User Story 3: User profile management

## Sprint 2  
- User Story 4: Advanced features
- User Story 5: Reporting module
- User Story 6: Integration APIs

## Future Sprints
Additional stories to be refined with [STAKEHOLDER_1] and team.
    `.trim()
  }

  private generateMockRiskRegister(): string {
    return `
# Risk Register

## High Priority Risks
1. **Technical Complexity**
   - Owner: [STAKEHOLDER_2]
   - Mitigation: Phased approach with POCs

2. **Resource Constraints**
   - Owner: [STAKEHOLDER_1]  
   - Mitigation: Cross-training and buffers

## Medium Priority Risks
3. **Scope Creep**
   - Owner: [STAKEHOLDER_3]
   - Mitigation: Strong change control

## Monitoring
Weekly risk reviews with project team.
    `.trim()
  }
}