# API Integration Guide

## GPT-5 Models via Vercel AI Gateway

### 🚨 CRITICAL: GPT-5 API Bug - MUST USE RESPONSES API
**GPT-5 models have a KNOWN BUG with the Chat Completions API that causes empty responses!**

#### The Problem (Discovered 2025-08-26):
When GPT-5 models (gpt-5, gpt-5-mini, gpt-5-nano) are used with `chat.completions.create()`:
- ALL tokens are allocated to internal `reasoning_tokens`
- The actual response content is EMPTY
- This happens even with simple prompts
- The API call succeeds but returns no usable content

#### The Solution: Use Responses API
GPT-5 models MUST use the `client.responses.create()` API instead:

```javascript
// ❌ WRONG - Returns empty responses with GPT-5
const response = await client.chat.completions.create({
  model: 'gpt-5-mini',
  messages: [...],
  temperature: 1,
  max_completion_tokens: 200
})
// Result: response.choices[0].message.content = "" (empty!)

// ✅ CORRECT - Works perfectly with GPT-5
const response = await client.responses.create({
  model: 'gpt-5-mini',
  input: 'Your prompt here',
  text: { verbosity: 'high' },
  reasoning: { effort: 'minimal' },
  max_output_tokens: 200
})
// Result: response.output_text contains the actual response
```

#### Test Results:
- Chat Completions API: Empty responses, all tokens go to reasoning
- Responses API: Works perfectly, 2-3 second response times
- GPT-4 models: Work fine with both APIs

### Important: GPT-5 Models via Vercel AI Gateway
GPT-5 models (gpt-5, gpt-5-mini, gpt-5-nano) are available **exclusively through Vercel AI Gateway**, not directly via OpenAI API.

#### Key Points:
- **DO NOT change models without permission** - Always ask before switching models
- GPT-5 nano is the most cost-efficient option ($0.025 input, $0.20 output per 1M tokens)
- GPT-5 models work locally with OpenAI SDK but require Vercel AI Gateway for Vercel deployments
- Reference: https://vercel.com/changelog/gpt-5-gpt-5-mini-and-gpt-5-nano-are-now-available-in-vercel-ai-gateway

#### Using GPT-5 Models with Vercel AI SDK (Required for Vercel deployments):
```javascript
// Via Vercel AI SDK v5
import { streamText } from 'ai'

const result = streamText({
  model: "openai/gpt-5-nano", // or openai/gpt-5-mini, openai/gpt-5
  prompt: "Your prompt here"
})
```

## 🎯 GPT-5 (DEFAULT) vs GPT-4.1 Model Selection Guide

### 🚨 IMPORTANT: GPT-5 is ALWAYS the DEFAULT choice

### When to Use Each Model Family

#### Use GPT-5 Models (DEFAULT - gpt-5-nano, gpt-5-mini, gpt-5) for:
- **ALL general tasks** (this is the default choice)
- **Narrative Documents** (Risk Register, Project Plans, Communication Plans)
- **Creative content** requiring nuanced writing
- **Analysis and insights** with detailed explanations
- **Long-form content** with flowing narrative structure
- **Strategic recommendations** requiring reasoning
- **Web Search Tasks** - GPT-5 models have native web search support
- **Company Intelligence** and market research

**Why:** GPT-5 is the primary model family with superior reasoning and web search capabilities. Always use GPT-5 unless you specifically need structured data output.

#### Use GPT-4.1 Models (ONLY for specific cases - gpt-4.1-nano, gpt-4.1-mini) for:
- **Structured Documents ONLY** with complex schemas (PID, Business Case)
- **Form-like outputs** requiring strict field validation
- **JSON generation** with guaranteed schema adherence via `zodResponseFormat`
- **Data transformation** tasks requiring consistent structure
- **API responses** that must conform to specific formats

**Why:** GPT-4.1 models support `chat.completions.parse` with `zodResponseFormat` for guaranteed structured outputs. ONLY use when structured data is critical.

### 💰 Cost Optimization Strategy

#### Model Pricing Comparison (per 1M tokens):
| Model | Input | Output | Best For |
|-------|--------|---------|----------|
| gpt-5-nano | $0.025 | $0.20 | DEFAULT for dev/testing |
| gpt-5-mini | $0.25 | $2.00 | DEFAULT for production |
| gpt-5 | $0.50 | $4.00 | Premium features |
| gpt-4.1-nano | $0.075 | $0.30 | Structured data only (dev) |
| gpt-4.1-mini | $0.15 | $0.60 | Structured data only (prod) |

