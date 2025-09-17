'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Building2,
  GitBranch,
  Globe,
  Search,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Link,
  Package,
  Briefcase,
  Users,
  TrendingUp,
  Info
} from 'lucide-react'
import { eventBus } from '@/lib/notifications/event-bus'
import { EventPriority, EventSource } from '@/lib/notifications/types'
import { EventFactory } from '@/lib/realtime-events'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface CorporateEntity {
  id?: string
  name: string
  type: 'parent' | 'subsidiary' | 'sub_brand' | 'division' | 'joint_venture' | 'franchise' | 'affiliate'
  domain?: string
  website?: string
  brandAssets?: {
    logo?: string
    colors?: string[]
    fonts?: string[]
  }
  confidence: number
  indicators: string[]
  relationship?: string
}

interface CorporateStructureDetectorProps {
  domain: string
  scrapedData?: any
  onStructureDetected?: (structure: CorporateStructure) => void
}

interface CorporateStructure {
  parentCompany?: CorporateEntity
  currentEntity: CorporateEntity
  subsidiaries: CorporateEntity[]
  subBrands: CorporateEntity[]
  relatedEntities: CorporateEntity[]
  hasMultipleBrands: boolean
  structureType: 'standalone' | 'subsidiary' | 'parent' | 'conglomerate'
}

