'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Home, 
  Info, 
  ShoppingBag, 
  Users, 
  Newspaper,
  Mail,
  Globe,
  FolderOpen,
  File,
  ExternalLink,
  Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageNode {
  url: string
  title?: string
  type: string
  depth: number
  children?: PageNode[]
  scraped?: boolean
  metadata?: any
  content?: string
}

interface SiteStructureVisualizerProps {
  pages?: Array<{
    url: string
    type: string
    title?: string
    h1?: string
    content?: string
    metadata?: any
  }>
  sitemapUrls?: string[]
  navigationItems?: Array<{
    text: string
    href: string
  }>
  onPageSelect?: (page: PageNode) => void
}

const pageTypeIcons: Record<string, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  about: <Info className="h-4 w-4" />,
  product: <ShoppingBag className="h-4 w-4" />,
  blog: <Newspaper className="h-4 w-4" />,
  contact: <Mail className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  page: <FileText className="h-4 w-4" />,
  unknown: <File className="h-4 w-4" />
}

const pageTypeColors: Record<string, string> = {
  home: 'bg-blue-500',
  about: 'bg-green-500',
  product: 'bg-purple-500',
  blog: 'bg-orange-500',
  contact: 'bg-pink-500',
  team: 'bg-yellow-500',
  page: 'bg-gray-500',
  unknown: 'bg-gray-400'
}

