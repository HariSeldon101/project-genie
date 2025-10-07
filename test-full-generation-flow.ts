/**
 * Comprehensive End-to-End Test for Document Generation
 * Tests the complete flow: Data → Sanitization → Prompt Building → Validation
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import { DataSanitizer } from './lib/llm/sanitizer'
import { LLMGateway } from './lib/llm/gateway'
import type { SanitizedProjectData } from './lib/llm/sanitizer'

console.log('🧪 COMPREHENSIVE GENERATION FLOW TEST\n')
console.log('=' .repeat(60))

// Real project data with emails (exactly like production)
const realProjectData = {
  name: 'CloudSync Platform Development',
  description: 'A cloud-based synchronization platform for enterprise data',
  methodology: 'agile',
  startDate: '2025-10-01',
  endDate: '2026-04-01',
  budget: 500000,
  timeline: '6 months',
  industry: 'technology',
  teamSize: 8,
  stakeholders: [
    { name: 'John Doe', role: 'Product Owner', email: 'john@example.com' },
    { name: 'Jane Smith', role: 'Scrum Master', email: 'jane@example.com' }
  ],
  objectives: [
    'Deliver scalable cloud platform',
    'Ensure 99.9% uptime',
    'Complete within budget'
  ],
  deliverables: [
    'Platform MVP',
    'API Documentation',
    'User Training'
  ]
}

console.log('📋 Step 1: Original Project Data')
console.log('   Stakeholders:', realProjectData.stakeholders.length)
console.log('   Contains emails:', realProjectData.stakeholders.map(s => s.email))
console.log('')

// Step 1: Sanitize data
console.log('🧹 Step 2: Sanitize Project Data')
const sanitizer = new DataSanitizer()
const sanitizedData: SanitizedProjectData = sanitizer.sanitizeProjectData(realProjectData)

console.log('   Sanitized stakeholders:')
sanitizedData.stakeholders.forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.placeholder}: ${s.role}`)
})
console.log('')

// Step 3: Build prompts (simulating what the generator does)
console.log('📝 Step 3: Build Prompts from Sanitized Data')
const gateway = new LLMGateway()

// Simulate Charter prompt
const charterPrompt = gateway.buildContextPrompt(
  `You are an expert project manager creating an Agile Project Charter for {{methodology}} projects.`,
  `Create a comprehensive project charter for:
Project Name: {{projectName}}
Description: {{description}}
Timeline: {{timeline}}
Budget: {{budget}}

Stakeholders:
{{stakeholders}}

Generate a detailed charter following Agile best practices.`,
  sanitizedData
)

console.log('   Charter System Prompt (first 200 chars):')
console.log('   ', charterPrompt.system.substring(0, 200))
console.log('')
console.log('   Charter User Prompt (first 500 chars):')
console.log('   ', charterPrompt.user.substring(0, 500))
console.log('')

// Step 4: Validate prompts
console.log('🔒 Step 4: Validate Prompts for PII')
console.log('   Testing System Prompt...')
try {
  sanitizer.validatePrompt(charterPrompt.system)
  console.log('   ✅ System prompt passed validation')
} catch (error) {
  console.error('   ❌ System prompt FAILED validation:')
  console.error('      ', error instanceof Error ? error.message : error)
  console.log('')
  console.log('   📋 Full system prompt for analysis:')
  console.log('   ', charterPrompt.system)
  console.log('')
}

console.log('   Testing User Prompt...')
try {
  sanitizer.validatePrompt(charterPrompt.user)
  console.log('   ✅ User prompt passed validation')
} catch (error) {
  console.error('   ❌ User prompt FAILED validation:')
  console.error('      ', error instanceof Error ? error.message : error)
  console.log('')
  console.log('   📋 Full user prompt for analysis:')
  console.log('   ', charterPrompt.user)
  console.log('')

  // Additional debugging - check each validation pattern
  console.log('   🔍 Debugging which pattern failed:')

  // Check email
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
  const emailMatches = charterPrompt.user.match(emailPattern)
  if (emailMatches) {
    console.log('      ⚠️  Email pattern matches:', emailMatches)
  } else {
    console.log('      ✅ No email matches')
  }

  // Check personal intro
  const personalIntroPattern = /\b(my name is|i am|i'm)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi
  const personalMatches = charterPrompt.user.match(personalIntroPattern)
  if (personalMatches) {
    console.log('      ⚠️  Personal intro pattern matches:', personalMatches)
  } else {
    console.log('      ✅ No personal intro matches')
  }

  // Check phone
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
  const phoneMatches = charterPrompt.user.match(phonePattern)
  if (phoneMatches) {
    console.log('      ⚠️  Phone pattern matches:', phoneMatches)
  } else {
    console.log('      ✅ No phone matches')
  }
}

console.log('')
console.log('=' .repeat(60))
console.log('🎉 Test Complete!')
console.log('')
console.log('If validation failed above, the full prompt is logged for analysis.')
