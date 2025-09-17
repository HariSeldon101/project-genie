import { z } from 'zod'

export const Prince2PIDSchema = z.object({
  projectDefinition: z.object({
    background: z.string(),
    objectives: z.array(z.string()),
    desiredOutcomes: z.array(z.string()),
    scope: z.object({
      included: z.array(z.string()),
      excluded: z.array(z.string())
    }),
    constraints: z.array(z.string()),
    assumptions: z.array(z.string()),
    deliverables: z.array(z.object({
      name: z.string(),
      description: z.string(),
      qualityCriteria: z.array(z.string())
    })),
    interfaces: z.array(z.string())
  }),
  
  businessCase: z.object({
    reasons: z.string(),
    businessOptions: z.array(z.object({
      option: z.string(),
      description: z.string(),
      costs: z.string(),
      benefits: z.string(),
      risks: z.string()
    })),
    expectedBenefits: z.array(z.object({
      benefit: z.string(),
      measurable: z.boolean(),
      measurement: z.string().optional(),
      baseline: z.string().optional(),
      target: z.string().optional()
    })),
    expectedDisBenefits: z.array(z.string()),
    timescale: z.string(),
    costs: z.object({
      development: z.string(),
      operational: z.string(),
      maintenance: z.string(),
      total: z.string()
    }),
    investmentAppraisal: z.object({
      roi: z.string(),
      paybackPeriod: z.string(),
      npv: z.string().optional()
    }),
    majorRisks: z.array(z.string())
  }),
  
  organizationStructure: z.object({
    projectBoard: z.object({
      executive: z.string(),
      seniorUser: z.string(),
      seniorSupplier: z.string()
    }),
    projectManager: z.string(),
    teamManagers: z.array(z.string()).optional(),
    projectAssurance: z.array(z.object({
      role: z.string(),
      responsibilities: z.array(z.string())
    })),
    projectSupport: z.string().optional()
  }),
  
  qualityManagementApproach: z.object({
    qualityStandards: z.array(z.string()),
    qualityCriteria: z.array(z.string()),
    qualityMethod: z.string(),
    qualityResponsibilities: z.array(z.object({
      role: z.string(),
      responsibilities: z.array(z.string())
    }))
  }),
  
  configurationManagementApproach: z.object({
    purpose: z.string(),
    procedure: z.string(),
    issueAndChangeControl: z.string(),
    toolsAndTechniques: z.array(z.string())
  }),
  
  riskManagementApproach: z.object({
    procedure: z.string(),
    riskTolerance: z.object({
      time: z.string(),
      cost: z.string(),
      quality: z.string(),
      scope: z.string(),
      benefits: z.string(),
      risk: z.string()
    }),
    riskCategories: z.array(z.string()),
    rolesAndResponsibilities: z.array(z.object({
      role: z.string(),
      responsibilities: z.array(z.string())
    }))
  }),
  
  communicationManagementApproach: z.object({
    methods: z.array(z.object({
      method: z.string(),
      frequency: z.string(),
      audience: z.array(z.string()),
      purpose: z.string()
    })),
    stakeholderAnalysis: z.array(z.object({
      stakeholder: z.string(),
      interest: z.enum(['high', 'medium', 'low']),
      influence: z.enum(['high', 'medium', 'low']),
      communicationNeeds: z.string()
    }))
  }),
  
  projectPlan: z.object({
    stages: z.array(z.object({
      name: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      objectives: z.array(z.string()),
      deliverables: z.array(z.string()),
      tolerances: z.object({
        time: z.string(),
        cost: z.string(),
        quality: z.string(),
        scope: z.string()
      })
    })),
    milestones: z.array(z.object({
      name: z.string(),
      date: z.string(),
      deliverables: z.array(z.string())
    }))
  }),
  
  projectControls: z.object({
    tolerances: z.object({
      project: z.object({
        time: z.string(),
        cost: z.string(),
        quality: z.string(),
        scope: z.string(),
        risk: z.string(),
        benefits: z.string()
      }),
      stage: z.object({
        time: z.string(),
        cost: z.string()
      })
    }),
    reportingArrangements: z.array(z.object({
      report: z.string(),
      frequency: z.string(),
      recipients: z.array(z.string())
    })),
    issueAndChangeControl: z.string()
  }),
  
  tailoring: z.object({
    approach: z.string(),
    justification: z.string()
  })
})

export type Prince2PID = z.infer<typeof Prince2PIDSchema>

export const RiskRegisterSchema = z.object({
  risks: z.array(z.object({
    id: z.string(),
    category: z.enum(['strategic', 'commercial', 'financial', 'operational', 'technical', 'compliance']),
    description: z.string(),
    probability: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    impact: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    score: z.number(),
    proximity: z.enum(['imminent', 'within_stage', 'within_project', 'beyond_project']),
    response: z.enum(['avoid', 'reduce', 'transfer', 'accept', 'share']),
    responseActions: z.array(z.string()),
    owner: z.string(),
    status: z.enum(['active', 'closed', 'occurred'])
  }))
})

export type RiskRegister = z.infer<typeof RiskRegisterSchema>