# Comparable Projects Analysis Document Template
## LLM Implementation Guide

---

## SYSTEM CONTEXT FOR LLM

**Document Purpose**: Generate a comprehensive Comparable Projects Analysis document that identifies, analyzes, and extracts actionable insights from similar projects to inform project planning and risk mitigation.

**Target Audience**: Project managers, executives, technical teams, and stakeholders requiring evidence-based project intelligence.

**Output Requirements**: Professional, data-driven analysis with verified sources, actionable recommendations, and clear traceability to evidence.

---

## INPUT PARAMETERS REQUIRED

```yaml
project_details:
  name: "[PROJECT_NAME]"
  organization: "[ORGANIZATION_NAME]"
  purpose: "[PROJECT_PURPOSE - 2-3 sentences describing why this project exists]"
  
  objectives:
    primary: "[PRIMARY_OBJECTIVE]"
    secondary:
      - "[SECONDARY_OBJECTIVE_1]"
      - "[SECONDARY_OBJECTIVE_2]"
      - "[SECONDARY_OBJECTIVE_3]"
  
  scope:
    included: "[WHAT'S IN SCOPE]"
    excluded: "[WHAT'S OUT OF SCOPE]"
    deliverables:
      - "[DELIVERABLE_1]"
      - "[DELIVERABLE_2]"
      - "[DELIVERABLE_3]"
  
  constraints:
    budget: 
      currency: "[CURRENCY]"
      amount: "[AMOUNT]"
      tolerance: "[+/- PERCENTAGE]"
    timeline:
      start_date: "[YYYY-MM-DD]"
      end_date: "[YYYY-MM-DD]"
      critical_milestones:
        - date: "[YYYY-MM-DD]"
          milestone: "[MILESTONE_DESCRIPTION]"
    
  context:
    industry: "[INDUSTRY]"
    sector: "[PUBLIC/PRIVATE/NON-PROFIT]"
    geography: "[COUNTRY/REGION]"
    regulatory_environment: "[KEY REGULATIONS IF APPLICABLE]"
    technology_stack: "[PRIMARY TECHNOLOGIES]"
    team_size: "[NUMBER]"
    methodology: "[AGILE/WATERFALL/HYBRID/PRINCE2]"
  
  comparison_priorities:
    - "[MOST IMPORTANT ASPECT TO COMPARE]"
    - "[SECOND PRIORITY]"
    - "[THIRD PRIORITY]"
```

---

## DOCUMENT GENERATION TEMPLATE

### 1. EXECUTIVE SUMMARY

**Generation Instructions for LLM**:
- Synthesize findings into 3-4 paragraphs maximum
- Lead with most impactful insight
- Include quantified benefits where possible
- Write for C-level audience

```markdown
## Executive Summary

### Purpose
This analysis examines [NUMBER] comparable projects in the [INDUSTRY] sector to extract actionable insights for [PROJECT_NAME]. The research focuses on projects with similar [scope/budget/timeline/technology] characteristics, particularly those [SPECIFIC SIMILARITY].

### Key Findings
[FINDING_1: Most critical insight with quantified impact]
[FINDING_2: Second most important discovery]
[FINDING_3: Third key learning]

### Strategic Recommendations
Based on the analysis of comparable projects:
1. **Immediate Action**: [SPECIFIC ACTION with expected outcome]
2. **Risk Mitigation**: [PRIMARY RISK to avoid based on failure patterns]
3. **Success Accelerator**: [PROVEN APPROACH that increased success rate by X%]

### Investment Required
Implementing these recommendations requires approximately [TIME] of effort and [BUDGET] of additional investment, with an expected ROI of [PERCENTAGE] based on comparable project outcomes.
```

### 2. PROJECT CONTEXT & SEARCH METHODOLOGY

**Generation Instructions for LLM**:
- Clearly establish the baseline for comparison
- Document search parameters for reproducibility
- Explain selection criteria and validation methods

