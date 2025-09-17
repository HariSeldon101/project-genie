# Project Genie Prompt Architecture Design

## Executive Summary

This document outlines a comprehensive strategy for improving document generation quality in Project Genie through enhanced prompt engineering, methodology documentation integration, and the addition of two new document types. The approach combines modern LLM techniques with established project management methodologies to create high-quality, contextually relevant project documentation.

## Problem Statement

Current prompt templates in Project Genie generate functional but generic documentation. The challenges identified include:

1. **Limited Methodology Context**: Prompts lack deep integration with PRINCE2 and Agile best practices
2. **Generic Outputs**: Generated documents don't fully leverage industry-specific patterns and terminology
3. **Missing Context Types**: No technical landscape or comparable projects analysis
4. **Token Inefficiency**: Current prompts don't optimize context usage for maximum quality

## Research and Analysis

### Current State Analysis

After reviewing the existing prompt structures in `lib/llm/prompts/agile.ts` and `lib/llm/prompts/prince2.ts`, several observations emerged:

**Strengths:**
- Clear role definitions in system prompts
- Structured output requirements (JSON format)
- Comprehensive section outlines
- Industry sector awareness

**Weaknesses:**
- No few-shot examples to guide output quality
- Missing methodology-specific terminology enforcement
- Lack of self-verification mechanisms
- No progressive refinement strategy

### Research Findings

#### 1. PRINCE2 Methodology Structure
Based on research from prince2.wiki, the framework emphasizes:
- **7 Principles**: Fundamental rules that guide project management decisions
- **7 Practices** (formerly Themes): Aspects of project management that must be continually addressed
- **7 Processes**: Steps taken throughout the project lifecycle
- **Management Products**: Specific documents and reports that support governance

Key insight: PRINCE2's strength lies in its structured documentation approach and clear governance model, which should be reflected in generated documents.

#### 2. Agile/Scrum Best Practices
Research from Scrum.org, Atlassian, and industry sources revealed:
- **Core Values**: Commitment, Focus, Openness, Respect, Courage
- **Documentation Philosophy**: "Just enough" documentation that evolves with the project
- **Diataxis Framework**: A holistic approach to technical documentation
- **Sprint-Centric Structure**: All documentation should align with sprint cycles

Key insight: Agile documentation should be lightweight but comprehensive, with emphasis on continuous refinement.

#### 3. LLM Prompt Engineering State-of-the-Art (2024)

Based on research into current best practices:

**RAG (Retrieval Augmented Generation) Benefits:**
- Reduces hallucination by grounding responses in retrieved context
- Enables dynamic knowledge updates without retraining
- Improves accuracy for domain-specific tasks

**Prompt Engineering Techniques:**
- **Chain-of-Thought**: Breaking complex tasks into reasoning steps
- **Few-Shot Learning**: Providing examples to guide output format and quality
- **Self-Consistency**: Multiple generation passes with validation
- **Context Window Optimization**: Strategic use of available token space

**Security Considerations:**
- Prompt injection risks in RAG systems
- Need for input validation and output sanitization
- Importance of prompt versioning and audit trails

## Model Selection Strategy

### Optimal Model Assignment Based on Document Type

After extensive testing and debugging (August 2025), we've identified that different OpenAI models excel at different types of document generation:

#### GPT-4o Models for Structured Documents
- **Use Case**: Documents with complex nested schemas requiring strict field validation
- **Examples**: PID, Business Case, Product Backlog, Sprint Plans
- **Why**: Native support for `zodResponseFormat` guarantees schema adherence
- **API**: `chat.completions.parse` with Zod schemas
- **Cost**: Higher per token but prevents regeneration due to failures

#### GPT-5 Models for Narrative Documents
- **Use Case**: Documents requiring creative analysis and flowing narrative
- **Examples**: Risk Register, Project Plan, Communication Plan, Technical Landscape
- **Why**: Superior reasoning and creative capabilities
- **API**: `responses.create` with text generation
- **Cost**: Lower per token, especially nano variant

### Cost Optimization Through Model Variants

| Environment | Structured Docs | Narrative Docs | Monthly Est. |
|------------|----------------|----------------|--------------|
| Development | gpt-4o-nano | gpt-5-nano | ~$10 |
| Staging | gpt-4o-nano | gpt-5-nano | ~$25 |
| Production | gpt-4o-mini | gpt-5-mini | ~$100 |

