/**
 * Document Tool Configuration
 * Defines which AI tools (web search, file search, etc.) are used for each document type
 * Optimized for cost-effectiveness based on OpenAI pricing (Sept 2025)
 */

export interface ToolConfig {
  type: 'web_search' | 'file_search' | 'code_interpreter'
  maxResults?: number
  searchDepth?: 'standard' | 'comprehensive' | 'focused'
  enabled?: boolean
}

export interface DocumentToolConfig {
  model: string
  tools: ToolConfig[]
  description: string
  costNotes: string
  validationRequired: boolean
}

/**
 * Cost-optimized tool configuration for each document type
 * 
 * Pricing Reference (Sept 2025):
 * - Web Search with gpt-4o: Search tokens are FREE
 * - Web Search with gpt-4o-mini: Fixed 8,000 input tokens
 * - Web Search Tool Calls: $2.50 per 1,000 calls
 * - GPT-4o-mini: $0.15/1M input + $0.60/1M output
 * - GPT-5-nano: $0.05/1M input + $0.40/1M output
 * - GPT-5-mini: $0.25/1M input + $2.00/1M output
 */
export const DOCUMENT_TOOL_CONFIG: Record<string, DocumentToolConfig> = {
  // Documents REQUIRING web search for real-world data
  comparable_projects: {
    model: 'gpt-4o-mini', // Cost-effective with web search
    tools: [
      {
        type: 'web_search',
        maxResults: 10,
        searchDepth: 'comprehensive',
        enabled: true
      }
    ],
    description: 'Requires real company examples and case studies',
    costNotes: 'Web search adds 8k tokens (~$0.0012) but provides real data',
    validationRequired: true
  },

  technical_landscape: {
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'web_search',
        maxResults: 8,
        searchDepth: 'focused',
        enabled: true
      }
    ],
    description: 'Needs current technology trends and industry standards',
    costNotes: 'Web search essential for current tech landscape',
    validationRequired: true
  },

  // Documents that MAY benefit from web search (optional)
  risk_register: {
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'web_search',
        maxResults: 5,
        searchDepth: 'standard',
        enabled: false // Enable only if sector-specific risks needed
      }
    ],
    description: 'May need industry-specific risk data',
    costNotes: 'Web search optional - enable for specialized sectors',
    validationRequired: false
  },

  communication_plan: {
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'web_search',
        maxResults: 3,
        searchDepth: 'standard',
        enabled: false // Enable for industry best practices
      }
    ],
    description: 'May benefit from communication best practices',
    costNotes: 'Web search optional - for industry standards',
    validationRequired: false
  },

  quality_management: {
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'web_search',
        maxResults: 5,
        searchDepth: 'standard',
        enabled: false // Enable for quality standards research
      }
    ],
    description: 'May need industry quality standards',
    costNotes: 'Web search optional - for ISO/quality standards',
    validationRequired: false
  },

  // Documents using STRUCTURED outputs (no web search needed)
  pid: {
    model: 'gpt-4o-mini', // Using for structured output with zodResponseFormat
    tools: [],
    description: 'Uses structured output with Zod schemas',
    costNotes: 'No web search needed - project-specific data',
    validationRequired: false
  },

  business_case: {
    model: 'gpt-4o-mini', // Using for structured output
    tools: [],
    description: 'Financial projections from project data',
    costNotes: 'No web search needed - uses project financials',
    validationRequired: false
  },

  // Documents using NARRATIVE generation (GPT-5 for quality)
  charter: {
    model: 'gpt-5-nano', // Cheapest GPT-5 for quality narrative
    tools: [],
    description: 'Project-specific charter document',
    costNotes: 'GPT-5-nano for quality at lowest cost',
    validationRequired: false
  },

  backlog: {
    model: 'gpt-5-nano',
    tools: [],
    description: 'Product backlog from project requirements',
    costNotes: 'GPT-5-nano for creative user stories',
    validationRequired: false
  },

  project_plan: {
    model: 'gpt-5-nano',
    tools: [],
    description: 'Detailed project planning',
    costNotes: 'GPT-5-nano for comprehensive planning',
    validationRequired: false
  },

  sprint_plan: {
    model: 'gpt-5-nano',
    tools: [],
    description: 'Sprint planning from backlog',
    costNotes: 'GPT-5-nano for agile planning',
    validationRequired: false
  }
}

