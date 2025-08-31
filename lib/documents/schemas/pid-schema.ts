/**
 * PRINCE2 Project Initiation Document (PID) Schema
 * Properly typed Zod schema with no z.any() usage
 * All fields are required - use null unions for optional fields
 */

import { z } from 'zod'

// Sub-schemas for complex nested structures
const ProjectDeliverableSchema = z.object({
  name: z.string().describe('Name of the deliverable'),
  description: z.string().describe('Detailed description of what will be delivered'),
  qualityCriteria: z.array(z.string()).describe('Specific quality criteria that must be met')
})

const ProjectStageSchema = z.object({
  name: z.string().describe('Stage name (e.g., "Initiation", "Development")'),
  startDate: z.string().describe('Start date in ISO format or descriptive text'),
  endDate: z.string().describe('End date in ISO format or descriptive text'),
  objectives: z.array(z.string()).describe('Stage-specific objectives'),
  deliverables: z.array(z.string()).describe('Key deliverables for this stage')
})

const MilestoneSchema = z.object({
  name: z.string().describe('Milestone name'),
  date: z.string().describe('Target date'),
  criteria: z.string().describe('Success criteria for this milestone')
})

const DependencySchema = z.object({
  type: z.string().describe('Type of dependency (internal/external)'),
  description: z.string().describe('Description of the dependency'),
  impact: z.string().describe('Impact if dependency is not met')
})

const RoleResponsibilitySchema = z.object({
  role: z.string().describe('Role name'),
  responsibilities: z.array(z.string()).describe('List of responsibilities')
})

const StakeholderSchema = z.object({
  stakeholder: z.string().describe('Stakeholder name or group'),
  interest: z.enum(['high', 'medium', 'low']).describe('Level of interest'),
  influence: z.enum(['high', 'medium', 'low']).describe('Level of influence'),
  communicationMethod: z.string().describe('Preferred communication method'),
  frequency: z.string().describe('Communication frequency')
})

const ToleranceSchema = z.object({
  time: z.string().describe('Time tolerance (e.g., "+/- 1 week")'),
  cost: z.string().describe('Cost tolerance (e.g., "+/- 10%")'),
  quality: z.string().describe('Quality tolerance'),
  scope: z.string().describe('Scope tolerance'),
  benefits: z.string().describe('Benefits tolerance'),
  risk: z.string().describe('Risk tolerance')
})

const TailoringItemSchema = z.object({
  aspect: z.string().describe('PRINCE2 aspect being tailored'),
  tailoring: z.string().describe('How it is being tailored'),
  justification: z.string().describe('Justification for the tailoring')
})