### Implementation Architecture

```
Document Request
       ↓
Document Type Router
       ├─ Structured? → GPT-4o Pipeline
       │                  ├─ Zod Schema
       │                  ├─ chat.completions.parse
       │                  └─ Guaranteed Output
       │
       └─ Narrative? → GPT-5 Pipeline
                          ├─ Creative Prompt
                          ├─ responses.create
                          └─ JSON Validation
```

## Proposed Architecture

### 1. Hybrid RAG + Methodology Context Injection

#### Design Rationale
Traditional RAG systems retrieve relevant documents based on semantic similarity. Our hybrid approach combines:
- **Static methodology knowledge** (PRINCE2/Agile principles) - always included
- **Dynamic context retrieval** (relevant templates, examples) - selected based on document type
- **Project-specific information** (user inputs, company context) - incorporated at generation time

This three-tier approach ensures consistency while maintaining flexibility.

#### Implementation Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Knowledge Base Layer                  │
├─────────────────────────────────────────────────────────┤
│  • PRINCE2 Documentation (chunked by principle/process)  │
│  • Agile Best Practices (organized by ceremony/artifact) │
│  • Industry Templates (categorized by sector)            │
│  • Example Documents (tagged by quality score)           │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                  Context Assembly Layer                  │
├─────────────────────────────────────────────────────────┤
│  • Relevance Scoring (semantic similarity + tags)        │
│  • Token Budget Management (prioritized inclusion)       │
│  • Context Compression (key points extraction)           │
│  • Template Selection (based on project type)            │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   Generation Layer                       │
├─────────────────────────────────────────────────────────┤
│  • Multi-stage prompting (outline → sections → review)   │
│  • Quality validation (methodology compliance checks)    │
│  • Output formatting (structured JSON/Markdown)          │
│  • Version control (prompt and output tracking)          │
└─────────────────────────────────────────────────────────┘
```

### 2. Enhanced Prompt Template Structure

#### New Template Format

```typescript
interface EnhancedPromptTemplate {
  // Core prompt components
  role: string                    // Expert role definition
  expertise: string[]              // Specific knowledge areas
  methodology: MethodologyContext  // PRINCE2/Agile principles
  
  // Learning examples
  examples: {
    positive: Example[]           // High-quality outputs
    negative: Example[]           // Common mistakes to avoid
  }
  
  // Generation strategy
  strategy: {
    reasoning: string[]           // Chain-of-thought steps
    validation: string[]          // Self-check questions
    refinement: string[]          // Improvement passes
  }
  
