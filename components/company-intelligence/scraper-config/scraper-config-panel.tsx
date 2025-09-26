'use client'

/**
 * Scraper Configuration Panel
 *
 * UI for configuring v3 scrapers with their native features
 * Shows how to leverage Firecrawl and Playwright capabilities
 *
 * KEY FEATURES:
 * - Firecrawl: Map discovery, schema extraction, screenshots
 * - Playwright: Anti-detection, session persistence, stealth
 * - Cost estimation based on features
 * - Preset configurations for common use cases
 */

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  Code,
  Shield,
  DollarSign,
  Zap,
  Eye,
  FileText,
  Map,
  Brain,
  Lock,
  MousePointer,
  Clock,
  Layers
} from 'lucide-react'

import type { FirecrawlConfig } from '@/lib/company-intelligence/scrapers-v3/config/firecrawl.config'
import type { PlaywrightConfig } from '@/lib/company-intelligence/scrapers-v3/config/playwright.config'
import {
  FIRECRAWL_PRESETS,
  calculateFirecrawlCost
} from '@/lib/company-intelligence/scrapers-v3/config/firecrawl.config'
import {
  PLAYWRIGHT_PRESETS,
  calculateStealthScore
} from '@/lib/company-intelligence/scrapers-v3/config/playwright.config'

interface ScraperConfigPanelProps {
  onConfigChange?: (scraper: 'firecrawl' | 'playwright', config: any) => void
  estimatedPages?: number
}

