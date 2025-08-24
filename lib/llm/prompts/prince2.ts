export const prince2Prompts = {
  pid: {
    system: `You are a certified Prince2 Practitioner creating a Project Initiation Document (PID).
You have extensive experience with Prince2 governance, management products, and best practices.
Generate formal, comprehensive documentation that adheres to Prince2 methodology.
IMPORTANT: Use placeholder tokens for people names (e.g., [EXECUTIVE], [SENIOR_USER], [SENIOR_SUPPLIER]).`,
    
    user: `Create a comprehensive Prince2 Project Initiation Document (PID) for:

Project Name: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Description: {{description}}
Company Website: {{companyWebsite}}
Industry Sector: {{sector}}

Key Roles:
- Executive: [EXECUTIVE]
- Senior User: [SENIOR_USER]  
- Senior Supplier: [SENIOR_SUPPLIER]

Additional Stakeholders:
{{stakeholders}}

Generate a complete PID with these sections:
1. Project Definition
   - Background
   - Project objectives and desired outcomes
   - Scope and exclusions
   - Constraints and assumptions
   - Project deliverables and/or desired outcomes
   - Interfaces

2. Business Case
   - Reasons
   - Business options
   - Expected benefits
   - Expected dis-benefits
   - Timescale
   - Costs
   - Investment appraisal
   - Major risks

3. Project Organization Structure
   - Project Board
   - Project Manager
   - Team Manager(s)
   - Project Assurance
   - Project Support

4. Quality Management Approach
   - Quality standards
   - Quality criteria
   - Quality method
   - Quality responsibilities

5. Configuration Management Approach
   - Purpose
   - Configuration management procedure
   - Issue and change control procedure
   - Tools and techniques

6. Risk Management Approach
   - Risk management procedure
   - Risk tolerance
   - Risk register format
   - Roles and responsibilities

7. Communication Management Approach
   - Communication methods
   - Frequency
   - Stakeholder analysis

8. Project Plan
   - Stages
   - Major milestones
   - Key deliverables timeline

9. Project Controls
   - Tolerances
   - Reporting arrangements
   - Issue and change control

10. Tailoring of Prince2

Research the company context and industry standards to make the PID specific and actionable.
Format as structured JSON.`,
  },

  businessCase: {
    system: `You are a Prince2 Business Analyst creating detailed Business Cases.
You understand financial analysis, benefit realization, and investment appraisal.
Generate data-driven, compelling business justifications.`,
    
    user: `Create a detailed Prince2 Business Case for:

Project Name: {{projectName}}
Business Case Summary: {{businessCase}}
Industry: {{sector}}
Company: {{companyWebsite}}

Include:
1. Executive Summary
2. Strategic Context
   - Strategic drivers
   - Business objectives alignment
3. Economic Analysis
   - Cost-Benefit Analysis
   - ROI calculation
   - Payback period
   - Net Present Value (NPV)
4. Options Appraisal
   - Do nothing option
   - Do minimum option
   - Recommended option
5. Expected Benefits
   - Quantifiable benefits
   - Non-quantifiable benefits
   - Benefit realization timeline
6. Expected Dis-benefits
7. Timescale
8. Costs
   - Development costs
   - Operational costs
   - Maintenance costs
9. Investment Appraisal
10. Major Risks
11. Recommendation

Use industry-specific benchmarks and realistic financial projections.
Format as structured JSON.`,
  },

  riskRegister: {
    system: `You are a Prince2 Risk Manager creating comprehensive risk assessments.
You understand risk identification, analysis, and response planning.`,
    
    user: `Create a Prince2 Risk Register for:

Project Name: {{projectName}}
Industry: {{sector}}
Project Description: {{description}}

Generate 15-20 realistic risks including:
1. Risk ID
2. Risk Category (Strategic, Commercial, Financial, Operational, Technical, Compliance)
3. Description
4. Probability (Very Low, Low, Medium, High, Very High)
5. Impact (Very Low, Low, Medium, High, Very High)
6. Proximity (Imminent, Within stage, Within project, Beyond project)
7. Risk Response (Avoid, Reduce, Transfer, Accept, Share)
8. Response Actions
9. Risk Owner (use role placeholders)
10. Status (Active, Closed, Occurred)

Include industry-specific risks and compliance considerations.
Calculate risk scores (Probability × Impact).
Format as structured JSON.`,
  },

  projectPlan: {
    system: `You are a Prince2 Project Manager creating detailed project plans.
You understand stage planning, product-based planning, and dependency management.`,
    
    user: `Create a Prince2 Project Plan for:

Project Name: {{projectName}}
Vision: {{vision}}
Estimated Duration: Based on project complexity

Generate:
1. Project Stages
   - Initiation Stage
   - Delivery Stage(s) - break down based on logical delivery increments
   - Final Delivery Stage
   - Closure Stage

2. For each stage provide:
   - Stage objectives
   - Stage deliverables/products
   - Key activities
   - Duration estimate
   - Resource requirements
   - Stage tolerances
   - End Stage Assessment criteria

3. Major Milestones
4. Critical Path activities
5. Dependencies
6. Resource allocation plan
7. Quality checkpoints
8. Management stages vs technical stages

Format as structured JSON with Gantt chart data.`,
  },
}