  // Quality controls
  constraints: {
    format: FormatSpec            // Output structure requirements
    terminology: Glossary         // Required terms and definitions
    compliance: Standard[]        // Methodology standards to follow
  }
}
```

### 3. New Document Type: Technical Landscape

#### Purpose
Provide comprehensive technical context to inform project planning and risk assessment.

#### Components

1. **Technology Stack Analysis**
   - Current technologies in use
   - Proposed new technologies
   - Integration requirements
   - Migration considerations

2. **Market Trends Research**
   - Industry adoption patterns
   - Emerging technologies
   - Competitive landscape
   - Future-proofing considerations

3. **Technical Glossary**
   - Project-specific terminology
   - Technology acronyms
   - Domain concepts
   - Stakeholder language alignment

4. **Resource Repository**
   - Official documentation links
   - Community resources
   - Tutorial references
   - Support channels

5. **Compatibility Matrix**
   - Technology interdependencies
   - Version requirements
   - Known conflicts
   - Integration patterns

#### Generation Strategy
- Use web search for current technology trends
- Cross-reference with company's existing infrastructure
- Generate sector-specific insights
- Include complexity and risk ratings

### 4. New Document Type: Comparable Projects

#### Purpose
Learn from similar implementations to provide realistic estimates and risk mitigation strategies.

#### Components

1. **Project Database**
   - 5-10 similar projects (synthetic but realistic)
   - Scope and scale comparisons
   - Technology choices
   - Team structures

2. **Success Factors Analysis**
   - Critical success factors
   - Best practices employed
   - Innovation approaches
   - Stakeholder management

3. **Failure Points Documentation**
   - Common pitfalls
   - Root cause analysis
   - Mitigation strategies
   - Recovery approaches

4. **Lessons Learned Synthesis**
   - Actionable insights
   - Do's and don'ts
   - Resource optimization
   - Timeline realities

5. **Benchmarking Data**
   - Cost comparisons
   - Timeline analysis
   - Quality metrics
   - ROI calculations

#### Generation Strategy
- Use case-based reasoning
- Generate realistic synthetic examples
- Include confidence scores
- Provide industry-specific patterns

## Implementation Approach

### Phase 1: Foundation (Week 1)
1. Create methodology documentation structure
2. Implement basic context injection system
3. Set up prompt versioning system
4. Create quality validation framework

### Phase 2: Enhancement (Week 2)
1. Enhance existing PRINCE2 and Agile prompts
2. Add few-shot examples to all prompts
3. Implement chain-of-thought reasoning
4. Add self-verification mechanisms

### Phase 3: New Features (Week 3)
1. Implement Technical Landscape generator
2. Implement Comparable Projects generator
3. Create web search integration for research
4. Add sector-specific template library

### Phase 4: Optimization (Week 4)
1. Implement token optimization strategies
2. Add prompt caching system
3. Create A/B testing framework
4. Deploy quality metrics dashboard

## Quality Improvement Strategies

### 1. Prompt Chaining
Break complex documents into smaller, manageable sections:
- Generate outline first
- Expand each section independently
- Review for consistency
- Final quality pass

### 2. Context-Aware Token Management
Optimize context window usage:
- Priority-based inclusion
- Dynamic truncation
- Relevance scoring
- Compression techniques

### 3. Output Validation
Ensure quality and compliance:
- Methodology alignment checks
- Terminology consistency
- Structure completeness
- Industry standard compliance

### 4. Continuous Improvement
Learn from usage patterns:
- Track editing patterns
- Collect user feedback
- A/B test variations
- Iterate on templates

## Technical Considerations

### Token Budget Allocation
Recommended distribution for 8K context window:
- Methodology context: 2K tokens (25%)
- Examples and templates: 2K tokens (25%)
- User inputs: 2K tokens (25%)
- Generation buffer: 2K tokens (25%)

### Provider Compatibility
Ensure prompts work across providers:
- OpenAI GPT-4
- Anthropic Claude
- Google Gemini
- Local models (Ollama)

### Performance Optimization
- Implement prompt caching
- Use streaming for long documents
- Parallelize section generation
- Optimize retrieval queries

## Success Metrics

### Quality Metrics
- Document completeness score (>90%)
- Methodology compliance rate (>95%)
- User satisfaction rating (>4.5/5)
- Manual edit percentage (<20%)

### Performance Metrics
- Generation time (<30 seconds)
- Token efficiency (>80% useful content)
- Cache hit rate (>60%)
- Error rate (<5%)

### Business Metrics
- Time saved per document (>2 hours)
- Cost per document (<$0.50)
- User adoption rate (>80%)
- Document reuse rate (>40%)

## Risk Mitigation

### Technical Risks
- **LLM API failures**: Implement fallback providers
- **Context window limits**: Use chunking strategies
- **Hallucination**: Strengthen validation checks
- **Performance issues**: Implement caching and optimization

### Quality Risks
- **Inconsistent outputs**: Standardize templates
- **Methodology violations**: Add compliance checks
- **Outdated information**: Regular knowledge base updates
- **Language barriers**: Implement localization support

## GPT-5 Specific Optimizations (2025)

### Model Characteristics and Constraints

#### Temperature Limitations
GPT-5 nano has a **critical constraint**: it only supports `temperature=1` and will error if other values are used. This impacts:
- **Consistency**: Less control over output variability
- **Creativity**: Fixed balance between creativity and determinism
- **Retry Strategy**: Cannot adjust temperature on retries

#### Reasoning Token Economics
GPT-5's reasoning process significantly impacts cost and performance:
- **Token Multiplication**: Reasoning tokens can be 5-10x the visible output
- **Cost Implications**: $10/million output tokens includes invisible reasoning
- **Example**: Simple 6-phrase list = 1659 total tokens (257 prompt, 1402 completion with 1344 reasoning)
- **Budget Planning**: Must account for 5-10x token consumption vs traditional models

#### Reasoning Effort Levels
GPT-5 nano supports four reasoning levels with distinct use cases:
```
minimal: Fast streaming, minimal reasoning (best for simple formatting)
low:     Basic reasoning, moderate latency (good for templates)
medium:  Balanced reasoning, standard latency (default for most documents)
high:    Deep reasoning, higher latency (complex analysis/synthesis)
```

### Prompt Engineering Best Practices for GPT-5

#### 1. Clarity and Precision
GPT-5's instruction-following is extremely literal, making clarity crucial:
- **Avoid Contradictions**: Contradictory instructions cause reasoning loops
- **Explicit Steps**: Number and order all instructions clearly
- **Unambiguous Language**: Remove vague terms like "maybe", "sometimes", "if possible"

#### 2. Task Decomposition Strategy
```typescript
// Bad: Vague, multi-part request
"Create a comprehensive document covering all aspects..."

