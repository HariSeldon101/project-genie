#!/usr/bin/env npx tsx
/**
 * Direct test of cost calculation
 */

// Test the cost calculation directly
const pricing: Record<string, { input: number; output: number }> = {
  // GPT-5 models (from Vercel AI Gateway pricing)
  'gpt-5': { input: 0.10, output: 0.30 }, // $0.10/$0.30 per 1K tokens
  'gpt-5-mini': { input: 0.025, output: 0.10 }, // $0.025/$0.10 per 1K tokens
  'gpt-5-nano': { input: 0.0025, output: 0.02 }, // $0.0025/$0.02 per 1K tokens
  // GPT-4 models
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // $0.01/$0.03 per 1K
  'gpt-4': { input: 0.03, output: 0.06 }, // $0.03/$0.06 per 1K
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 } // $0.0005/$0.0015 per 1K
}

function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const modelPricing = pricing[model] || pricing['gpt-5-mini']
  
  const inputCost = (inputTokens / 1000) * modelPricing.input
  const outputCost = (outputTokens / 1000) * modelPricing.output
  
  return inputCost + outputCost
}

console.log('\n🧮 Testing Cost Calculation\n')
console.log('=' .repeat(50))

// Test with the tokens from your screenshot: 6,574 tokens
// Assuming roughly 30% input, 70% output for generation
const totalTokens = 6574
const inputTokens = Math.round(totalTokens * 0.3)  // ~1972
const outputTokens = Math.round(totalTokens * 0.7) // ~4602

console.log('Model: gpt-5-mini')
console.log('Input tokens:', inputTokens)
console.log('Output tokens:', outputTokens)
console.log('Total tokens:', totalTokens)

const cost = calculateCostUsd('gpt-5-mini', inputTokens, outputTokens)
console.log('\n💰 Calculated cost: $' + cost.toFixed(4))

console.log('\nBreakdown:')
console.log('  Input cost: $' + ((inputTokens / 1000) * 0.025).toFixed(4))
console.log('  Output cost: $' + ((outputTokens / 1000) * 0.10).toFixed(4))
console.log('  Total: $' + cost.toFixed(4))

// Test with exact values from a real generation
console.log('\n' + '=' .repeat(50))
console.log('\nTest with real values:')
const realInput = 1043
const realOutput = 2746
const realTotal = realInput + realOutput

console.log('Model: gpt-5-mini')
console.log('Input tokens:', realInput)
console.log('Output tokens:', realOutput) 
console.log('Total tokens:', realTotal)

const realCost = calculateCostUsd('gpt-5-mini', realInput, realOutput)
console.log('\n💰 Calculated cost: $' + realCost.toFixed(4))

console.log('\nBreakdown:')
console.log('  Input cost: $' + ((realInput / 1000) * 0.025).toFixed(4))
console.log('  Output cost: $' + ((realOutput / 1000) * 0.10).toFixed(4))
console.log('  Total: $' + realCost.toFixed(4))