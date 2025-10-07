# GPT-5 Agile Document Generation Issue

## Current Status: BROKEN ❌
**Date Identified:** October 7, 2025
**Severity:** HIGH - All 3 Agile documents failing in production

---

## The Problem

### Failing Documents
1. **Project Charter** - 405 error
2. **Product Backlog** - "Personal data pattern detected" error
3. **Sprint Plan** - 405 error ("LLM provider error: 405 status code (no body)")

### Working Documents (For Comparison)
1. **PRINCE2 PID** - ✅ Works perfectly
2. **Business Case** - ✅ Works perfectly

---

## Root Cause Analysis

### Architecture Comparison

#### ✅ PRINCE2 Documents (WORKING)
```typescript
// Location: lib/documents/generator.ts:1278-1355
private async generatePrince2PID() {
  // Uses: StructuredDocumentGenerator class
  const result = await this.structuredGenerator.generatePID(data, projectId)

  // Model: GPT-4o-mini (line 76)
  // Method: chat.completions.parse with zodResponseFormat
  // API: OpenAI Chat Completions API
  // Has: Fallback to sectioned generator if fails
}
```

**Why It Works:**
- Uses stable GPT-4o-mini model
- Uses OpenAI's `chat.completions.parse` method
- Has `zodResponseFormat` for guaranteed schema adherence
- Robust error handling with fallback mechanisms

#### ❌ Agile Documents (BROKEN)
```typescript
// Location: lib/documents/generator.ts:1068-1273

// Charter & Backlog:
private async generateAgileCharter() {
  const content = await this.gateway.generateJSON(optimizedPrompt, AgileCharterSchema)
  // Uses: GPT-5-mini via gateway
  // Method: gateway.generateJSON() → Responses API (responses.create)
  // No fallback
}

// Sprint Plan (WORST):
private async generateSprintPlan() {
  const metricsResponse = await this.gateway.generateTextWithMetrics(prompt)
  // Uses: GPT-5-mini via gateway
  // Method: gateway.generateTextWithMetrics() → Responses API
  // Returns: Plain text wrapped in object
  // No structured output!
}
```

**Why It Fails:**

1. **GPT-5 Responses API Limitations:**
   - The `responses.create` endpoint has different capabilities than `chat.completions.parse`
   - May not support all operations (evidenced by 405 errors)
   - Text generation via Responses API is less stable

2. **No Structured Output for Sprint Plan:**
   - Sprint Plan uses `generateTextWithMetrics()` which returns plain text
   - Plain text is then wrapped in `{ plan: content }`
   - No schema validation or structure enforcement

3. **No Fallback Mechanisms:**
   - PRINCE2 has fallback to `sectionedGenerator`
   - Agile documents have no fallback - they just fail

4. **Security False Positives:**
   - Some prompts trigger PII detection despite being sanitized
   - Likely related to how GPT-5 prompts are formatted

---

## Why We're Using Different Models

**Comment in code (line 73-76):**
```typescript
// Use GPT-4o-mini for structured documents (PID & Business Case)
// GPT-4o supports zodResponseFormat for guaranteed schema adherence
// GPT-5 models cause truncation issues with large complex schemas
this.structuredGenerator = new StructuredDocumentGenerator(undefined, 'gpt-4o-mini')
```

**The Tradeoff:**
- **GPT-4o:** Reliable structured outputs, but more expensive
- **GPT-5:** Cheaper, better reasoning, BUT incompatible with some operations

---

## TEMPORARY FIX (Current Implementation)

### What We Did
Convert Agile documents to use the same architecture as PRINCE2:

1. ✅ Add methods to `StructuredDocumentGenerator`:
   - `generateAgileCharter()`
   - `generateProductBacklog()`
   - `generateSprintPlan()`

2. ✅ Update `DocumentGenerator` to delegate to structured generator

3. ✅ Use GPT-4o-mini for ALL documents (consistent model)

### Why This Is a "Hack"
- Forces use of more expensive GPT-4o-mini model
- Doesn't utilize GPT-5's superior reasoning capabilities
- Doesn't take advantage of GPT-5's cost savings
- Band-aid solution rather than fixing the underlying GPT-5 integration

---

## PROPER FIX (To Be Implemented)

### Goal
Get GPT-5 Responses API working correctly for Agile documents while maintaining cost efficiency.

### Investigation Needed

