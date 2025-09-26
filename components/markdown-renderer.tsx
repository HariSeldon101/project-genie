'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { MermaidDiagram } from '@/components/mermaid-diagram'
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
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom code block renderer for mermaid diagrams
          code: ({ className, children, ...props }) => {
            const match = /language-mermaid/.exec(className || '')
            if (match && enableMermaid) {
              return (
                <MermaidDiagram
                  definition={String(children).replace(/\n$/, '')}
                  type="markdown"
                  showControls={false}
                  lazy={true}
                  cache={true}
                  className="my-4"
                />
              )
            }
            // Regular code block
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
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
              <h2 id={id} className="text-3xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white scroll-mt-20" {...props}>
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
              <h3 id={id} className="text-2xl font-medium mt-4 mb-2 text-gray-900 dark:text-white scroll-mt-20" {...props}>
                {children}
              </h3>
            )
          },
          // Enhanced list styling
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-4 ml-4 text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-4 ml-4 text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </ol>
          ),
          // Enhanced link styling
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              {...props}
            >
              {children}
            </a>
          ),
          // Enhanced blockquote styling
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Enhanced inline code styling
          p: ({ children, ...props }) => (
            <p className="my-3 leading-relaxed text-gray-700 dark:text-gray-300" {...props}>
              {children}
            </p>
          ),
          // Enhanced pre styling for code blocks
          pre: ({ children, ...props }) => {
            // Check if this is a mermaid code block that wasn't caught by the code component
            const isMermaid = React.Children.toArray(children).some(child =>
              React.isValidElement(child) &&
              child.props?.className?.includes('language-mermaid')
            )

            if (isMermaid) {
              // This shouldn't happen with our code component, but just in case
              return null
            }

            return (
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto" {...props}>
                {children}
              </pre>
            )
          },
        }}>
        {content}
      </ReactMarkdown>
    </div>
  )
}