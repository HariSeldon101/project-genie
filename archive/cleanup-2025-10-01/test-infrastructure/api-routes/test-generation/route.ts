import { NextRequest, NextResponse } from 'next/server'
import { DocumentGenerator } from '@/lib/documents/generator'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  console.log('[TEST] Starting document generation test')
  
  // Test project data
  const testProjectData = {
    name: 'Test Project',
    description: 'Testing optimized document generation',
    methodology: 'PRINCE2',
    duration: 6,
    teamSize: 5,
    budget: 100000,
    objectives: ['Improve performance', 'Reduce timeouts', 'Optimize costs'],
    deliverables: ['Optimized system', 'Performance reports', 'Documentation'],
    milestones: ['Phase 1 Complete', 'Phase 2 Complete', 'Final Delivery'],
    risks: ['Technical complexity', 'Time constraints', 'Resource availability'],
    constraints: ['Budget limit', 'Timeline fixed', 'Team size'],
    assumptions: ['Stable requirements', 'Available resources', 'Technical feasibility'],
    dependencies: ['External API', 'Third-party libraries', 'Cloud infrastructure'],
    stakeholders: [
      { name: 'Project Sponsor', role: 'Provides funding and strategic direction' },
      { name: 'Technical Lead', role: 'Oversees technical implementation' },
      { name: 'End Users', role: 'Primary users of the system' }
    ]
  }

  const startTime = Date.now()
  const documentTimings: Record<string, number> = {}

  try {
    // Test with our optimized configuration
    const generator = new DocumentGenerator()
    
    // Generate all documents with timing
    console.log('[TEST] Starting parallel document generation...')
    const documents = await generator.generateProjectDocuments(testProjectData, 'test-project-001')
    
    // Extract timing from document metadata if available
    documents.forEach(doc => {
      if (doc.metadata?.type) {
        documentTimings[doc.metadata.type] = doc.metadata.generationTime || 0
      }
    })
    
    const totalTime = Date.now() - startTime
    
    // Calculate costs (approximate based on token usage)
    const estimatedTokens = documents.reduce((sum, doc) => {
      const outputTokens = doc.content.length / 4 // Rough estimate
      const reasoningMultiplier = doc.metadata.reasoningEffort === 'minimal' ? 2 : 
                                 doc.metadata.reasoningEffort === 'low' ? 5 : 10
      return sum + outputTokens * (1 + reasoningMultiplier)
    }, 0)
    
    const estimatedCost = (estimatedTokens / 1000000) * 0.20 // Output token pricing

    // Analyze results
    const results = {
      success: true,
      totalDocuments: documents.length,
      totalTime: `${(totalTime / 1000).toFixed(1)}s`,
      documentsGenerated: documents.map(doc => ({
        type: doc.metadata.type,
        title: doc.metadata.title,
        reasoningEffort: doc.metadata.reasoningEffort,
        contentLength: doc.content.length,
        hasContent: doc.content.length > 100,
        timeSeconds: documentTimings[doc.metadata.type] ? 
          `${(documentTimings[doc.metadata.type] / 1000).toFixed(1)}s` : 'N/A'
      })),
      performance: {
        totalTimeMs: totalTime,
        averagePerDocument: `${(totalTime / documents.length / 1000).toFixed(1)}s`,
        improvementVsSequential: `${((98000 - totalTime) / 98000 * 100).toFixed(1)}%`,
        targetMet: totalTime < 40000 ? '✅ Yes' : '❌ No'
      },
      cost: {
        estimatedTokens: Math.round(estimatedTokens),
        estimatedCostUSD: `$${estimatedCost.toFixed(4)}`,
        costIncreaseVsOriginal: `${((estimatedCost - 0.0012) / 0.0012 * 100).toFixed(1)}%`
      },
      configuration: {
        maxDuration: '120s',
        parallelBatches: 2,
        documentsPerBatch: 3,
        perDocumentTimeout: '40s'
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error('[TEST] Generation failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timeBeforeError: `${(errorTime / 1000).toFixed(1)}s`,
      partialTimings: documentTimings,
      configuration: {
        maxDuration: '120s',
        parallelBatches: 2
      }
    }, { status: 500 })
  }
}