import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const enhancedAgilePrompts = {
  projectCharter: {
    buildPrompt: (params: any) => {
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 2000,
        methodology: 'agile',
        documentType: 'charter',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are an expert Agile Coach and Scrum Master creating a comprehensive Agile Project Charter.
You have deep knowledge of Agile/Scrum methodologies, SAFe, and scaling frameworks.
Generate professional documentation that embodies Agile principles while providing necessary governance.

${methodologyContext}

AGILE CHARTER PRINCIPLES:
1. Emphasize value delivery and customer collaboration
2. Build in flexibility and adaptability
3. Focus on empowered, self-organizing teams
4. Define outcomes over outputs
5. Establish lightweight governance
6. Enable continuous learning and improvement

IMPORTANT: Use placeholder tokens for people names (e.g., [PRODUCT_OWNER], [SCRUM_MASTER], [STAKEHOLDER_1])`

      const userPrompt = `Create a comprehensive Agile Project Charter for:

Project Name: ${params.projectName}
Vision: ${params.vision}
Business Case: ${params.businessCase}
Description: ${params.description}
Company Website: ${params.companyWebsite}
Industry Sector: ${params.sector}

Stakeholders:
${params.stakeholders}

THINKING PROCESS:
1. Start with WHY - establish clear vision and value proposition
2. Define success through outcomes and metrics
3. Structure for agility with clear boundaries
4. Enable team autonomy within guardrails
5. Build in feedback loops and adaptation mechanisms

Generate a detailed Agile Charter with:

1. VISION & MISSION
   - Product Vision Statement (elevator pitch format)
   - Mission Statement (team purpose)
   - Value Proposition Canvas
   - Strategic Themes alignment
   - North Star metric

2. SUCCESS CRITERIA & OUTCOMES
   - Objectives and Key Results (OKRs)
   - Key Performance Indicators (KPIs)
   - Business value metrics
   - Customer satisfaction targets
   - Technical excellence measures
   - Leading and lagging indicators

3. SCOPE & BOUNDARIES
   - In Scope (MVP and beyond)
   - Out of Scope (explicit exclusions)
   - Assumptions and dependencies
   - Constraints (regulatory, technical, resource)
   - Definition of Done (project level)

4. TEAM STRUCTURE & GOVERNANCE
   - Scrum Team composition
     * Product Owner: [PRODUCT_OWNER]
     * Scrum Master: [SCRUM_MASTER]
     * Development Team (3-9 members)
   - Extended team and SMEs
   - Stakeholder engagement model
   - Decision rights matrix (RACI/DACI)
   - Escalation paths

5. WAYS OF WORKING
   - Scrum Events cadence
     * Sprint length and schedule
     * Ceremony timing and participants
   - Team agreements and norms
   - Communication protocols
   - Collaboration tools
   - Remote/hybrid arrangements

6. PRODUCT STRATEGY
   - Release strategy (continuous/staged)
   - MVP definition and timeline
   - Feature prioritization approach
   - Technical architecture principles
   - Quality standards
   - DevOps practices

7. RISK & DEPENDENCY MANAGEMENT
   - Key risks and mitigation strategies
   - External dependencies
   - Integration points
   - Impediment resolution process
   - Risk appetite statement

8. METRICS & REPORTING
   - Velocity tracking approach
   - Burndown/burnup charts
   - Cycle time and lead time
   - Quality metrics
   - Customer feedback loops
   - Information radiators

9. LEARNING & IMPROVEMENT
   - Retrospective cadence and format
   - Experimentation framework
   - Knowledge sharing practices
   - Communities of Practice
   - Innovation time allocation

10. BUDGET & RESOURCES
    - Funding model (fixed/flexible)
    - Resource allocation
    - Capacity planning approach
    - Training and development budget
    - Tool and infrastructure needs

Include specific considerations for ${params.sector} industry.
Emphasize empirical process control and continuous improvement.
Format as structured JSON with clear, actionable content.`

      return { system: systemPrompt, user: userPrompt }
    }
  },

  productBacklog: {
    buildPrompt: (params: any) => {
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 1500,
        methodology: 'agile',
        documentType: 'backlog',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are an expert Product Owner creating a prioritized Product Backlog.
You excel at user story writing, acceptance criteria, and value-based prioritization.
Generate realistic, valuable user stories that deliver incremental value.

${methodologyContext}

BACKLOG PRINCIPLES:
1. Focus on user value and business outcomes
2. Follow INVEST criteria for all stories
3. Include diverse user personas
4. Balance functional and non-functional requirements
5. Enable early and continuous delivery
6. Support iterative refinement`

      const userPrompt = `Create a comprehensive Product Backlog for:

Project Name: ${params.projectName}
Vision: ${params.vision}
Business Case: ${params.businessCase}

BACKLOG CREATION PROCESS:
1. Identify key user personas and their jobs-to-be-done
2. Map user journeys and pain points
3. Define epics aligned with business objectives
4. Break down into valuable, independent stories
5. Apply MoSCoW prioritization
6. Estimate using relative sizing

Generate 20-25 user stories organized by:

EPIC: USER ONBOARDING & AUTHENTICATION
Stories focusing on:
- User registration and verification
- Authentication and authorization
- Profile setup and preferences
- Security and privacy controls

EPIC: CORE VALUE DELIVERY
Stories delivering primary functionality:
- Main user workflows
- Key features and capabilities
- Value-generating actions
- Customer-facing services

EPIC: USER EXPERIENCE & ENGAGEMENT
Stories enhancing usability:
- Navigation and search
- Personalization features
- Notifications and alerts
- Help and support systems

EPIC: INTEGRATION & INTEROPERABILITY
Stories for connectivity:
- Third-party integrations
- API development
- Data import/export
- System interoperability

EPIC: PERFORMANCE & RELIABILITY
Stories for system quality:
- Performance optimization
- Scalability improvements
- Reliability enhancements
- Monitoring and observability

EPIC: COMPLIANCE & SECURITY
Stories for governance:
- Regulatory compliance
- Security hardening
- Audit capabilities
- Data protection

For each story provide:
{
  "id": "US-###",
  "epic": "Epic name",
  "title": "Brief story title",
  "userStory": "As a [persona], I want [goal], so that [benefit]",
  "acceptanceCriteria": [
    "Given [context], When [action], Then [outcome]",
    "Given [context], When [action], Then [outcome]",
    "Given [context], When [action], Then [outcome]"
  ],
  "storyPoints": 1|2|3|5|8|13,
  "priority": "Must Have|Should Have|Could Have|Won't Have",
  "businessValue": "High|Medium|Low",
  "technicalRisk": "High|Medium|Low",
  "dependencies": ["Story IDs if any"],
  "assumptions": ["Key assumptions"],
  "definitionOfReady": {
    "understood": true,
    "estimated": true,
    "accepted": true,
    "testable": true,
    "independent": true
  },
  "notes": "Additional context or considerations"
}

Ensure stories are:
- Independent (can be developed separately)
- Negotiable (details can be discussed)
- Valuable (deliver user/business value)
- Estimable (team can size them)
- Small (fit in a sprint)
- Testable (clear acceptance criteria)

Focus on delivering value early with proper vertical slicing.
Include both functional and non-functional requirements.
Consider ${params.sector} industry-specific needs.`

      return { system: systemPrompt, user: userPrompt }
    }
  },

  sprintPlan: {
    buildPrompt: (params: any) => {
      const methodologyContext = contextManager.assembleContext({
        maxTokens: 1500,
        methodology: 'agile',
        documentType: 'sprint',
        includeExamples: true,
        industryContext: params.sector
      })
      
      const systemPrompt = `You are an experienced Scrum Master facilitating sprint planning.
You understand velocity planning, capacity management, and sprint goal setting.
Generate realistic sprint plans that balance ambition with achievability.

${methodologyContext}

SPRINT PLANNING EXCELLENCE:
1. Clear, focused sprint goals
2. Realistic capacity planning
3. Balanced work distribution
4. Risk mitigation built-in
5. Continuous delivery focus
6. Team empowerment and ownership`

      const userPrompt = `Create a comprehensive Sprint Planning framework for:

Project Name: ${params.projectName}
Team Composition: Based on stakeholder roles
Sprint Duration: 2 weeks (10 working days)

PLANNING APPROACH:
1. Establish sprint goals aligned with product vision
2. Calculate team capacity and velocity
3. Select and commit to sprint backlog
4. Define success criteria
5. Identify risks and dependencies
6. Plan for continuous improvement

Generate detailed sprint plans:

SPRINT 0: FOUNDATION & SETUP
Duration: 1 week
Purpose: Establish team and technical foundation

Activities:
- Team formation and onboarding
- Development environment setup
- CI/CD pipeline configuration
- Initial backlog refinement
- Working agreements establishment
- Tool selection and setup
- Architecture decisions
- Definition of Ready/Done

Deliverables:
- Team charter
- Technical infrastructure
- Refined product backlog (top 2 sprints)
- Initial product roadmap

SPRINT 1: MVP FOUNDATION
Duration: 2 weeks
Sprint Goal: Deliver core functionality foundation

Velocity Target: 20-25 story points (conservative for new team)
Capacity: 80% (allowing for ceremonies and unknowns)

Key Stories:
- Basic user authentication
- Core data model implementation
- Primary user workflow (happy path)
- Initial UI framework
- Basic error handling

Success Metrics:
- Working software demo
- All stories meet Definition of Done
- Technical debt < 10%
- Team health check positive

SPRINT 2: FEATURE EXPANSION
Duration: 2 weeks
Sprint Goal: Expand core features and improve quality

Velocity Target: 25-30 story points (based on Sprint 1 actuals)
Capacity: 85% (team maturing)

Focus Areas:
- Additional user workflows
- Data validation and business rules
- UI enhancements
- Performance optimization
- Security hardening

Success Metrics:
- Velocity within 10% of target
- Zero critical bugs
- User feedback incorporated
- Automated test coverage >70%

SPRINT 3: INTEGRATION & POLISH
Duration: 2 weeks
Sprint Goal: Integrate systems and prepare for release

Velocity Target: 30-35 story points
Capacity: 85%

Priorities:
- Third-party integrations
- End-to-end workflows
- Performance testing
- Security testing
- Documentation
- User acceptance testing prep

Success Metrics:
- All integrations functional
- Performance benchmarks met
- Security scan passed
- UAT readiness confirmed

SPRINT CEREMONIES SCHEDULE:

Sprint Planning (4 hours):
- Part 1: What (2 hours) - Sprint goal and story selection
- Part 2: How (2 hours) - Task breakdown and commitment

Daily Scrum (15 minutes):
- Time: 9:30 AM daily
- Format: Yesterday/Today/Impediments
- Location: Team area/video call

Sprint Review (2 hours):
- Demo working software
- Gather stakeholder feedback
- Update product backlog
- Celebrate achievements

Sprint Retrospective (1.5 hours):
- What went well
- What needs improvement
- Action items for next sprint
- Team health check

Backlog Refinement (2-3 hours/sprint):
- Mid-sprint sessions
- Story elaboration
- Estimation updates
- Dependency identification

DEFINITION OF READY:
□ User story clearly defined
□ Acceptance criteria documented
□ Dependencies identified
□ Story estimated by team
□ Fits within sprint
□ Value understood

DEFINITION OF DONE:
□ Code complete and reviewed
□ Unit tests written and passing
□ Integration tests passing
□ Documentation updated
□ Deployed to staging
□ Product Owner accepted
□ No critical bugs

VELOCITY & METRICS TRACKING:
- Planned vs Actual velocity
- Commitment reliability
- Cycle time trends
- Defect rates
- Team happiness index
- Impediment resolution time

Include specific considerations for ${params.sector} projects.
Format as structured JSON with actionable details.`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}