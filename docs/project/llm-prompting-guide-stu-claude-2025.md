# LLM Prompting Guide - Stu & Claude 2025

**Last Updated:** 2025-08-28  
**Version:** 1.0  
**Purpose:** Comprehensive guide for working with OpenAI API to generate high-quality prompts at the lowest cost

## 🚫 Critical DO NOTs

### 1. **DO NOT Use Chat Completions API with GPT-5 Models**
- **NEVER** use `chat.completions.create()` with GPT-5 models - it causes empty responses
- All tokens get allocated to internal `reasoning_tokens` with no usable output
- This is a KNOWN BUG discovered on 2025-08-26

### 2. **DO NOT Switch Models Without Permission**
- Always stick to GPT-5 models or higher unless explicitly approved
- GPT-5 nano is the most cost-efficient ($0.025 input, $0.20 output per 1M tokens)

### 3. **DO NOT Increase Timeouts as a Solution**
- Timeout increases are a symptom of underlying code issues, not a fix
- Always investigate the root cause first

### 4. **DO NOT Skip Schema Validation**
- Never assume the model will follow your intended format without structured outputs
- Always use strict JSON schema validation when structure matters

### 5. **DO NOT Use anyOf at Root Level**
- Root objects in schemas must be objects, not anyOf types
- This is a hard limitation of Structured Outputs

### 6. **DO NOT Ignore Refusals**
- Always handle safety refusals programmatically
- Check for the `refusal` field in responses

### 7. **DO NOT Forget Required Fields**
- All fields in Structured Outputs must be marked as required
- Use union types with `null` for optional fields

### 8. **DO NOT Mix Static and Variable Content**
- Keep static content (instructions, examples) at the beginning
- Variable content (user input) should come at the end for optimal caching

## ✅ Critical MUST DOs

### 1. **MUST Use Responses API for GPT-5 Models**
```javascript
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

### 2. **MUST Structure Prompts for Caching**
- Place static content at the beginning (>1024 tokens for automatic caching)
- 50% discount on cached tokens, up to 80% latency reduction
- Cache persists for 5-10 minutes (up to 1 hour during off-peak)

### 3. **MUST Use Structured Outputs for JSON**
- Always use `strict: true` for guaranteed schema adherence
- 100% accuracy on complex JSON schema following (vs <40% without)
- Available for gpt-4o-2024-08-06 and later

### 4. **MUST Set additionalProperties: false**
- Required for all objects in Structured Outputs
- Ensures no unexpected keys in response

### 5. **MUST Handle Edge Cases**
```javascript
if (response.status === "incomplete") {
  // Handle max_output_tokens or content_filter
}
if (response.output[0].content[0].type === "refusal") {
  // Handle safety refusals
}
```

### 6. **MUST Use Message Roles Appropriately**
- `developer`: System rules and business logic (highest priority)
- `user`: End-user input (lower priority than developer)
- `assistant`: Model-generated responses

### 7. **MUST Monitor Token Usage**
- Track `cached_tokens` field for cost optimization
- Use `max_output_tokens` to control costs
- Consider token limits for context window (100k to 1M+ tokens)

## 📋 Prompt Engineering Best Practices

### Message Structure (GPT-5 Optimized)

```text
# Identity
[Define purpose, communication style, and goals]

# Instructions
[Explicit rules, workflows, and constraints]
* What the model MUST do
* What the model MUST NOT do
* Specific formatting requirements

# Examples
<user_query>
[Example input]
</user_query>

<assistant_response>
[Expected output]
</assistant_response>

