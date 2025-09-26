'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

// Test directly with Mermaid without the wrapper component to isolate the issue
export default function TestMermaidSimplePage() {
  const [currentTest, setCurrentTest] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [mermaidLoaded, setMermaidLoaded] = useState(false)
  const mermaidRef = useRef<any>(null)

  // Ensure we only run on client and load Mermaid
  useEffect(() => {
    setIsClient(true)

    // Dynamically import and initialize Mermaid
    const initMermaid = async () => {
      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default

        // Store reference
        mermaidRef.current = mermaid

        // Initialize with config
        mermaid.initialize({
          startOnLoad: false, // Disable auto-start since we're using render API
          theme: 'default',
          securityLevel: 'loose',
          logLevel: 'error', // Changed from 'fatal' to 'error' to see potential issues
          suppressErrorRendering: false // Show errors in diagram
        })

        setMermaidLoaded(true)
        console.log('Mermaid loaded and initialized successfully')
        console.log('Mermaid version:', mermaid.version ? mermaid.version() : 'unknown')
      } catch (error) {
        console.error('Failed to load Mermaid:', (error as Error)?.message || 'Unknown error')
      }
    }

    initMermaid()
  }, [])

  // Re-render diagram when currentTest changes
  useEffect(() => {
    const renderCurrentDiagram = async () => {
      if (currentTest && mermaidLoaded && mermaidRef.current) {
        try {
          const container = document.getElementById('mermaid-container')
          if (!container) {
            console.error('Container not found')
            return
          }

          // Method 1: Try using the run method with pre-tagged content
          const definition = tests[currentTest as keyof typeof tests]

          // Clear and set up the container with the mermaid class
          container.innerHTML = `<pre class="mermaid">${definition}</pre>`

          // Run mermaid on the container
          await mermaidRef.current.run({
            querySelector: '.mermaid',
            suppressErrors: false
          })

          console.log('Mermaid rendered successfully for:', currentTest)
        } catch (error) {
          console.error('Failed to render diagram:', (error as Error)?.message || 'Unknown error')

          // Try fallback method: render API
          try {
            const container = document.getElementById('mermaid-container')
            if (!container) return

            // Generate unique ID for this render
            const graphId = `mermaid-graph-${Date.now()}`
            const definition = tests[currentTest as keyof typeof tests]

            // Try the render method as fallback
            const { svg } = await mermaidRef.current.render(graphId, definition)

            // Insert the SVG into the container
            container.innerHTML = svg

            console.log('Mermaid rendered via fallback method for:', currentTest)
          } catch (fallbackError) {
            console.error('Fallback render also failed:', (fallbackError as Error)?.message || 'Unknown error')
            const container = document.getElementById('mermaid-container')
            if (container) {
              container.innerHTML = `<div class="text-red-500">Error rendering diagram: ${(error as Error)?.message || 'Unknown error'}</div>`
            }
          }
        }
      }
    }

    renderCurrentDiagram()
  }, [currentTest, mermaidLoaded])

  // Simple test diagrams
  const tests = {
    flowchart: `flowchart TD
      A[Start] --> B{Working?}
      B -->|Yes| C[Success]
      B -->|No| D[Debug]`,

    gantt: `gantt
title Test Gantt
dateFormat YYYY-MM-DD
section Testing
Task 1 :2025-01-01, 30d
Task 2 :after a1, 20d`,

    pie: `pie title Test Pie
      "Category A" : 30
      "Category B" : 50
      "Category C" : 20`,

    timeline: `timeline
title Test Timeline
2020 : Event 1
2021 : Event 2
2022 : Event 3`
  }

  const renderDiagram = (type: string) => {
    // Avoid React synthetic event issues by not passing event objects around
    setTimeout(() => {
      setCurrentTest(type)
    }, 0)
  }

  if (!isClient) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Simple Mermaid Test (No Components)</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Simplified Test Page</AlertTitle>
            <AlertDescription>
              This page tests Mermaid diagrams without the wrapper component to isolate issues.
              Access at: <code>http://localhost:3000/test-mermaid-simple</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex gap-2">
              {Object.keys(tests).map(type => (
                <Button
                  key={type}
                  onClick={() => renderDiagram(type)}
                  variant={currentTest === type ? 'default' : 'outline'}
                >
                  Test {type}
                </Button>
              ))}
            </div>

            {currentTest && (
              <Card>
                <CardHeader>
                  <CardTitle>Testing: {currentTest}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Definition:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-xs">
                        {tests[currentTest as keyof typeof tests]}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Rendered (Raw HTML):</h4>
                      <div className="border rounded p-4 bg-gray-50">
                        <div id="mermaid-container" className="flex justify-center items-center min-h-[200px]">
                          {/* Mermaid diagram will be rendered here */}
                          <span className="text-gray-400">Select a diagram type to render</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Status:</h4>
                    <p className="text-sm text-gray-600">
                      If you see a diagram above instead of text, Mermaid is working.
                      If you see the raw text definition, there is an issue with Mermaid initialization.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded">
                  {JSON.stringify({
                    isClient,
                    windowDefined: typeof window !== 'undefined',
                    mermaidAvailable: typeof window !== 'undefined' && 'mermaid' in window,
                    mermaidLoaded,
                    mermaidRefExists: !!mermaidRef.current,
                    currentTest
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}