// Good: Clear, decomposed steps
"1. Analyze the project scope
 2. Identify 5 key risks
 3. For each risk, provide mitigation
 4. Summarize in executive format"
```

#### 3. Structured Output Without response_format
GPT-5 models don't reliably support `response_format: { type: 'json_object' }`:
```typescript
// Instead of response_format, use explicit instructions:
"Return ONLY valid JSON with this exact structure:
{
  \"field1\": \"value\",
  \"field2\": [\"item1\", \"item2\"]
}
Do not include any markdown, backticks, or additional text."
```

#### 4. Progressive Refinement Pattern
Break complex documents into stages to manage reasoning tokens:
```typescript
Stage 1: Generate outline (reasoning_effort: 'low')
Stage 2: Expand sections (reasoning_effort: 'medium')
Stage 3: Add details (reasoning_effort: 'low')
Stage 4: Final review (reasoning_effort: 'minimal')
```

### Implementation Strategies

#### Dynamic Token Management
```typescript
interface DocumentTokenBudget {
  'charter': { max_completion_tokens: 3000, reasoning_effort: 'medium' },
  'backlog': { max_completion_tokens: 2500, reasoning_effort: 'low' },
  'risk_register': { max_completion_tokens: 3500, reasoning_effort: 'high' },
  'technical_landscape': { max_completion_tokens: 4000, reasoning_effort: 'high' },
  'comparable_projects': { max_completion_tokens: 3500, reasoning_effort: 'medium' }
}
```

#### Retry Logic with Effort Reduction
```typescript
async function generateWithRetry(prompt, initialEffort = 'medium') {
  const efforts = ['high', 'medium', 'low', 'minimal'];
  let currentEffortIndex = efforts.indexOf(initialEffort);
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generate(prompt, {
        reasoning_effort: efforts[currentEffortIndex]
      });
    } catch (error) {
      // Reduce reasoning effort on retry
      currentEffortIndex = Math.min(currentEffortIndex + 1, efforts.length - 1);
    }
  }
}
```

#### Cost Monitoring and Alerts
```typescript
interface CostEstimate {
  visibleTokens: number,
  estimatedReasoningTokens: number,
  totalTokens: number,
  estimatedCost: number,
  warning?: string
}

