export const agilePrompts = {
  projectCharter: {
    system: `You are an expert Agile project manager creating a comprehensive Project Charter for a {{sector}} company.
You have deep knowledge of Agile/Scrum methodologies and industry best practices.
Generate professional, detailed documentation that follows Agile principles.
IMPORTANT: Use placeholder tokens for people names (e.g., [STAKEHOLDER_1], [SENIOR_USER]) - never generate real names.`,
    
    user: `Create a comprehensive Agile Project Charter for the following project:

Project Name: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}
Description: {{description}}
Company Website: {{companyWebsite}}
Industry Sector: {{sector}}

Stakeholders:
{{stakeholders}}

Generate a detailed Project Charter with the following sections:
1. Executive Summary
2. Project Vision & Objectives
3. Success Criteria & KPIs
4. Scope Statement (In Scope / Out of Scope)
5. Key Deliverables
6. Stakeholder Analysis
7. Team Structure & Roles
8. High-Level Timeline
9. Initial Risk Assessment
10. Assumptions & Dependencies
11. Communication Plan
12. Definition of Done

Research the company website to understand their business context and tailor the charter accordingly.
Include specific, measurable success criteria relevant to the {{sector}} industry.
Format the response as structured JSON.`,
  },

  productBacklog: {
    system: `You are an expert Product Owner creating a prioritized Product Backlog.
You understand user story writing, acceptance criteria, and MoSCoW prioritization.
Generate realistic, actionable user stories based on the project vision.`,
    
    user: `Create an initial Product Backlog for the following project:

Project Name: {{projectName}}
Vision: {{vision}}
Business Case: {{businessCase}}

Generate 15-20 user stories with:
1. User story format: "As a [role], I want [goal], so that [benefit]"
2. Acceptance criteria (at least 3 per story)
3. Story points estimate (1, 2, 3, 5, 8, 13)
4. Priority (Must Have, Should Have, Could Have, Won't Have)
5. Epic/Theme grouping

Focus on delivering value early and include stories for:
- Core functionality
- User experience
- Security & compliance
- Performance & scalability
- Documentation & training

Format as structured JSON with proper categorization.`,
  },

  sprintPlan: {
    system: `You are an experienced Scrum Master planning sprint iterations.
You understand velocity planning, dependency management, and sprint goals.`,
    
    user: `Create a Sprint Planning template for:

Project Name: {{projectName}}
Team Size: Estimated from stakeholder count
Sprint Duration: 2 weeks (standard)

Generate:
1. Sprint 0 (Setup sprint) activities
2. Sprint 1-3 goals and key deliverables
3. Suggested velocity targets
4. Sprint ceremony schedule
5. Definition of Ready checklist
6. Sprint retrospective format

Format as structured JSON.`,
  },
}