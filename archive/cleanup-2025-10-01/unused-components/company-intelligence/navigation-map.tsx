'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Navigation,
  Menu,
  ChevronRight,
  Home,
  Link,
  ExternalLink,
  Compass,
  Grid3x3,
  AlertCircle,
  Copy,
  CheckCircle,
  ArrowRight,
  LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationItem {
  text: string
  href: string
  children?: NavigationItem[]
}

interface NavigationStructure {
  main?: NavigationItem[]
  footer?: NavigationItem[]
  sidebar?: NavigationItem[]
  breadcrumbs?: Array<{ text: string; href?: string }>
  mobile?: NavigationItem[]
}

interface NavigationMapProps {
  navigation?: NavigationStructure
  currentUrl?: string
  onNavigate?: (url: string) => void
}

export function NavigationMap({
  navigation,
  currentUrl,
  onNavigate
}: NavigationMapProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']))
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('main')

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const renderNavigationItem = (
    item: NavigationItem, 
    level: number = 0,
    isCurrentPath: boolean = false
  ): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.href)
    const isCurrent = item.href === currentUrl

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            isCurrent && "bg-blue-50 dark:bg-blue-950 border-l-2 border-blue-500",
            isCurrentPath && !isCurrent && "bg-gray-50 dark:bg-gray-900"
          )}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => toggleSection(item.href)}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
            </Button>
          )}
          {!hasChildren && <div className="w-5" />}

          <Link className="h-3 w-3 text-gray-400" />

          <button
            className="flex-1 text-left text-sm"
            onClick={() => onNavigate?.(item.href)}
          >
            <span className={cn("font-medium", isCurrent && "text-blue-600 dark:text-blue-400")}>
              {item.text}
            </span>
            <span className="text-xs text-gray-500 ml-2 hidden sm:inline">
              {item.href}
            </span>
          </button>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => copyUrl(item.href)}
            >
              {copiedUrl === item.href ? 
                <CheckCircle className="h-3 w-3 text-green-500" /> : 
                <Copy className="h-3 w-3" />
              }
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => window.open(item.href, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => 
              renderNavigationItem(child, level + 1, isCurrent || isCurrentPath)
            )}
          </div>
        )}
      </div>
    )
  }

  const renderBreadcrumbs = () => {
    if (!navigation?.breadcrumbs || navigation.breadcrumbs.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No breadcrumbs detected</AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <Home className="h-4 w-4 text-gray-400" />
        {navigation.breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ArrowRight className="h-3 w-3 text-gray-400" />}
            {crumb.href ? (
              <button
                className="text-sm hover:text-blue-600 dark:hover:text-blue-400"
                onClick={() => onNavigate?.(crumb.href!)}
              >
                {crumb.text}
              </button>
            ) : (
              <span className="text-sm font-medium">{crumb.text}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  const getNavigationStats = () => {
    const stats = {
      mainItems: navigation?.main?.length || 0,
      footerItems: navigation?.footer?.length || 0,
      sidebarItems: navigation?.sidebar?.length || 0,
      totalLinks: 0
    }

    const countLinks = (items: NavigationItem[]): number => {
      return items.reduce((acc, item) => {
        const childCount = item.children ? countLinks(item.children) : 0
        return acc + 1 + childCount
      }, 0)
    }

    if (navigation?.main) stats.totalLinks += countLinks(navigation.main)
    if (navigation?.footer) stats.totalLinks += countLinks(navigation.footer)
    if (navigation?.sidebar) stats.totalLinks += countLinks(navigation.sidebar)

    return stats
  }

  const stats = getNavigationStats()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Navigation Map
            </CardTitle>
            <CardDescription>
              Site navigation structure • {stats.totalLinks} total links
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              <Menu className="h-3 w-3 mr-1" />
              {stats.mainItems} Main
            </Badge>
            <Badge variant="secondary">
              <Grid3x3 className="h-3 w-3 mr-1" />
              {stats.footerItems} Footer
            </Badge>
            <Badge variant="secondary">
              <LayoutGrid className="h-3 w-3 mr-1" />
              {stats.sidebarItems} Sidebar
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Breadcrumbs */}
        {navigation?.breadcrumbs && navigation.breadcrumbs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Compass className="h-4 w-4" />
              Current Page Breadcrumbs
            </h4>
            {renderBreadcrumbs()}
          </div>
        )}

        {/* Navigation Sections */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="main" className="flex items-center gap-1">
              <Menu className="h-3 w-3" />
              Main Nav
            </TabsTrigger>
            <TabsTrigger value="footer" className="flex items-center gap-1">
              <Grid3x3 className="h-3 w-3" />
              Footer
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              Sidebar
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-1">
              <Compass className="h-3 w-3" />
              Full Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main">
            {navigation?.main && navigation.main.length > 0 ? (
              <ScrollArea className="h-[400px] border rounded-lg p-2">
                {navigation.main.map(item => renderNavigationItem(item))}
              </ScrollArea>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No main navigation detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="footer">
            {navigation?.footer && navigation.footer.length > 0 ? (
              <ScrollArea className="h-[400px] border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-4">
                  {navigation.footer.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                      <h5 className="font-semibold text-sm">{section.text}</h5>
                      {section.children && (
                        <div className="space-y-1 pl-4">
                          {section.children.map((item, childIdx) => (
                            <button
                              key={childIdx}
                              className="block text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              onClick={() => onNavigate?.(item.href)}
                            >
                              {item.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No footer navigation detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="sidebar">
            {navigation?.sidebar && navigation.sidebar.length > 0 ? (
              <ScrollArea className="h-[400px] border rounded-lg p-2">
                {navigation.sidebar.map(item => renderNavigationItem(item))}
              </ScrollArea>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No sidebar navigation detected</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="sitemap">
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-6">
                {navigation?.main && navigation.main.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Menu className="h-4 w-4" />
                      Main Navigation
                    </h5>
                    <div className="pl-2">
                      {navigation.main.map(item => renderNavigationItem(item))}
                    </div>
                  </div>
                )}

                {navigation?.footer && navigation.footer.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Grid3x3 className="h-4 w-4" />
                      Footer Navigation
                    </h5>
                    <div className="pl-2">
                      {navigation.footer.map(item => renderNavigationItem(item))}
                    </div>
                  </div>
                )}

                {navigation?.sidebar && navigation.sidebar.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Sidebar Navigation
                    </h5>
                    <div className="pl-2">
                      {navigation.sidebar.map(item => renderNavigationItem(item))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}