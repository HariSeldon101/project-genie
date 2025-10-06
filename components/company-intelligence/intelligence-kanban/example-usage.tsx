// Example usage: app/(dashboard)/company-intelligence/intelligence-viewer/[sessionId]/page.tsx

import { IntelligenceKanban } from '@/components/company-intelligence/intelligence-kanban'
import { permanentLogger } from '@/lib/utils/permanent-logger'
// import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
// import { transformToIntelligenceCategories } from '@/lib/company-intelligence/intelligence/category-extractor'

/**
 * Example implementation of the Intelligence Viewer page
 * 
 * This shows how to integrate the new Kanban component with:
 * - Full drag and drop functionality
 * - Three view modes
 * - Enrichment queue side panel
 * - Category color system
 * - Performance optimizations
 */

// Example mock data for testing (replace with real data from repository)
const mockIntelligenceData = {
  CORPORATE: {
    metadata: {
      label: 'Corporate Intelligence',
      icon: 'building',
      color: 'blue'
    },
    items: [
      {
        id: 'corp-1',
        type: 'Company Overview',
        content: 'Founded in 2015, the company has grown to become a leader in cloud infrastructure...',
        source: 'https://example.com/about',
        confidence: 0.85,
        extractedAt: new Date().toISOString()
      },
      {
        id: 'corp-2',
        type: 'Mission Statement',
        content: 'To democratize access to enterprise-grade technology for businesses of all sizes...',
        source: 'https://example.com/mission',
        confidence: 0.92,
        extractedAt: new Date().toISOString()
      }
    ],
    confidence: 0.88,
    sources: ['https://example.com/about', 'https://example.com/mission']
  },
  PRODUCTS: {
    metadata: {
      label: 'Products & Services',
      icon: 'package',
      color: 'purple'
    },
    items: [
      {
        id: 'prod-1',
        type: 'Cloud Platform',
        content: { name: 'CloudPro', description: 'Enterprise cloud infrastructure platform' },
        source: 'https://example.com/products/cloudpro',
        confidence: 0.90,
        extractedAt: new Date().toISOString()
      },
      {
        id: 'prod-2',
        type: 'Analytics Suite',
        content: { name: 'DataInsights', description: 'Real-time business analytics' },
        source: 'https://example.com/products/analytics',
        confidence: 0.78,
        extractedAt: new Date().toISOString()
      }
    ],
    confidence: 0.84,
    sources: ['https://example.com/products']
  },
  PRICING: {
    metadata: {
      label: 'Pricing & Plans',
      icon: 'dollar-sign',
      color: 'green'
    },
    items: [
      {
        id: 'price-1',
        type: 'Starter Plan',
        content: { price: '$99/month', features: ['10 users', '100GB storage', 'Basic support'] },
        source: 'https://example.com/pricing',
        confidence: 0.95,
        extractedAt: new Date().toISOString()
      },
      {
        id: 'price-2',
        type: 'Enterprise Plan',
        content: { price: 'Custom', features: ['Unlimited users', 'Unlimited storage', '24/7 support'] },
        source: 'https://example.com/pricing',
        confidence: 0.88,
        extractedAt: new Date().toISOString()
      }
    ],
    confidence: 0.91,
    sources: ['https://example.com/pricing']
  },
  COMPETITORS: {
    metadata: {
      label: 'Competitive Intelligence',
      icon: 'target',
      color: 'red'
    },
    items: [
      {
        id: 'comp-1',
        type: 'Main Competitor',
        content: 'CompetitorX - Market share 35%, strong in enterprise segment',
        source: 'https://example.com/market-analysis',
        confidence: 0.72,
        extractedAt: new Date().toISOString()
      }
    ],
    confidence: 0.72,
    sources: ['https://example.com/market-analysis']
  },
  TEAM: {
    metadata: {
      label: 'Team & Leadership',
      icon: 'users',
      color: 'orange'
    },
    items: [
      {
        id: 'team-1',
        type: 'CEO',
        content: { name: 'John Doe', bio: '20 years experience in tech leadership' },
        source: 'https://example.com/team',
        confidence: 0.88,
        extractedAt: new Date().toISOString()
      },
      {
        id: 'team-2',
        type: 'CTO',
        content: { name: 'Jane Smith', bio: 'Former Google engineer, ML expert' },
        source: 'https://example.com/team',
        confidence: 0.85,
        extractedAt: new Date().toISOString()
      }
    ],
    confidence: 0.86,
    sources: ['https://example.com/team']
  }
}

