'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Image as ImageIcon,
  Download,
  ExternalLink,
  Maximize2,
  Grid,
  List,
  Filter,
  Search,
  AlertCircle,
  FileImage,
  Palette,
  Sparkles,
  Copy,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageData {
  src: string
  alt?: string
  width?: number
  height?: number
  type?: string
  size?: number
  isLogo?: boolean
  isFavicon?: boolean
  isHero?: boolean
  isBackground?: boolean
  isIcon?: boolean
  format?: string
}

interface ImageGalleryProps {
  images?: ImageData[]
  logos?: string[]
  favicons?: string[]
  screenshots?: string[]
  onImageSelect?: (image: ImageData) => void
}

export function ImageGallery({
  images = [],
  logos = [],
  favicons = [],
  screenshots = [],
  onImageSelect
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Combine all image sources into unified format
  const allImages: ImageData[] = [
    ...logos.map(src => ({ src, isLogo: true, type: 'logo' })),
    ...favicons.map(src => ({ src, isFavicon: true, type: 'favicon' })),
    ...screenshots.map(src => ({ src, type: 'screenshot' })),
    ...images
  ]

  // Categorize images
  const categorizedImages = {
    logos: allImages.filter(img => img.isLogo),
    favicons: allImages.filter(img => img.isFavicon),
    heroes: allImages.filter(img => img.isHero),
    backgrounds: allImages.filter(img => img.isBackground),
    icons: allImages.filter(img => img.isIcon),
    screenshots: allImages.filter(img => img.type === 'screenshot'),
    general: allImages.filter(img => 
      !img.isLogo && !img.isFavicon && !img.isHero && 
      !img.isBackground && !img.isIcon && img.type !== 'screenshot'
    )
  }

  const getFilteredImages = () => {
    let filtered = filterType === 'all' ? allImages : categorizedImages[filterType as keyof typeof categorizedImages] || []
    
    if (searchQuery) {
      filtered = filtered.filter(img => 
        img.src.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.alt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return filtered
  }

  const handleImageClick = (image: ImageData) => {
    setSelectedImage(image)
    onImageSelect?.(image)
  }

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const getImageDimensions = (image: ImageData): string => {
    if (image.width && image.height) {
      return `${image.width}x${image.height}`
    }
    return 'Unknown'
  }

  const getImageFormat = (src: string): string => {
    const extension = src.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(extension || '')) {
      return extension?.toUpperCase() || 'Unknown'
    }
    return 'Unknown'
  }

  const filteredImages = getFilteredImages()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Gallery
            </CardTitle>
            <CardDescription>
              {allImages.length} images discovered • {filteredImages.length} shown
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters and Search */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search images..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Images</option>
              <option value="logos">Logos</option>
              <option value="favicons">Favicons</option>
              <option value="heroes">Hero Images</option>
              <option value="backgrounds">Backgrounds</option>
              <option value="icons">Icons</option>
              <option value="screenshots">Screenshots</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Category Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                All ({allImages.length})
              </TabsTrigger>
              {categorizedImages.logos.length > 0 && (
                <TabsTrigger value="logos">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Logos ({categorizedImages.logos.length})
                </TabsTrigger>
              )}
              {categorizedImages.screenshots.length > 0 && (
                <TabsTrigger value="screenshots">
                  <FileImage className="h-3 w-3 mr-1" />
                  Screenshots ({categorizedImages.screenshots.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all">
              {filteredImages.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-4 gap-4 p-2">
                      {filteredImages.map((image, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleImageClick(image)}
                        >
                          <div className="aspect-square bg-gray-50 dark:bg-gray-900 p-2">
                            <img
                              src={image.src}
                              alt={image.alt || 'Image'}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-2 space-y-1">
                            <div className="flex items-center gap-1">
                              {image.isLogo && <Badge variant="secondary" className="text-xs">Logo</Badge>}
                              {image.isFavicon && <Badge variant="secondary" className="text-xs">Favicon</Badge>}
                              {image.isHero && <Badge variant="secondary" className="text-xs">Hero</Badge>}
                              <Badge variant="outline" className="text-xs">
                                {getImageFormat(image.src)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {image.alt || image.src.split('/').pop()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredImages.map((image, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => handleImageClick(image)}
                        >
                          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded p-1">
                            <img
                              src={image.src}
                              alt={image.alt || 'Image'}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {image.alt || image.src.split('/').pop()}
                              </p>
                              {image.isLogo && <Badge variant="secondary" className="text-xs">Logo</Badge>}
                              {image.isFavicon && <Badge variant="secondary" className="text-xs">Favicon</Badge>}
                            </div>
                            <p className="text-xs text-gray-500">{image.src}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{getImageDimensions(image)}</span>
                              <span>•</span>
                              <span>{getImageFormat(image.src)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyImageUrl(image.src)
                              }}
                            >
                              {copiedUrl === image.src ? 
                                <CheckCircle className="h-4 w-4" /> : 
                                <Copy className="h-4 w-4" />
                              }
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(image.src, '_blank')
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchQuery ? 'No images found matching your search' : 'No images discovered'}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="logos">
              {categorizedImages.logos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {categorizedImages.logos.map((logo, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white dark:bg-gray-900">
                      <img
                        src={logo.src}
                        alt="Logo"
                        className="w-full h-24 object-contain mb-2"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => copyImageUrl(logo.src)}
                      >
                        {copiedUrl === logo.src ? 
                          <CheckCircle className="h-3 w-3 mr-2" /> : 
                          <Copy className="h-3 w-3 mr-2" />
                        }
                        Copy URL
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No logos found</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="screenshots">
              {categorizedImages.screenshots.length > 0 ? (
                <div className="space-y-4">
                  {categorizedImages.screenshots.map((screenshot, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <img
                        src={screenshot.src}
                        alt="Screenshot"
                        className="w-full h-auto"
                      />
                      <div className="p-3 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <span className="text-sm">Screenshot {idx + 1}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(screenshot.src, '_blank')}
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          View Full
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No screenshots available</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Image Preview Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            {selectedImage && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.alt || 'Image'}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {selectedImage.alt || selectedImage.src.split('/').pop()}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyImageUrl(selectedImage.src)}
                      >
                        {copiedUrl === selectedImage.src ? 
                          <CheckCircle className="h-4 w-4" /> : 
                          <Copy className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedImage.src, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><strong>URL:</strong> {selectedImage.src}</p>
                    <p><strong>Format:</strong> {getImageFormat(selectedImage.src)}</p>
                    <p><strong>Dimensions:</strong> {getImageDimensions(selectedImage)}</p>
                    {selectedImage.type && <p><strong>Type:</strong> {selectedImage.type}</p>}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}