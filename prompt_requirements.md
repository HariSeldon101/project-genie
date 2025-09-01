# Document Generation Prompt Requirements

## Purpose
This document defines the requirements for all document generation prompts to ensure they generate high-quality, actionable content with real-world data instead of generic fallback content. This includes specifications for web search tool usage to retrieve accurate, current information.

## Web Search Tool Integration

### Tool Configuration
- **Web Search Required Documents**: Comparable Projects, Technical Landscape
- **Web Search Optional Documents**: Risk Register, Communication Plan (for industry-specific data)
- **No Web Search Needed**: PID, Business Case, Charter, Backlog (use project-specific data)

### Cost-Optimized Model Selection
- **Web Search Documents**: Use `gpt-4o-mini` (cheaper with web search: $0.15/1M input + $0.60/1M output)
- **Structured Documents**: Use `gpt-4o-mini` with zodResponseFormat
- **Narrative Documents**: Use `gpt-5-nano` without web search ($0.05/1M input + $0.40/1M output)

### Web Search Instructions for Prompts
When web search is enabled, prompts MUST include:
```
IMPORTANT: Use web search to find real examples:
- Search for "[SECTOR] digital transformation case studies 2023-2024"
- Search for specific companies in the sector
- Search for "[SECTOR] IT projects budget timeline"
- Verify all data with actual sources before including
- Include URLs from search results as references
```

## Core Requirements

### 1. Real Projects Only
- **MUST** reference actual companies and projects that exist
- **MUST** use real company names (e.g., "JPMorgan Chase", "Bank of America", "Wells Fargo")
- **MUST** cite verifiable sources (e.g., "McKinsey Banking Report 2023", "Gartner Case Study")
- **MUST** include project dates and timelines that are realistic
- **NO** generic placeholders like "Company A" or "Banking Institution X"

### 2. Verifiable Data Sources
Each project MUST include:
- **Source/Reference**: Actual report name, publication, or case study
- **Links**: Where possible, include actual URLs to public sources
- **Dates**: Real project timelines (e.g., "2021-2023", not "Year 1-2")
- **Metrics**: Specific, quantifiable outcomes (e.g., "reduced processing time by 47%")

### 3. Actionable Insights
Each comparable project MUST provide:
- **Specific technologies used**: Named platforms and tools (e.g., "Salesforce Financial Services Cloud", "AWS Lambda")
- **Quantified outcomes**: Real percentages, dollar amounts, time savings
- **Named methodologies**: Specific approaches (e.g., "SAFe 5.0", "Spotify Model")
- **Concrete lessons**: Actionable takeaways with specific examples

### 4. Industry-Specific Context
Projects MUST be:
- **Sector-relevant**: From the same or closely related industry
- **Scale-appropriate**: Similar in scope and complexity
- **Recent**: Preferably from the last 3-5 years
- **Documented**: Have publicly available information

## Content Structure Requirements

### Executive Summary
- 3-5 bullet points with **specific metrics** from the analysis
- **Named companies** referenced in findings
- **Quantified success factors** (e.g., "Executive sponsorship increased success rate by 35%")

### Project Profiles (5 Required)
Each project MUST include ALL of these fields:
```
- Project ID: CP-001 through CP-005
- Company: [Real company name with size/type]
- Project Name: [Actual project name or descriptive title]
- Similarity Score: [70-95% with justification]
- Timeline: [Actual dates, e.g., "Jan 2022 - Dec 2023"]
- Budget: [Real amounts in millions, e.g., "$45M USD"]
- Team Size: [Specific numbers, e.g., "Peak: 120, Average: 85"]
- Outcome: [Success/Partial/Failed with metrics]
- Success Metrics: [3 specific KPIs with values]
- Technologies: [Named platforms and tools]
- Methodology: [Specific framework used]
- Key Lesson: [30-50 word actionable insight]
- Source: [Actual publication or report]
- Link: [URL if publicly available]
```

### Critical Success Factors Table
Must include 10 factors with:
- **Quantified impact** (e.g., "Increases success rate by 25-30%")
- **Implementation difficulty** (High/Medium/Low with justification)
- **Priority ranking** (1-10)
- **Real-world examples** from named companies