export default async function IntelligenceViewerPage({
  params
}: {
  params: { sessionId: string }
}) {
  // In production, fetch real data from repository:
  // const repository = CompanyIntelligenceRepository.getInstance()
  // const session = await repository.getSession(params.sessionId)
  // const scrapedData = session.merged_data?.raw_data || new Map()
  // const intelligenceData = transformToIntelligenceCategories(scrapedData)

  // For now, use mock data
  const intelligenceData = mockIntelligenceData

  // Handle enrichment queue updates
  const handleEnrichmentQueue = async (items: any[]) => {
    permanentLogger.info('INTELLIGENCE_VIEWER', 'Enrichment queue updated', {
      sessionId: params.sessionId,
      itemCount: items.length,
      items: items.map(i => ({ id: i.id, type: i.type }))
    })

    // In production, save to database:
    // await repository.updateMergedData(params.sessionId, {
    //   enrichmentQueue: items,
    //   queuedAt: new Date().toISOString()
    // })

    // Trigger enrichment process
    if (items.length > 0) {
      console.log('Starting enrichment process for', items.length, 'items')
      // await startEnrichmentProcess(params.sessionId, items)
    }
  }

  // Mock user credits (in production, fetch from user account)
  const creditsAvailable = 500

  return (
    <div className="container mx-auto py-6 h-screen flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Intelligence Data Viewer</h1>
        <p className="text-muted-foreground">
          Organize and curate extracted intelligence before enrichment
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <IntelligenceKanban
          intelligenceData={intelligenceData}
          onEnrichmentQueueUpdate={handleEnrichmentQueue}
          creditsAvailable={creditsAvailable}
          sessionId={params.sessionId}
        />
      </div>
    </div>
  )
}

/**
 * Alternative: Client-side implementation with real-time updates
 */
export function ClientSideExample() {
  const [intelligenceData, setIntelligenceData] = useState(mockIntelligenceData)
  const [enrichmentQueue, setEnrichmentQueue] = useState<any[]>([])

  // Subscribe to SSE for real-time updates
  // const { events } = useSSE(sessionId)

  // Handle queue updates with optimistic updates
  const handleQueueUpdate = useCallback((items: any[]) => {
    setEnrichmentQueue(items)
    
    // Log the update
    permanentLogger.info('KANBAN', 'Queue updated', {
      count: items.length,
      credits: items.length * 2
    })

    // Save to backend
    // saveQueueToDatabase(items)
  }, [])

  return (
    <IntelligenceKanban
      intelligenceData={intelligenceData}
      onEnrichmentQueueUpdate={handleQueueUpdate}
      creditsAvailable={500}
    />
  )
}

/**
 * Testing the component in isolation
 */
export function TestKanbanComponent() {
  // Generate test data with multiple categories
  const generateTestData = () => {
    const categories = [
      'CORPORATE', 'PRODUCTS', 'PRICING', 'COMPETITORS', 'TEAM',
      'CASE_STUDIES', 'TECHNICAL', 'COMPLIANCE', 'BLOG', 'TESTIMONIALS',
      'PARTNERSHIPS', 'RESOURCES', 'EVENTS', 'FEATURES', 'INTEGRATIONS',
      'SUPPORT', 'CAREERS', 'INVESTORS', 'PRESS', 'MARKET_POSITION',
      'CONTENT', 'SOCIAL_PROOF', 'COMMERCIAL', 'CUSTOMER_EXPERIENCE', 'FINANCIAL'
    ]

    const data: any = {}
    
    categories.forEach((category, index) => {
      data[category] = {
        metadata: {
          label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          icon: 'layers',
          color: ['blue', 'purple', 'green', 'red', 'orange', 'teal', 'indigo', 'yellow'][index % 8]
        },
        items: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({
          id: `${category.toLowerCase()}-${i}`,
          type: `${category} Item ${i + 1}`,
          content: `This is sample content for ${category} item ${i + 1}. It contains various information that was extracted from the website.`,
          source: `https://example.com/${category.toLowerCase()}`,
          confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
          extractedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          enriched: Math.random() > 0.7,
          needsReview: Math.random() > 0.8,
          status: Math.random() > 0.5 ? 'pending' : undefined
        })),
        confidence: Math.random() * 0.5 + 0.5,
        sources: [`https://example.com/${category.toLowerCase()}`]
      }
    })

    return data
  }

  const [testData] = useState(generateTestData())

  return (
    <div className="h-screen p-4">
      <IntelligenceKanban
        intelligenceData={testData}
        onEnrichmentQueueUpdate={(items) => {
          console.log('Enrichment queue:', items)
        }}
        creditsAvailable={1000}
        sessionId="test-session"
      />
    </div>
  )
}
