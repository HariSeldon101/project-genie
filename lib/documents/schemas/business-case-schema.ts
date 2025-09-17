/**
 * PRINCE2 Business Case Schema
 * Properly typed Zod schema with no z.any() usage
 * All fields are required - use null unions for optional fields
 */

import { z } from 'zod'

// Sub-schemas for complex nested structures
const BusinessOptionSchema = z.object({
  option: z.string().describe('Name of the business option'),
  description: z.string().describe('Detailed description of the option'),
  costs: z.string().describe('Estimated costs for this option'),
  benefits: z.string().describe('Expected benefits from this option'),
  risks: z.string().describe('Key risks associated with this option')
})

const BenefitSchema = z.object({
  benefit: z.string().describe('Description of the benefit'),
  measurable: z.boolean().describe('Whether the benefit is measurable'),
  measurement: z.string().describe('How the benefit will be measured'),
  baseline: z.string().describe('Current baseline value'),
  target: z.string().describe('Target value to achieve')
})

const DisBenefitSchema = z.object({
  disbenefit: z.string().describe('Description of the disbenefit'),
  impact: z.string().describe('Impact of the disbenefit'),
  mitigation: z.string().describe('How to mitigate the disbenefit')
})

const CostBreakdownSchema = z.object({
  development: z.string().describe('Development costs as formatted string (e.g., "$100,000")'),
  operational: z.string().describe('Operational costs as formatted string'),
  maintenance: z.string().describe('Maintenance costs as formatted string'),
  total: z.string().describe('Total costs as formatted string')
})

const InvestmentAppraisalSchema = z.object({
  roi: z.string().describe('Return on Investment percentage or description'),
  paybackPeriod: z.string().describe('Payback period (e.g., "18 months")'),
  npv: z.string().describe('Net Present Value or financial assessment')
})

const RiskSchema = z.object({
  risk: z.string().describe('Risk description'),
  probability: z.enum(['high', 'medium', 'low']).describe('Risk probability'),
  impact: z.enum(['high', 'medium', 'low']).describe('Risk impact'),
  mitigation: z.string().describe('Risk mitigation strategy')
})

// Main Business Case Schema
export const BusinessCaseSchema = z.object({
  // 1. Executive Summary
  executiveSummary: z.string().describe('Comprehensive executive summary of the business case'),

  // 2. Reasons
  reasons: z.string().describe('Detailed business reasons for undertaking the project'),

  // 3. Business Options
  businessOptions: z.array(BusinessOptionSchema)
    .min(3)
    .describe('Business options analysis (minimum 3 options including "do nothing")'),

  // 4. Expected Benefits
  expectedBenefits: z.array(BenefitSchema)
    .min(3)
    .describe('Expected benefits from the project'),

  // 5. Expected Dis-benefits
  expectedDisBenefits: z.array(DisBenefitSchema)
    .describe('Expected negative impacts or dis-benefits'),

  // 6. Timescale
  timescale: z.string().describe('Project timescale and key dates'),

  // 7. Costs
  costs: CostBreakdownSchema.describe('Detailed cost breakdown'),

  // 8. Investment Appraisal
  investmentAppraisal: InvestmentAppraisalSchema.describe('Financial assessment'),

  // 9. Major Risks
  majorRisks: z.array(RiskSchema)
    .min(3)
    .describe('Major risks to the business case'),

  // 10. Recommendation
  recommendation: z.string().describe('Recommended course of action'),

  // 11. Funding Source
  fundingSource: z.string().describe('Source of project funding'),

  // 12. Benefits Realization
  benefitsRealization: z.object({
    approach: z.string().describe('Approach to realizing benefits'),
    timeline: z.string().describe('Timeline for benefits realization'),
    responsibilities: z.string().describe('Who is responsible for benefits realization'),
    measurementMethod: z.string().describe('How benefits will be measured')
  }),

  // 13. Stakeholder Analysis
  stakeholderAnalysis: z.array(z.object({
    stakeholder: z.string().describe('Stakeholder name or group'),
    interest: z.string().describe('Their interest in the project'),
    influence: z.enum(['high', 'medium', 'low']).describe('Level of influence'),
    attitude: z.enum(['champion', 'supporter', 'neutral', 'skeptic', 'opponent'])
      .describe('Current attitude toward the project'),
    strategy: z.string().describe('Engagement strategy')
  })).min(3).describe('Key stakeholder analysis'),

  // 14. Success Criteria
  successCriteria: z.array(z.string())
    .min(3)
    .describe('Specific criteria for project success'),

  // 15. Constraints and Dependencies
  constraintsAndDependencies: z.object({
    constraints: z.array(z.string()).describe('Project constraints'),
    dependencies: z.array(z.string()).describe('Project dependencies'),
    assumptions: z.array(z.string()).describe('Key assumptions')
  })
})

// Type export for TypeScript usage
export type BusinessCaseDocument = z.infer<typeof BusinessCaseSchema>

// Schema name for OpenAI API
export const BUSINESS_CASE_SCHEMA_NAME = 'prince2_business_case'