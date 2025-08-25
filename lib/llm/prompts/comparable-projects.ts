import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const comparableProjectsPrompts = {
  analysis: {
    buildPrompt: (params: any) => {
      const systemPrompt = `You are a Senior Project Management Consultant with expertise in project analysis and benchmarking.
You specialize in case-based reasoning, lessons learned extraction, and project pattern recognition.
Generate realistic, insightful analyses of comparable projects that provide actionable intelligence.

ANALYSIS METHODOLOGY:
1. Case Selection - Identify truly comparable projects
2. Success Factor Analysis - What made projects succeed
3. Failure Pattern Recognition - Common pitfalls and their causes  
4. Lesson Extraction - Actionable insights from each case
5. Benchmark Development - Realistic metrics and timelines
6. Risk Pattern Identification - Recurring challenges
7. Recommendation Synthesis - Evidence-based guidance

IMPORTANT:
- Generate realistic but anonymized project examples
- Base insights on industry best practices and common patterns
- Provide specific, actionable lessons learned
- Include both successes and failures for balanced perspective
- Consider sector-specific project characteristics`

      const userPrompt = `Create a comprehensive Comparable Projects Analysis for:

Project Name: ${params.projectName}
Description: ${params.description}
Industry Sector: ${params.sector}
Vision: ${params.vision}
Business Case: ${params.businessCase}

ANALYSIS APPROACH:
1. Identify 8-10 projects with similar characteristics
2. Analyze success and failure patterns
3. Extract actionable lessons learned
4. Develop realistic benchmarks
5. Identify recurring risks and mitigation strategies
6. Provide evidence-based recommendations

Generate a detailed Comparable Projects Analysis with:

1. EXECUTIVE SUMMARY
   - Key findings from comparable projects
   - Critical success factors identified
   - Major risks and mitigation strategies
   - Recommended approach based on analysis
   - Confidence level in recommendations

2. PROJECT SELECTION CRITERIA
   - Similarity Dimensions
     * Industry/sector alignment
     * Project scale and complexity
     * Technology stack similarity
     * Organizational context
     * Regulatory environment
   - Selection Rationale
     * Why these projects are relevant
     * Degree of comparability (High/Medium/Low)
     * Data quality and reliability
     * Recency and relevance

3. COMPARABLE PROJECTS DATABASE
   Generate 8-10 realistic project cases:
   
   For each project:
   {
     "projectId": "CP-###",
     "name": "Anonymized project name",
     "organization": "Industry and size (e.g., 'Large Financial Services')",
     "sector": "${params.sector} or related",
     "scope": "Brief project scope description",
     "duration": {
       "planned": "X months",
       "actual": "Y months",
       "variance": "+/- Z%"
     },
     "budget": {
       "planned": "$X million",
       "actual": "$Y million",
       "variance": "+/- Z%"
     },
     "teamSize": {
       "peak": "X people",
       "average": "Y people",
       "structure": "Team composition"
     },
     "technology": {
       "stack": ["Technologies used"],
       "challenges": ["Technical challenges faced"],
       "innovations": ["Novel approaches"]
     },
     "outcome": "Success|Partial Success|Challenged|Failed",
     "keyMetrics": {
       "roi": "X%",
       "userAdoption": "Y%",
       "qualityScore": "Z/10",
       "stakeholderSatisfaction": "A/10"
     }
   }

4. SUCCESS FACTORS ANALYSIS
   - Critical Success Factors
     * Executive sponsorship patterns
     * Team composition and skills
     * Methodology and governance
     * Stakeholder engagement approaches
     * Technology choices
     * Change management strategies
   - Success Patterns
     * Common approaches in successful projects
     * Key decisions that drove success
     * Resource allocation strategies
     * Risk management approaches
     * Quality assurance practices
   - Success Metrics
     * How success was measured
     * Achievement rates
     * Value delivery patterns
     * Time to value

5. FAILURE ANALYSIS
   - Common Failure Points
     * Requirements management issues
     * Scope creep patterns
     * Resource constraints
     * Technology challenges
     * Organizational resistance
     * External factors
   - Root Cause Analysis
     * Primary failure causes
     * Contributing factors
     * Early warning signs missed
     * Decision points that led to failure
   - Recovery Strategies
     * How challenged projects were recovered
     * Pivot strategies employed
     * Lessons from project rescues
     * When to stop vs continue

6. LESSONS LEARNED SYNTHESIS
   - Planning Phase Lessons
     * Scoping and estimation accuracy
     * Stakeholder identification and engagement
     * Risk assessment completeness
     * Resource planning effectiveness
     * Vendor selection criteria
   - Execution Phase Lessons
     * Team formation and development
     * Communication effectiveness
     * Change management approaches
     * Quality control measures
     * Progress tracking methods
   - Technology Lessons
     * Architecture decisions
     * Technology selection criteria
     * Integration challenges
     * Performance optimization
     * Security implementations
   - Organizational Lessons
     * Change readiness assessment
     * Training and adoption strategies
     * Cultural considerations
     * Politics and dynamics
     * Benefits realization

7. BENCHMARK METRICS
   - Timeline Benchmarks
     * Phase durations (initiation, planning, execution, closure)
     * Milestone achievement rates
     * Delay patterns and causes
     * Acceleration opportunities
   - Cost Benchmarks
     * Cost per user/transaction/feature
     * Budget variance patterns
     * Cost driver analysis
     * Optimization opportunities
   - Quality Benchmarks
     * Defect rates and patterns
     * Testing coverage standards
     * Performance benchmarks
     * User satisfaction scores
   - Productivity Benchmarks
     * Team velocity patterns
     * Learning curve effects
     * Automation benefits
     * Tool effectiveness

8. RISK PATTERNS & MITIGATION
   - Recurring Risk Themes
     * Technical risks (60% of projects faced...)
     * Organizational risks (45% experienced...)
     * External risks (30% were impacted by...)
     * Resource risks (55% had issues with...)
   - Effective Mitigation Strategies
     * Proactive measures that worked
     * Contingency plans activated
     * Risk response effectiveness
     * Insurance and hedging strategies
   - Risk Materialization Timeline
     * When risks typically occur
     * Early warning indicators
     * Escalation triggers
     * Recovery timeframes

9. RESOURCE INSIGHTS
   - Team Composition Patterns
     * Optimal team structures
     * Skill mix requirements
     * Onshore/offshore ratios
     * Contractor vs employee mix
   - Effort Distribution
     * Phase-wise effort allocation
     * Activity-based percentages
     * Rework and waste patterns
     * Efficiency improvements over time
   - Budget Allocation Patterns
     * Category-wise spending
     * Contingency usage
     * Change request impacts
     * Value engineering opportunities

10. STAKEHOLDER INSIGHTS
    - Engagement Strategies
      * Successful communication approaches
      * Stakeholder management techniques
      * Resistance management
      * Champion development
    - Satisfaction Drivers
      * Key factors for satisfaction
      * Expectation management
      * Feedback incorporation
      * Success celebration

11. RECOMMENDATIONS FOR ${params.projectName}
    - Approach Recommendations
      * Methodology selection (based on X similar projects)
      * Team structure (proven patterns from Y projects)
      * Technology choices (success rate of Z%)
      * Governance model (effective in A% of cases)
    - Risk Mitigation Priorities
      * Top 5 risks to actively manage
      * Proven mitigation strategies
      * Contingency planning needs
      * Early warning system design
    - Success Enablers
      * Critical factors to ensure
      * Investment priorities
      * Quick wins to target
      * Long-term success factors
    - Pitfalls to Avoid
      * Common mistakes in similar projects
      * Decision traps to recognize
      * Resource allocation errors
      * Timeline optimism bias

12. CONFIDENCE ASSESSMENT
    - Analysis Confidence
      * Data quality (High/Medium/Low)
      * Comparability degree (Strong/Moderate/Weak)
      * Pattern consistency (Clear/Mixed/Unclear)
      * Recommendation strength (Strong/Moderate/Cautious)
    - Uncertainty Factors
      * Unique project aspects
      * Environmental changes
      * Technology evolution
      * Organizational factors

Generate realistic, detailed project cases that reflect actual industry patterns.
Provide specific percentages, timelines, and metrics based on typical industry benchmarks.
Ensure lessons learned are actionable and directly applicable to ${params.projectName}.
Format as structured JSON with comprehensive details.`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}