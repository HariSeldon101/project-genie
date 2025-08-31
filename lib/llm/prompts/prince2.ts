export const prince2Prompts = {
  pid: {
    system: `You are a PRINCE2 expert creating a Project Initiation Document.
You MUST return valid JSON that matches the schema exactly.
Do not include any text outside the JSON structure.
Use placeholder tokens: [EXECUTIVE], [SENIOR_USER], [SENIOR_SUPPLIER], [PROJECT_MANAGER].`,
    
    user: `Create a PRINCE2 PID for this project:
Project: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Sector: {{sector}}

CRITICAL: Return ONLY a valid JSON object with this EXACT structure:
{
  "projectDefinition": {
    "background": "detailed background text",
    "objectives": ["objective 1", "objective 2", "objective 3"],
    "desiredOutcomes": ["outcome 1", "outcome 2", "outcome 3"],
    "scope": {
      "included": ["in scope item 1", "in scope item 2"],
      "excluded": ["out of scope item 1", "out of scope item 2"]
    },
    "constraints": ["constraint 1", "constraint 2"],
    "assumptions": ["assumption 1", "assumption 2"],
    "deliverables": [
      {
        "name": "deliverable name",
        "description": "deliverable description",
        "qualityCriteria": ["criteria 1", "criteria 2"]
      }
    ],
    "interfaces": ["interface 1", "interface 2"]
  },
  "businessCase": {
    "reasons": "business reasons text",
    "options": [
      {
        "name": "option name",
        "description": "option description",
        "cost": "cost estimate",
        "benefits": "benefits description",
        "risks": "risks description"
      }
    ],
    "expectedBenefits": [
      {
        "description": "benefit description",
        "measurableTarget": "target metric",
        "timeline": "timeline",
        "owner": "[SENIOR_USER]"
      }
    ],
    "expectedDisbenefits": ["disbenefit 1"],
    "timescale": "project timeline",
    "costs": {
      "development": "dev cost",
      "operational": "ops cost",
      "total": "total cost"
    },
    "investmentAppraisal": "appraisal text",
    "majorRisks": ["risk 1", "risk 2"]
  },
  "organizationStructure": {
    "projectBoard": {
      "executive": "[EXECUTIVE]",
      "seniorUser": "[SENIOR_USER]",
      "seniorSupplier": "[SENIOR_SUPPLIER]"
    },
    "projectManager": "[PROJECT_MANAGER]",
    "teamManagers": ["[TEAM_MANAGER_1]"],
    "projectAssurance": {
      "business": "[BUSINESS_ASSURANCE]",
      "user": "[USER_ASSURANCE]",
      "specialist": "[SPECIALIST_ASSURANCE]"
    },
    "projectSupport": "Project support description"
  },
  "qualityManagementApproach": {
    "qualityStandards": ["standard 1", "standard 2"],
    "qualityCriteria": ["criteria 1", "criteria 2"],
    "qualityMethod": "quality method description",
    "qualityResponsibilities": "responsibilities description"
  },
  "configurationManagementApproach": {
    "purpose": "purpose text",
    "procedure": "procedure description",
    "issueAndChangeControl": "control description",
    "toolsAndTechniques": ["tool 1", "tool 2"]
  },
  "riskManagementApproach": {
    "procedure": "risk procedure",
    "riskTolerance": "tolerance levels",
    "riskRegisterFormat": "register format",
    "rolesAndResponsibilities": "risk roles"
  },
  "communicationManagementApproach": {
    "methods": ["method 1", "method 2"],
    "frequency": "communication frequency",
    "stakeholderAnalysis": "stakeholder analysis"
  },
  "projectPlan": {
    "stages": ["stage 1", "stage 2"],
    "majorMilestones": ["milestone 1", "milestone 2"],
    "deliveryTimeline": "timeline description"
  },
  "projectControls": {
    "tolerances": {
      "time": "time tolerance",
      "cost": "cost tolerance",
      "scope": "scope tolerance",
      "quality": "quality tolerance"
    },
    "reportingArrangements": "reporting description",
    "issueAndChangeControl": "control procedures"
  },
  "tailoring": {
    "approach": "tailoring approach",
    "justification": "tailoring justification"
  }
}

DO NOT include markdown backticks, explanations, or any text outside the JSON.
Return ONLY the raw JSON object above with actual values replacing the placeholders.`,
  },

  businessCase: {
    system: `You are a Prince2 Business Analyst.
Expertise: Financial analysis and benefit realization.
Task: Create data-driven business justification in JSON format.`,
    
    user: `Follow these steps to create a Prince2 Business Case:

STEP 1: Project context
- Project: {{projectName}}
- Summary: {{businessCase}}
- Industry: {{sector}}

STEP 2: Generate JSON with exact structure:
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

STEP 3: Requirements
- Use realistic financial figures
- All numbers must be positive integers
- Dates in "Q# YYYY" format

STEP 4: Output
Return ONLY the JSON object above.
No additional text or formatting.`,
  },

  riskRegister: {
    system: `You are a Prince2 Risk Manager.
Expertise: Risk identification and response planning.
Task: Generate realistic risk assessments in JSON format.`,
    
    user: `Execute these steps to create a Risk Register:

STEP 1: Project context
- Project: {{projectName}}
- Industry: {{sector}}
- Description: {{description}}

STEP 2: Generate JSON with this structure:
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

STEP 3: Generate exactly 15 risks
Distribution:
- 3 Strategic risks
- 3 Operational risks
- 3 Financial risks
- 3 Technical risks
- 2 Compliance risks
- 1 External risk

STEP 4: Requirements
- IDs: R001 through R015
- Dates: Use current year
- Owners: Use role titles only
- Status: 10 Open, 4 Monitoring, 1 Closed
- Each mitigation: 20-40 words

STEP 5: Output
Return ONLY the JSON object.
No markdown or additional text.`,
  },

  projectPlan: {
    system: `You are a Prince2 Project Manager.
Expertise: Stage planning and dependency management.
Task: Create structured project plan with clear stages.`,
    
    user: `Follow these steps to create a Project Plan:

STEP 1: Project context
- Project: {{projectName}}
- Vision: {{vision}}

STEP 2: Define 4 stages
1. Initiation (2 weeks)
2. Delivery Stage 1 (8 weeks)
3. Delivery Stage 2 (8 weeks)
4. Closure (2 weeks)

STEP 3: For each stage, provide:
- 1 objective (20 words)
- 3 deliverables
- 5 key activities
- Resource count (3-8 people)
- Tolerance: ±10% time, ±15% cost
- 3 assessment criteria

STEP 4: Add project elements
- 5 major milestones with dates
- 5 critical path activities
- 5 key dependencies
- Resource allocation matrix
- 4 quality checkpoints

STEP 5: Output
Return structured JSON with all elements.
Include Gantt chart data (start/end dates).
No markdown or additional formatting.`,
  },

  qualityManagement: {
    system: `You are a PRINCE2 Quality Manager.
Expertise: Quality planning, control, and assurance.
Task: Create comprehensive Quality Management Strategy.`,
    
    user: `Create a Quality Management Strategy for this project:

STEP 1: Project context
- Project: {{projectName}}
- Vision: {{vision}}
- Sector: {{sector}}

STEP 2: Generate JSON with this structure:
{
  "introduction": {
    "purpose": "detailed purpose (30-50 words)",
    "scope": "scope definition (30-50 words)",
    "responsible_parties": ["party 1", "party 2", "party 3"],
    "quality_system_precedence": "customer's|supplier's|combined approach"
  },
  "quality_procedures": {
    "quality_planning": {
      "approach": "planning approach (40-60 words)",
      "product_identification": "how products are identified (30-40 words)",
      "criteria_definition": "how criteria are defined (30-40 words)",
      "techniques": ["Product Descriptions", "Quality Reviews", "technique 3"]
    },
    "quality_control": {
      "standards": ["ISO 9001", "standard 2", "standard 3"],
      "templates": ["template 1", "template 2"],
      "methods": ["Inspection", "Testing", "Reviews", "method 4"],
      "metrics": ["metric 1", "metric 2", "metric 3"]
    },
    "project_assurance": {
      "board_responsibilities": ["responsibility 1", "responsibility 2"],
      "compliance_audits": "audit approach (30-40 words)",
      "corporate_reviews": "review requirements (30-40 words)"
    }
  },
  "tools_techniques": {
    "quality_systems": ["system 1", "system 2"],
    "preferred_techniques": [
      { "step": "Planning", "technique": "technique description" },
      { "step": "Control", "technique": "technique description" },
      { "step": "Assurance", "technique": "technique description" }
    ],
    "integration_approach": "integration with organizational quality (40-60 words)"
  },
  "records_management": {
    "required_documentation": ["document type 1", "document type 2", "document type 3"],
    "quality_register": {
      "composition": "what's included (30-40 words)",
      "format": "format description (20-30 words)"
    },
    "inspection_documentation": "requirements (30-40 words)",
    "approval_storage": "storage location and method (20-30 words)"
  },
  "reporting": {
    "report_formats": [
      { "type": "Quality Report", "format": "format description" },
      { "type": "Exception Report", "format": "format description" }
    ],
    "timing": "reporting schedule (30-40 words)",
    "recipients": [
      { "report": "Quality Report", "recipient": "Project Board" },
      { "report": "Exception Report", "recipient": "Executive" }
    ],
    "escalation_procedures": "escalation process (40-50 words)"
  },
  "timing": {
    "formal_activities": [
      { "activity": "Quality Reviews", "timing": "End of each work package" },
      { "activity": "Quality Audits", "timing": "Monthly" },
      { "activity": "Board Reviews", "timing": "End of each stage" }
    ],
    "quality_register_reference": "how register is used for scheduling (30-40 words)",
    "stage_boundaries": "integration with stages (30-40 words)"
  },
  "roles_responsibilities": {
    "project_board": ["Define quality expectations", "Approve quality approach"],
    "senior_users": ["Define acceptance criteria", "Confirm quality expectations"],
    "senior_suppliers": ["Provide quality resources", "Ensure standards compliance"],
    "executive": ["Approve quality management approach", "Resolve quality escalations"],
    "project_manager": ["Implement quality procedures", "Maintain Quality Register"],
    "quality_assurance": ["Independent quality reviews", "Compliance monitoring"]
  },
  "quality_expectations": {
    "product_description": "reference to project product (30-40 words)",
    "acceptance_criteria": ["criterion 1", "criterion 2", "criterion 3"],
    "moscow_priorities": {
      "must_have": ["requirement 1", "requirement 2"],
      "should_have": ["requirement 1", "requirement 2"],
      "could_have": ["requirement 1"],
      "wont_have": ["requirement 1"]
    },
    "tolerance_levels": [
      { "criteria": "System response time", "tolerance": "<2 seconds, zero tolerance" },
      { "criteria": "Uptime", "tolerance": "99.5% minimum" },
      { "criteria": "Defect rate", "tolerance": "<5 per 1000 transactions" }
    ]
  },
  "review_technique": {
    "chair_role": "Coordinates review, ensures objectivity (20-30 words)",
    "presenter_role": "Represents producer, presents product (20-30 words)",
    "reviewer_role": "Examines against criteria, identifies issues (20-30 words)",
    "administrator_role": "Maintains Quality Register, documents outcomes (20-30 words)",
    "process": [
      "Preparation phase",
      "Review meeting",
      "Follow-up actions",
      "Sign-off"
    ]
  },
  "tailoring": {
    "project_size": "Small|Medium|Large",
    "complexity_factors": ["factor 1", "factor 2", "factor 3"],
    "organizational_standards": "alignment approach (30-40 words)",
    "industry_requirements": ["requirement 1", "requirement 2"],
    "risk_profile": "Low|Medium|High with explanation (30-40 words)"
  }
}

STEP 3: Requirements
- Generate realistic, project-specific content
- Use proper PRINCE2 terminology
- Include specific metrics and tolerances
- Ensure all roles use PRINCE2 terms

STEP 4: Output
Return ONLY the JSON object.
No markdown or additional text.`,
  },

  communicationPlan: {
    system: `You are a PRINCE2 Communications Manager.
Expertise: Stakeholder engagement and communication planning.
Task: Create comprehensive Communication Management Approach.`,
    
    user: `Create a Communication Management Approach for this project:

STEP 1: Project context
- Project: {{projectName}}
- Vision: {{vision}}
- Sector: {{sector}}

STEP 2: Generate JSON with this structure:
{
  "document_admin": {
    "project_id": "{{projectName}}",
    "revision_history": [
      { "version": "1.0", "date": "2024-01-15", "changes": "Initial draft" },
      { "version": "1.1", "date": "2024-01-20", "changes": "Stakeholder updates" }
    ],
    "approval_records": ["Project Board approval", "Executive sign-off"],
    "distribution_list": ["Project Board", "Team Managers", "Key Stakeholders"],
    "ownership": "Project Manager"
  },
  "communication_procedures": {
    "methods": [
      { "type": "Meetings", "description": "Face-to-face and virtual", "use_case": "Decision making, complex discussions" },
      { "type": "Email", "description": "Written updates", "use_case": "Routine updates, documentation" },
      { "type": "Reports", "description": "Formal documentation", "use_case": "Status updates, milestone reviews" },
      { "type": "Presentations", "description": "Visual communication", "use_case": "Board meetings, stakeholder briefings" }
    ],
    "protocols": {
      "formal": ["Board meetings", "Stage gate reviews", "Exception reports"],
      "informal": ["Team stand-ups", "Slack messages", "Quick calls"]
    },
    "escalation_paths": [
      { "level": "Level 1", "trigger": "Team issue", "contact": "Team Manager" },
      { "level": "Level 2", "trigger": "Work package issue", "contact": "Project Manager" },
      { "level": "Level 3", "trigger": "Tolerance breach", "contact": "Project Board" }
    ],
    "feedback_mechanisms": ["Surveys", "Review meetings", "Suggestion box", "1-on-1s"]
  },
  "stakeholder_analysis": {
    "identification_method": "Facilitated workshops and stakeholder mapping sessions",
    "internal_stakeholders": [
      { "name": "Executive Sponsor", "role": "Executive", "department": "Leadership" },
      { "name": "Business Users", "role": "Senior User", "department": "Operations" },
      { "name": "IT Team", "role": "Senior Supplier", "department": "Technology" }
    ],
    "external_stakeholders": [
      { "name": "Key Customers", "organization": "Customer Base", "relationship": "End users" },
      { "name": "Vendors", "organization": "Supply Chain", "relationship": "Suppliers" },
      { "name": "Regulators", "organization": "Government", "relationship": "Compliance" }
    ],
    "power_interest_grid": {
      "high_power_high_interest": ["Executive Sponsor", "Senior Users", "Senior Suppliers"],
      "high_power_low_interest": ["Finance Director", "Legal Team"],
      "low_power_high_interest": ["End Users", "Team Members"],
      "low_power_low_interest": ["General Staff", "Minor Vendors"]
    }
  },
  "information_needs": [
    {
      "stakeholder_group": "Project Board",
      "required_information": ["Overall status", "Risk status", "Exception reports", "Stage assessments"],
      "preferred_format": "Executive dashboard and formal reports",
      "delivery_frequency": "Monthly or by exception",
      "content_specifications": "High-level summary with RAG status"
    },
    {
      "stakeholder_group": "Team Members",
      "required_information": ["Work packages", "Daily priorities", "Technical specifications"],
      "preferred_format": "Detailed documentation and team meetings",
      "delivery_frequency": "Daily/Weekly",
      "content_specifications": "Detailed technical content with clear actions"
    },
    {
      "stakeholder_group": "End Users",
      "required_information": ["Project progress", "Release dates", "Training schedules"],
      "preferred_format": "Newsletters and demos",
      "delivery_frequency": "Quarterly",
      "content_specifications": "User-friendly, non-technical language"
    }
  ],
  "tools_techniques": {
    "technologies": ["Email", "Video conferencing", "Project portal", "Mobile apps"],
    "collaboration_platforms": ["Microsoft Teams", "SharePoint", "Slack", "Jira"],
    "document_templates": ["Highlight Report", "Checkpoint Report", "Exception Report", "End Stage Report"],
    "channel_matrix": [
      { "message_type": "Urgent issues", "channel": "Phone/SMS" },
      { "message_type": "Status updates", "channel": "Email/Portal" },
      { "message_type": "Decisions required", "channel": "Meeting/Video call" },
      { "message_type": "Documentation", "channel": "SharePoint/Portal" }
    ]
  },
  "timing_scheduling": {
    "communication_calendar": [
      { "event": "Project Board Meeting", "frequency": "Monthly", "date": "First Monday" },
      { "event": "Team Stand-up", "frequency": "Daily", "date": "9:00 AM" },
      { "event": "Stakeholder Review", "frequency": "Quarterly", "date": "Quarter end" }
    ],
    "report_frequencies": [
      { "report": "Highlight Report", "frequency": "Monthly" },
      { "report": "Checkpoint Report", "frequency": "Weekly" },
      { "report": "Exception Report", "frequency": "As needed" }
    ],
    "event_triggers": [
      { "event": "Tolerance breach", "action": "Immediate Exception Report" },
      { "event": "Risk materialized", "action": "Emergency Board meeting" },
      { "event": "Stage completion", "action": "End Stage Report" }
    ],
    "critical_milestones": ["Project initiation", "Stage boundaries", "Major deliverables", "Project closure"]
  },
  "roles_responsibilities": {
    "raci_matrix": [
      { "activity": "Highlight Reports", "responsible": "Project Manager", "accountable": "Executive", "consulted": "Team Managers", "informed": "Stakeholders" },
      { "activity": "Exception Reports", "responsible": "Project Manager", "accountable": "Project Board", "consulted": "Team", "informed": "All" },
      { "activity": "Stakeholder Engagement", "responsible": "Stakeholder Owner", "accountable": "Project Manager", "consulted": "Team", "informed": "Board" }
    ],
    "project_manager": ["Overall communication coordination", "Report production", "Stakeholder management"],
    "team_members": ["Work package reporting", "Technical communication", "Peer updates"],
    "stakeholder_owners": [
      { "stakeholder": "Executive Sponsor", "owner": "Project Manager" },
      { "stakeholder": "End Users", "owner": "Business Analyst" },
      { "stakeholder": "Vendors", "owner": "Procurement Lead" }
    ]
  },
  "stakeholder_management": {
    "categories": {
      "champions": {
        "members": ["Executive Sponsor", "Key User Representative"],
        "strategy": "Leverage as project advocates, involve in key decisions"
      },
      "supporters": {
        "members": ["Team Members", "Department Heads"],
        "strategy": "Maintain engagement through regular updates and involvement"
      },
      "neutral": {
        "members": ["Finance Team", "HR Department"],
        "strategy": "Provide information to gain support, address concerns proactively"
      },
      "blockers": {
        "members": ["Resistant Department", "Competing Project Manager"],
        "strategy": "Direct engagement, address concerns, find win-win solutions"
      },
      "critics": {
        "members": ["Skeptical Stakeholder Group"],
        "strategy": "Regular communication, demonstrate value, quick wins"
      }
    },
    "engagement_plans": [
      {
        "stakeholder": "Executive Sponsor",
        "current_state": "Supportive but busy",
        "desired_state": "Actively engaged champion",
        "actions": ["Weekly 1-on-1s", "Executive dashboard", "Early escalation of issues"]
      },
      {
        "stakeholder": "Resistant Department",
        "current_state": "Skeptical blocker",
        "desired_state": "Neutral or supportive",
        "actions": ["Department briefings", "Address specific concerns", "Show department benefits"]
      }
    ]
  },
  "communication_methods": {
    "face_to_face": {
      "use_cases": ["Sensitive discussions", "Complex negotiations", "Team building", "Critical decisions"],
      "guidelines": "Schedule in advance, prepare agenda, document outcomes"
    },
    "email": {
      "use_cases": ["Routine updates", "Documentation", "Wide distribution", "Audit trail"],
      "guidelines": "Clear subject lines, concise content, appropriate distribution"
    },
    "presentations": {
      "use_cases": ["Board meetings", "Stakeholder briefings", "Stage gates", "Training"],
      "guidelines": "Visual aids, time-boxed, interactive Q&A, follow-up materials"
    },
    "dashboards": {
      "use_cases": ["Real-time status", "KPI monitoring", "Risk tracking", "Progress visualization"],
      "guidelines": "Auto-updated, mobile-friendly, role-based views, drill-down capability"
    }
  },
  "sensitive_information": {
    "classification_levels": [
      { "level": "Public", "description": "General project information", "handling": "No restrictions" },
      { "level": "Internal", "description": "Team and organizational data", "handling": "Internal distribution only" },
      { "level": "Confidential", "description": "Commercial or personal data", "handling": "Need-to-know basis" },
      { "level": "Restricted", "description": "Highly sensitive information", "handling": "Named individuals only" }
    ],
    "access_controls": ["Role-based access", "Secure portals", "Encryption", "Password protection"],
    "distribution_restrictions": ["Email encryption", "Watermarked documents", "No forwarding rules"],
    "legal_constraints": ["GDPR compliance", "NDA requirements", "Industry regulations"],
    "crisis_communication": {
      "scenarios": ["Major incident", "Data breach", "Project failure", "Stakeholder conflict"],
      "pre_drafted_messages": ["Initial response template", "Investigation update", "Resolution notice"],
      "spokesperson": "Executive or designated Project Board member"
    }
  },
  "reporting_hierarchies": {
    "highlight_reports": {
      "frequency": "Monthly to Project Board",
      "audience": "Project Board and senior stakeholders",
      "content": "Overall status, key achievements, issues, risks, next period plan"
    },
    "checkpoint_reports": {
      "frequency": "Weekly from Team Managers",
      "audience": "Project Manager",
      "content": "Work package progress, team issues, resource utilization"
    },
    "exception_reports": {
      "frequency": "Immediately upon tolerance breach",
      "audience": "Project Board for decision",
      "content": "Issue description, impact, options, recommendation"
    },
    "stakeholder_bulletins": {
      "frequency": "Quarterly to all stakeholders",
      "audience": "All project stakeholders",
      "content": "Progress summary, upcoming milestones, success stories"
    }
  }
}

STEP 3: Requirements
- Use PRINCE2 terminology throughout
- Generate realistic stakeholder groups
- Include proper escalation paths
- Create comprehensive RACI matrix

STEP 4: Output
Return ONLY the JSON object.
No markdown or additional text.`,
  },
}