**Recommendation:** Always use GPT-5 nano for development/testing, GPT-5 mini for production. Only use GPT-4.1 when structured data output is critical.

### 📋 Document-to-Model Mapping

| Document Type | Recommended Model | Reasoning |
|--------------|-------------------|-----------|
| PID | gpt-4.1-nano/mini | Complex nested schema, needs zodResponseFormat |
| Business Case | gpt-4.1-nano/mini | Structured financial data, strict validation |
| Risk Register | gpt-5-nano/mini | Narrative risk descriptions and analysis |
| Project Plan | gpt-5-nano/mini | Strategic planning and timeline narrative |
| Communication Plan | gpt-5-nano/mini | Stakeholder analysis and engagement strategies |
| Quality Management | gpt-5-nano/mini | Process descriptions and standards |
| Technical Landscape | gpt-5-nano/mini | Technical analysis and architecture description |
| Comparable Projects | gpt-5-nano/mini | Case studies and comparative analysis |

## 🚨 CRITICAL: Structured Outputs Requirements

When using OpenAI's Structured Outputs feature for reliable JSON generation:

### MUST DO:
1. **Use `zodResponseFormat` helper** from `openai/helpers/zod` for proper schema enforcement
2. **Set `strict: true`** in the schema configuration for guaranteed adherence
3. **Set `additionalProperties: false`** on ALL object schemas
4. **Define proper types for EVERY field** - NEVER use `z.any()`
5. **Make all fields required** - use union with `null` for optional fields

### Example Implementation:
```typescript
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.union([z.string().email(), z.null()]), // Optional field pattern
  metadata: z.object({
    created: z.string(),
    tags: z.array(z.string())
  }).strict() // Set strict on nested objects too
}).strict()

const response = await openai.chat.completions.parse({
  model: 'gpt-4.1-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: zodResponseFormat(schema, 'user_data')
})
```

### Key Requirements:
- Use `zodResponseFormat` for GPT-4.1 structured outputs
- Set `strict: true` and `additionalProperties: false`
- Never use `z.any()` - define proper types for every field
- Make all fields required (use union with null for optional)

## Known Issues and Solutions

### Issue: PID/Business Case Generation Failures with GPT-5
**Symptom:** JSON parsing errors, truncated responses, `[object Object]` in output
**Cause:** GPT-5's `responses.create` API returns plain text that gets truncated for large schemas
**Solution:** Use GPT-4.1 models with `zodResponseFormat` for these structured documents ONLY

### Issue: Empty Responses from GPT-5 with Chat Completions
**Symptom:** All tokens allocated to reasoning_tokens, empty content
**Cause:** Known bug with GPT-5 models using chat.completions.create
**Solution:** Always use `responses.create` API for GPT-5 models

### Web Search with GPT-5 Models
**Format:** Use `{ type: 'web_search' }` tool definition
**Response:** Returns array with `web_search_call` and `message` items
**Citations:** Available in message annotations

## API Integration Best Practices

### 1. Error Handling
```typescript
try {
  const response = await client.responses.create({...})
  if (!response.output_text) {
    throw new Error('Empty response from GPT-5')
  }
} catch (error) {
  permanentLogger.captureError('API_GPT5', error as Error, {
    model: 'gpt-5-mini',
    stage: 'generation'
  })
  throw error
}
```

### 2. Rate Limiting
- Implement exponential backoff
- Track token usage per request
- Use lower-cost models for development

### 3. Response Validation
- Always validate structured outputs
- Check for empty responses
- Verify token allocation

### 4. Model Selection Logic
```typescript
function selectModel(taskType: string): string {
  switch (taskType) {
    case 'structured_data':
      return 'gpt-4.1-mini'
    case 'narrative':
    case 'analysis':
    default:
      return 'gpt-5-mini'
  }
}
```

## Stripe Integration

**Status**: Fully configured with Basic ($19/mo) and Premium ($49/mo) plans
**Webhook Testing**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
**Environment Variables**: Already set in .env.local (publishable key, secret key, webhook secret, price IDs)

### Available Stripe Tools
- Search documentation
- Create customers and products
- Manage subscriptions
- Process payments
- Handle refunds
- Manage disputes

### Webhook Implementation
```typescript
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful checkout
        break
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break
    }
    
    return NextResponse.json({ received: true })
  } catch (err) {
    permanentLogger.captureError('STRIPE_WEBHOOK', err as Error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }
}
```