# Context
[Additional information, data, or resources]
```

### GPT-5 Specific Guidelines

#### For Coding Tasks
```javascript
const response = await client.responses.create({
  model: "gpt-5",
  instructions: `
    You are a world-class software engineer.
    
    Requirements:
    - Define clear agent role and responsibilities
    - Enforce structured tool use with examples
    - Require thorough testing for correctness
    - Generate clean, semantic markdown
    
    Workflow:
    1. Plan the solution
    2. Implement with best practices
    3. Test thoroughly
    4. Document clearly
  `,
  input: userRequest,
  reasoning: { effort: "medium" }
});
```

#### For Front-End Development
- **Recommended Libraries**: Tailwind CSS, shadcn/ui, Radix Themes
- **Icons**: Lucide, Material Symbols, Heroicons  
- **Animation**: Motion (not Framer Motion for GPT-5)

#### For Agentic Tasks
```text
Remember, you are an agent - keep going until the query is completely resolved.
Decompose into sub-tasks and confirm each is completed.
Plan extensively before function calls.
Reflect on outcomes after each step.
```

## 🔧 Structured Outputs Implementation

### Critical Requirements for Structured Outputs
- **MUST use `zodResponseFormat` helper** for proper schema enforcement with OpenAI API
- **MUST set `strict: true`** in the schema configuration for guaranteed adherence
- **MUST set `additionalProperties: false`** on all object schemas
- **NEVER use `z.any()`** - define proper types for every field
- **All fields must be required** - use union with `null` for optional fields

### Using Pydantic (Python)
```python
from pydantic import BaseModel

class ResponseSchema(BaseModel):
    title: str
    items: list[str]
    metadata: dict[str, str]

response = client.responses.parse(
    model="gpt-4o-2024-08-06",
    input=messages,
    text_format=ResponseSchema
)
```

### Using Zod (JavaScript) - CORRECT Implementation
```javascript
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Define schema with proper types (no z.any())
const ResponseSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
  metadata: z.record(z.string()),
  optionalField: z.union([z.string(), z.null()]) // For optional fields
});

// Use with OpenAI Chat Completions API
const response = await openai.chat.completions.parse({
  model: "gpt-4o-2024-08-06",
  messages: messages,
  response_format: zodResponseFormat(ResponseSchema, "response_name") // Proper zodResponseFormat usage
});

// For GPT-5 models with proper structured output
const gpt5Response = await client.responses.create({
  model: "gpt-5-mini",
  input: combinedInput,
  text: {
    format: {
      type: "json_schema",
      name: "schema_name",
      strict: true, // CRITICAL: Must be true
      schema: {
        type: "object",
        properties: {
          // Define all properties
        },
        required: ["field1", "field2"], // All fields required
        additionalProperties: false // CRITICAL: Must be false
      }
    }
  }
});
```

### Schema Best Practices
- **Define explicit types**: Never use `any` or loose typing
- **Add descriptions**: Guide the model with clear field descriptions
- **Use enums for constraints**: Limit values to valid options
- **Validate nested objects**: Each level needs proper schema
- **Test with sample data**: Validate schemas before deployment

### Common Pitfalls to Avoid
```javascript
// ❌ WRONG - Using z.any()
const BadSchema = z.object({
  data: z.any() // This defeats structured outputs!
});

// ✅ CORRECT - Define proper structure
const GoodSchema = z.object({
  data: z.object({
    id: z.string(),
    value: z.number(),
    items: z.array(z.string())
  })
});

// ❌ WRONG - Missing strict and additionalProperties
const BadConfig = {
  type: "json_schema",
  schema: { /* ... */ }
};

// ✅ CORRECT - Proper configuration
const GoodConfig = {
  type: "json_schema",
  strict: true,
  schema: {
    type: "object",
    properties: { /* ... */ },
    additionalProperties: false,
    required: [/* all fields */]
  }
};
```

### Schema Limitations
- Max 5000 properties, 10 levels of nesting
- Max 120,000 chars for all property names combined
- Max 1000 enum values across all properties
- No `allOf`, `not`, `dependentRequired` support

## 💰 Cost Optimization Strategies

### 1. Prompt Caching
```javascript
// Structure for optimal caching
const response = await client.responses.create({
  model: "gpt-5-nano",  // Cheapest GPT-5 model
  instructions: staticInstructions,  // >1024 tokens, placed first
  input: userSpecificInput,  // Variable content last
});
```

### 2. Model Selection by Use Case
| Use Case | Model | Cost | Speed |
|----------|-------|------|-------|
| Simple queries | gpt-5-nano | Lowest | Fastest |
| General tasks | gpt-5-mini | Low | Fast |
| Complex tasks | gpt-5 | Higher | Moderate |

### 3. Token Management
```javascript
const response = await client.responses.create({
  model: "gpt-5-nano",
  input: prompt,
  max_output_tokens: 500,  // Limit output
  text: { verbosity: "low" }  // Concise responses
});
```

## 🔄 Webhooks for Async Operations

### Configuration
```javascript
// Configure webhooks per-project
const webhook = await client.webhooks.create({
  url: "https://your-domain.com/webhook",
  events: ["response.completed", "response.failed"]
});