export function SiteStructureVisualizer({
  pages = [],
  sitemapUrls = [],
  navigationItems = [],
  onPageSelect
}: SiteStructureVisualizerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<PageNode | null>(null)

  // Build tree structure from pages
  const buildSiteTree = (): PageNode[] => {
    const root: PageNode[] = []
    const urlMap = new Map<string, PageNode>()
    
    // First, create all nodes
    pages.forEach(page => {
      const node: PageNode = {
        url: page.url,
        title: page.title || page.h1,
        type: page.type || 'unknown',
        depth: calculateDepth(page.url),
        scraped: true,
        metadata: page.metadata,
        content: page.content
      }
      urlMap.set(page.url, node)
    })

    // Add sitemap URLs that weren't scraped
    sitemapUrls.forEach(url => {
      if (!urlMap.has(url)) {
        const node: PageNode = {
          url,
          type: inferPageType(url),
          depth: calculateDepth(url),
          scraped: false
        }
        urlMap.set(url, node)
      }
    })

    // Build hierarchy
    const sortedUrls = Array.from(urlMap.keys()).sort((a, b) => {
      const depthA = calculateDepth(a)
      const depthB = calculateDepth(b)
      if (depthA !== depthB) return depthA - depthB
      return a.localeCompare(b)
    })

    sortedUrls.forEach(url => {
      const node = urlMap.get(url)!
      const parentUrl = findParentUrl(url, sortedUrls)
      
      if (parentUrl && urlMap.has(parentUrl)) {
        const parent = urlMap.get(parentUrl)!
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else {
        root.push(node)
      }
    })

    return root
  }

  const calculateDepth = (url: string): number => {
    try {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/').filter(s => s)
      return pathSegments.length
    } catch {
      return 0
    }
  }

  const findParentUrl = (url: string, allUrls: string[]): string | null => {
    try {
      const urlObj = new URL(url)
      const pathSegments = urlObj.pathname.split('/').filter(s => s)
      
      if (pathSegments.length === 0) return null
      
      // Try to find parent by removing last segment
      const parentPath = pathSegments.slice(0, -1).join('/')
      const parentUrl = `${urlObj.protocol}//${urlObj.host}/${parentPath}`
      
      if (allUrls.includes(parentUrl)) {
        return parentUrl
      }
      
      // If no exact parent, return root
      return `${urlObj.protocol}//${urlObj.host}`
    } catch {
      return null
    }
  }

  const inferPageType = (url: string): string => {
    const urlLower = url.toLowerCase()
    if (url.endsWith('/') || url === '') return 'home'
    if (urlLower.includes('/about')) return 'about'
    if (urlLower.includes('/product') || urlLower.includes('/service')) return 'product'
    if (urlLower.includes('/blog') || urlLower.includes('/news')) return 'blog'
    if (urlLower.includes('/contact')) return 'contact'
    if (urlLower.includes('/team') || urlLower.includes('/people')) return 'team'
    return 'page'
  }

  const toggleNode = (url: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(url)) {
      newExpanded.delete(url)
    } else {
      newExpanded.add(url)
    }
    setExpandedNodes(newExpanded)
  }

  const handlePageClick = (node: PageNode) => {
    setSelectedPage(node)
    onPageSelect?.(node)
  }

  const filterNodes = (nodes: PageNode[], query: string): PageNode[] => {
    if (!query) return nodes
    
    return nodes.filter(node => {
      const matchesQuery = 
        node.url.toLowerCase().includes(query.toLowerCase()) ||
        node.title?.toLowerCase().includes(query.toLowerCase()) ||
        node.type.toLowerCase().includes(query.toLowerCase())
      
      if (matchesQuery) return true
      
      if (node.children) {
        const filteredChildren = filterNodes(node.children, query)
        if (filteredChildren.length > 0) {
          node.children = filteredChildren
          return true
        }
      }
      
      return false
    })
  }

  const TreeNode = ({ node, level = 0 }: { node: PageNode; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.url)
    const isSelected = selectedPage?.url === node.url

    return (
      <div>
        <div 
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors",
            isSelected && "bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-500",
            !node.scraped && "opacity-60"
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handlePageClick(node)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.url)
              }}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <div className={cn("p-1 rounded", pageTypeColors[node.type] || pageTypeColors.unknown)}>
            {pageTypeIcons[node.type] || pageTypeIcons.unknown}
          </div>
          
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium">
              {node.title || getUrlSegment(node.url)}
            </span>
            {!node.scraped && (
              <Badge variant="outline" className="text-xs">Not scraped</Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              window.open(node.url, '_blank')
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, idx) => (
              <TreeNode key={`${child.url}-${idx}`} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const getUrlSegment = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const segments = urlObj.pathname.split('/').filter(s => s)
      return segments[segments.length - 1] || urlObj.hostname
    } catch {
      return url
    }
  }

  const siteTree = buildSiteTree()
  const filteredTree = filterNodes(siteTree, searchQuery)
  
  const stats = {
    totalPages: pages.length + sitemapUrls.filter(u => !pages.find(p => p.url === u)).length,
    scrapedPages: pages.length,
    pageTypes: Array.from(new Set(pages.map(p => p.type || 'unknown')))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Site Structure
            </CardTitle>
            <CardDescription>
              Discovered {stats.totalPages} pages • {stats.scrapedPages} scraped
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {stats.pageTypes.map(type => (
              <Badge key={type} variant="secondary" className="gap-1">
                {pageTypeIcons[type] || pageTypeIcons.unknown}
                {type}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tree View */}
          <ScrollArea className="h-[500px] border rounded-lg p-2">
            {filteredTree.length > 0 ? (
              filteredTree.map((node, idx) => (
                <TreeNode key={`${node.url}-${idx}`} node={node} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No pages found matching your search' : 'No pages discovered'}
              </div>
            )}
          </ScrollArea>

          {/* Selected Page Details */}
          {selectedPage && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Page Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">URL:</span>{' '}
                  <a href={selectedPage.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {selectedPage.url}
                  </a>
                </div>
                {selectedPage.title && (
                  <div>
                    <span className="font-medium">Title:</span> {selectedPage.title}
                  </div>
                )}
                <div>
                  <span className="font-medium">Type:</span>{' '}
                  <Badge variant="outline">{selectedPage.type}</Badge>
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <Badge variant={selectedPage.scraped ? "default" : "secondary"}>
                    {selectedPage.scraped ? 'Scraped' : 'Discovered'}
                  </Badge>
                </div>
                {selectedPage.content && (
                  <div>
                    <span className="font-medium">Content Preview:</span>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      {selectedPage.content.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}