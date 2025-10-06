'use client'

import React, { useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { DataItem } from './types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Image, Code, Database, Globe, Brain, Clock, Link } from 'lucide-react'

interface DataPreviewPaneProps {
  selectedItems: DataItem[]
  currentItem?: DataItem
}

const sourceIcons = {
  scraping: <Globe className="w-4 h-4" />,
  extraction: <FileText className="w-4 h-4" />,
  external: <Database className="w-4 h-4" />,
  analysis: <Brain className="w-4 h-4" />
}

export function DataPreviewPane({ selectedItems, currentItem }: DataPreviewPaneProps) {
  const previewData = currentItem || selectedItems[0]

  const renderValue = (value: any) => {
    if (!value) return <span className="text-gray-400">No data</span>

    // Handle different data types
    if (typeof value === 'string') {
      // Check if it's a URL
      if (value.startsWith('http')) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center gap-1"
          >
            <Link className="w-3 h-3" />
            {value}
          </a>
        )
      }
      // Check if it's an image URL
      if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(value)) {
        return (
          <div className="space-y-2">
            <img
              src={value}
              alt="Preview"
              className="max-w-full h-auto rounded-lg border"
              loading="lazy"
            />
            <p className="text-xs text-gray-500">{value}</p>
          </div>
        )
      }
      // Check if it's HTML
      if (value.includes('<') && value.includes('>')) {
        return (
          <SyntaxHighlighter
            language="html"
            style={vscDarkPlus}
            customStyle={{ fontSize: '12px', borderRadius: '6px' }}
          >
            {value}
          </SyntaxHighlighter>
        )
      }
      // Regular text
      return <p className="whitespace-pre-wrap">{value}</p>
    }

    // Handle objects and arrays
    if (typeof value === 'object') {
      return (
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          customStyle={{ fontSize: '12px', borderRadius: '6px' }}
        >
          {JSON.stringify(value, null, 2)}
        </SyntaxHighlighter>
      )
    }

    // Handle numbers and booleans
    return <span className="font-mono">{String(value)}</span>
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!previewData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
          <CardDescription>Select an item to preview its contents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FileText className="w-12 h-12 mb-2" />
            <p>No item selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {sourceIcons[previewData.source]}
              {previewData.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {previewData.category}
              {previewData.subcategory && ` › ${previewData.subcategory}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={previewData.quality === 'high' ? 'default' : previewData.quality === 'medium' ? 'secondary' : 'destructive'}>
              {previewData.quality}
            </Badge>
            <Badge variant="outline">
              {Math.round(previewData.confidence * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="content" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="pr-4">
                {renderValue(previewData.value)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metadata" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Source</p>
                  <p className="flex items-center gap-2">
                    {sourceIcons[previewData.source]}
                    {previewData.source}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Size</p>
                  <p>{formatSize(previewData.size)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Confidence Score</p>
                  <p>{Math.round(previewData.confidence * 100)}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quality Rating</p>
                  <p className="capitalize">{previewData.quality}</p>
                </div>
                {previewData.metadata && (
                  <>
                    {previewData.metadata.url && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Source URL</p>
                        <a
                          href={previewData.metadata.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm flex items-center gap-1"
                        >
                          <Link className="w-3 h-3" />
                          {previewData.metadata.url}
                        </a>
                      </div>
                    )}
                    {previewData.metadata.timestamp && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Collected At</p>
                        <p className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {new Date(previewData.metadata.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {previewData.metadata.method && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Collection Method</p>
                        <p className="text-sm">{previewData.metadata.method}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <SyntaxHighlighter
                language="json"
                style={vscDarkPlus}
                customStyle={{ fontSize: '12px', borderRadius: '6px' }}
              >
                {JSON.stringify(previewData, null, 2)}
              </SyntaxHighlighter>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}