#### 1. Understand GPT-5 Responses API Limitations
**Questions to Answer:**
- What HTTP methods does `responses.create` support?
- Why are we getting 405 errors?
- Is there a content type or header mismatch?
- Does Responses API support structured JSON output?
- Can we use Zod schemas with Responses API?

**Action Items:**
```typescript
// Test in isolation:
- Create test script for GPT-5 Responses API
- Test plain text generation
- Test JSON generation with schema
- Test different HTTP configurations
- Document what works and what doesn't
```

#### 2. Fix Sprint Plan to Use Structured Output
**Current State:** Returns plain text wrapped in object
**Target State:** Return properly structured JSON with schema validation

**Create:** `lib/documents/schemas/sprint-plan-schema.ts`
```typescript
import { z } from 'zod'

export const SprintPlanSchema = z.object({
  sprintNumber: z.number(),
  sprintGoal: z.string(),
  duration: z.string(),
  capacity: z.object({
    totalHours: z.number(),
    availableTeamMembers: z.number()
  }),
  backlogItems: z.array(z.object({
    id: z.string(),
    title: z.string(),
    storyPoints: z.number(),
    priority: z.enum(['high', 'medium', 'low']),
    assignee: z.string()
  })),
  dailyStandups: z.object({
    time: z.string(),
    duration: z.string()
  }),
  retrospective: z.object({
    plannedDate: z.string(),
    format: z.string()
  })
})
```

#### 3. Create Proper GPT-5 Structured Generator
**New File:** `lib/documents/gpt5-structured-generator.ts`

```typescript
/**
 * GPT-5 Structured Generator
 * Uses Responses API with proper schema handling
 */
export class GPT5StructuredGenerator {
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey })
  }

  /**
   * Generate structured output using GPT-5 Responses API
   * Need to research: How to enforce schema with responses.create
   */
  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    config: {
      model: string,
      reasoningEffort?: 'low' | 'medium' | 'high'
    }
  ): Promise<T> {
    // TODO: Research proper way to enforce schema with Responses API
    // Options:
    // 1. JSON mode with schema in prompt
    // 2. Post-generation validation
    // 3. Hybrid approach

    const response = await this.client.responses.create({
      model: config.model,
      input: this.buildSchemaPrompt(prompt, schema),
      text: { verbosity: 'high' },
      reasoning: { effort: config.reasoningEffort || 'medium' },
      // TODO: How to enforce schema here?
    })

    // Parse and validate
    const parsed = JSON.parse(response.output_text)
    return schema.parse(parsed) // Validate with Zod
  }

  private buildSchemaPrompt<T>(prompt: string, schema: z.ZodSchema<T>): string {
    // TODO: Convert Zod schema to JSON schema description
    // Include in prompt to guide GPT-5 output
    return `${prompt}\n\nRETURN VALID JSON MATCHING THIS SCHEMA:\n${schemaDescription}`
  }
}
```

#### 4. Fix PII Detection for GPT-5 Prompts
**Issue:** GPT-5 Responses API may format prompts differently, triggering false positives

**Investigation:**
```typescript
// Add comprehensive logging:
console.log('[GPT5-DEBUG] Full prompt being validated:', prompt)
console.log('[GPT5-DEBUG] Prompt length:', prompt.length)
console.log('[GPT5-DEBUG] Contains "this is"?', /this is/i.test(prompt))
console.log('[GPT5-DEBUG] Contains "I am"?', /I am/i.test(prompt))

// Test with actual GPT-5 formatted prompts
```

#### 5. Add Fallback Mechanisms
**Target:** Match PRINCE2 reliability

```typescript
private async generateAgileCharterWithFallback() {
  try {
    // Try GPT-5 Responses API first (cost-efficient)
    return await this.gpt5Generator.generateAgileCharter(data)
  } catch (error) {
    console.warn('GPT-5 failed, falling back to GPT-4o:', error)
    // Fallback to GPT-4o structured generator
    return await this.structuredGenerator.generateAgileCharter(data)
  }
}
```

---

## Research Tasks

### 1. OpenAI API Documentation Review
- [ ] Read official docs for `responses.create` endpoint
- [ ] Understand supported HTTP methods
- [ ] Check for JSON schema support
- [ ] Review error codes and meanings

### 2. Test GPT-5 Responses API Capabilities
- [ ] Create isolated test script
- [ ] Test plain text generation ✅ or ❌
- [ ] Test JSON generation ✅ or ❌
- [ ] Test with Zod schemas ✅ or ❌
- [ ] Test with different HTTP configurations
- [ ] Document 405 error triggers

