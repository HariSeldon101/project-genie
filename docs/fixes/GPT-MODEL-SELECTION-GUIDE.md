# GPT Model Selection Guide for Project Genie

## Executive Summary

This guide documents the optimal model selection strategy for Project Genie, based on extensive testing and debugging of document generation issues. The key finding is that GPT-4o models should be used for structured documents requiring strict schema adherence, while GPT-5 models excel at narrative and creative content.

## Model Capabilities Comparison

### GPT-4o Family (gpt-4o-nano, gpt-4o-mini, gpt-4o)

**Strengths:**
- Native support for `zodResponseFormat` via `chat.completions.parse`
- Guaranteed structured JSON output matching Zod schemas
- No truncation issues with large, complex schemas
- Deterministic field generation
- Excellent for form-like documents

**Limitations:**
- Less creative in narrative generation
- More rigid in content structure
- Higher cost per token than GPT-5 nano

**API Pattern:**
```typescript
// GPT-4o uses chat.completions.parse with zodResponseFormat
const response = await openai.chat.completions.parse({
  model: 'gpt-4o-nano',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  response_format: zodResponseFormat(MySchema, 'schema_name'),
  temperature: 0.5,
  max_tokens: 4000
})
// Guaranteed to match schema or throw error
const parsed = response.choices[0].message.parsed
```

### GPT-5 Family (gpt-5-nano, gpt-5-mini, gpt-5)

**Strengths:**
- Superior creative and analytical capabilities
- Better contextual understanding
- More nuanced narrative generation
- Excellent reasoning for complex analysis
- Lower cost (especially nano variant)

**Limitations:**
- Requires `responses.create` API (no native structured output)
- Prone to JSON truncation with large schemas
- Manual JSON parsing required
- Known bug with `chat.completions.create` (returns empty content)

**API Pattern:**
```typescript
// GPT-5 MUST use responses.create API
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: combinedPrompt,
  text: { verbosity: 'high' },
  reasoning: { effort: 'minimal' },
  max_output_tokens: 4000
})
// Manual JSON parsing required
const content = JSON.parse(response.output_text)
```

## Document Type Recommendations

### Use GPT-4o for Structured Documents

These documents have complex nested schemas requiring guaranteed structure:

| Document | Model | Reasoning |
|----------|-------|-----------|
| **Project Initiation Document (PID)** | gpt-4o-nano | 10+ nested sections, strict PRINCE2 schema |
| **Business Case** | gpt-4o-nano | Financial data, ROI calculations, structured analysis |
| **Product Backlog** | gpt-4o-nano | Structured user stories with acceptance criteria |
| **Sprint Plan** | gpt-4o-nano | Time-boxed tasks with dependencies |

### Use GPT-5 for Narrative Documents

These documents benefit from creative analysis and flowing narrative:

| Document | Model | Reasoning |
|----------|-------|-----------|
| **Risk Register** | gpt-5-nano | Risk analysis requires nuanced understanding |
| **Project Plan** | gpt-5-nano | Strategic narrative with timeline storytelling |
| **Communication Plan** | gpt-5-nano | Stakeholder psychology and engagement strategies |
| **Quality Management** | gpt-5-nano | Process descriptions and best practices |
| **Technical Landscape** | gpt-5-mini | Deep technical analysis and architecture insights |
| **Comparable Projects** | gpt-5-mini | Case study analysis and pattern recognition |

## Cost Optimization Strategy

### Development/Testing Phase
- Use `gpt-4o-nano` for structured documents ($0.50/$2.00 per 1M tokens)
- Use `gpt-5-nano` for narrative documents ($0.05/$0.40 per 1M tokens)
- Total estimated cost per full project generation: ~$0.02

### Production Phase
- Consider `gpt-4o-mini` for critical structured documents if quality issues arise
- Upgrade to `gpt-5-mini` for premium narrative quality
- Estimated cost per full project generation: ~$0.08

### Cost Comparison Table

| Model | Input (per 1M) | Output (per 1M) | Use Case |
|-------|---------------|-----------------|----------|
| gpt-4o-nano | $0.50 | $2.00 | Dev/test structured docs |
| gpt-4o-mini | $1.50 | $6.00 | Production structured docs |
| gpt-4o | $2.50 | $10.00 | Premium structured docs |
| gpt-5-nano | $0.05 | $0.40 | Dev/test narrative docs |
| gpt-5-mini | $0.25 | $2.00 | Production narrative docs |
| gpt-5 | $1.00 | $3.00 | Premium narrative docs |

## Implementation Patterns

### Pattern 1: Structured Document Generation (GPT-4o)

