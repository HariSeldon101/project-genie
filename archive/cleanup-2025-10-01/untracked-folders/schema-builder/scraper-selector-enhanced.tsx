/**
 * Enhanced Scraper Selector Component with Advanced Options
 * CLAUDE.md Compliant - Includes all scraper configuration options from spec
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import {
  Shield,
  Zap,
  Settings,
  Eye,
  EyeOff,
  Network,
  MousePointer
} from 'lucide-react'
import { ScraperType } from '@/lib/company-intelligence/types/intelligence-enums'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { calculateStealthScore, getStealthScoreDescription, getStealthScoreColor } from '@/lib/utils/scraper-scoring'

interface ScraperSelectorProps {
  currentScraper: ScraperType
  onScraperChange: (scraper: ScraperType) => void
  onConfigChange?: (config: any) => void
}

export function ScraperSelectorEnhanced({
  currentScraper,
  onScraperChange,
  onConfigChange
}: ScraperSelectorProps) {
  // Firecrawl advanced options
  const [firecrawlConfig, setFirecrawlConfig] = useState({
    useProxy: false,
    proxyCountry: 'US',
    proxyProvider: 'auto',
    rotating: true,
    residential: false,
    waitForSelector: '',
    timeout: 30000,
    formats: ['markdown', 'html', 'extract'],
    onlyMainContent: true,
    scrollToBottom: false,
    includePatterns: '',
    excludePatterns: '',
    rateLimit: 2,
    batchSize: 10
  })

  // Playwright advanced options
  const [playwrightConfig, setPlaywrightConfig] = useState({
    headless: true,
    stealthEnabled: true,
    stealthEvasions: [
      'chrome.runtime',
      'navigator.webdriver',
      'navigator.plugins'
    ],
    fingerprint: true,
    humanBehavior: true,
    userAgent: '',
    deviceEmulation: 'none',
    blockWebRTC: true,
    blockCanvasFingerprint: true,
    randomizeTimers: true,
    scrollBehavior: true,
    randomizeScroll: true,
    screenshot: false,
    fullPageScreenshot: false,
    blockResources: [] as string[],
    requestDelay: 1000,
    randomDelay: true
  })

  const handleScraperChange = useCallback((scraper: string) => {
    const scraperType = scraper as ScraperType
    onScraperChange(scraperType)
    
    permanentLogger.info('SCRAPER_SELECTOR', 'Scraper changed', {
      from: currentScraper,
      to: scraperType
    })
  }, [currentScraper, onScraperChange])

  const handleFirecrawlConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...firecrawlConfig, [key]: value }
    setFirecrawlConfig(newConfig)
    
    if (onConfigChange) {
      onConfigChange({
        scraperType: ScraperType.FIRECRAWL,
        ...newConfig
      })
    }
    
    permanentLogger.breadcrumb('firecrawl_config_change', 'Firecrawl config updated', {
      key,
      value
    })
  }, [firecrawlConfig, onConfigChange])

  const handlePlaywrightConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...playwrightConfig, [key]: value }
    setPlaywrightConfig(newConfig)
    
    if (onConfigChange) {
      onConfigChange({
        scraperType: ScraperType.PLAYWRIGHT,
        ...newConfig
      })
    }
    
    permanentLogger.breadcrumb('playwright_config_change', 'Playwright config updated', {
      key,
      value
    })
  }, [playwrightConfig, onConfigChange])

  const scraperInfo = {
    [ScraperType.FIRECRAWL]: {
      name: 'Firecrawl',
      description: 'Fast cloud-based scraper with proxy support',
      icon: <Zap className="h-5 w-5" />,
      pros: ['Fast execution', 'Proxy support', 'Structured extraction', 'Batch processing'],
      cons: ['API limits', 'Less control', 'Cost per page']
    },
    [ScraperType.PLAYWRIGHT]: {
      name: 'Playwright',
      description: 'Browser-based scraper with stealth capabilities',
      icon: <Eye className="h-5 w-5" />,
      pros: ['Full browser control', 'Stealth mode', 'JavaScript rendering', 'Screenshots'],
      cons: ['Slower', 'Resource intensive', 'Complex setup']
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Scraper Configuration
        </CardTitle>
        <CardDescription>
          Choose and configure your scraping method with advanced options
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Scraper Selection */}
        <div className="space-y-2">
          <Label>Scraper Type</Label>
          <Select value={currentScraper} onValueChange={handleScraperChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ScraperType).map(scraper => (
                <SelectItem key={scraper} value={scraper}>
                  <div className="flex items-center gap-2">
                    {scraperInfo[scraper].icon}
                    <span>{scraperInfo[scraper].name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Scraper Info */}
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {scraperInfo[currentScraper].icon}
              <span className="font-medium">{scraperInfo[currentScraper].name}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {scraperInfo[currentScraper].description}
            </p>
            <div className="flex gap-2 flex-wrap">
              {scraperInfo[currentScraper].pros.map(pro => (
                <Badge key={pro} variant="secondary" className="text-xs">
                  ✓ {pro}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Configuration */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="stealth">Stealth</TabsTrigger>
          </TabsList>

          {/* Firecrawl Configuration */}
          {currentScraper === ScraperType.FIRECRAWL && (
            <>
              <TabsContent value="basic" className="space-y-4">
                {/* Proxy Configuration */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Use Proxy
                    </Label>
                    <Switch
                      checked={firecrawlConfig.useProxy}
                      onCheckedChange={(checked) => 
                        handleFirecrawlConfigChange('useProxy', checked)
                      }
                    />
                  </div>
                  
                  {firecrawlConfig.useProxy && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-2">
                        <Label>Proxy Country</Label>
                        <Select 
                          value={firecrawlConfig.proxyCountry}
                          onValueChange={(value) => 
                            handleFirecrawlConfigChange('proxyCountry', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="JP">Japan</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <TooltipWrapper content="Use rotating IP addresses">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={firecrawlConfig.rotating}
                              onCheckedChange={(checked) => 
                                handleFirecrawlConfigChange('rotating', checked)
                              }
                            />
                            <Label className="text-sm">Rotating IPs</Label>
                          </div>
                        </TooltipWrapper>
                        
                        <TooltipWrapper content="Use residential proxies (higher quality)">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={firecrawlConfig.residential}
                              onCheckedChange={(checked) => 
                                handleFirecrawlConfigChange('residential', checked)
                              }
                            />
                            <Label className="text-sm">Residential</Label>
                          </div>
                        </TooltipWrapper>
                      </div>
                    </div>
                  )}
                </div>

                {/* Output Formats */}
                <div className="space-y-2">
                  <Label>Output Formats</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['markdown', 'html', 'extract', 'screenshot', 'text'].map(format => (
                      <TooltipWrapper key={format} content={`Include ${format} output`}>
                        <Badge
                          variant={firecrawlConfig.formats.includes(format) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const formats = firecrawlConfig.formats.includes(format)
                              ? firecrawlConfig.formats.filter(f => f !== format)
                              : [...firecrawlConfig.formats, format]
                            handleFirecrawlConfigChange('formats', formats)
                          }}
                        >
                          {format}
                        </Badge>
                      </TooltipWrapper>
                    ))}
                  </div>
                </div>

                {/* Timeout */}
                <div className="space-y-2">
                  <Label>Request Timeout (ms)</Label>
                  <Input
                    type="number"
                    value={firecrawlConfig.timeout}
                    onChange={(e) => 
                      handleFirecrawlConfigChange('timeout', parseInt(e.target.value))
                    }
                    min={5000}
                    max={120000}
                    step={1000}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {/* Wait for Selector */}
                <div className="space-y-2">
                  <Label>Wait for Selector</Label>
                  <Input
                    placeholder="e.g., .content-loaded"
                    value={firecrawlConfig.waitForSelector}
                    onChange={(e) => 
                      handleFirecrawlConfigChange('waitForSelector', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    CSS selector to wait for before extraction
                  </p>
                </div>

                {/* URL Patterns */}
                <div className="space-y-2">
                  <Label>Include URL Patterns</Label>
                  <Input
                    placeholder="e.g., /blog/*, /products/*"
                    value={firecrawlConfig.includePatterns}
                    onChange={(e) => 
                      handleFirecrawlConfigChange('includePatterns', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated patterns to include
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Exclude URL Patterns</Label>
                  <Input
                    placeholder="e.g., /admin/*, *.pdf"
                    value={firecrawlConfig.excludePatterns}
                    onChange={(e) => 
                      handleFirecrawlConfigChange('excludePatterns', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated patterns to exclude
                  </p>
                </div>

                {/* Performance */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rate Limit (req/s)</Label>
                    <Input
                      type="number"
                      value={firecrawlConfig.rateLimit}
                      onChange={(e) => 
                        handleFirecrawlConfigChange('rateLimit', parseInt(e.target.value))
                      }
                      min={1}
                      max={10}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value={firecrawlConfig.batchSize}
                      onChange={(e) => 
                        handleFirecrawlConfigChange('batchSize', parseInt(e.target.value))
                      }
                      min={1}
                      max={50}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stealth" className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Firecrawl includes built-in anti-detection features when using proxies.
                    No additional configuration needed.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </>
          )}

          {/* Playwright Configuration */}
          {currentScraper === ScraperType.PLAYWRIGHT && (
            <>
              <TabsContent value="basic" className="space-y-4">
                {/* Browser Mode */}
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Headless Mode
                  </Label>
                  <Switch
                    checked={playwrightConfig.headless}
                    onCheckedChange={(checked) => 
                      handlePlaywrightConfigChange('headless', checked)
                    }
                  />
                </div>

                {/* Device Emulation */}
                <div className="space-y-2">
                  <Label>Device Emulation</Label>
                  <Select 
                    value={playwrightConfig.deviceEmulation}
                    onValueChange={(value) => 
                      handlePlaywrightConfigChange('deviceEmulation', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No emulation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No emulation</SelectItem>
                      <SelectItem value="iPhone 12">iPhone 12</SelectItem>
                      <SelectItem value="iPhone 13 Pro Max">iPhone 13 Pro Max</SelectItem>
                      <SelectItem value="iPad Pro">iPad Pro</SelectItem>
                      <SelectItem value="Pixel 5">Pixel 5</SelectItem>
                      <SelectItem value="Galaxy S21">Galaxy S21</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Screenshots */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Take Screenshots</Label>
                    <Switch
                      checked={playwrightConfig.screenshot}
                      onCheckedChange={(checked) => 
                        handlePlaywrightConfigChange('screenshot', checked)
                      }
                    />
                  </div>
                  
                  {playwrightConfig.screenshot && (
                    <div className="flex items-center gap-2 pl-6">
                      <Switch
                        checked={playwrightConfig.fullPageScreenshot}
                        onCheckedChange={(checked) => 
                          handlePlaywrightConfigChange('fullPageScreenshot', checked)
                        }
                      />
                      <Label className="text-sm">Full page screenshot</Label>
                    </div>
                  )}
                </div>

                {/* Request Delay */}
                <div className="space-y-2">
                  <Label>Request Delay</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={playwrightConfig.requestDelay}
                      onChange={(e) => 
                        handlePlaywrightConfigChange('requestDelay', parseInt(e.target.value))
                      }
                      min={0}
                      max={10000}
                      step={100}
                      disabled={playwrightConfig.randomDelay}
                    />
                    <TooltipWrapper content="Use random delays for more human-like behavior">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={playwrightConfig.randomDelay}
                          onCheckedChange={(checked) => 
                            handlePlaywrightConfigChange('randomDelay', checked)
                          }
                        />
                        <Label className="text-sm whitespace-nowrap">Random</Label>
                      </div>
                    </TooltipWrapper>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {/* Resource Blocking */}
                <div className="space-y-2">
                  <Label>Block Resources</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Block resource types to improve performance
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {['image', 'stylesheet', 'font', 'script', 'media'].map(resource => (
                      <Badge
                        key={resource}
                        variant={playwrightConfig.blockResources.includes(resource) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const resources = playwrightConfig.blockResources.includes(resource)
                            ? playwrightConfig.blockResources.filter(r => r !== resource)
                            : [...playwrightConfig.blockResources, resource]
                          handlePlaywrightConfigChange('blockResources', resources)
                        }}
                      >
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Scroll Behavior */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      Scroll Behavior
                    </Label>
                    <Switch
                      checked={playwrightConfig.scrollBehavior}
                      onCheckedChange={(checked) => 
                        handlePlaywrightConfigChange('scrollBehavior', checked)
                      }
                    />
                  </div>
                  
                  {playwrightConfig.scrollBehavior && (
                    <div className="flex items-center gap-2 pl-6">
                      <Switch
                        checked={playwrightConfig.randomizeScroll}
                        onCheckedChange={(checked) => 
                          handlePlaywrightConfigChange('randomizeScroll', checked)
                        }
                      />
                      <Label className="text-sm">Randomize scroll patterns</Label>
                    </div>
                  )}
                </div>

                {/* User Agent */}
                <div className="space-y-2">
                  <Label>Custom User Agent</Label>
                  <Input
                    placeholder="Leave empty for auto-selection"
                    value={playwrightConfig.userAgent}
                    onChange={(e) => 
                      handlePlaywrightConfigChange('userAgent', e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom user agent string (optional)
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="stealth" className="space-y-4">
                {/* Stealth Mode */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Stealth Mode
                    </Label>
                    <Switch
                      checked={playwrightConfig.stealthEnabled}
                      onCheckedChange={(checked) => 
                        handlePlaywrightConfigChange('stealthEnabled', checked)
                      }
                    />
                  </div>
                  
                  {playwrightConfig.stealthEnabled && (
                    <div className="space-y-3">
                      {/* Evasions */}
                      <div className="space-y-2">
                        <Label className="text-sm">Evasion Techniques</Label>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            'chrome.runtime',
                            'navigator.webdriver',
                            'navigator.plugins',
                            'navigator.permissions',
                            'webgl.vendor',
                            'window.chrome'
                          ].map(evasion => (
                            <Badge
                              key={evasion}
                              variant={playwrightConfig.stealthEvasions.includes(evasion) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                const evasions = playwrightConfig.stealthEvasions.includes(evasion)
                                  ? playwrightConfig.stealthEvasions.filter(e => e !== evasion)
                                  : [...playwrightConfig.stealthEvasions, evasion]
                                handlePlaywrightConfigChange('stealthEvasions', evasions)
                              }}
                            >
                              {evasion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Advanced Anti-Detection */}
                      <div className="space-y-2">
                        <Label className="text-sm">Anti-Detection</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={playwrightConfig.fingerprint}
                              onCheckedChange={(checked) => 
                                handlePlaywrightConfigChange('fingerprint', checked)
                              }
                            />
                            <Label className="text-sm">Randomize fingerprint</Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={playwrightConfig.humanBehavior}
                              onCheckedChange={(checked) => 
                                handlePlaywrightConfigChange('humanBehavior', checked)
                              }
                            />
                            <Label className="text-sm">Human-like behavior</Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={playwrightConfig.blockWebRTC}
                              onCheckedChange={(checked) => 
                                handlePlaywrightConfigChange('blockWebRTC', checked)
                              }
                            />
                            <Label className="text-sm">Block WebRTC</Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={playwrightConfig.blockCanvasFingerprint}
                              onCheckedChange={(checked) => 
                                handlePlaywrightConfigChange('blockCanvasFingerprint', checked)
                              }
                            />
                            <Label className="text-sm">Block canvas fingerprint</Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={playwrightConfig.randomizeTimers}
                              onCheckedChange={(checked) => 
                                handlePlaywrightConfigChange('randomizeTimers', checked)
                              }
                            />
                            <Label className="text-sm">Randomize timers</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stealth Score */}
                {playwrightConfig.stealthEnabled && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Stealth Score</Label>
                      <Badge
                        variant="secondary"
                        className={getStealthScoreColor(calculateStealthScore(playwrightConfig))}
                      >
                        {calculateStealthScore(playwrightConfig)}/100
                      </Badge>
                    </div>
                    <TooltipWrapper content={getStealthScoreDescription(calculateStealthScore(playwrightConfig))}>
                      <Progress
                        value={calculateStealthScore(playwrightConfig)}
                        className="h-2"
                      />
                    </TooltipWrapper>
                    <p className="text-xs text-muted-foreground mt-2">
                      {getStealthScoreDescription(calculateStealthScore(playwrightConfig))}
                    </p>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Configuration Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <Label className="text-sm mb-2 block">Configuration Summary</Label>
          <div className="flex gap-2 flex-wrap">
            {currentScraper === ScraperType.FIRECRAWL ? (
              <>
                {firecrawlConfig.useProxy && (
                  <Badge variant="secondary" className="text-xs">
                    Proxy: {firecrawlConfig.proxyCountry}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  Formats: {firecrawlConfig.formats.length}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Timeout: {firecrawlConfig.timeout}ms
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Batch: {firecrawlConfig.batchSize}
                </Badge>
              </>
            ) : (
              <>
                {playwrightConfig.stealthEnabled && (
                  <TooltipWrapper content={getStealthScoreDescription(calculateStealthScore(playwrightConfig))}>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getStealthScoreColor(calculateStealthScore(playwrightConfig))}`}
                    >
                      Stealth: {calculateStealthScore(playwrightConfig)}%
                    </Badge>
                  </TooltipWrapper>
                )}
                <Badge variant="secondary" className="text-xs">
                  {playwrightConfig.headless ? 'Headless' : 'Visible'}
                </Badge>
                {playwrightConfig.screenshot && (
                  <Badge variant="secondary" className="text-xs">
                    Screenshots
                  </Badge>
                )}
                {playwrightConfig.blockResources.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Blocking: {playwrightConfig.blockResources.length}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

