'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'
import { cn } from '@/lib/utils'
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
  className?: string
  enableMermaid?: boolean
}

export function MarkdownRenderer({ 
  content, 
  className,
  enableMermaid = true 
}: MarkdownRendererProps) {
  const [processedContent, setProcessedContent] = useState(content)
  const mermaidRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [mermaidInitialized, setMermaidInitialized] = useState(false)

  // Initialize Mermaid
  useEffect(() => {
    if (enableMermaid && !mermaidInitialized) {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        themeVariables: {
          primaryColor: '#6366f1',
          primaryTextColor: '#fff',
          primaryBorderColor: '#4f46e5',
          lineColor: '#e5e7eb',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#fef3c7',
          background: '#ffffff',
          mainBkg: '#6366f1',
          secondBkg: '#f3f4f6',
          tertiaryBkg: '#fef3c7',
          darkMode: false,
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
        },
        gantt: {
          numberSectionStyles: 4,
          fontSize: 11,
        }
      })
      setMermaidInitialized(true)
    }
  }, [enableMermaid, mermaidInitialized])

  // Process Mermaid diagrams
  useEffect(() => {
    if (!enableMermaid || !mermaidInitialized) return

    const processMermaid = async () => {
      // Find all mermaid code blocks
      const mermaidRegex = /```mermaid\n([\s\S]*?)```/g
      let match
      let newContent = content
      let mermaidId = 0

      while ((match = mermaidRegex.exec(content)) !== null) {
        const mermaidCode = match[1]
        const id = `mermaid-${mermaidId++}`
        
        try {
          // Render mermaid diagram
          const { svg } = await mermaid.render(id, mermaidCode)
          
          // Replace the code block with the rendered SVG
          newContent = newContent.replace(
            match[0],
            `<div class="mermaid-container" id="${id}">${svg}</div>`
          )
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          // Keep the original code block if rendering fails
          newContent = newContent.replace(
            match[0],
            `<pre class="mermaid-error"><code>Mermaid diagram error:\n${mermaidCode}</code></pre>`
          )
        }
      }

      setProcessedContent(newContent)
    }

    processMermaid()
  }, [content, enableMermaid, mermaidInitialized])

  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom table rendering with better formatting
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r last:border-r-0 border-gray-200 dark:border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r last:border-r-0 border-gray-200 dark:border-gray-700">
              <div className="whitespace-pre-wrap break-words max-w-xs lg:max-w-md">
                {children}
              </div>
            </td>
          ),
          // Custom heading rendering with anchor links
          h1: ({ children, ...props }) => {
            const text = React.Children.toArray(children).map(child => 
              typeof child === 'string' ? child : ''
            ).join('')
            const id = text.toLowerCase().replace(/[^a-z0-9\s]+/g, '').replace(/\s+/g, '-').replace(/(^-|-$)/g, '')
            return (
              <h1 id={id} className="text-4xl font-bold mt-8 mb-4 text-gray-900 dark:text-white scroll-mt-20" {...props}>
                {children}
              </h1>
            )
          },
          h2: ({ children, ...props }) => {
            const text = React.Children.toArray(children).map(child => 
              typeof child === 'string' ? child : ''
            ).join('')
            const id = text.toLowerCase().replace(/[^a-z0-9\s]+/g, '').replace(/\s+/g, '-').replace(/(^-|-$)/g, '')
            return (
              <h2 id={id} className="text-3xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-100 border-b pb-2 scroll-mt-20" {...props}>
                {children}
              </h2>
            )
          },
          h3: ({ children, ...props }) => {
            const text = React.Children.toArray(children).map(child => 
              typeof child === 'string' ? child : ''
            ).join('')
            const id = text.toLowerCase().replace(/[^a-z0-9\s]+/g, '').replace(/\s+/g, '-').replace(/(^-|-$)/g, '')
            return (
              <h3 id={id} className="text-2xl font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-100 scroll-mt-20" {...props}>
                {children}
              </h3>
            )
          },
          h4: ({ children, ...props }) => {
            const text = React.Children.toArray(children).map(child => 
              typeof child === 'string' ? child : ''
            ).join('')
            const id = text.toLowerCase().replace(/[^a-z0-9\s]+/g, '').replace(/\s+/g, '-').replace(/(^-|-$)/g, '')
            return (
              <h4 id={id} className="text-xl font-semibold mt-3 mb-2 text-gray-700 dark:text-gray-200 scroll-mt-20" {...props}>
                {children}
              </h4>
            )
          },
          // Custom paragraph rendering
          p: ({ children }) => (
            <p className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              {children}
            </p>
          ),
          // Custom list rendering with better spacing
          ul: ({ children }) => (
            <ul className="list-disc pl-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          // Custom blockquote rendering
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          // Custom code rendering
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            
            return isInline ? (
              <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono text-indigo-600 dark:text-indigo-400" {...props}>
                {children}
              </code>
            ) : (
              <code className={cn("block p-4 rounded-lg overflow-x-auto", className)} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-4 bg-gray-900 rounded-lg overflow-x-auto">
              {children}
            </pre>
          ),
          // Custom horizontal rule
          hr: () => (
            <hr className="my-8 border-gray-200 dark:border-gray-700" />
          ),
          // Custom link rendering with scroll behavior for anchors
          a: ({ href, children }) => {
            const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (href?.startsWith('#')) {
                e.preventDefault()
                const element = document.getElementById(href.slice(1))
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }
            }
            return (
              <a 
                href={href} 
                onClick={handleClick}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            )
          },
          // Custom strong/bold rendering
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          // Custom emphasis/italic rendering
          em: ({ children }) => (
            <em className="italic text-gray-700 dark:text-gray-300">
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
      
      <style jsx global>{`
        .markdown-body {
          font-size: 16px;
          line-height: 1.6;
          word-wrap: break-word;
        }
        
        /* Better table formatting */
        .markdown-body table {
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .markdown-body td,
        .markdown-body th {
          word-break: normal;
          overflow-wrap: break-word;
          hyphens: auto;
        }
        
        /* Handle pipe characters in tables */
        .markdown-body td:contains("|"),
        .markdown-body th:contains("|") {
          white-space: pre-wrap;
        }
        
        .mermaid-container {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        
        .dark .mermaid-container {
          background: #1f2937;
        }
        
        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }
        
        /* Mermaid graph styling */
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse,
        .mermaid-container .node polygon {
          fill: #f3f4f6;
          stroke: #6b7280;
          stroke-width: 2px;
        }
        
        .mermaid-container .node text {
          fill: #1f2937;
        }
        
        .mermaid-container .edgeLabel {
          background: white;
          padding: 2px 4px;
          border-radius: 2px;
        }
        
        .mermaid-error {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1rem 0;
          color: #c00;
        }
        
        .dark .mermaid-error {
          background: #4a1f1f;
          border-color: #7a2f2f;
          color: #faa;
        }
        
        /* Print styles */
        @media print {
          .markdown-body {
            color: #000;
            background: #fff;
          }
          
          .mermaid-container {
            page-break-inside: avoid;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}