```markdown
## Project Profile

### Core Characteristics
- **Purpose**: [PROJECT_PURPOSE from input]
- **Budget**: [CURRENCY] [AMOUNT] (±[TOLERANCE]%)
- **Timeline**: [START_DATE] to [END_DATE] ([DURATION] months)
- **Team Size**: [NUMBER] resources
- **Methodology**: [METHODOLOGY]

### Comparison Criteria
Projects were selected based on the following similarity factors:
1. **Budget Range**: ±[X]% of target budget
2. **Timeline**: [X-Y] month duration
3. **Industry**: [EXACT/SIMILAR] industry classification
4. **Complexity**: [METRIC used to assess complexity]
5. **Technology**: [PERCENTAGE]% overlap in tech stack

### Search Methodology
- **Databases Searched**: [LIST OF SOURCES]
- **Keywords Used**: "[KEYWORD_STRING]"
- **Date Range**: Projects completed between [START] and [END]
- **Validation Method**: [HOW RELEVANCE WAS CONFIRMED]
- **Total Projects Reviewed**: [NUMBER]
- **Projects Selected for Deep Analysis**: [NUMBER]
```

### 3. COMPARABLE PROJECTS MATRIX

**Generation Instructions for LLM**:
- Create structured comparison table
- Include relevance scoring
- Provide direct links to sources
- Calculate variance from plan

```markdown
## Comparable Projects Overview

| Project | Organization | Similarity Score | Budget (Planned → Actual) | Timeline (Planned → Actual) | Success Rate | Key Learning | Source |
|---------|--------------|------------------|---------------------------|----------------------------|--------------|--------------|--------|
| [NAME] | [ORG] | [X]/10 | [CURRENCY][AMOUNT] → [ACTUAL] ([VARIANCE]%) | [MONTHS] → [ACTUAL] ([VARIANCE]%) | [X]% | [ONE KEY INSIGHT] | [LINK] |
| [NAME] | [ORG] | [X]/10 | [CURRENCY][AMOUNT] → [ACTUAL] ([VARIANCE]%) | [MONTHS] → [ACTUAL] ([VARIANCE]%) | [X]% | [ONE KEY INSIGHT] | [LINK] |

### Similarity Scoring Methodology
- Budget alignment: [WEIGHT]%
- Timeline alignment: [WEIGHT]%
- Technical similarity: [WEIGHT]%
- Industry/sector match: [WEIGHT]%
- Team size correlation: [WEIGHT]%
```

### 4. PATTERN ANALYSIS

**Generation Instructions for LLM**:
- Identify recurring themes across projects
- Quantify frequency of patterns
- Correlate patterns with outcomes
- Provide evidence trail

```markdown
## Success Patterns Analysis

### Consistent Success Factors
#### [SUCCESS_FACTOR_1]
- **Frequency**: Observed in [X]/[Y] successful projects ([PERCENTAGE]%)
- **Impact**: Correlated with [METRIC] improvement of [X]%
- **Implementation Cost**: [LOW/MEDIUM/HIGH]
- **Evidence**: 
  - [PROJECT_1]: [SPECIFIC EXAMPLE] ([SOURCE])
  - [PROJECT_2]: [SPECIFIC EXAMPLE] ([SOURCE])
- **Application to Your Project**: [SPECIFIC RECOMMENDATION]

### Critical Failure Points
#### [FAILURE_PATTERN_1]
- **Frequency**: Led to issues in [X]/[Y] projects ([PERCENTAGE]%)
- **Impact Severity**: [HIGH/MEDIUM/LOW]
- **Early Warning Signs**: 
  1. [INDICATOR_1]
  2. [INDICATOR_2]
- **Mitigation Strategies That Worked**:
  - [STRATEGY_1]: Used by [PROJECT] with [RESULT] ([SOURCE])
- **Preventive Measures for Your Project**: [SPECIFIC ACTIONS]

### Risk Heat Map
```
High Impact    | [RISK_1] | [RISK_2] |          |
Medium Impact  | [RISK_3] |          | [RISK_4] |
Low Impact     |          | [RISK_5] | [RISK_6] |
               | High     | Medium   | Low      |
                     Probability
```
```

### 5. ACTIONABLE INTELLIGENCE

