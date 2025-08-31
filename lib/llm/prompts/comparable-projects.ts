import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const comparableProjectsPrompts = {
  analysis: {
    buildPrompt: (params: any) => {
      const systemPrompt = `You are a Project Management Consultant analyzing comparable projects.
Expertise: Benchmarking and lessons learned extraction.
Task: Generate realistic project comparisons with actionable insights.
Focus: ${params.sector} industry patterns and best practices.`

      const userPrompt = `Execute these steps for Comparable Projects Analysis:

STEP 1: Project context
- Project: ${params.projectName}
- Description: ${params.description}
- Sector: ${params.sector}
- Vision: ${params.vision}

STEP 2: Generate analysis with these sections:

1. EXECUTIVE SUMMARY
   - 3 key findings from analysis
   - 3 critical success factors
   - Top 3 risks to manage
   - Primary recommendation

2. COMPARABLE PROJECTS (Generate 5 projects)
   For each project, provide:
   - Project ID (CP-001 through CP-005)
   - Anonymous name and ${params.sector} organization type
   - Duration: planned vs actual (in months)
   - Budget: planned vs actual (in millions)
   - Team size: 5-20 people
   - Outcome: Success/Partial/Failed
   - Key lesson learned (20 words)

3. SUCCESS PATTERNS
   - 5 common success factors across projects
   - Team structure that worked best
   - Technology choices that succeeded
   - Governance approach effectiveness
   - Change management strategy

4. FAILURE PATTERNS
   - 5 common failure points
   - Root causes (top 3)
   - Early warning signs
   - Recovery strategies that worked

5. BENCHMARK DATA
   - Timeline: Average duration by phase
   - Budget: Cost per team member
   - Quality: Defect rates
   - Productivity: Velocity trends
   - Success rate: % of projects meeting goals

6. LESSONS LEARNED
   - Planning: 3 key insights
   - Execution: 3 key insights
   - Technology: 3 key insights
   - Team: 3 key insights

7. RISK MITIGATION
   - Top 5 risks from similar projects
   - Proven mitigation for each
   - When risks typically materialize
   - Cost of mitigation vs impact

8. RECOMMENDATIONS FOR ${params.projectName}
   - Methodology: Agile/Prince2/Hybrid recommendation
   - Team size: Optimal number
   - Timeline: Realistic estimate
   - Budget: Expected range
   - Success factors: Top 3 to ensure
   - Pitfalls: Top 3 to avoid

STEP 3: Output requirements
- Keep analysis practical and actionable
- Use realistic percentages and timelines
- Base on ${params.sector} industry patterns
- Format as structured text (not JSON)
- Total length: 1500-2500 words`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}