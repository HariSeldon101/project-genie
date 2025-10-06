'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Loader2, 
  Search, 
  Settings, 
  Sparkles,
  Database,
  BarChart3,
  Globe,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { IntelligenceKanban } from '@/components/company-intelligence/intelligence-kanban'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { EventFactory } from '@/lib/realtime-events'
import { CompanyIntelligenceRepository } from '@/lib/repositories/company-intelligence-repository'
import { convertSupabaseError } from '@/lib/utils/supabase-error-helper'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import type { 
  IntelligenceData, 
  IntelligenceItem,
  ScraperType,
  IntelligenceCategoryEnum,
  IntelligenceDepth,
  ScraperConfig,
  IntelligenceSessionStatus
} from '@/lib/company-intelligence/types/intelligence-types'
import { 
  getCategoryMetadata,
  validateIntelligenceCategory,
  CATEGORY_METADATA 
} from '@/lib/company-intelligence/types/intelligence-types'

// Available categories for selection with proper enum usage
const AVAILABLE_CATEGORIES = [
  { id: IntelligenceCategoryEnum.COMPANY_OVERVIEW, default: true },
  { id: IntelligenceCategoryEnum.PRODUCTS, default: true },
  { id: IntelligenceCategoryEnum.SERVICES, default: true },
  { id: IntelligenceCategoryEnum.PRICING, default: true },
  { id: IntelligenceCategoryEnum.LEADERSHIP, default: false },
  { id: IntelligenceCategoryEnum.TECH_STACK, default: false },
  { id: IntelligenceCategoryEnum.INTEGRATIONS, default: false },
  { id: IntelligenceCategoryEnum.CASE_STUDIES, default: false },
  { id: IntelligenceCategoryEnum.COMPETITORS, default: false },
  { id: IntelligenceCategoryEnum.CONTACT_INFO, default: false }
].map(item => ({
  ...item,
  metadata: getCategoryMetadata(item.id)
}))