**Generation Instructions for LLM**:
- Prioritize by implementation ease vs. impact
- Provide specific, measurable actions
- Include success metrics
- Estimate resource requirements

```markdown
## Quick Wins (Implement Within 2 Weeks)

### Quick Win #1: [TITLE]
- **Action**: [SPECIFIC STEPS]
- **Expected Impact**: [QUANTIFIED BENEFIT]
- **Resource Requirement**: [TIME/PEOPLE/BUDGET]
- **Success Metric**: [HOW TO MEASURE]
- **Evidence Base**: Successfully implemented in [X] projects including [EXAMPLE] ([SOURCE])

## Critical Do's and Don'ts

### DO: [PRACTICE_NAME]
✅ **Why**: [REASONING based on evidence]
✅ **How**: [SPECIFIC IMPLEMENTATION]
✅ **Success Rate**: [X]% of projects that did this succeeded
✅ **Example**: [PROJECT] achieved [RESULT] by [METHOD] ([SOURCE])

### DON'T: [PRACTICE_NAME]
❌ **Why**: [REASONING based on evidence]
❌ **Risk**: [SPECIFIC CONSEQUENCE]
❌ **Failure Rate**: [X]% of projects that did this failed
❌ **Example**: [PROJECT] experienced [PROBLEM] due to [CAUSE] ([SOURCE])

## Decision Point Roadmap

### Critical Decision #1: [DECISION_NAME]
**When**: [PROJECT PHASE/MILESTONE]
**Options Taken by Comparable Projects**:
- **Option A**: [DESCRIPTION]
  - Chosen by: [X] projects
  - Success rate: [X]%
  - Best when: [CONDITIONS]
- **Option B**: [DESCRIPTION]
  - Chosen by: [X] projects
  - Success rate: [X]%
  - Best when: [CONDITIONS]
**Recommendation**: [SPECIFIC GUIDANCE based on analysis]
```

### 6. IMPLEMENTATION ROADMAP

**Generation Instructions for LLM**:
- Create phased implementation plan
- Link to project milestones
- Include resource planning
- Define success metrics

```markdown
## Implementation Schedule

### Phase 1: Immediate (Weeks 1-2)
| Action | Owner | Resource Need | Success Metric | Based on Learning From |
|--------|-------|---------------|----------------|----------------------|
| [ACTION] | [ROLE] | [HOURS/BUDGET] | [METRIC] | [PROJECT/SOURCE] |

### Phase 2: Short-term (Weeks 3-8)
| Action | Owner | Resource Need | Success Metric | Based on Learning From |
|--------|-------|---------------|----------------|----------------------|
| [ACTION] | [ROLE] | [HOURS/BUDGET] | [METRIC] | [PROJECT/SOURCE] |

### Phase 3: Ongoing (Weeks 9+)
| Action | Owner | Resource Need | Success Metric | Based on Learning From |
|--------|-------|---------------|----------------|----------------------|
| [ACTION] | [ROLE] | [HOURS/BUDGET] | [METRIC] | [PROJECT/SOURCE] |

## Success Tracking Dashboard
- **Leading Indicators**: [METRICS to track weekly]
- **Lagging Indicators**: [METRICS to track monthly]
- **Risk Indicators**: [METRICS that signal problems]
- **Review Cadence**: [FREQUENCY and format]
```

### 7. APPENDICES

**Generation Instructions for LLM**:
- Provide complete source documentation
- Include detailed project profiles
- Add supplementary analysis
- Ensure traceability