/**
 * Get tool configuration for a document type
 */
export function getDocumentToolConfig(documentType: string): DocumentToolConfig {
  const config = DOCUMENT_TOOL_CONFIG[documentType]
  if (!config) {
    // Default configuration for unknown document types
    return {
      model: 'gpt-4o-mini',
      tools: [],
      description: 'Default configuration',
      costNotes: 'Using default cost-effective model',
      validationRequired: false
    }
  }
  return config
}

/**
 * Check if web search is enabled for a document type
 */
export function isWebSearchEnabled(documentType: string): boolean {
  const config = getDocumentToolConfig(documentType)
  return config.tools.some(tool => 
    tool.type === 'web_search' && tool.enabled !== false
  )
}

/**
 * Get web search configuration for a document type
 */
export function getWebSearchConfig(documentType: string): ToolConfig | undefined {
  const config = getDocumentToolConfig(documentType)
  return config.tools.find(tool => tool.type === 'web_search')
}

/**
 * Enable/disable web search for a document type at runtime
 */
export function setWebSearchEnabled(documentType: string, enabled: boolean): void {
  const config = DOCUMENT_TOOL_CONFIG[documentType]
  if (config) {
    const webSearchTool = config.tools.find(tool => tool.type === 'web_search')
    if (webSearchTool) {
      webSearchTool.enabled = enabled
    } else if (enabled) {
      // Add web search tool if it doesn't exist
      config.tools.push({
        type: 'web_search',
        maxResults: 5,
        searchDepth: 'standard',
        enabled: true
      })
    }
  }
}

/**
 * Calculate estimated cost for a document generation
 */
export function estimateDocumentCost(
  documentType: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): { 
  modelCost: number, 
  toolCost: number, 
  totalCost: number,
  breakdown: string 
} {
  const config = getDocumentToolConfig(documentType)
  
  // Model costs per 1M tokens
  const modelCosts: Record<string, { input: number, output: number }> = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-mini': { input: 0.25, output: 2.00 }
  }
  
  const modelCost = modelCosts[config.model] || modelCosts['gpt-4o-mini']
  
  // Calculate base model cost
  let inputCost = (estimatedInputTokens / 1_000_000) * modelCost.input
  let outputCost = (estimatedOutputTokens / 1_000_000) * modelCost.output
  
  // Add web search token cost if enabled
  let toolCost = 0
  const webSearch = config.tools.find(t => t.type === 'web_search' && t.enabled !== false)
  if (webSearch && config.model === 'gpt-4o-mini') {
    // Web search adds 8k input tokens for gpt-4o-mini
    inputCost += (8000 / 1_000_000) * modelCost.input
    // Add tool call cost (assuming 1 call)
    toolCost = 2.50 / 1000 // $2.50 per 1k calls
  }
  
  const totalCost = inputCost + outputCost + toolCost
  
  const breakdown = `
Model: ${config.model}
Input: ${estimatedInputTokens} tokens @ $${modelCost.input}/1M = $${inputCost.toFixed(4)}
Output: ${estimatedOutputTokens} tokens @ $${modelCost.output}/1M = $${outputCost.toFixed(4)}
${webSearch ? `Web Search: 8k tokens + tool call = $${toolCost.toFixed(4)}` : 'No web search'}
Total: $${totalCost.toFixed(4)}
  `.trim()
  
  return {
    modelCost: inputCost + outputCost,
    toolCost,
    totalCost,
    breakdown
  }
}