// Save the signing secret securely
const signingSecret = webhook.signing_secret;
```

### Best Practices
- Respond with 2xx status within seconds
- Implement idempotency using `webhook-id` header
- Verify signatures for security
- Handle exponential backoff (up to 72 hours)

## 📊 Response Handling Patterns

### Complete Response Handling
```javascript
try {
  const response = await openai.responses.create({
    model: "gpt-5",
    input: messages,
    text: { format: { type: "json_schema", strict: true, schema } }
  });

  // Check completion status
  if (response.status === "incomplete") {
    const reason = response.incomplete_details.reason;
    if (reason === "max_output_tokens") {
      // Handle token limit
    } else if (reason === "content_filter") {
      // Handle filtered content
    }
  }

  // Check for refusal
  const content = response.output[0].content[0];
  if (content.type === "refusal") {
    console.log("Refused:", content.refusal);
    return;
  }

  // Parse structured output
  const result = JSON.parse(response.output_text);
  
} catch (error) {
  // Handle API errors
  console.error("API Error:", error);
}
```

## 🎯 Quality Improvement Techniques

### 1. Few-Shot Learning
```javascript
const examples = [
  { input: "example1", output: "result1" },
  { input: "example2", output: "result2" }
];

const response = await client.responses.create({
  model: "gpt-5",
  instructions: `Learn from these examples:\n${JSON.stringify(examples)}`,
  input: userInput
});
```

### 2. Chain of Thought
```javascript
const ChainOfThought = z.object({
  steps: z.array(z.object({
    explanation: z.string(),
    output: z.string()
  })),
  final_answer: z.string()
});
```

### 3. Reusable Prompts (Dashboard)
```javascript
const response = await client.responses.create({
  model: "gpt-5",
  prompt: {
    id: "pmpt_abc123",
    version: "2",
    variables: {
      context: dynamicContext,
      user_input: userInput
    }
  }
});
```

## 🔗 Reference URLs

### Official Documentation
- **Prompt Engineering Guide**: https://platform.openai.com/docs/guides/prompt-engineering
- **Structured Outputs**: https://platform.openai.com/docs/guides/structured-outputs
- **Prompt Caching**: https://platform.openai.com/docs/guides/prompt-caching
- **Webhooks Guide**: https://platform.openai.com/docs/guides/webhooks

### Cookbook & Examples
- **GPT-5 Prompting Guide**: https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide
- **Structured Outputs Intro**: https://cookbook.openai.com/examples/structured_outputs_intro
- **Prompt Caching 101**: https://cookbook.openai.com/examples/prompt_caching101

### API References
- **Responses API**: https://platform.openai.com/docs/api-reference/responses
- **Models Overview**: https://platform.openai.com/docs/models

## 📝 Quick Reference Checklist

Before making an API call:
- [ ] Using Responses API for GPT-5 models?
- [ ] Static content placed first for caching?
- [ ] Schema validated with `strict: true`?
- [ ] All fields marked as required?
- [ ] Edge cases handled (refusals, limits)?
- [ ] Token limits set appropriately?
- [ ] Model selection justified for use case?
- [ ] Response format specified correctly?

## Version History

- **v1.0 (2025-08-28)**: Initial comprehensive guide
  - GPT-5 Responses API requirement documented
  - Structured Outputs best practices
  - Prompt caching strategies
  - Cost optimization techniques
  - Webhook implementation

---

**Note:** This document should be regularly reviewed and updated as OpenAI releases new features and best practices. Reference this guide in CLAUDE.md, JSON configs, and claude-init scripts for future projects.