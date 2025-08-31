/**
 * Utility functions for document formatters
 */

/**
 * Ensures PID data has all required fields with defaults
 */
export function ensurePIDStructure(data: any): any {
  // Handle malformed or incomplete data
  if (!data || typeof data !== 'object') {
    data = {}
  }
  
  // Extract any available data, even from partial structures
  const projectDef = data.projectDefinition || {}
  const scope = projectDef.scope || {}
  
  const defaults = {
    projectDefinition: {
      background: projectDef.background || 'Project background to be defined',
      objectives: projectDef.objectives || ['Objective 1', 'Objective 2'],
      desiredOutcomes: projectDef.desiredOutcomes || ['Outcome 1', 'Outcome 2'],
      scope: {
        included: scope.included || (Array.isArray(scope) ? scope : ['In scope items']),
        excluded: scope.excluded || ['Out of scope items']
      },
      constraints: data?.projectDefinition?.constraints || ['Time', 'Budget', 'Resources'],
      assumptions: data?.projectDefinition?.assumptions || ['Assumptions to be validated'],
      deliverables: data?.projectDefinition?.deliverables || [
        {
          name: 'Deliverable 1',
          description: 'Description',
          qualityCriteria: ['Quality criteria']
        }
      ],
      interfaces: data?.projectDefinition?.interfaces || ['External systems']
    },
    businessCase: {
      reasons: data?.businessCase?.reasons || 'Business reasons',
      businessOptions: data?.businessCase?.businessOptions || data?.businessCase?.options || [],
      options: data?.businessCase?.options || data?.businessCase?.businessOptions || [], // Support both names
      expectedBenefits: data?.businessCase?.expectedBenefits || [],
      expectedDisbenefits: data?.businessCase?.expectedDisbenefits || data?.businessCase?.expectedDisBenefits || [], // Support both spellings
      expectedDisBenefits: data?.businessCase?.expectedDisBenefits || data?.businessCase?.expectedDisbenefits || [], // Support both spellings
      timescale: data?.businessCase?.timescale || 'Project timeline',
      costs: data?.businessCase?.costs || {
        development: '0',
        operational: '0',
        maintenance: '0',
        total: '0'
      },
      investmentAppraisal: data?.businessCase?.investmentAppraisal || 'Investment appraisal',
      majorRisks: data?.businessCase?.majorRisks || []
    },
    organizationStructure: data?.organizationStructure || {
      projectBoard: {
        executive: '[EXECUTIVE]',
        seniorUser: '[SENIOR_USER]',
        seniorSupplier: '[SENIOR_SUPPLIER]'
      },
      projectManager: '[PROJECT_MANAGER]',
      teamManagers: [],
      projectAssurance: {
        business: '[BUSINESS_ASSURANCE]',
        user: '[USER_ASSURANCE]',
        specialist: '[SPECIALIST_ASSURANCE]'
      },
      projectSupport: 'Project support'
    },
    qualityManagementApproach: data?.qualityManagementApproach || {
      qualityStandards: ['ISO 9001'],
      qualityCriteria: ['Quality criteria'],
      qualityMethod: 'Quality method',
      qualityResponsibilities: 'Quality responsibilities'
    },
    configurationManagementApproach: data?.configurationManagementApproach || {
      purpose: 'Configuration management purpose',
      procedure: 'Configuration procedure',
      issueAndChangeControl: 'Issue and change control',
      toolsAndTechniques: ['Git', 'Jira']
    },
    riskManagementApproach: data?.riskManagementApproach || {
      procedure: 'Risk procedure',
      riskTolerance: {
        time: '± 10%',
        cost: '± 15%',
        quality: 'Must meet standards',
        scope: 'No changes without approval',
        benefits: 'Must achieve 80%',
        risk: 'Medium tolerance'
      },
      riskRegisterFormat: 'Risk register format',
      rolesAndResponsibilities: [
        {
          role: 'Project Manager',
          responsibilities: ['Maintain risk register', 'Facilitate risk workshops']
        },
        {
          role: 'Project Board',
          responsibilities: ['Approve risk management approach', 'Make decisions on escalated risks']
        }
      ],
      riskCategories: ['Strategic', 'Operational', 'Technical', 'External'],
      toolsAndTechniques: ['Risk workshops', 'Risk checklists', 'SWOT analysis'],
      reporting: 'Monthly risk reports',
      timingOfRiskManagementActivities: 'Risk reviews at each stage boundary'
    },
    communicationManagementApproach: data?.communicationManagementApproach || {
      methods: ['Email', 'Meetings', 'Reports', 'Presentations'],
      frequency: 'Weekly status updates, Monthly steering committee meetings',
      stakeholderAnalysis: [
        {
          stakeholder: 'Project Sponsor',
          interest: 'High',
          influence: 'High',
          communicationMethod: 'Face-to-face meetings',
          frequency: 'Weekly'
        },
        {
          stakeholder: 'End Users',
          interest: 'High',
          influence: 'Medium',
          communicationMethod: 'Email updates',
          frequency: 'Bi-weekly'
        }
      ],
      procedure: 'Communication procedures',
      toolsAndTechniques: ['Email', 'MS Teams', 'Project Portal'],
      reporting: 'Weekly status reports',
      rolesAndResponsibilities: 'Project Manager responsible for all communications'
    },
    projectPlan: data?.projectPlan || {
      stages: [],
      milestones: [],
      dependencies: [],
      schedule: 'Project schedule'
    },
    projectControls: data?.projectControls || {
      tolerances: {
        time: '± 10%',
        cost: '± 15%',
        scope: 'No changes without approval',
        quality: 'Must meet standards',
        risk: 'Medium tolerance',
        benefits: 'Must achieve 80%'
      },
      reportingFrequency: 'Weekly',
      escalationProcess: 'Escalation process'
    },
    tailoring: data?.tailoring || {
      approach: 'Tailoring approach',
      justification: 'Tailoring justification'
    }
  }

  // Merge provided data with defaults
  return { ...defaults, ...data }
}

