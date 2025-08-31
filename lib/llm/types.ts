export interface LLMUsage {
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

export interface LLMResponse<T = string> {
  content: T
  usage?: LLMUsage
  model?: string
  provider?: string
}

export interface LLMProvider {
  name: string
  generateText(prompt: LLMPrompt): Promise<string>
  generateJSON<T>(prompt: LLMPrompt, schema: unknown): Promise<T>
  generateTextWithMetrics?(prompt: LLMPrompt): Promise<LLMResponse<string>>
  generateJSONWithMetrics?<T>(prompt: LLMPrompt, schema: unknown): Promise<LLMResponse<T>>
  countTokens(text: string): number
}

export interface LLMPrompt {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock' | 'deepseek' | 'groq' | 'vercel-ai'
  apiKey?: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  fallbackProviders?: Array<'openai' | 'deepseek' | 'groq' | 'anthropic' | 'mock' | 'vercel-ai'>
}

export interface SanitizedProjectData {
  projectName: string
  vision: string
  businessCase: string
  description: string
  methodology: 'agile' | 'prince2' | 'hybrid'
  companyWebsite: string
  sector: string
  stakeholders: Array<{
    role: string
    placeholder: string
  }>
  prince2Stakeholders?: {
    seniorUser: { role: string; placeholder: string }
    seniorSupplier: { role: string; placeholder: string }
    executive: { role: string; placeholder: string }
  }
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}

export interface DocumentMetadata {
  projectId: string
  type: 'charter' | 'pid' | 'backlog' | 'risk_register' | 'business_case' | 'project_plan' | 'technical_landscape' | 'comparable_projects'
  methodology: 'agile' | 'prince2' | 'hybrid'
  version: number
  generatedAt: Date
  llmProvider: string
  model: string
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'
  usage?: LLMUsage
  generationTimeMs?: number
  prompt?: {
    system: string
    user: string
  }
}

export interface GeneratedDocument {
  metadata: DocumentMetadata
  content: Record<string, unknown> // JSONB structure varies by document type
  aiInsights?: {
    industryContext?: string
    recommendedKPIs?: string[]
    potentialRisks?: string[]
    suggestions?: string[]
  }
}