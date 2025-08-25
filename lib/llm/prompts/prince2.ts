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
Generate data-driven, compelling business justifications with proper JSON structure.`,
    
    user: `Create a detailed Prince2 Business Case for:

Project Name: {{projectName}}
Business Case Summary: {{businessCase}}
Industry: {{sector}}
Company: {{companyWebsite}}

Generate a JSON object with this exact structure:
{
  "projectName": "string",
  "executiveSummary": "detailed paragraph",
  "strategicContext": {
    "drivers": ["driver1", "driver2", ...],
    "objectives": ["objective1", "objective2", ...],
    "alignment": "explanation of alignment"
  },
  "economicAnalysis": {
    "totalInvestment": number,
    "netBenefit": number,
    "roi": number,
    "paybackPeriod": "X months",
    "npv": number,
    "irr": number
  },
  "options": [
    {
      "name": "Do Nothing",
      "description": "description",
      "costs": number,
      "benefits": number,
      "risks": "summary",
      "recommendation": "Not Recommended"
    },
    {
      "name": "Do Minimum",
      "description": "description",
      "costs": number,
      "benefits": number,
      "risks": "summary",
      "recommendation": "Partially Recommended"
    },
    {
      "name": "Recommended Option",
      "description": "description",
      "costs": number,
      "benefits": number,
      "risks": "summary",
      "recommendation": "Strongly Recommended"
    }
  ],
  "benefits": {
    "quantifiable": [
      { "description": "benefit", "value": number, "timeline": "when" }
    ],
    "nonQuantifiable": ["benefit1", "benefit2"]
  },
  "disbenefits": ["disbenefit1", "disbenefit2"],
  "costs": {
    "development": number,
    "operational": number,
    "maintenance": number,
    "total": number
  },
  "timeline": {
    "start": "Q1 2024",
    "end": "Q4 2025",
    "milestones": [
      { "name": "milestone", "date": "date", "deliverables": ["item1"] }
    ]
  },
  "risks": [
    { "risk": "description", "impact": "High/Medium/Low", "mitigation": "strategy" }
  ],
  "recommendation": "detailed recommendation paragraph"
}

Use industry-specific benchmarks and realistic financial projections.`,
  },

  riskRegister: {
    system: `You are a Prince2 Risk Manager creating comprehensive risk assessments.
You understand risk identification, analysis, and response planning.
Generate realistic, industry-specific risks with proper JSON structure.`,
    
    user: `Create a Prince2 Risk Register for:

Project Name: {{projectName}}
Industry: {{sector}}
Project Description: {{description}}

Generate a JSON object with this exact structure:
{
  "projectName": "string",
  "risks": [
    {
      "id": "R001",
      "category": "Strategic|Operational|Financial|Technical|Compliance|External",
      "description": "detailed risk description",
      "probability": "Very Low|Low|Medium|High|Very High",
      "impact": "Very Low|Low|Medium|High|Very High",
      "owner": "role or title",
      "mitigation": "detailed mitigation strategy",
      "contingency": "contingency plan if risk occurs",
      "status": "Open|Monitoring|Closed|Occurred",
      "dateIdentified": "2024-01-15",
      "lastReviewed": "2024-02-01",
      "residualProbability": "Low|Medium|High",
      "residualImpact": "Low|Medium|High"
    }
  ]
}

Generate 15-20 realistic risks covering:
- Strategic risks (market, competition, reputation)
- Operational risks (resources, processes, dependencies)
- Financial risks (budget, funding, ROI)
- Technical risks (technology, integration, performance)
- Compliance risks (regulatory, legal, standards)
- External risks (suppliers, environment, politics)

Include industry-specific risks and realistic mitigation strategies.
Use role titles for owners (e.g., "Project Manager", "Technical Lead", "Risk Manager").
Set most risks to "Open" status, with a few "Monitoring" and "Closed" for realism.`,
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