### Risk Analysis Table
Must include 10 risks with:
- **Probability percentage** (e.g., "65% based on industry data")
- **Impact severity** (Critical/High/Medium/Low with dollar/time impact)
- **Specific mitigation strategies** (not generic advice)
- **Early warning signs** (measurable indicators)
- **Residual risk assessment** after mitigation

### Recommendations Section (Single Consolidated Section)
Must include:
- **Recommended methodology** with specific version/variant
- **Team structure** with exact roles and numbers
- **Timeline** with monthly milestones
- **Budget breakdown** by category with percentages
- **Top 5 success factors** with implementation steps
- **Top 5 pitfalls** with prevention strategies
- **90-day quick wins** with measurable outcomes

## Formatting Requirements

### Tables
- Use proper markdown table format
- Include headers for all columns
- Align numerical data appropriately
- Provide totals/averages where relevant

### Links and References
- Format links as: `[Company Name Report](https://actual-url.com)`
- Include publication date for all sources
- Cite page numbers where applicable

### Metrics and Data
- Use consistent units (all USD, all months, etc.)
- Include confidence levels for projections
- Show ranges where exact data unavailable (e.g., "$40-50M")
- Provide industry averages for comparison

## Quality Checks

The prompt output should be validated against:
1. **No generic content**: Every project must be traceable to a real source
2. **Actionable insights**: Each recommendation must have clear next steps
3. **Quantified metrics**: At least 80% of claims should have numbers
4. **Current relevance**: Projects should be from 2020 or later
5. **Sector alignment**: All projects must be from the specified industry

## Example Output Snippet

### Good Example ✅
```
Project: JPMorgan Chase Digital Banking Transformation
Timeline: January 2022 - June 2023 (18 months)
Budget: $147M USD (15% over initial $128M budget)
Team: Peak 185 people, average 120
Outcome: Success - 4.7M users migrated, 92% satisfaction
Technologies: AWS, Kubernetes, React Native, Kafka
Source: JPMorgan Chase 2023 Annual Report, pages 47-52
Link: https://www.jpmorganchase.com/annual-report-2023
```

### Bad Example ❌
```
Project: Large Bank Digital Initiative
Timeline: 18 months
Budget: Large investment
Team: Significant resources
Outcome: Successful
Technologies: Cloud, Modern frameworks
Source: Industry case study
```

## Enforcement in Prompts

To ensure compliance, prompts should:
1. Explicitly state "Use ONLY real companies and actual projects"
2. Require "Include source links where available"
3. Specify "Provide quantified metrics for all claims"
4. Demand "No generic placeholders or hypothetical examples"
5. Include "If you cannot find real examples, search for actual case studies from the specified industry"

## Validation Checklist

### Comparable Projects & Technical Landscape (Web Search Required)
Documents MUST pass ALL of these checks:
- ☐ Contains 5+ real company names (no "Company A" or generic names)
- ☐ Contains 10+ quantified metrics with specific percentages or amounts
- ☐ Each project has specific date ranges (e.g., "January 2021 - June 2023")
- ☐ Contains 5+ actual URLs to real sources
- ☐ All budgets show actual amounts AND variance
- ☐ All technologies are named platforms/versions
- ☐ Each project has a specific outcome with metrics
- ☐ References include page numbers where applicable

### Other Documents (Standard Requirements)
- ☐ All dates relative to project timeline (no hardcoded years)
- ☐ Company name from project data used consistently
- ☐ Budget from project data integrated correctly
- ☐ Stakeholder names use proper placeholders

## Success Criteria

A successful document will:
- **With Web Search**: Reference real companies, include verifiable metrics, provide actual URLs
- **Without Web Search**: Use project-specific data, maintain consistency, avoid generic content
- **All Documents**: Pass validation checks, meet quality standards, provide actionable insights

## Implementation Notes

### Web Search API Call Structure
```javascript
// For GPT-4o models with web search
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: messages,
  tools: [{
    type: 'web_search',
    web_search: {
      max_results: 10,
      search_depth: 'comprehensive'
    }
  }],
  temperature: 0.7,
  max_tokens: 8000
})
```

### Cost Tracking
- Web Search Tool Calls: $2.50 per 1,000 calls
- GPT-4o-mini with web search: ~70% cheaper than GPT-5 models
- Monitor usage to optimize search frequency

---

*Last Updated: September 2025*
*Document Version: 2.0*
*Changes: Added web search tool requirements and cost optimization guidelines*