```markdown
## Appendix A: Source Documentation

### Primary Sources
1. **[SOURCE_NAME]**
   - URL: [LINK]
   - Date Accessed: [DATE]
   - Relevance: [WHY THIS SOURCE MATTERS]
   - Key Data Points Extracted: [LIST]

### Academic Research
1. **[PAPER_TITLE]**
   - Authors: [NAMES]
   - Publication: [JOURNAL/CONFERENCE]
   - Year: [YEAR]
   - DOI/Link: [IDENTIFIER]
   - Key Findings Applied: [SUMMARY]

## Appendix B: Detailed Project Profiles

### [PROJECT_NAME_1]
**Organization**: [NAME]
**Duration**: [START] to [END]
**Final Budget**: [AMOUNT]
**Team Size**: [NUMBER]

**Project Overview**:
[2-3 paragraph description]

**Key Success Factors**:
1. [FACTOR_1]: [DESCRIPTION]
2. [FACTOR_2]: [DESCRIPTION]

**Challenges Encountered**:
1. [CHALLENGE_1]: [DESCRIPTION AND RESOLUTION]
2. [CHALLENGE_2]: [DESCRIPTION AND RESOLUTION]

**Lessons Learned Documentation**: [LINK]
**Contact for Follow-up**: [IF AVAILABLE]

## Appendix C: Analysis Methodology

### Data Collection Process
[DETAILED DESCRIPTION]

### Validation Criteria
[CRITERIA USED]

### Limitations and Assumptions
[TRANSPARENCY ABOUT CONSTRAINTS]

### Confidence Levels
- High Confidence (>80%): [FINDINGS]
- Medium Confidence (50-80%): [FINDINGS]
- Low Confidence (<50%): [FINDINGS]
```

---

## LLM PROCESSING INSTRUCTIONS

### Search Strategy
1. **Initial Broad Search**: Cast wide net using industry + project type
2. **Refinement Search**: Narrow to budget/timeline parameters
3. **Deep Dive Search**: Investigate specific success/failure cases
4. **Validation Search**: Cross-reference findings across sources

### Quality Criteria
- **Source Reliability**: Prioritize official project reports, peer-reviewed studies, industry databases
- **Recency**: Weight recent projects (last 3 years) more heavily unless historical perspective adds value
- **Completeness**: Only include projects with sufficient documentation
- **Relevance Scoring**: Score each project 1-10 based on similarity criteria

### Output Formatting
- Use consistent markdown formatting
- Include clickable links for all sources
- Provide data tables where appropriate
- Use bullet points for lists of 3+ items
- Bold key terms and important numbers
- Include visual elements descriptions for developer implementation

### Validation Requirements
- Every claim must have a source
- Quantitative statements require specific data
- Patterns must appear in 3+ projects to be considered significant
- Conflicting evidence must be acknowledged

### Response Constraints
- Maximum document length: 5000 words
- Minimum comparable projects: 5
- Maximum comparable projects for deep analysis: 10
- Include at least 3 actionable insights per section
- Provide specific metrics wherever possible

---

## DEVELOPER IMPLEMENTATION NOTES

### API Integration Points
```python
# Suggested API structure
class ComparableProjectsAnalyzer:
    def __init__(self, project_details):
        self.project = project_details
        self.comparable_projects = []
        
    def search_comparable_projects(self):
        # Implement web search using appropriate APIs
        # - Industry databases
        # - Academic repositories  
        # - News sources
        # - Project management platforms
        pass
    
    def analyze_patterns(self):
        # Pattern recognition across projects
        pass
    
    def generate_insights(self):
        # Extract actionable intelligence
        pass
    
    def create_document(self):
        # Generate final markdown document
        pass
```

### Data Sources to Integrate
1. **Public APIs**: 
   - GitHub (for tech projects)
   - Government procurement databases
   - Industry association databases
   
2. **Web Scraping Targets**:
   - Project management case study sites
   - Industry news sites
   - Company press releases
   - Academic repositories

3. **Structured Databases**:
   - PMI project database
   - Industry-specific databases
   - Regulatory filing systems

### Caching Strategy
- Cache search results for 7 days
- Store analyzed patterns for 30 days
- Refresh comparable projects quarterly

### Error Handling
- Insufficient comparable projects: Expand search parameters
- Conflicting data: Present both views with confidence scores
- Missing critical data: Flag and request manual input

### User Customization Options
- Adjustable similarity thresholds
- Custom weight for comparison criteria
- Industry-specific terminology mappings
- Regional/regulatory adjustments

---

## VERSION CONTROL
- Template Version: 1.0
- Last Updated: [CURRENT_DATE]
- Compatibility: LLM Models with web search capability
- PRINCE2 Alignment: Lessons Learned, Risk Management, Quality Management themes