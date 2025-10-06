'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Palette, 
  Type, 
  Image as ImageIcon,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Moon,
  Sun,
  Zap,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandAssetsData {
  logo?: string | null
  favicon?: string | null
  colors?: string[]
  fonts?: string[]
  gradients?: string[]
  cssVariables?: Record<string, string>
  darkModeVariants?: {
    logo?: string
    colors?: string[]
  }
}

interface BrandAssetsPanelProps {
  brandAssets?: BrandAssetsData
  screenshot?: string
  onExport?: () => void
}

export function BrandAssetsPanel({
  brandAssets,
  screenshot,
  onExport
}: BrandAssetsPanelProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light')

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(itemId)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const calculateBrandScore = (): number => {
    let score = 0
    if (brandAssets?.logo) score += 20
    if (brandAssets?.favicon) score += 10
    if (brandAssets?.colors && brandAssets.colors.length > 0) score += 20
    if (brandAssets?.fonts && brandAssets.fonts.length > 0) score += 15
    if (brandAssets?.gradients && brandAssets.gradients.length > 0) score += 15
    if (brandAssets?.cssVariables && Object.keys(brandAssets.cssVariables).length > 0) score += 10
    if (brandAssets?.darkModeVariants) score += 10
    return score
  }

  const brandScore = calculateBrandScore()

  const getContrastRatio = (color: string): number => {
    // Simple contrast calculation (would need proper implementation)
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? 21 : 1
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Brand Assets
            </CardTitle>
            <CardDescription>
              Visual identity and design system elements
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Brand Score</span>
              <Progress value={brandScore} className="w-24 h-2" />
              <Badge variant={brandScore > 70 ? "default" : brandScore > 40 ? "secondary" : "outline"}>
                {brandScore}%
              </Badge>
            </div>
            {onExport && (
              <Button onClick={onExport} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="logos" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="logos">Logos</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="gradients">Gradients</TabsTrigger>
            <TabsTrigger value="variables">CSS Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="logos" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Main Logo */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Primary Logo
                </h4>
                {brandAssets?.logo ? (
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                    <img 
                      src={brandAssets.logo} 
                      alt="Company logo" 
                      className="max-h-24 max-w-full object-contain mx-auto"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(brandAssets.logo!, 'logo')}
                      >
                        {copiedItem === 'logo' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copy URL
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(brandAssets.logo!, '_blank')}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No logo detected</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Favicon */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Favicon
                </h4>
                {brandAssets?.favicon ? (
                  <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                    <img 
                      src={brandAssets.favicon} 
                      alt="Favicon" 
                      className="w-16 h-16 mx-auto"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(brandAssets.favicon!, 'favicon')}
                      >
                        {copiedItem === 'favicon' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        Copy URL
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No favicon detected</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Dark Mode Variants */}
              {brandAssets?.darkModeVariants?.logo && (
                <div className="col-span-2 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark Mode Logo
                  </h4>
                  <div className="border rounded-lg p-4 bg-gray-900">
                    <img 
                      src={brandAssets.darkModeVariants.logo} 
                      alt="Dark mode logo" 
                      className="max-h-24 max-w-full object-contain mx-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-4">
              {brandAssets?.colors && brandAssets.colors.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      Brand Colors ({brandAssets.colors.length})
                    </h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPreviewMode('light')}>
                        <Sun className={cn("h-3 w-3", previewMode === 'light' && "text-yellow-500")} />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPreviewMode('dark')}>
                        <Moon className={cn("h-3 w-3", previewMode === 'dark' && "text-blue-500")} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {brandAssets.colors.map((color, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer transition-all",
                          selectedColor === color && "ring-2 ring-blue-500",
                          previewMode === 'dark' ? "bg-gray-900" : "bg-white"
                        )}
                        onClick={() => setSelectedColor(color)}
                      >
                        <div 
                          className="w-full h-20 rounded mb-2 border-2"
                          style={{ backgroundColor: color }}
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-mono">{color}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {color.startsWith('#') ? 'HEX' : color.startsWith('rgb') ? 'RGB' : 'HSL'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(color, `color-${idx}`)
                              }}
                            >
                              {copiedItem === `color-${idx}` ? 
                                <CheckCircle className="h-3 w-3" /> : 
                                <Copy className="h-3 w-3" />
                              }
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedColor && (
                    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <h5 className="font-semibold mb-2">Color Details</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Value:</span>
                          <p className="font-mono">{selectedColor}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Contrast:</span>
                          <p>AA {getContrastRatio(selectedColor) > 4.5 ? '✓' : '✗'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No brand colors detected</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-4">
            {brandAssets?.fonts && brandAssets.fonts.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">
                  Font Families ({brandAssets.fonts.length})
                </h4>
                <div className="space-y-3">
                  {brandAssets.fonts.map((font, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          <span className="font-mono text-sm">{font}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(font, `font-${idx}`)}
                        >
                          {copiedItem === `font-${idx}` ? 
                            <CheckCircle className="h-3 w-3" /> : 
                            <Copy className="h-3 w-3" />
                          }
                        </Button>
                      </div>
                      <div 
                        className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900 rounded"
                        style={{ fontFamily: font }}
                      >
                        <p className="text-3xl">Aa Bb Cc</p>
                        <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
                        <p className="text-sm">0123456789 !@#$%^&*()</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No fonts detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="gradients" className="space-y-4">
            {brandAssets?.gradients && brandAssets.gradients.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Gradients ({brandAssets.gradients.length})
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {brandAssets.gradients.map((gradient, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div 
                        className="w-full h-24 rounded mb-2"
                        style={{ background: gradient }}
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-mono line-clamp-2">{gradient}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => copyToClipboard(gradient, `gradient-${idx}`)}
                        >
                          {copiedItem === `gradient-${idx}` ? 
                            <CheckCircle className="h-3 w-3 mr-2" /> : 
                            <Copy className="h-3 w-3 mr-2" />
                          }
                          Copy CSS
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No gradients detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            {brandAssets?.cssVariables && Object.keys(brandAssets.cssVariables).length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">
                  CSS Custom Properties ({Object.keys(brandAssets.cssVariables).length})
                </h4>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {Object.entries(brandAssets.cssVariables).map(([key, value]) => (
                      <div 
                        key={key}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
                      >
                        <div className="flex items-center gap-3">
                          {value.startsWith('#') || value.includes('rgb') || value.includes('hsl') ? (
                            <div 
                              className="w-8 h-8 rounded border-2"
                              style={{ backgroundColor: value }}
                            />
                          ) : null}
                          <div>
                            <p className="font-mono text-sm">{key}</p>
                            <p className="text-xs text-gray-500">{value}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(`${key}: ${value}`, `var-${key}`)}
                        >
                          {copiedItem === `var-${key}` ? 
                            <CheckCircle className="h-3 w-3" /> : 
                            <Copy className="h-3 w-3" />
                          }
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No CSS variables detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        {/* Screenshot Preview */}
        {screenshot && (
          <div className="mt-6 border-t pt-6">
            <h4 className="text-sm font-semibold mb-3">Website Preview</h4>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={screenshot} 
                alt="Website screenshot" 
                className="w-full h-auto"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}