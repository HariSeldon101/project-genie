'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Code, 
  Eye, 
  FileText,
  Copy,
  CheckCircle,
  Download,
  Maximize2,
  Search,
  Hash,
  AlignLeft,
  List,
  Image as ImageIcon,
  Link,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentSection {
  type: string
  title: string
  content: string
  confidence: number
}

interface PageContent {
  url: string
  title?: string
  type?: string
  content?: string
  html?: string
  sections?: ContentSection[]
  h1?: string[]
  h2?: string[]
  h3?: string[]
  paragraphs?: string[]
  images?: string[]
  links?: Array<{ text: string; href: string }>
  metadata?: Record<string, any>
}

interface ContentViewerProps {
  pages?: PageContent[]
  selectedPage?: PageContent | null
  onPageSelect?: (page: PageContent) => void
}

export function ContentViewer({
  pages = [],
  selectedPage: propSelectedPage,
  onPageSelect
}: ContentViewerProps) {
  const [selectedPage, setSelectedPage] = useState<PageContent | null>(propSelectedPage || pages[0] || null)
  const [viewMode, setViewMode] = useState<'rendered' | 'html' | 'structured'>('structured')
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (propSelectedPage) {
      setSelectedPage(propSelectedPage)
    }
  }, [propSelectedPage])

  const handlePageSelect = (page: PageContent) => {
    setSelectedPage(page)
    onPageSelect?.(page)
  }

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(itemId)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <>
        {parts.map((part, idx) => 
          part.toLowerCase() === query.toLowerCase() ? 
            <mark key={idx} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : 
            part
        )}
      </>
    )
  }

  const renderHtmlContent = (html: string) => {
    // For security, we should sanitize HTML before rendering
    // This is a simplified version - in production use DOMPurify
    return (
      <div 
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: html || selectedPage?.content || '<p>No content available</p>' 
        }}
      />
    )
  }

  const getContentStats = (page: PageContent) => {
    return {
      headings: (page.h1?.length || 0) + (page.h2?.length || 0) + (page.h3?.length || 0),
      paragraphs: page.paragraphs?.length || 0,
      images: page.images?.length || 0,
      links: page.links?.length || 0,
      sections: page.sections?.length || 0,
      wordCount: page.content?.split(' ').length || 0
    }
  }

  return (
    <Card className={cn("w-full", isFullscreen && "fixed inset-0 z-50")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Viewer
            </CardTitle>
            <CardDescription>
              Analyze and preview scraped content
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {selectedPage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(selectedPage.content || '', 'content')}
              >
                {copiedItem === 'content' ? 
                  <CheckCircle className="h-4 w-4" /> : 
                  <Copy className="h-4 w-4" />
                }
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {/* Page List */}
          <div className="col-span-1 border-r pr-4">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {pages
                  .filter(page => 
                    !searchQuery || 
                    page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    page.title?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((page, idx) => (
                    <button
                      key={idx}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        selectedPage?.url === page.url 
                          ? "bg-blue-50 dark:bg-blue-950 border-blue-500" 
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                      onClick={() => handlePageSelect(page)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {page.type || 'page'}
                          </Badge>
                          {page.content && (
                            <span className="text-xs text-gray-500">
                              {Math.round(page.content.length / 1024)}kb
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-1">
                          {page.title || page.h1?.[0] || page.url.split('/').pop() || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-1">{page.url}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content Display */}
          <div className="col-span-3">
            {selectedPage ? (
              <div className="space-y-4">
                {/* Page Header */}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold">
                    {selectedPage.title || selectedPage.h1?.[0] || 'Untitled Page'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedPage.url}</p>
                  
                  {/* Content Stats */}
                  <div className="flex gap-4 mt-3">
                    {(() => {
                      const stats = getContentStats(selectedPage)
                      return (
                        <>
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{stats.headings} headings</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlignLeft className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{stats.paragraphs} paragraphs</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ImageIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{stats.images} images</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Link className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{stats.links} links</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* View Mode Tabs */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="structured">Structured</TabsTrigger>
                    <TabsTrigger value="rendered">Rendered</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>

                  <TabsContent value="structured" className="space-y-4">
                    <ScrollArea className="h-[400px] border rounded-lg p-4">
                      {/* Sections */}
                      {selectedPage.sections && selectedPage.sections.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <List className="h-4 w-4" />
                            Content Sections
                          </h4>
                          <div className="space-y-3">
                            {selectedPage.sections.map((section, idx) => (
                              <div key={idx} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="secondary">{section.type}</Badge>
                                  <span className="text-xs text-gray-500">
                                    Confidence: {section.confidence}%
                                  </span>
                                </div>
                                {section.title && (
                                  <h5 className="font-medium mb-1">{section.title}</h5>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {highlightText(section.content.substring(0, 200), searchQuery)}
                                  {section.content.length > 200 && '...'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Headings */}
                      {selectedPage.h1 && selectedPage.h1.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-2">H1 Headings</h4>
                          <ul className="space-y-1">
                            {selectedPage.h1.map((h, idx) => (
                              <li key={idx} className="text-sm">
                                {highlightText(h, searchQuery)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedPage.h2 && selectedPage.h2.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-2">H2 Headings</h4>
                          <ul className="space-y-1">
                            {selectedPage.h2.map((h, idx) => (
                              <li key={idx} className="text-sm pl-4">
                                {highlightText(h, searchQuery)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Paragraphs */}
                      {selectedPage.paragraphs && selectedPage.paragraphs.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold mb-2">
                            Paragraphs ({selectedPage.paragraphs.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedPage.paragraphs.slice(0, 5).map((p, idx) => (
                              <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                {highlightText(p.substring(0, 200), searchQuery)}
                                {p.length > 200 && '...'}
                              </p>
                            ))}
                            {selectedPage.paragraphs.length > 5 && (
                              <p className="text-sm text-gray-500">
                                +{selectedPage.paragraphs.length - 5} more paragraphs
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="rendered">
                    <ScrollArea className="h-[400px] border rounded-lg p-4">
                      {selectedPage.html ? (
                        renderHtmlContent(selectedPage.html)
                      ) : selectedPage.content ? (
                        <div className="whitespace-pre-wrap">
                          {highlightText(selectedPage.content, searchQuery)}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>No HTML content available</AlertDescription>
                        </Alert>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="html">
                    <ScrollArea className="h-[400px] border rounded-lg p-4 bg-gray-900">
                      <pre className="text-sm text-gray-100">
                        <code>
                          {selectedPage.html || selectedPage.content || 'No HTML available'}
                        </code>
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[500px] text-gray-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a page to view its content</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}