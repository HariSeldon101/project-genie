/**
 * React hook for streaming document generation with real-time logs
 */

import { useState, useCallback } from 'react'

export interface LogEntry {
  type: 'start' | 'log' | 'progress' | 'complete' | 'error'
  message: string
  level?: 'info' | 'error' | 'warn'
  progress?: number
  timestamp: Date
}

export function useGenerationStream() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const generateDocuments = useCallback(async (projectId: string, projectData: any, token: string) => {
    setIsGenerating(true)
    setError(null)
    setLogs([])
    setProgress(0)

    try {
      const response = await fetch('/api/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, projectData })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Add timestamp
              const logEntry: LogEntry = {
                ...data,
                timestamp: new Date()
              }

              // Update logs
              setLogs(prev => [...prev, logEntry])

              // Update progress if provided
              if (data.progress !== undefined) {
                setProgress(data.progress)
              }

              // Handle completion
              if (data.type === 'complete') {
                setProgress(100)
                setIsGenerating(false)
                return data
              }

              // Handle errors
              if (data.type === 'error') {
                setError(data.message)
                setIsGenerating(false)
                throw new Error(data.message)
              }
              
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      setError(message)
      setLogs(prev => [...prev, {
        type: 'error',
        message,
        level: 'error',
        timestamp: new Date()
      }])
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
    setError(null)
    setProgress(0)
  }, [])

  return {
    logs,
    isGenerating,
    progress,
    error,
    generateDocuments,
    clearLogs
  }
}