/**
 * Ensures Business Case data has all required fields with defaults
 */
export function ensureBusinessCaseStructure(data: any): any {
  // Handle malformed or incomplete data
  if (!data || typeof data !== 'object') {
    data = {}
  }
  
  const defaults = {
    executiveSummary: data?.executiveSummary || 'Executive summary to be written',
    reasons: data?.reasons || 'Business reasons for the project',
    businessOptions: data?.businessOptions || [
      {
        option: 'Do Nothing',
        description: 'Continue with current state',
        costs: '0',
        benefits: 'None',
        risks: 'Status quo risks'
      },
      {
        option: 'Recommended Option',
        description: 'Implement proposed solution',
        costs: data?.costs?.total || '0',
        benefits: 'Expected benefits',
        risks: 'Implementation risks'
      }
    ],
    expectedBenefits: data?.expectedBenefits || [
      {
        benefit: 'Benefit 1',
        measurable: true,
        measurement: 'KPI',
        baseline: 'Current',
        target: 'Target'
      }
    ],
    expectedDisBenefits: data?.expectedDisBenefits || [],
    timescale: data?.timescale || 'Project timeline',
    costs: {
      development: data?.costs?.development || '0',
      operational: data?.costs?.operational || '0',
      maintenance: data?.costs?.maintenance || '0',
      total: data?.costs?.total || '0'
    },
    investmentAppraisal: data?.investmentAppraisal || {
      roi: 'ROI calculation pending',
      paybackPeriod: 'Payback period pending',
      npv: 'NPV calculation pending'
    },
    majorRisks: data?.majorRisks || ['Risk 1', 'Risk 2']
  }

  // Properly merge the data with defaults
  return { ...defaults, ...data }
}

/**
 * Safely formats a document with error handling
 */
export function safeFormatDocument(
  formatter: (data: any, metadata: any) => string,
  data: any,
  metadata: any,
  documentType: string
): string {
  try {
    return formatter(data, metadata)
  } catch (error) {
    console.error(`Error formatting ${documentType}:`, error)
    
    // Return a formatted error message with the raw data
    return `# ${documentType}

## Formatting Error

The document could not be formatted properly. This may be due to incomplete data generation.

### Raw Document Content

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

### Document Metadata

- **Project**: ${metadata.projectName || 'Unknown'}
- **Version**: ${metadata.version || '1.0'}
- **Date**: ${metadata.date || new Date().toLocaleDateString()}

### Troubleshooting

1. The document may have been partially generated
2. Try regenerating the document
3. Check the console for detailed error messages
`
  }
}