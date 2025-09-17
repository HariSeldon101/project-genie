import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const comparableProjectsPrompts = {
  analysis: {
    buildPrompt: (params: any) => {
      const systemPrompt = `You are a Senior Project Management Consultant with expertise in ${params.sector} industry benchmarking.
Your role: Research and analyze REAL comparable projects from actual companies to extract actionable insights.
Approach: Use your knowledge of documented case studies, public reports, and verifiable project outcomes.
Focus: ${params.sector} sector transformation projects from REAL companies with similar scope and complexity.
CRITICAL: You MUST reference actual companies by name (e.g., JPMorgan Chase, Bank of America, Citigroup, Wells Fargo, HSBC, Barclays, etc.)
NO generic placeholders or hypothetical examples allowed.`

      const userPrompt = `Conduct a comprehensive Comparable Projects Analysis for:

PROJECT CONTEXT:
- Name: ${params.projectName}
- Description: ${params.description}
- Sector: ${params.sector}
- Vision: ${params.vision}
- Scope: ${params.scope || 'Enterprise-wide transformation'}
- Budget Range: ${params.budget || 'To be determined'}

CRITICAL REQUIREMENTS:
- You MUST use REAL company names (NO "Company A" or generic names)
- You MUST cite actual sources (reports, case studies, press releases) with URLs
- You MUST provide verifiable data and metrics with specific numbers
- Include working URLs/links to public sources (annual reports, case studies)
- Reference projects from 2020-2024 for relevance (with specific start/end dates)
- Each project MUST have Month Year format dates (e.g., "March 2021 - November 2023")

REQUIRED COMPANIES BY SECTOR:
Banking/Finance: Must include at least 3 from: JPMorgan Chase, Bank of America, Wells Fargo, Citigroup, Capital One, PNC Bank, US Bank, Truist, Goldman Sachs, Morgan Stanley, HSBC USA, Barclays US, Deutsche Bank US, BNP Paribas USA, Santander US, TD Bank, Royal Bank of Canada, Scotiabank, ING Direct USA, State Street
Retail: Must include at least 3 from: Walmart, Target, Home Depot, Lowe's, Costco, Kroger, CVS Health, Walgreens, Best Buy, Macy's, Nordstrom, Kohl's, Dollar General, TJX Companies, Ross Stores, Gap Inc, Dick's Sporting Goods, AutoZone, O'Reilly Auto Parts, Tractor Supply
Technology: Must include at least 3 from: Microsoft, Google/Alphabet, Apple, Amazon/AWS, Meta/Facebook, Salesforce, Oracle, SAP, Adobe, IBM, ServiceNow, Workday, Snowflake, Databricks, Palantir, VMware, Cisco, Intel, NVIDIA, Qualcomm

DELIVERABLES:

1. EXECUTIVE SUMMARY
   Provide a data-driven summary with:
   - Market context and industry transformation trends
   - 3 key findings from comparable analysis (with specific metrics)
   - 3 critical success factors (with % impact on success rate)
   - Top 3 risks to manage (with probability and impact ratings)
   - Primary strategic recommendation

2. COMPARABLE PROJECTS ANALYSIS
   Identify 5 REAL ${params.sector} transformation projects from ACTUAL COMPANIES:
   
   EXAMPLE FORMAT (MUST FOLLOW):
   Project ID: CP-001
   Organization: JPMorgan Chase (Assets: $3.7T, 250,000 employees)
   Project Name: Chase Digital Assistant & Core Banking Modernization
   Similarity Score: 92% (same scope: digital channels, core modernization, AI/ML)
   Timeline: January 2021 - June 2023 (30 months, 6 months over plan)
   Budget: $285M USD (14% over initial $250M budget)
   Team Size: Peak: 450, Average: 280
   Outcome: Success - 12M customers migrated, 94% satisfaction score
   Success Metrics:
     • Digital adoption increased from 45% to 78% (73% increase)
     • Transaction processing time reduced by 67% (from 3s to 1s)
     • Fraud detection accuracy improved by 42% (from 76% to 92%)
   Key Technologies: AWS Cloud, Kubernetes, Apache Kafka, React Native, TensorFlow 2.0
   Methodology: SAFe 5.1 with quarterly PI planning
   Critical Success Factor: C-suite sponsorship with weekly steering committee (25% impact on success)
   Major Challenge: Legacy COBOL integration - resolved using microservices wrapper pattern
   Lesson Learned: Investing 15% of budget in data quality upfront reduced migration issues by 60% and saved 3 months of rework
   Source/Reference: JPMorgan Chase 2023 Annual Report, pages 47-52; McKinsey Banking Digital Transformation Study 2023
   Link: https://www.jpmorganchase.com/content/dam/jpmc/jpmorgan-chase-and-co/investor-relations/documents/annual-report-2023.pdf
   
   For EACH of the 5 projects, provide ALL fields above with REAL data.

3. CRITICAL SUCCESS FACTORS (TABLE FORMAT)
   Provide 10 specific success factors:
   | Factor | Description | Impact on Success Rate | Implementation Difficulty | Priority |
   Include factors like:
   - Executive sponsorship level required
   - Change management approach
   - Technology architecture decisions
   - Team composition and skills
   - Stakeholder engagement model
   - Governance structure
   - Risk management maturity
   - Vendor/partner selection
   - Data migration strategy
   - Testing and quality approach

4. KEY RISKS ANALYSIS (TABLE FORMAT)
   Identify 10 major risks:
   | Risk | Probability | Impact | Mitigation Strategy | Early Warning Signs | Residual Risk |
   Include risks like:
   - Legacy system integration complexity
   - Regulatory compliance changes
   - Resource availability and retention
   - Stakeholder resistance
   - Technology platform risks
   - Data quality and migration
   - Vendor dependency
   - Budget overrun
   - Timeline delays
   - Scope creep

5. BENCHMARK METRICS
   Provide industry-standard metrics:
   - Average project duration: By project size (small/medium/large)
   - Budget distribution: % for technology, people, training, contingency
   - Team composition: Optimal ratio of roles
   - Success rates: By methodology and approach
   - ROI timeline: Time to value realization
   - Quality metrics: Defect rates, rework percentages
   - Productivity: Story points/sprint, features/release

6. LESSONS LEARNED MATRIX
   Organize lessons by category:
   
   Planning Phase:
   - Lesson 1: [Specific insight with example]
   - Lesson 2: [Specific insight with example]
   - Lesson 3: [Specific insight with example]
   
   Execution Phase:
   - Lesson 1: [Specific insight with example]
   - Lesson 2: [Specific insight with example]
   - Lesson 3: [Specific insight with example]
   
   Technology Decisions:
   - Lesson 1: [Specific insight with example]
   - Lesson 2: [Specific insight with example]
   - Lesson 3: [Specific insight with example]
   
   Team & Culture:
   - Lesson 1: [Specific insight with example]
   - Lesson 2: [Specific insight with example]
   - Lesson 3: [Specific insight with example]

7. COMPARISON MATRIX
   Create a detailed comparison table:
   | Aspect | ${params.projectName} | Industry Best Practice | Gap Analysis | Recommendation |
   Include aspects like:
   - Project duration
   - Budget allocation
   - Team size
   - Technology stack
   - Methodology
   - Governance model
   - Risk approach
   - Change management
   - Quality standards
   - Success metrics

8. RECOMMENDATIONS

   Format this section EXACTLY as shown below for proper parsing:

   ### Implementation Roadmap
   
   **Methodology:** [Specific methodology like Agile/SAFe/PRINCE2] - [Justification with specific metrics from comparable projects]
   **Team Structure:** [Number] total - Project Manager: 1, Business Analysts: [X], Developers: [X], QA Engineers: [X], UX/UI Designers: [X], Change Management Lead: 1
   **Timeline:** Phase 1: [Activity] ([X] months) → Phase 2: [Activity] ([X] months) → Phase 3: [Activity] ([X] months) → Phase 4: [Activity] ([X] months)
   **Budget:** Total $[X]M - Technology: $[X]M ([X]%), People: $[X]M ([X]%), Training: $[X]M ([X]%), Contingency: $[X]M ([X]%)
   
   ### Top 5 Success Factors
   1. [Factor name] - [Specific impact percentage]% improvement in success rate
   2. [Factor name] - [Specific impact percentage]% improvement in success rate
   3. [Factor name] - [Specific impact percentage]% improvement in success rate
   4. [Factor name] - [Specific impact percentage]% improvement in success rate
   5. [Factor name] - [Specific impact percentage]% improvement in success rate
   
   ### Top 5 Pitfalls to Avoid
   1. [Pitfall name] - [Specific example or consequence from comparable projects]
   2. [Pitfall name] - [Specific example or consequence from comparable projects]
   3. [Pitfall name] - [Specific example or consequence from comparable projects]
   4. [Pitfall name] - [Specific example or consequence from comparable projects]
   5. [Pitfall name] - [Specific example or consequence from comparable projects]
   
   ### Quick Wins (First 90 Days)
   1. [Specific action] - Complete by [Day X] - Expected outcome: [Specific metric]
   2. [Specific action] - Complete by [Day X] - Expected outcome: [Specific metric]
   3. [Specific action] - Complete by [Day X] - Expected outcome: [Specific metric]
   
   ### Long-term Sustainability
   [2-3 paragraphs describing the long-term approach based on lessons from comparable projects]

9. REFERENCE SOURCES
   List ACTUAL sources with links:
   - "McKinsey Global Banking Annual Review 2023" - https://www.mckinsey.com/industries/financial-services
   - "Gartner Digital Banking Platforms Magic Quadrant 2023" - https://www.gartner.com
   - "JPMorgan Chase 2023 Annual Report" - https://www.jpmorganchase.com/ir/annual-report
   - "Bank of America Digital Transformation Case Study 2023" - https://about.bankofamerica.com
   - "Deloitte Banking Industry Outlook 2024" - https://www2.deloitte.com/insights
   - Include at least 5 real sources with actual URLs or publication details

OUTPUT REQUIREMENTS:
- NO GENERIC CONTENT - Every example must be from a REAL company
- Use specific, quantifiable metrics (percentages, dollar amounts, time savings)
- Include actual project dates and timelines (e.g., "January 2022 - December 2023", not "Year 1-2")
- Provide actionable insights with clear next steps
- Reference actual reports and include URLs where possible
- Format data in tables where appropriate for clarity
- Total length: 2000-3000 words
- Focus on practical application for ${params.projectName}

VALIDATION CHECKLIST (Your output MUST pass ALL of these):
☐ Contains 5+ real company names (JPMorgan, Bank of America, Wells Fargo, etc.) - NO "Company A" or generic names
☐ Contains 10+ quantified metrics with specific percentages or amounts (e.g., "47% reduction", "$285M budget")
☐ Each project has specific date ranges (e.g., "January 2021 - June 2023") - NO vague timelines
☐ Contains 5+ actual URLs to real sources (annual reports, case studies, industry reports)
☐ All budgets show actual amounts AND variance (e.g., "$147M, 15% over $128M budget")
☐ All technologies are named platforms/versions (e.g., "AWS", "Kubernetes 1.24", "SAFe 5.1")
☐ Each project has a specific outcome with metrics (e.g., "Success - 94% satisfaction, 12M users migrated")
☐ References include page numbers where applicable (e.g., "Annual Report 2023, pp. 47-52")

FINAL CHECK: If any item above is missing, the response is INCOMPLETE and must be regenerated.`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}