export function CorporateStructureDetector({ 
  domain, 
  scrapedData,
  onStructureDetected 
}: CorporateStructureDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [structure, setStructure] = useState<CorporateStructure | null>(null)
  const [detectionProgress, setDetectionProgress] = useState(0)
  const [detectionStage, setDetectionStage] = useState('')
  
  useEffect(() => {
    if (scrapedData) {
      analyzeForCorporateStructure()
    }
  }, [scrapedData])
  
  const analyzeForCorporateStructure = async () => {
    setIsAnalyzing(true)
    setDetectionProgress(0)
    
    try {
      permanentLogger.info('Starting corporate structure analysis', { category: 'CORPORATE_DETECTOR', domain,
        hasScrapedData: !!scrapedData,
        pageCount: scrapedData?.pages?.length || 0 })
      
      // Stage 1: Analyze for parent company indicators
      setDetectionStage('Detecting parent company...')
      setDetectionProgress(20)
      const parentIndicators = detectParentCompany(scrapedData)
      
      // Stage 2: Look for subsidiaries and brands
      setDetectionStage('Searching for subsidiaries and brands...')
      setDetectionProgress(40)
      const subsidiaries = detectSubsidiaries(scrapedData)
      const subBrands = detectSubBrands(scrapedData)
      
      // Stage 3: Analyze footer and about pages
      setDetectionStage('Analyzing corporate information...')
      setDetectionProgress(60)
      const footerInfo = analyzeFooterForCorporateInfo(scrapedData)
      const aboutInfo = analyzeAboutPageForStructure(scrapedData)
      
      // Stage 4: Check for "Our Brands" or portfolio sections
      setDetectionStage('Checking brand portfolio...')
      setDetectionProgress(80)
      const brandPortfolio = detectBrandPortfolio(scrapedData)
      
      // Stage 5: Compile structure
      setDetectionStage('Compiling corporate structure...')
      setDetectionProgress(100)
      
      const detectedStructure: CorporateStructure = {
        currentEntity: {
          name: extractCompanyName(scrapedData) || domain,
          type: parentIndicators.isParent ? 'parent' : 'subsidiary',
          domain,
          confidence: 1.0,
          indicators: []
        },
        parentCompany: parentIndicators.parentCompany,
        subsidiaries: [...subsidiaries, ...footerInfo.subsidiaries],
        subBrands: [...subBrands, ...brandPortfolio],
        relatedEntities: aboutInfo.relatedEntities,
        hasMultipleBrands: subBrands.length > 0 || brandPortfolio.length > 0,
        structureType: determineStructureType(parentIndicators, subsidiaries, subBrands)
      }
      
      setStructure(detectedStructure)
      
      if (onStructureDetected) {
        onStructureDetected(detectedStructure)
      }
      
      permanentLogger.info('Corporate structure analysis complete', { category: 'CORPORATE_DETECTOR', structureType: detectedStructure.structureType,
        hasParent: !!detectedStructure.parentCompany,
        subsidiaryCount: detectedStructure.subsidiaries.length,
        brandCount: detectedStructure.subBrands.length })
      
      // Show toast with results
      if (detectedStructure.hasMultipleBrands) {
        eventBus.emit(EventFactory.notification(
          `[CORPORATE] Found ${detectedStructure.subsidiaries.length + detectedStructure.subBrands.length} related brands/entities`,
          'success',
          {
            source: EventSource.CLIENT,
            metadata: {
              priority: EventPriority.NORMAL,
              persistent: true
            }
          }))
      } else if (detectedStructure.parentCompany) {
        eventBus.emit(EventFactory.notification(
          `[CORPORATE] This appears to be part of ${detectedStructure.parentCompany.name}`,
          'info',
          {
            source: EventSource.CLIENT,
            metadata: {
              priority: EventPriority.NORMAL,
              persistent: true
            }
          }))
      }
      
    } catch (error) {
      permanentLogger.captureError('CORPORATE_DETECTOR', new Error('Failed to analyze corporate structure'), {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      eventBus.emit(EventFactory.notification(
        '[CORPORATE] Failed to analyze corporate structure',
        'error',
        {
          source: EventSource.CLIENT,
          metadata: {
            priority: EventPriority.HIGH,
            persistent: true
          }
        }))
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  // Detection helper functions
  const detectParentCompany = (data: any): { isParent: boolean, parentCompany?: CorporateEntity } => {
    const indicators = []
    let parentCompany: CorporateEntity | undefined
    
    // Check for "Part of", "A division of", "Owned by" patterns
    const parentPatterns = [
      /part of ([A-Z][A-Za-z\s&]+)/gi,
      /a division of ([A-Z][A-Za-z\s&]+)/gi,
      /owned by ([A-Z][A-Za-z\s&]+)/gi,
      /subsidiary of ([A-Z][A-Za-z\s&]+)/gi,
      /member of ([A-Z][A-Za-z\s&]+) group/gi
    ]
    
    if (data?.pages) {
      for (const page of data.pages) {
        const content = page.content || ''
        for (const pattern of parentPatterns) {
          const match = pattern.exec(content)
          if (match) {
            indicators.push(`Found parent reference: "${match[0]}"`)
            parentCompany = {
              name: match[1].trim(),
              type: 'parent',
              confidence: 0.9,
              indicators: [match[0]]
            }
            break
          }
        }
      }
    }
    
    return {
      isParent: indicators.length === 0,
      parentCompany
    }
  }
  
  const detectSubsidiaries = (data: any): CorporateEntity[] => {
    const subsidiaries: CorporateEntity[] = []
    const subsidiaryPatterns = [
      /our subsidiaries include ([^.]+)/gi,
      /subsidiaries:?\s*([^.]+)/gi,
      /operates through.*?subsidiaries.*?including ([^.]+)/gi
    ]
    
    if (data?.pages) {
      for (const page of data.pages) {
        const content = page.content || ''
        for (const pattern of subsidiaryPatterns) {
          const matches = content.matchAll(pattern)
          for (const match of matches) {
            const entities = match[1].split(/,|and/).map(s => s.trim())
            entities.forEach(entity => {
              if (entity && entity.length > 2) {
                subsidiaries.push({
                  name: entity,
                  type: 'subsidiary',
                  confidence: 0.8,
                  indicators: ['Found in subsidiary list']
                })
              }
            })
          }
        }
      }
    }
    
    return subsidiaries
  }
  
  const detectSubBrands = (data: any): CorporateEntity[] => {
    const brands: CorporateEntity[] = []
    const brandPatterns = [
      /our brands:?\s*([^.]+)/gi,
      /brand portfolio:?\s*([^.]+)/gi,
      /we own.*?brands.*?including ([^.]+)/gi,
      /family of brands.*?([^.]+)/gi
    ]
    
    if (data?.pages) {
      for (const page of data.pages) {
        const content = page.content || ''
        for (const pattern of brandPatterns) {
          const matches = content.matchAll(pattern)
          for (const match of matches) {
            const entities = match[1].split(/,|and/).map(s => s.trim())
            entities.forEach(entity => {
              if (entity && entity.length > 2) {
                brands.push({
                  name: entity,
                  type: 'sub_brand',
                  confidence: 0.85,
                  indicators: ['Found in brand portfolio']
                })
              }
            })
          }
        }
      }
    }
    
    return brands
  }
  
  const analyzeFooterForCorporateInfo = (data: any): { subsidiaries: CorporateEntity[] } => {
    // Footer often contains corporate structure information
    const subsidiaries: CorporateEntity[] = []
    
    // This would analyze footer content for corporate info
    // Placeholder implementation
    
    return { subsidiaries }
  }
  
  const analyzeAboutPageForStructure = (data: any): { relatedEntities: CorporateEntity[] } => {
    // About pages often describe corporate structure
    const relatedEntities: CorporateEntity[] = []
    
    // Find and analyze about page
    if (data?.pages) {
      const aboutPage = data.pages.find((p: any) => 
        p.url?.includes('/about') || 
        p.url?.includes('/company') ||
        p.title?.toLowerCase().includes('about')
      )
      
      if (aboutPage) {
        // Analyze about page content
        // Placeholder implementation
      }
    }
    
    return { relatedEntities }
  }
  
  const detectBrandPortfolio = (data: any): CorporateEntity[] => {
    const portfolio: CorporateEntity[] = []
    
    // Look for dedicated brand/portfolio pages
    if (data?.pages) {
      const portfolioPage = data.pages.find((p: any) => 
        p.url?.includes('/brands') || 
        p.url?.includes('/portfolio') ||
        p.url?.includes('/our-companies')
      )
      
      if (portfolioPage) {
        // Extract brands from portfolio page
        // Placeholder implementation
      }
    }
    
    return portfolio
  }
  
  const extractCompanyName = (data: any): string | null => {
    // Extract company name from metadata or content
    if (data?.brandAssets?.ogSiteName) {
      return data.brandAssets.ogSiteName
    }
    if (data?.pages?.[0]?.title) {
      // Extract from homepage title
      const title = data.pages[0].title
      const match = title.match(/^([^|–-]+)/)?.[1]?.trim()
      return match || null
    }
    return null
  }
  
  const determineStructureType = (
    parentIndicators: any, 
    subsidiaries: CorporateEntity[], 
    brands: CorporateEntity[]
  ): CorporateStructure['structureType'] => {
    if (subsidiaries.length > 3 || brands.length > 3) {
      return 'conglomerate'
    }
    if (parentIndicators.parentCompany) {
      return 'subsidiary'
    }
    if (subsidiaries.length > 0 || brands.length > 0) {
      return 'parent'
    }
    return 'standalone'
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Corporate Structure Analysis
        </CardTitle>
        <CardDescription>
          Detect parent companies, subsidiaries, and sub-brands
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">{detectionStage}</span>
            </div>
            <Progress value={detectionProgress} className="h-2" />
          </div>
        )}
        
        {!isAnalyzing && !structure && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Corporate structure will be analyzed during the scraping phase.
              This helps identify all related brands and subsidiaries for comprehensive data extraction.
            </AlertDescription>
          </Alert>
        )}
        
        {structure && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
              <TabsTrigger value="subsidiaries">Subsidiaries</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Structure Type</span>
                  <Badge variant="outline" className="text-base">
                    {structure.structureType}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Current Entity</span>
                  <div className="font-medium">{structure.currentEntity.name}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {structure.parentCompany ? '1' : '0'}
                    </div>
                    <p className="text-xs text-muted-foreground">Parent Company</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {structure.subsidiaries.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Subsidiaries</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {structure.subBrands.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Sub-Brands</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="parent" className="space-y-4">
              {structure.parentCompany ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-lg">
                          {structure.parentCompany.name}
                        </div>
                        <Badge>{structure.parentCompany.type}</Badge>
                      </div>
                      {structure.parentCompany.domain && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4" />
                          <a 
                            href={`https://${structure.parentCompany.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {structure.parentCompany.domain}
                          </a>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Confidence: {(structure.parentCompany.confidence * 100).toFixed(0)}%
                      </div>
                      {structure.parentCompany.indicators.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Indicators:</span>
                          {structure.parentCompany.indicators.map((indicator, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              • {indicator}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No parent company detected. This appears to be an independent entity.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="subsidiaries" className="space-y-4">
              {structure.subsidiaries.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {structure.subsidiaries.map((subsidiary, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">{subsidiary.name}</div>
                              {subsidiary.domain && (
                                <div className="text-xs text-muted-foreground">
                                  {subsidiary.domain}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {(subsidiary.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                              <Button size="sm" variant="ghost">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No subsidiaries detected for this entity.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="brands" className="space-y-4">
              {structure.subBrands.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-2 gap-3">
                    {structure.subBrands.map((brand, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div className="font-medium">{brand.name}</div>
                            </div>
                            {brand.domain && (
                              <div className="text-xs text-muted-foreground">
                                {brand.domain}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={brand.confidence * 100} 
                                className="h-1 flex-1"
                              />
                              <span className="text-xs text-muted-foreground">
                                {(brand.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No sub-brands detected. This entity may not have a brand portfolio.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        )}
        
        {structure && structure.hasMultipleBrands && (
          <Alert className="mt-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Multiple brands detected!</strong> We'll automatically discover and scrape all related 
              brand websites to provide comprehensive corporate intelligence.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}