export default function CompanyIntelligenceDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [domain, setDomain] = useState('')
  const [scraperType, setScraperType] = useState<ScraperType>('PLAYWRIGHT')
  const [depth, setDepth] = useState<IntelligenceDepth>(IntelligenceDepth.DEEP)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    AVAILABLE_CATEGORIES.filter(c => c.default).map(c => c.id)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceData | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  const repository = useState(() => new CompanyIntelligenceRepository())[0]
  const correlationId = useState(() => `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)[0]

  // Check authentication
  useEffect(() => {
    if (!userLoading && !user) {
      permanentLogger.warn('INTELLIGENCE_DASHBOARD', 'Unauthenticated access attempt', {
        correlationId
      })
      router.push('/login')
    }
  }, [user, userLoading, router, correlationId])

  // Load existing sessions
  useEffect(() => {
    if (user) {
      loadUserSessions()
    }
  }, [user])

  const loadUserSessions = async () => {
    if (!user) return
    
    try {
      permanentLogger.breadcrumb('INTELLIGENCE_DASHBOARD', 'Loading user sessions', {
        userId: user.id,
        correlationId
      })
      
      const sessions = await repository.getUserSessions(user.id, 10)
      
      // If there are existing sessions, we could show them in a list
      permanentLogger.info('INTELLIGENCE_DASHBOARD', 'User sessions loaded', {
        count: sessions.length,
        userId: user.id,
        correlationId
      })
      
    } catch (error) {
      const jsError = error instanceof Error ? error : convertSupabaseError(error)
      permanentLogger.captureError('INTELLIGENCE_DASHBOARD', jsError, {
        context: 'load_sessions',
        userId: user?.id,
        correlationId
      })
    }
  }

  // Handle domain validation
  const validateDomain = (domain: string): boolean => {
    const domainPattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    return domainPattern.test(domain)
  }

  // Handle scraping initiation
  const handleStartScraping = async () => {
    if (!user) {
      setError('You must be logged in to scrape websites')
      return
    }

    if (!domain) {
      setError('Please enter a domain to scrape')
      return
    }

    if (!validateDomain(domain)) {
      setError('Please enter a valid domain (e.g., example.com)')
      return
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one category to extract')
      return
    }

    // Validate all selected categories
    for (const category of selectedCategories) {
      if (!validateIntelligenceCategory(category)) {
        setError(`Invalid category selected: ${category}`)
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      permanentLogger.breadcrumb('INTELLIGENCE_DASHBOARD', 'Starting scraping process', {
        domain,
        scraperType,
        categoriesCount: selectedCategories.length,
        depth,
        userId: user.id,
        correlationId
      })

      EventFactory.intelligence('scraping_initiated', {
        domain,
        scraperType,
        categoriesCount: selectedCategories.length,
        depth
      }, { correlationId })

      const response = await fetch('/api/company-intelligence/v4/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain,
          scraperType,
          config: {
            categories: selectedCategories,
            depth,
            maxPages: depth === IntelligenceDepth.COMPREHENSIVE ? 50 : 
                      depth === IntelligenceDepth.DEEP ? 20 : 10,
            includeSubdomains: depth === IntelligenceDepth.COMPREHENSIVE,
            timeout: 30000
          } as ScraperConfig
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Scraping failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setIntelligenceData(result.data)
        setSessionId(result.sessionId)
        
        permanentLogger.info('INTELLIGENCE_DASHBOARD', 'Scraping completed successfully', {
          sessionId: result.sessionId,
          domain,
          totalItems: result.stats.totalItems,
          categoriesFound: result.stats.categoriesFound,
          userId: user.id,
          correlationId
        })
        
        EventFactory.intelligence('scraping_completed', {
          sessionId: result.sessionId,
          domain,
          stats: result.stats
        }, { correlationId })
        
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }

    } catch (err) {
      const jsError = err instanceof Error ? err : new Error(String(err))
      
      permanentLogger.captureError('INTELLIGENCE_DASHBOARD', jsError, {
        context: 'scraping_initiation',
        domain,
        userId: user.id,
        correlationId
      })
      
      setError(jsError.message)
      
      EventFactory.error(jsError, {
        code: 'SCRAPING_INIT_FAILED',
        retriable: true,
        context: { domain, userId: user.id }
      })
      
    } finally {
      setIsLoading(false)
    }
  }

  // Handle data updates from kanban
  const handleDataUpdate = useCallback(async (updatedData: IntelligenceData) => {
    setIntelligenceData(updatedData)
    
    if (!sessionId || !user) return
    
    try {
      permanentLogger.breadcrumb('INTELLIGENCE_DASHBOARD', 'Updating intelligence data', {
        sessionId,
        categoriesCount: Object.keys(updatedData.categories).length,
        userId: user.id,
        correlationId
      })
      
      await repository.updateSessionIntelligence(sessionId, {
        categories: updatedData.categories,
        metadata: {
          ...updatedData.metadata,
          lastUpdated: new Date().toISOString()
        }
      })
      
      EventFactory.intelligence('data_updated', {
        sessionId,
        categoriesCount: Object.keys(updatedData.categories).length
      }, { correlationId })
      
    } catch (error) {
      const jsError = error instanceof Error ? error : convertSupabaseError(error)
      permanentLogger.captureError('INTELLIGENCE_DASHBOARD', jsError, {
        context: 'data_update',
        sessionId,
        userId: user?.id,
        correlationId
      })
    }
  }, [sessionId, user, repository, correlationId])

  // Handle enrichment requests
  const handleEnrichmentRequest = useCallback(async (items: IntelligenceItem[]) => {
    if (!sessionId || !user) {
      throw new Error('Session or user not available')
    }
    
    const startTime = Date.now()
    
    try {
      permanentLogger.breadcrumb('INTELLIGENCE_DASHBOARD', 'Starting enrichment', {
        itemCount: items.length,
        sessionId,
        userId: user.id,
        correlationId
      })
      
      EventFactory.intelligence('enrichment_requested', {
        itemCount: items.length,
        sessionId
      }, { correlationId })
      
      const response = await fetch('/api/company-intelligence/v4/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: user.id,
          items,
          model: 'gpt-4',
          temperature: 0.7,
          extractStructured: true
        })
      })

      if (!response.ok) {
        throw new Error('Enrichment failed')
      }

      const enrichedData = await response.json()
      
      // Store enrichment results in repository
      await repository.storeEnrichmentResults(sessionId, enrichedData)
      
      // Update intelligence data with enriched items
      if (intelligenceData) {
        const updatedData = { ...intelligenceData }
        
        enrichedData.forEach((enrichedItem: any) => {
          // Find and update the item in the appropriate category
          Object.values(updatedData.categories).forEach(category => {
            const itemIndex = category.items.findIndex(item => item.id === enrichedItem.itemId)
            if (itemIndex !== -1) {
              category.items[itemIndex] = {
                ...category.items[itemIndex],
                enriched: true,
                enrichedAt: new Date().toISOString(),
                enrichmentData: enrichedItem.enrichedData,
                confidence: enrichedItem.confidence,
                enrichmentSessionId: sessionId
              }
            }
          })
        })
        
        setIntelligenceData(updatedData)
        
        const duration = Date.now() - startTime
        
        permanentLogger.info('INTELLIGENCE_DASHBOARD', 'Enrichment completed', {
          itemCount: items.length,
          duration,
          sessionId,
          userId: user.id,
          correlationId
        })
        
        EventFactory.intelligence('enrichment_completed', {
          itemCount: items.length,
          duration,
          sessionId
        }, { correlationId })
      }
      
    } catch (err) {
      const jsError = err instanceof Error ? err : convertSupabaseError(err)
      
      permanentLogger.captureError('INTELLIGENCE_DASHBOARD', jsError, {
        context: 'enrichment_request',
        itemCount: items.length,
        sessionId,
        userId: user?.id,
        correlationId
      })
      
      EventFactory.error(jsError, {
        code: 'ENRICHMENT_FAILED',
        retriable: true,
        context: { sessionId, itemCount: items.length }
      })
      
      throw jsError
    }
  }, [sessionId, user, intelligenceData, repository, correlationId])

  // Toggle category selection
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Select all/none categories
  const selectAllCategories = () => {
    setSelectedCategories(AVAILABLE_CATEGORIES.map(c => c.id))
  }

  const selectNoneCategories = () => {
    setSelectedCategories([])
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!intelligenceData ? (
        // Configuration Screen
        <div className="container mx-auto py-8 px-4">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6" />
                Company Intelligence Extractor
              </CardTitle>
              <CardDescription>
                Extract and organize company intelligence data from any website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Domain Input */}
              <div className="space-y-2">
                <Label htmlFor="domain">Company Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleStartScraping}
                    disabled={isLoading || !domain}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Start Scraping
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Configuration Options */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Scraper Type</Label>
                      <Select 
                        value={scraperType} 
                        onValueChange={(v) => setScraperType(v as ScraperType)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLAYWRIGHT">Playwright (Recommended)</SelectItem>
                          <SelectItem value="FIRECRAWL">Firecrawl API</SelectItem>
                          <SelectItem value="PUPPETEER">Puppeteer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Playwright handles dynamic content best
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Extraction Depth</Label>
                      <Select 
                        value={depth} 
                        onValueChange={(v) => setDepth(v as IntelligenceDepth)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IntelligenceDepth.SHALLOW}>
                            Shallow (5-10 pages)
                          </SelectItem>
                          <SelectItem value={IntelligenceDepth.DEEP}>
                            Deep (10-20 pages)
                          </SelectItem>
                          <SelectItem value={IntelligenceDepth.COMPREHENSIVE}>
                            Comprehensive (20+ pages)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Deeper extraction takes more time
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="categories" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Intelligence Categories</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={selectAllCategories}
                        disabled={isLoading}
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={selectNoneCategories}
                        disabled={isLoading}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_CATEGORIES.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                          disabled={isLoading}
                        />
                        <Label 
                          htmlFor={category.id}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2"
                        >
                          {category.metadata.name}
                          {category.default && (
                            <Badge variant="secondary" className="text-xs">
                              Recommended
                            </Badge>
                          )}
                          {category.metadata.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              High Priority
                            </Badge>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Selected: {selectedCategories.length} categories
                  </p>
                </TabsContent>
              </Tabs>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loading Progress */}
              {isLoading && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Scraping {domain}... This may take a few minutes depending on the site size and depth selected.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Kanban Interface
        <IntelligenceKanban
          sessionId={sessionId || ''}
          userId={user.id}
          companyDomain={domain}
          intelligenceData={intelligenceData}
          onDataUpdate={handleDataUpdate}
          onEnrichmentRequest={handleEnrichmentRequest}
        />
      )}
    </div>
  )
}