function estimateGPT5Cost(promptLength: number, expectedOutput: number): CostEstimate {
  const reasoningMultiplier = 5; // Conservative estimate
  const totalTokens = promptLength + (expectedOutput * reasoningMultiplier);
  const cost = (promptLength * 0.025 + totalTokens * 0.20) / 1000000;
  
  return {
    visibleTokens: expectedOutput,
    estimatedReasoningTokens: expectedOutput * (reasoningMultiplier - 1),
    totalTokens,
    estimatedCost: cost,
    warning: cost > 0.50 ? 'High cost generation' : undefined
  };
}
```

### Prompt Template Optimizations

#### Before (Generic, Potentially Contradictory):
```typescript
system: "You are an expert who might consider various approaches..."
user: "Create comprehensive documentation but keep it concise..."
```

#### After (GPT-5 Optimized):
```typescript
system: "You are an Agile Project Manager. Follow each instruction exactly."
user: `Complete these steps in order:
1. Read project data: {{projectName}}
2. Generate exactly 5 sections
3. Each section: 200-300 words
4. Use this structure: [clear template]
5. Output format: JSON only`
```

### Performance Optimization Techniques

#### 1. Prompt Compression
- Remove redundant instructions
- Use concise variable names
- Eliminate examples when pattern is clear
- Compress whitespace in templates

#### 2. Context Window Management
```typescript
// Priority-based inclusion
const contextPriority = {
  critical: ['projectName', 'vision', 'businessCase'],
  important: ['stakeholders', 'timeline', 'budget'],
  optional: ['additionalNotes', 'references']
};
```

#### 3. Parallel Generation Strategy
For independent sections, use parallel calls with minimal reasoning:
```typescript
const sections = await Promise.all([
  generateSection('executive_summary', 'minimal'),
  generateSection('technical_details', 'low'),
  generateSection('risk_assessment', 'medium')
]);
```

### Quality Assurance for GPT-5

#### Validation Checklist
- [ ] No contradictory instructions in prompts
- [ ] Clear, numbered steps for complex tasks
- [ ] Explicit output format instructions (no response_format)
- [ ] Token budget appropriate for document type
- [ ] Reasoning effort matched to complexity
- [ ] Cost estimates within acceptable range
- [ ] Retry strategy with effort reduction
- [ ] Empty response handling

#### Common GPT-5 Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty responses | Token limit hit | Reduce max_completion_tokens |
| High latency | High reasoning effort | Start with 'low' or 'minimal' |
| Excessive cost | Reasoning token explosion | Limit scope, use minimal effort |
| Format errors | response_format not supported | Use explicit JSON instructions |
| Contradictory output | Conflicting instructions | Audit and clarify prompts |

### Migration Checklist from GPT-4 to GPT-5

1. **Configuration Updates**
   - [x] Set temperature to 1 (only supported value)
   - [x] Replace max_tokens with max_completion_tokens
   - [x] Remove response_format for JSON generation
   - [x] Add reasoning_effort parameter

2. **Prompt Updates**
   - [ ] Remove contradictory instructions
   - [ ] Add explicit step-by-step decomposition
   - [ ] Simplify complex nested requests
   - [ ] Add clear output format instructions

3. **Cost Management**
   - [ ] Implement token budget limits
   - [ ] Add cost estimation warnings
   - [ ] Monitor reasoning token usage
   - [ ] Set up usage alerts

4. **Error Handling**
   - [ ] Handle empty responses gracefully
   - [ ] Implement retry with effort reduction
   - [ ] Add fallback to simpler prompts
   - [ ] Log reasoning token consumption

## Future Enhancements

### Short-term (3 months)
- Multi-language support with GPT-5 optimizations
- Custom methodology integration with reasoning controls
- Advanced analytics dashboard for token usage
- Template marketplace with GPT-5 templates

### Medium-term (6 months)
- AI-powered document review using minimal reasoning
- Automated quality scoring with cost optimization
- Predictive risk analysis with reasoning chains
- Integration with PM tools and token budgets

### Long-term (12 months)
- Custom model fine-tuning for reduced reasoning
- Real-time collaboration with streaming responses
- Automated project updates with incremental generation
- Comprehensive knowledge graph with cached reasoning

## Conclusion

This architecture represents a significant evolution in Project Genie's document generation capabilities. By combining established project management methodologies with cutting-edge LLM techniques, we can deliver high-quality, contextually relevant documentation that provides real value to project teams.

The phased implementation approach ensures we can deliver improvements iteratively while maintaining system stability. The focus on measurement and continuous improvement will ensure the system evolves to meet user needs over time.

## References and Sources

### Methodology Documentation
- PRINCE2 Wiki: https://prince2.wiki (Official PRINCE2 methodology reference)
- Scrum.org: https://www.scrum.org/resources/scrum-guide (Official Scrum Guide)
- Atlassian Agile Resources: https://www.atlassian.com/agile/scrum (Comprehensive Agile/Scrum documentation)

### LLM and RAG Research
- Prompt Engineering Guide - RAG: https://www.promptingguide.ai/research/rag (Academic research on RAG systems)
- IBM RAG vs Fine-tuning: https://www.ibm.com/think/topics/rag-vs-fine-tuning-vs-prompt-engineering (Comparison of LLM optimization techniques)
- AWS Prompt Engineering Best Practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/llm-prompt-engineering-best-practices/ (Enterprise-grade prompt engineering)

### Technical Implementation
- OpenAI Cookbook: RAG techniques and best practices
- LangChain Documentation: RAG implementation patterns
- Anthropic Claude Documentation: Prompt engineering guidelines

### Security Considerations
- OWASP GenAI Security: https://genai.owasp.org/llmrisk/llm01-prompt-injection/ (Prompt injection risks)
- AWS Prescriptive Guidance: Common prompt injection attacks and mitigations

---

*Document Version: 1.0*  
*Last Updated: 2025-01-25*  
*Author: Project Genie Architecture Team*