```typescript
class StructuredDocumentGenerator {
  async generatePID(data: ProjectData): Promise<PIDDocument> {
    // Use GPT-4o with zodResponseFormat for guaranteed structure
    const response = await openai.chat.completions.parse({
      model: 'gpt-4o-nano',  // or gpt-4o-mini for production
      messages: [
        { role: 'system', content: pidSystemPrompt },
        { role: 'user', content: buildUserPrompt(data) }
      ],
      response_format: zodResponseFormat(PIDSchema, 'pid'),
      temperature: 0.5,
      max_tokens: 4000
    })
    
    // Response is guaranteed to match schema
    return response.choices[0].message.parsed as PIDDocument
  }
}
```

### Pattern 2: Narrative Document Generation (GPT-5)

```typescript
class NarrativeDocumentGenerator {
  async generateRiskRegister(data: ProjectData): Promise<RiskRegister> {
    // Use GPT-5 for creative risk analysis
    const response = await openai.responses.create({
      model: 'gpt-5-nano',  // or gpt-5-mini for production
      input: buildCombinedPrompt(data),
      text: { verbosity: 'high' },
      reasoning: { effort: 'medium' },  // Higher for complex analysis
      max_output_tokens: 8000
    })
    
    // Parse and validate manually
    const content = JSON.parse(response.output_text)
    return validateWithZod(content, RiskRegisterSchema)
  }
}
```

### Pattern 3: Hybrid Approach (Recommended)

```typescript
class DocumentGenerator {
  private structuredGen: StructuredDocumentGenerator
  private narrativeGen: NarrativeDocumentGenerator
  
  constructor() {
    // GPT-4o for structured docs
    this.structuredGen = new StructuredDocumentGenerator('gpt-4o-nano')
    // GPT-5 for narrative docs
    this.narrativeGen = new NarrativeDocumentGenerator('gpt-5-nano')
  }
  
  async generateDocument(type: string, data: ProjectData) {
    // Route to appropriate generator based on document type
    if (['pid', 'business_case', 'backlog'].includes(type)) {
      return this.structuredGen.generate(type, data)
    } else {
      return this.narrativeGen.generate(type, data)
    }
  }
}
```

## Troubleshooting Guide

### Issue: PID/Business Case Showing [object Object]
**Cause:** Using GPT-5 with manual JSON parsing on complex schemas
**Solution:** Switch to GPT-4o with zodResponseFormat

### Issue: JSON Parsing Errors
**Symptom:** "Expected ',' or ']' after array element"
**Cause:** GPT-5 response truncation on large schemas
**Solution:** Use GPT-4o or break document into sections

### Issue: Empty Response Content
**Symptom:** All tokens go to reasoning_tokens, content is empty
**Cause:** Known GPT-5 bug with chat.completions API
**Solution:** Must use responses.create for GPT-5

### Issue: High Generation Costs
**Cause:** Using mini/full models in development
**Solution:** Use nano variants for dev/test, upgrade for production

## Migration Strategy

### Phase 1: Immediate Fix (Current)
1. Switch PID and Business Case to gpt-4o-nano
2. Keep other documents on current models
3. Test and validate output quality

### Phase 2: Optimization (Next Sprint)
1. Audit all document generation for model fit
2. Implement hybrid generator pattern
3. Add model selection configuration

### Phase 3: Advanced Features (Future)
1. Dynamic model selection based on document complexity
2. Quality scoring and automatic model upgrade
3. Cost tracking and optimization dashboard

## Best Practices

### DO:
- ✅ Use GPT-4o for documents with strict schemas
- ✅ Use GPT-5 for creative and analytical content
- ✅ Start with nano variants for cost optimization
- ✅ Implement proper error handling for both APIs
- ✅ Cache generated documents to avoid regeneration

### DON'T:
- ❌ Use GPT-5 with chat.completions.create
- ❌ Try to parse truncated JSON from GPT-5
- ❌ Use GPT-5 for deeply nested schemas
- ❌ Mix model types within a single document
- ❌ Use production models for development

## Conclusion

The optimal strategy for Project Genie is a hybrid approach:
- **GPT-4o-nano** for structured documents (PID, Business Case)
- **GPT-5-nano** for narrative documents (all others)

This provides the best balance of:
- Output quality (structured accuracy + creative narrative)
- Cost efficiency (nano variants reduce costs by 60-80%)
- Reliability (no truncation or parsing issues)
- Maintainability (clear model-to-document mapping)

## References

- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs)
- [Vercel AI Gateway GPT-5 Announcement](https://vercel.com/changelog/gpt-5-gpt-5-mini-and-gpt-5-nano-are-now-available-in-vercel-ai-gateway)
- [Zod Documentation](https://zod.dev/)
- Project Genie Testing Results (2025-08-28)