### 3. Analyze Prompt Formatting Differences
- [ ] Compare GPT-4o vs GPT-5 prompt structures
- [ ] Check if Responses API requires different format
- [ ] Test PII detection with actual GPT-5 prompts
- [ ] Document any special requirements

### 4. Cost-Benefit Analysis
- [ ] Calculate cost difference: GPT-4o-mini vs GPT-5-mini
- [ ] Measure quality difference (if any)
- [ ] Determine if GPT-5 savings justify the effort

---

## Testing Checklist (Before Enabling GPT-5)

### Local Tests
- [ ] Create test project with Agile methodology
- [ ] Generate Project Charter with GPT-5
- [ ] Generate Product Backlog with GPT-5
- [ ] Generate Sprint Plan with GPT-5
- [ ] Verify structured output format
- [ ] Verify PII sanitization works
- [ ] Test error handling and fallbacks

### Production Validation
- [ ] Deploy to staging first
- [ ] Generate all 3 Agile documents
- [ ] Verify display formatting
- [ ] Check database storage
- [ ] Monitor error logs
- [ ] Compare output quality with GPT-4o

---

## Success Criteria

A proper GPT-5 fix is achieved when:

✅ All 3 Agile documents generate successfully with GPT-5-mini
✅ Structured JSON output with schema validation
✅ No 405 errors or API incompatibility
✅ PII detection doesn't block legitimate prompts
✅ Fallback to GPT-4o if GPT-5 fails
✅ Cost savings realized (vs GPT-4o-mini)
✅ Output quality matches or exceeds GPT-4o
✅ Production deployment successful
✅ Zero document generation failures

---

## Cost Analysis (Motivation for Fix)

### Current (Temporary Fix - GPT-4o-mini)
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- Average document: ~5,000 input + ~2,000 output tokens
- **Cost per document:** ~$0.002

### Target (GPT-5-mini)
- Input: $0.025 per 1M tokens
- Output: $0.200 per 1M tokens
- Same token usage
- **Cost per document:** ~$0.0005

**Savings:** 75% reduction in document generation costs

**Annual Impact (assuming 10,000 documents/month):**
- Current: $240/year
- With GPT-5: $60/year
- **Savings: $180/year**

---

## Timeline

### Phase 1: Research (2-4 hours)
- Complete OpenAI API research
- Test GPT-5 capabilities in isolation
- Document findings

### Phase 2: Implementation (4-6 hours)
- Create GPT-5 structured generator
- Add Sprint Plan schema
- Update generator methods
- Add fallback mechanisms

### Phase 3: Testing (2-3 hours)
- Local testing with all scenarios
- Staging deployment
- Production validation

### Phase 4: Monitoring (ongoing)
- Track success rates
- Monitor error logs
- Compare costs

**Total Estimated Effort:** 8-13 hours

---

## Files Affected

### To Modify
- `lib/documents/generator.ts` - Update Agile generation methods
- `lib/llm/providers/vercel-ai.ts` - Fix Responses API usage
- `lib/llm/gateway.ts` - Handle GPT-5 properly

### To Create
- `lib/documents/gpt5-structured-generator.ts` - New class
- `lib/documents/schemas/sprint-plan-schema.ts` - New schema
- `lib/documents/schemas/product-backlog-schema.ts` - New schema (if not exists)
- `test-gpt5-responses-api.ts` - Test script

### To Test
- All Agile document generation paths
- Fallback mechanisms
- Error handling
- PII detection

---

## Notes

- **Current temporary fix is ACCEPTABLE for production** - uses proven GPT-4o-mini
- **Proper fix is an OPTIMIZATION** - not urgent, but valuable for cost savings
- **Don't rush the GPT-5 fix** - better to have reliable GPT-4o than broken GPT-5
- **Consider if GPT-5 is worth it** - 75% cost savings may justify the effort

---

## Related Issues

- Charter display schema mismatch (FIXED: commit 848af3a)
- Prompt enhancement TypeError (FIXED: commit 482ddbc)
- Sprint Plan metadata type bug (FIXED: commit 47a5664)
- PII detection false positive (FIXED: commit 2643066)

---

**Last Updated:** October 7, 2025
**Status:** Temporary fix implemented, proper fix pending research