// Main PID Schema
export const PIDSchema = z.object({
  // 1. Project Definition
  projectDefinition: z.object({
    background: z.string().describe('Project background and context'),
    objectives: z.array(z.string()).describe('SMART project objectives'),
    desiredOutcomes: z.array(z.string()).describe('Expected outcomes and benefits'),
    scope: z.object({
      included: z.array(z.string()).describe('What is included in project scope'),
      excluded: z.array(z.string()).describe('What is explicitly excluded')
    }),
    constraints: z.array(z.string()).describe('Project constraints'),
    assumptions: z.array(z.string()).describe('Project assumptions'),
    deliverables: z.array(ProjectDeliverableSchema).describe('Major project deliverables'),
    interfaces: z.array(z.string()).describe('External interfaces and dependencies')
  }),

  // 2. Business Case Summary
  businessCase: z.object({
    reasons: z.string().describe('Business reasons for the project'),
    businessOptions: z.array(z.object({
      option: z.string().describe('Option name'),
      description: z.string().describe('Option description'),
      costs: z.string().describe('Estimated costs'),
      benefits: z.string().describe('Expected benefits'),
      risks: z.string().describe('Associated risks')
    })).describe('Business options considered'),
    expectedBenefits: z.array(z.object({
      benefit: z.string().describe('Benefit description'),
      measurable: z.boolean().describe('Is the benefit measurable'),
      measurement: z.string().describe('How to measure'),
      baseline: z.string().describe('Current baseline'),
      target: z.string().describe('Target value')
    })).describe('Expected business benefits'),
    expectedDisBenefits: z.array(z.string()).describe('Expected disbenefits or negative impacts'),
    timescale: z.string().describe('Project timescale'),
    costs: z.object({
      development: z.string().describe('Development costs as formatted string'),
      operational: z.string().describe('Operational costs as formatted string'),
      maintenance: z.string().describe('Maintenance costs as formatted string'),
      total: z.string().describe('Total project costs as formatted string')
    }),
    investmentAppraisal: z.object({
      roi: z.string().describe('Return on Investment'),
      paybackPeriod: z.string().describe('Payback period'),
      npv: z.string().describe('Net Present Value')
    }).describe('Investment appraisal'),
    majorRisks: z.array(z.string()).describe('Major business risks')
  }),

  // 3. Organization Structure
  organizationStructure: z.object({
    projectBoard: z.object({
      executive: z.string().describe('Project Executive name'),
      seniorUser: z.string().describe('Senior User representative'),
      seniorSupplier: z.string().describe('Senior Supplier representative')
    }),
    projectManager: z.string().describe('Project Manager name'),
    teamManagers: z.array(z.string()).describe('Team Manager names'),
    projectAssurance: z.object({
      business: z.string().describe('Business assurance role'),
      user: z.string().describe('User assurance role'),
      specialist: z.string().describe('Specialist/technical assurance role')
    }),
    projectSupport: z.string().describe('Project support structure')
  }),

  // 4. Quality Management Approach
  qualityManagementApproach: z.object({
    qualityStandards: z.array(z.string()).describe('Applicable quality standards'),
    qualityCriteria: z.array(z.string()).describe('Project quality criteria'),
    qualityMethod: z.string().describe('Quality management method'),
    qualityResponsibilities: z.string().describe('Quality responsibilities')
  }),

  // 5. Configuration Management Approach
  configurationManagementApproach: z.object({
    purpose: z.string().describe('Purpose of configuration management'),
    procedure: z.string().describe('Configuration management procedures'),
    issueAndChangeControl: z.string().describe('Issue and change control process'),
    toolsAndTechniques: z.array(z.string()).describe('Tools and techniques to be used')
  }),

  // 6. Risk Management Approach
  riskManagementApproach: z.object({
    procedure: z.string().describe('Risk management procedure'),
    riskTolerance: ToleranceSchema.describe('Risk tolerance levels'),
    riskRegisterFormat: z.string().describe('Format of the risk register'),
    rolesAndResponsibilities: z.array(RoleResponsibilitySchema).describe('Risk management roles'),
    riskCategories: z.array(z.string()).describe('Risk categories'),
    toolsAndTechniques: z.array(z.string()).describe('Risk management tools'),
    reporting: z.string().describe('Risk reporting arrangements'),
    timingOfRiskManagementActivities: z.string().describe('When risk activities occur')
  }),

  // 7. Communication Management Approach
  communicationManagementApproach: z.object({
    procedure: z.string().describe('Communication procedures'),
    toolsAndTechniques: z.array(z.string()).describe('Communication tools'),
    reporting: z.string().describe('Reporting arrangements'),
    rolesAndResponsibilities: z.string().describe('Communication roles'),
    methods: z.array(z.string()).describe('Communication methods'),
    frequency: z.string().describe('Communication frequency'),
    stakeholderAnalysis: z.array(StakeholderSchema).describe('Stakeholder communication needs')
  }),

  // 8. Project Plan
  projectPlan: z.object({
    stages: z.array(ProjectStageSchema).describe('Project stages'),
    milestones: z.array(MilestoneSchema).describe('Key milestones'),
    dependencies: z.array(DependencySchema).describe('Project dependencies'),
    schedule: z.string().describe('High-level schedule summary')
  }),

  // 9. Project Controls
  projectControls: z.object({
    stages: z.array(z.string()).describe('Management stages'),
    tolerances: ToleranceSchema.describe('Project tolerances'),
    reportingArrangements: z.string().describe('Reporting arrangements')
  }),

  // 10. Tailoring
  tailoring: z.object({
    approach: z.string().describe('Approach to tailoring PRINCE2'),
    justification: z.string().describe('Justification for tailoring PRINCE2')
  })
})

// Type export for TypeScript usage
export type PIDDocument = z.infer<typeof PIDSchema>

// Schema name for OpenAI API
export const PID_SCHEMA_NAME = 'prince2_pid'