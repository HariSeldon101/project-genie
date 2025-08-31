import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const technicalLandscapePrompts = {
  analysis: {
    buildPrompt: (params: any) => {
      const systemPrompt = `You are a Senior Technology Analyst creating an industry technology overview document.

FOCUS: Create a strategic technology landscape overview for Project Managers (NOT developers).
This document should provide context about the ${params.sector} industry's technology environment, 
explain key technical concepts, and clarify terminology so PMs can effectively manage technical teams
and communicate with stakeholders.

Key Guidelines:
- Focus on business implications of technology choices
- Explain technical concepts in business terms
- Provide industry context and market positioning
- Include links to authoritative resources
- Create a comprehensive glossary of technical terms (NOT PM terms)
- Keep it strategic, not deeply technical

Remember: Your audience is experienced Project Managers who need to understand the technology 
landscape to make informed decisions, not to implement the technology themselves.`

      const userPrompt = `Create a Technology Landscape Overview for Project Managers:

PROJECT CONTEXT:
- Project: ${params.projectName}
- Description: ${params.description}
- Industry/Sector: ${params.sector}
- Company Vision: ${params.vision}
${params.budget ? `- Budget: ${params.budget}` : ''}
${params.timeline ? `- Timeline: ${params.timeline}` : ''}

Generate these sections:

1. EXECUTIVE OVERVIEW (200 words)
   - Industry technology context for ${params.sector}
   - Current market technology trends
   - Strategic technology considerations
   - Key competitive differentiators

2. INDUSTRY TECHNOLOGY LANDSCAPE (300 words)
   - Standard technologies used in ${params.sector}
   - Market leaders and their tech stacks
   - Emerging technologies gaining traction
   - Technology adoption maturity curve
   - Investment trends in the sector

3. CLIENT COMPANY PROFILE (250 words)
   - Current technology position
   - Market positioning relative to competitors
   - Key services and digital offerings
   - Technology strengths and gaps
   - Strategic technology opportunities

4. RECOMMENDED TECHNOLOGY APPROACH (300 words)
   - High-level architecture overview (business perspective)
   - Core technology platform recommendations
   - Integration strategy with existing systems
   - Scalability and growth considerations
   - Security and compliance requirements

5. KEY TECHNOLOGY DECISIONS (200 words)
   - Build vs Buy considerations
   - Cloud vs On-premise implications
   - Open source vs Commercial solutions
   - Technology partner selection criteria
   - Risk vs Innovation balance

6. RESOURCE & SKILLS REQUIREMENTS (200 words)
   - Team composition needs
   - Critical technical roles
   - Skills availability in market
   - Training and upskilling needs
   - External expertise requirements

7. TECHNOLOGY COST IMPLICATIONS (200 words)
   - Initial investment breakdown
   - Ongoing operational costs
   - Total Cost of Ownership (TCO)
   - ROI considerations
   - Cost optimization opportunities

8. TECHNICAL GLOSSARY (400 words)
   Create a comprehensive glossary of ALL technical terms, acronyms, and jargon used in this document.
   Format: **Term**: Clear, business-friendly explanation
   Include:
   - Technology acronyms (API, SaaS, PaaS, etc.)
   - Architecture terms
   - Development methodologies
   - Security concepts
   - Data management terms
   - Integration patterns
   DO NOT include PM acronyms (like WBS, RACI, etc.)

9. REFERENCE RESOURCES (150 words)
   Provide 8-10 curated links to:
   - Industry technology reports
   - Technology vendor documentation
   - Quick overview guides
   - Relevant tutorials or courses
   - Industry analyst reports
   Format: [Resource Name](URL) - Brief description

OUTPUT REQUIREMENTS:
- Write for experienced PMs who need technology context
- Focus on strategic implications, not implementation details
- Use clear business language, explain all technical terms
- Include specific technology names and versions where relevant
- Provide actionable insights for project planning
- Total length: 2000-2500 words`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}