export function ScraperConfigPanel({
  onConfigChange,
  estimatedPages = 10
}: ScraperConfigPanelProps) {
  // Firecrawl configuration state
  const [firecrawlConfig, setFirecrawlConfig] = useState<FirecrawlConfig>(
    FIRECRAWL_PRESETS.quick
  )

  // Playwright configuration state
  const [playwrightConfig, setPlaywrightConfig] = useState<PlaywrightConfig>(
    PLAYWRIGHT_PRESETS.balanced
  )

  // Active tab
  const [activeTab, setActiveTab] = useState<'firecrawl' | 'playwright'>('firecrawl')

  // Update Firecrawl config
  const updateFirecrawlConfig = (path: string, value: any) => {
    const newConfig = { ...firecrawlConfig }
    const keys = path.split('.')
    let current: any = newConfig

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value

    setFirecrawlConfig(newConfig)
    onConfigChange?.('firecrawl', newConfig)
  }

  // Update Playwright config
  const updatePlaywrightConfig = (path: string, value: any) => {
    const newConfig = { ...playwrightConfig }
    const keys = path.split('.')
    let current: any = newConfig

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value

    setPlaywrightConfig(newConfig)
    onConfigChange?.('playwright', newConfig)
  }

  // Calculate costs
  const firecrawlCost = calculateFirecrawlCost(firecrawlConfig, estimatedPages)
  const playwrightCost = estimatedPages * 0.01 // Base cost for Playwright
  const stealthScore = calculateStealthScore(playwrightConfig)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Scraper Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Configure native scraper features for optimal data extraction
        </p>
      </div>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Presets
          </CardTitle>
          <CardDescription>
            Pre-configured settings for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFirecrawlConfig(FIRECRAWL_PRESETS.discovery)
                setActiveTab('firecrawl')
              }}
            >
              <Map className="h-4 w-4 mr-1" />
              Discovery
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFirecrawlConfig(FIRECRAWL_PRESETS.comprehensive)
                setActiveTab('firecrawl')
              }}
            >
              <Layers className="h-4 w-4 mr-1" />
              Comprehensive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPlaywrightConfig(PLAYWRIGHT_PRESETS.maximum_stealth)
                setActiveTab('playwright')
              }}
            >
              <Shield className="h-4 w-4 mr-1" />
              Max Stealth
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPlaywrightConfig(PLAYWRIGHT_PRESETS.fast)
                setActiveTab('playwright')
              }}
            >
              <Zap className="h-4 w-4 mr-1" />
              Fast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="firecrawl">
            <Globe className="h-4 w-4 mr-2" />
            Firecrawl AI
          </TabsTrigger>
          <TabsTrigger value="playwright">
            <Code className="h-4 w-4 mr-2" />
            Playwright
          </TabsTrigger>
        </TabsList>

        {/* Firecrawl Configuration */}
        <TabsContent value="firecrawl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Features</CardTitle>
              <CardDescription>
                Native Firecrawl capabilities that replace custom code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <TooltipWrapper content="Instantly discover all URLs on a website (replaces sitemap-discovery.ts)">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="map" className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      URL Discovery (Map API)
                    </Label>
                    <Switch
                      id="map"
                      checked={firecrawlConfig.features.map}
                      onCheckedChange={(v) => updateFirecrawlConfig('features.map', v)}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="AI-powered data extraction with schemas (replaces 6 extractors)">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="extract" className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Smart Extraction
                    </Label>
                    <Switch
                      id="extract"
                      checked={firecrawlConfig.features.extract}
                      onCheckedChange={(v) => updateFirecrawlConfig('features.extract', v)}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Convert HTML to clean markdown for LLMs">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="markdown" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Markdown Conversion
                    </Label>
                    <Switch
                      id="markdown"
                      checked={firecrawlConfig.features.markdown}
                      onCheckedChange={(v) => updateFirecrawlConfig('features.markdown', v)}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Capture full-page screenshots">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="screenshots" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Screenshots
                    </Label>
                    <Switch
                      id="screenshots"
                      checked={firecrawlConfig.features.screenshots}
                      onCheckedChange={(v) => updateFirecrawlConfig('features.screenshots', v)}
                    />
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Enable page interactions (click, scroll, wait)">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="actions" className="flex items-center gap-2">
                      <MousePointer className="h-4 w-4" />
                      Dynamic Actions
                    </Label>
                    <Switch
                      id="actions"
                      checked={firecrawlConfig.features.actions}
                      onCheckedChange={(v) => updateFirecrawlConfig('features.actions', v)}
                    />
                  </div>
                </TooltipWrapper>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anti-Detection</CardTitle>
              <CardDescription>
                Avoid blocking and rate limiting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipWrapper content="Use residential proxies to avoid detection">
                <div className="flex items-center justify-between">
                  <Label htmlFor="proxy" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Stealth Proxies
                  </Label>
                  <Switch
                    id="proxy"
                    checked={firecrawlConfig.stealth.useProxy}
                    onCheckedChange={(v) => updateFirecrawlConfig('stealth.useProxy', v)}
                  />
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Requests per second (lower = more human-like)">
                <div className="space-y-2">
                  <Label htmlFor="rate" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Rate Limit: {firecrawlConfig.stealth.rateLimit} req/s
                  </Label>
                  <Slider
                    id="rate"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={[firecrawlConfig.stealth.rateLimit]}
                    onValueChange={([v]) => updateFirecrawlConfig('stealth.rateLimit', v)}
                  />
                </div>
              </TooltipWrapper>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Extraction Schema</CardTitle>
              <CardDescription>
                Choose data structure for extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={firecrawlConfig.extraction.schemaType}
                onValueChange={(v) => updateFirecrawlConfig('extraction.schemaType', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company Information</SelectItem>
                  <SelectItem value="ecommerce">E-commerce Products</SelectItem>
                  <SelectItem value="blog">Blog/News Articles</SelectItem>
                  <SelectItem value="custom">Custom Schema</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playwright Configuration */}
        <TabsContent value="playwright" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anti-Detection Suite</CardTitle>
              <CardDescription>
                Enterprise-grade stealth features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TooltipWrapper content="Hides all automation signals">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stealth-plugin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Stealth Plugin
                  </Label>
                  <Switch
                    id="stealth-plugin"
                    checked={playwrightConfig.stealth.plugins.stealth}
                    onCheckedChange={(v) => updatePlaywrightConfig('stealth.plugins.stealth', v)}
                  />
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Randomize browser fingerprint">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fingerprint" className="flex items-center gap-2">
                    Random Fingerprint
                  </Label>
                  <Switch
                    id="fingerprint"
                    checked={playwrightConfig.stealth.fingerprint.randomizeViewport}
                    onCheckedChange={(v) => updatePlaywrightConfig('stealth.fingerprint.randomizeViewport', v)}
                  />
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Simulate human mouse movements and delays">
                <div className="flex items-center justify-between">
                  <Label htmlFor="human-behavior" className="flex items-center gap-2">
                    Human Behavior
                  </Label>
                  <Switch
                    id="human-behavior"
                    checked={playwrightConfig.stealth.behavior.humanizeMouseMovement}
                    onCheckedChange={(v) => updatePlaywrightConfig('stealth.behavior.humanizeMouseMovement', v)}
                  />
                </div>
              </TooltipWrapper>

              <TooltipWrapper content="Persist cookies between sessions">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cookies" className="flex items-center gap-2">
                    Session Persistence
                  </Label>
                  <Switch
                    id="cookies"
                    checked={playwrightConfig.stealth.session.persistCookies}
                    onCheckedChange={(v) => updatePlaywrightConfig('stealth.session.persistCookies', v)}
                  />
                </div>
              </TooltipWrapper>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Stealth Score</span>
                  <Badge variant={stealthScore > 70 ? "default" : stealthScore > 40 ? "secondary" : "outline"}>
                    {stealthScore}/100
                  </Badge>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${stealthScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resource Management</CardTitle>
              <CardDescription>
                Control what gets loaded for better performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TooltipWrapper content="Block image loading">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="block-images"
                      checked={playwrightConfig.resources.blockImages}
                      onCheckedChange={(v) => updatePlaywrightConfig('resources.blockImages', v)}
                    />
                    <Label htmlFor="block-images" className="text-sm">Block Images</Label>
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Block stylesheets">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="block-css"
                      checked={playwrightConfig.resources.blockStylesheets}
                      onCheckedChange={(v) => updatePlaywrightConfig('resources.blockStylesheets', v)}
                    />
                    <Label htmlFor="block-css" className="text-sm">Block CSS</Label>
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Block font loading">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="block-fonts"
                      checked={playwrightConfig.resources.blockFonts}
                      onCheckedChange={(v) => updatePlaywrightConfig('resources.blockFonts', v)}
                    />
                    <Label htmlFor="block-fonts" className="text-sm">Block Fonts</Label>
                  </div>
                </TooltipWrapper>

                <TooltipWrapper content="Block media files">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="block-media"
                      checked={playwrightConfig.resources.blockMedia}
                      onCheckedChange={(v) => updatePlaywrightConfig('resources.blockMedia', v)}
                    />
                    <Label htmlFor="block-media" className="text-sm">Block Media</Label>
                  </div>
                </TooltipWrapper>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="browser">Browser Engine</Label>
                  <Select
                    value={playwrightConfig.browser.type}
                    onValueChange={(v) => updatePlaywrightConfig('browser.type', v)}
                  >
                    <SelectTrigger id="browser">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chromium">Chromium</SelectItem>
                      <SelectItem value="firefox">Firefox</SelectItem>
                      <SelectItem value="webkit">WebKit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="headless">Mode</Label>
                  <Select
                    value={playwrightConfig.browser.headless ? "headless" : "headed"}
                    onValueChange={(v) => updatePlaywrightConfig('browser.headless', v === "headless")}
                  >
                    <SelectTrigger id="headless">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headless">Headless</SelectItem>
                      <SelectItem value="headed">Headed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Estimation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Estimation
          </CardTitle>
          <CardDescription>
            Estimated cost for {estimatedPages} pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Firecrawl</div>
              <div className="text-2xl font-bold">
                ${firecrawlCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                ${(firecrawlCost / estimatedPages).toFixed(3)} per page
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Playwright</div>
              <div className="text-2xl font-bold">
                ${playwrightCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                ${(playwrightCost / estimatedPages).toFixed(3)} per page
              </div>
            </div>
          </div>

          {firecrawlConfig.features.extract && (
            <Alert className="mt-4">
              <Brain className="h-4 w-4" />
              <AlertDescription>
                Schema extraction adds ~$0.10 per page but replaces 6 custom extractors
              </AlertDescription>
            </Alert>
          )}

          {playwrightConfig.stealth.proxy.enabled && (
            <Alert className="mt-4">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Proxy usage adds ~$0.05 per page for enhanced privacy
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Benefits Summary */}
      <Card>
        <CardHeader>
          <CardTitle>v3 Benefits</CardTitle>
          <CardDescription>
            Why native features are better
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Instead of custom code:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• URL validation (573 lines) → Native</li>
                <li>• 6 extractors (3,600 lines) → Schemas</li>
                <li>• Sitemap parsing (400 lines) → Map API</li>
                <li>• Cookie management (200 lines) → Browser</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">You get:</h4>
              <ul className="space-y-1 text-sm text-green-600 dark:text-green-400">
                <li>✓ 86% less code to maintain</li>
                <li>✓ 3x more features</li>
                <li>✓ Enterprise anti-detection</li>
                <li>✓ Automatic updates from services</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}