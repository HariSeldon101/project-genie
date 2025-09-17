import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const enhancedPrince2Prompts = {
  pid: {
    buildPrompt: (params: any) => {
      // Assemble methodology context
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 2000,
        methodology: 'prince2',
        documentType: 'pid',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are a certified PRINCE2 Practitioner creating a Project Initiation Document (PID).
You have extensive experience with PRINCE2 governance, management products, and best practices.
Generate formal, comprehensive documentation that adheres to PRINCE2 methodology.

${methodologyContext}

IMPORTANT GUIDELINES:
1. Use placeholder tokens for people names (e.g., [EXECUTIVE], [SENIOR_USER], [SENIOR_SUPPLIER])
2. Follow PRINCE2 terminology exactly as defined
3. Ensure all mandatory PID sections are included
4. Apply the 7 PRINCE2 principles throughout
5. Structure content for stage-gate governance
6. Include measurable tolerances for time, cost, quality, scope, risk, and benefits

QUALITY CHECKS:
Before finalizing, verify:
✓ All PRINCE2 principles are reflected
✓ Roles and responsibilities are clearly defined
✓ Business justification is robust
✓ Risk management approach is comprehensive
✓ Quality criteria are measurable
✓ Stage boundaries are defined`

      const userPrompt = `Create a comprehensive PRINCE2 Project Initiation Document (PID) for:

Project Name: ${params.projectName}
Vision: ${params.vision}
Business Case: ${params.businessCase}
Description: ${params.description}
Company Website: ${params.companyWebsite}
Industry Sector: ${params.sector}

Key Roles:
- Executive: [EXECUTIVE]
- Senior User: [SENIOR_USER]  
- Senior Supplier: [SENIOR_SUPPLIER]

Additional Stakeholders:
${params.stakeholders}

CHAIN OF THOUGHT PROCESS:
1. First, analyze the business context and drivers
2. Define clear, measurable project objectives aligned with PRINCE2
3. Structure the organization with clear accountability
4. Design management approaches for all PRINCE2 practices
5. Create a realistic project plan with stages
6. Define controls and tolerances
7. Document tailoring decisions

Generate a complete PID with these enhanced sections:

1. PROJECT DEFINITION
   - Background (industry context, business drivers)
   - Project objectives (SMART objectives with success criteria)
   - Desired outcomes (business benefits and value)
   - Scope and exclusions (clear boundaries)
   - Constraints and assumptions (validated and documented)
   - Interfaces (internal and external dependencies)

2. BUSINESS CASE (detailed)
   - Strategic alignment
   - Options analysis (Do Nothing, Do Minimum, Recommended)
   - Cost-benefit analysis with NPV/ROI
   - Benefits realization plan
   - Dis-benefits and mitigation

3. PROJECT ORGANIZATION
   - Project Board composition and terms of reference
   - Role descriptions with specific accountabilities
   - Project Assurance arrangements
   - Delegation and escalation paths
   - Communication lines

4. QUALITY MANAGEMENT APPROACH
   - Quality expectations and standards
   - Quality control measures
   - Quality assurance activities
   - Acceptance criteria
   - Quality register format

5. CONFIGURATION MANAGEMENT APPROACH
   - Configuration identification scheme
   - Status accounting procedures
   - Change control process
   - Version control strategy
   - Information management

6. RISK MANAGEMENT APPROACH
   - Risk appetite and tolerance
   - Risk identification techniques
   - Assessment scales (probability/impact)
   - Response strategies
   - Risk register management

7. COMMUNICATION MANAGEMENT APPROACH
   - Stakeholder engagement matrix
   - Communication methods and frequency
   - Information needs analysis
   - Reporting arrangements
   - Feedback mechanisms

8. PROJECT PLAN
   - Stage structure and boundaries
   - Product breakdown structure
   - Milestone schedule
   - Resource requirements
   - Critical path analysis

9. PROJECT CONTROLS
   - Stage tolerances (time, cost, quality, scope, risk, benefit)
   - Reporting frequency and format
   - Exception handling procedures
   - Change authority limits
   - Monitoring mechanisms

10. TAILORING
    - Rationale for tailoring decisions
    - Adaptations to organizational standards
    - Integration with existing processes

Research the company context and industry standards to make the PID specific and actionable.
Format as structured JSON with clear sections and professional language.`

      return { system: systemPrompt, user: userPrompt }
    }
  },

  businessCase: {
    buildPrompt: (params: any) => {
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 1500,
        methodology: 'prince2',
        documentType: 'business case',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are a PRINCE2 Business Analyst creating detailed Business Cases.
You understand financial analysis, benefit realization, and investment appraisal.
Generate data-driven, compelling business justifications following PRINCE2 standards.

${methodologyContext}

ANALYSIS FRAMEWORK:
1. Strategic Context: Align with organizational strategy
2. Economic Analysis: Use standard financial metrics (NPV, IRR, ROI)
3. Options Appraisal: Structured comparison of alternatives
4. Benefits Management: Measurable and time-bound benefits
5. Risk Assessment: Financial impact of risks
6. Sensitivity Analysis: Test key assumptions`

      const userPrompt = `Create a detailed PRINCE2 Business Case for:

Project Name: ${params.projectName}
Business Case Summary: ${params.businessCase}
Industry: ${params.sector}
Company: ${params.companyWebsite}

REASONING STEPS:
1. Analyze strategic drivers and objectives
2. Identify and evaluate all viable options
3. Calculate financial metrics for each option
4. Assess benefits (quantifiable and non-quantifiable)
5. Identify dis-benefits and mitigation strategies
6. Perform risk-adjusted analysis
7. Make clear recommendation with justification

Generate a comprehensive Business Case with:

EXECUTIVE SUMMARY
- Clear statement of recommendation
- Key financial metrics summary
- Strategic alignment statement
- Critical success factors

STRATEGIC CONTEXT
- Business drivers (market, regulatory, competitive)
- Strategic objectives alignment
- Organizational capability impact
- Opportunity cost analysis

OPTIONS ANALYSIS
For each option (Do Nothing, Do Minimum, Recommended):
- Description and scope
- Costs breakdown (CapEx, OpEx, lifecycle)
- Benefits profile
- Risk profile
- Implementation complexity
- Viability assessment

ECONOMIC ANALYSIS
- Total Cost of Ownership (TCO)
- Net Present Value (NPV) at organizational discount rate
- Internal Rate of Return (IRR)
- Return on Investment (ROI)
- Payback period
- Break-even analysis
- Sensitivity analysis on key variables

BENEFITS ANALYSIS
Quantifiable Benefits:
- Financial benefits with monetary values
- Efficiency gains with metrics
- Productivity improvements with measures
- Cost avoidance opportunities

Non-Quantifiable Benefits:
- Strategic positioning
- Customer satisfaction
- Employee morale
- Brand value
- Risk reduction

DIS-BENEFITS
- Negative impacts identified
- Mitigation strategies
- Residual dis-benefits accepted

RISKS TO THE BUSINESS CASE
- Key assumptions and dependencies
- Major risks to benefits realization
- Cost overrun scenarios
- Timeline slippage impacts
- Contingency provisions

BENEFITS REALIZATION PLAN
- Benefits timeline
- Measurement methods
- Ownership assignments
- Review points
- Success criteria

Use industry-specific benchmarks and realistic financial projections.
Format as structured JSON with professional financial terminology.`

      return { system: systemPrompt, user: userPrompt }
    }
  },

  riskRegister: {
    buildPrompt: (params: any) => {
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 1500,
        methodology: 'prince2',
        documentType: 'risk',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are a PRINCE2 Risk Manager creating comprehensive risk assessments.
You understand risk identification, analysis, and response planning.
Generate realistic, industry-specific risks following PRINCE2 risk management approach.

${methodologyContext}

RISK MANAGEMENT PRINCIPLES:
1. Identify risks continuously throughout the project
2. Assess probability and impact objectively
3. Plan appropriate responses (Avoid, Reduce, Transfer, Accept, Share)
4. Assign clear ownership and actions
5. Monitor and review regularly
6. Consider both threats and opportunities`

      const userPrompt = `Create a PRINCE2 Risk Register for:

Project Name: ${params.projectName}
Industry: ${params.sector}
Project Description: ${params.description}

SYSTEMATIC RISK IDENTIFICATION:
1. Review each PRINCE2 practice area for risks
2. Consider industry-specific challenges
3. Analyze stakeholder concerns
4. Examine technical complexities
5. Assess external factors
6. Identify opportunity risks

Generate 20-25 comprehensive risks covering:

STRATEGIC RISKS
- Business strategy alignment risks
- Market and competitive risks
- Organizational change risks
- Benefits realization risks
- Reputation and brand risks

COMMERCIAL RISKS
- Supplier and vendor risks
- Contract and procurement risks
- Financial and funding risks
- Cost estimation risks
- Economic environment risks

TECHNICAL RISKS
- Technology selection risks
- Integration and compatibility risks
- Performance and scalability risks
- Security and data protection risks
- Technical debt risks

OPERATIONAL RISKS
- Resource availability risks
- Process and procedure risks
- Knowledge and skills risks
- Communication breakdown risks
- Quality assurance risks

COMPLIANCE RISKS
- Regulatory compliance risks
- Legal and contractual risks
- Industry standards risks
- Audit and governance risks
- Policy adherence risks

EXTERNAL RISKS
- Environmental factors
- Political changes
- Force majeure events
- Market conditions
- Stakeholder changes

For each risk provide:
{
  "id": "R###",
  "category": "Category name",
  "description": "Detailed risk description including cause and effect",
  "probability": "Very Low|Low|Medium|High|Very High",
  "impact": "Very Low|Low|Medium|High|Very High",
  "proximityDate": "When risk might occur",
  "owner": "Role responsible for managing",
  "responseStrategy": "Avoid|Reduce|Transfer|Accept|Share",
  "mitigationActions": "Specific actions to implement strategy",
  "contingencyPlan": "Actions if risk occurs",
  "earlyWarningIndicators": "Signs that risk is materializing",
  "status": "Open|Monitoring|Closed",
  "residualProbability": "After mitigation",
  "residualImpact": "After mitigation",
  "riskScore": "Probability × Impact",
  "lastReviewed": "Date",
  "escalationCriteria": "When to escalate"
}

Include both threats and opportunities.
Ensure risks are specific to the ${params.sector} industry.
Use realistic mitigation strategies that are actionable.`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}