export const testProjectData = {
  agile: {
    id: 'test-agile-project',
    projectName: 'Test Agile Project',
    methodology: 'agile',
    vision: 'Create an innovative solution using agile methodology',
    businessCase: 'Deliver value incrementally with rapid iterations',
    description: 'A test project for agile document generation',
    sector: 'technology',
    tier: 'premium',
    companyWebsite: 'https://example.com',
    stakeholders: [
      { role: 'Product Owner', influence: 'high', interest: 'high' },
      { role: 'Scrum Master', influence: 'high', interest: 'medium' },
      { role: 'Developer', influence: 'medium', interest: 'high' }
    ],
    epics: [
      { title: 'User Authentication', description: 'Implement secure login system' },
      { title: 'Dashboard', description: 'Create user dashboard with analytics' }
    ],
    risks: [
      { description: 'Technical debt', impact: 'medium', probability: 'high' },
      { description: 'Scope creep', impact: 'high', probability: 'medium' }
    ]
  },
  
  prince2: {
    id: 'test-prince2-project',
    projectName: 'Test PRINCE2 Project',
    methodology: 'prince2',
    vision: 'Deliver a structured project following PRINCE2 principles',
    businessCase: 'Ensure controlled project delivery with clear governance',
    description: 'A test project for PRINCE2 document generation',
    sector: 'finance',
    tier: 'enterprise',
    companyWebsite: 'https://example.org',
    stakeholders: [
      { role: 'Executive', influence: 'high', interest: 'high' },
      { role: 'Senior User', influence: 'high', interest: 'high' },
      { role: 'Senior Supplier', influence: 'high', interest: 'medium' }
    ],
    epics: [
      { title: 'Project Initiation', description: 'Complete project initiation documentation' },
      { title: 'Quality Management', description: 'Establish quality assurance processes' }
    ],
    risks: [
      { description: 'Budget overrun', impact: 'high', probability: 'low' },
      { description: 'Resource availability', impact: 'medium', probability: 'medium' }
    ]
  },
  
  hybrid: {
    id: 'test-hybrid-project',
    projectName: 'Test Hybrid Project',
    methodology: 'hybrid',
    vision: 'Combine agile flexibility with structured governance',
    businessCase: 'Balance rapid delivery with controlled processes',
    description: 'A test project for hybrid document generation',
    sector: 'healthcare',
    tier: 'standard',
    companyWebsite: 'https://example.net',
    stakeholders: [
      { role: 'Project Board', influence: 'high', interest: 'high' },
      { role: 'Product Owner', influence: 'high', interest: 'high' },
      { role: 'Team Lead', influence: 'medium', interest: 'high' }
    ],
    epics: [
      { title: 'Phase 1 Delivery', description: 'Initial product release' },
      { title: 'Compliance', description: 'Ensure regulatory compliance' }
    ],
    risks: [
      { description: 'Methodology conflicts', impact: 'medium', probability: 'medium' },
      { description: 'Communication gaps', impact: 'high', probability: 'low' }
    ]
  }
}

export const expectedDocuments = {
  agile: [
    'charter',
    'backlog',
    'sprint_plan',
    'technical_landscape',
    'comparable_projects'
  ],
  prince2: [
    'pid',
    'business_case',
    'risk_register',
    'project_plan',
    'technical_landscape',
    'comparable_projects'
  ],
  hybrid: [
    'charter',
    'risk_register',
    'backlog',
    'technical_landscape',
    'comparable_projects'
  ]
}

export const mockLLMResponses = {
  charter: {
    projectName: 'Test Project',
    vision: 'Test vision statement',
    objectives: ['Objective 1', 'Objective 2'],
    scope: {
      inScope: ['Feature 1', 'Feature 2'],
      outOfScope: ['Feature 3']
    },
    stakeholders: [
      { name: '[STAKEHOLDER_1]', role: 'Product Owner', influence: 'high' }
    ],
    constraints: ['Time constraint', 'Budget constraint'],
    assumptions: ['Assumption 1', 'Assumption 2'],
    risks: [
      { description: 'Risk 1', impact: 'high', mitigation: 'Mitigation strategy' }
    ],
    successCriteria: ['Criteria 1', 'Criteria 2']
  },
  
  businessCase: {
    executiveSummary: 'Executive summary of the business case',
    businessNeed: 'Description of the business need',
    options: [
      { name: 'Option 1', description: 'Description', pros: ['Pro 1'], cons: ['Con 1'] }
    ],
    expectedBenefits: ['Benefit 1', 'Benefit 2'],
    costs: {
      development: 100000,
      operational: 50000,
      total: 150000
    },
    risks: [
      { description: 'Business risk', impact: 'high', probability: 'low' }
    ],
    timeline: 'Project timeline description',
    recommendation: 'Recommended approach'
  },
  
  technicalLandscape: `# Technical Landscape Analysis

## Current Architecture
- Microservices architecture
- Cloud-native deployment
- RESTful APIs

## Technology Stack
- Frontend: React/Next.js
- Backend: Node.js
- Database: PostgreSQL
- Infrastructure: AWS

## Integration Points
- Payment gateway integration
- Third-party APIs
- Authentication services`,
  
  comparableProjects: `# Comparable Projects Analysis

## Similar Implementations
1. **Project Alpha**
   - Industry: Same sector
   - Size: Similar scope
   - Success metrics: 95% on-time delivery

2. **Project Beta**
   - Technology: Same stack
   - Team size: Comparable
   - Lessons learned: Focus on early testing

## Key Insights
- Average timeline: 6-8 months
- Common challenges: Integration complexity
- Success factors: Strong governance`
}

export const mockGenerationConfig = {
  provider: 'mock',
  model: 'test-model',
  maxTokens: 4000,
  temperature: 0.7,
  timeout: 30000
}