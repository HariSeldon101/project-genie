export interface LLMProvider {
  name: string
  generateText(prompt: LLMPrompt): Promise<string>
  generateJSON<T>(prompt: LLMPrompt, schema: unknown): Promise<T>
  countTokens(text: string): number
}

export interface LLMPrompt {
  system: string
  user: string
  temperature?: number
  maxTokens?: number
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock' | 'deepseek' | 'groq'
  apiKey?: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
  fallbackProviders?: Array<'openai' | 'deepseek' | 'groq' | 'anthropic' | 'mock'>
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
  type: 'charter' | 'pid' | 'backlog' | 'risk_register' | 'business_case' | 'project_plan'
  methodology: 'agile' | 'prince2' | 'hybrid'
  version: number
  generatedAt: Date
  llmProvider: string
  model: string
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