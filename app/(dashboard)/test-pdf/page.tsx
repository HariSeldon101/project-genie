'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// EXCEPTION: Test/Debug page - direct client access allowed for development testing
// This page is not for production use and helps test PDF generation
import { createClient } from '@/lib/supabase/client'
import { testDocuments as comprehensiveTestData } from './comprehensive-test-data'
import { DocumentType } from '@/lib/pdf-generation/types'

export default function TestPDFPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentType>('pid')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'pid', label: 'Project Initiation Document (PID)' },
    { value: 'business_case', label: 'Business Case' },
    { value: 'risk_register', label: 'Risk Register' },
    { value: 'project_plan', label: 'Project Plan' },
    { value: 'communication_plan', label: 'Communication Plan' },
    { value: 'quality_management', label: 'Quality Management Plan' },
    { value: 'technical_landscape', label: 'Technical Landscape' },
    { value: 'comparable_projects', label: 'Comparable Projects Analysis' },
    { value: 'backlog', label: 'Product Backlog' },
    { value: 'charter', label: 'Project Charter' },
    { value: 'kanban', label: 'Kanban Board' }
  ]

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[PDF Test] ${message}`)
  }

  const testPDFGeneration = async () => {
    setIsGenerating(true)
    setError(null)
    setLogs([])
    setPdfUrl(null)
    
    try {
      addLog('Starting PDF generation test...')
      addLog(`Selected document type: ${selectedType}`)
      
      // Check authentication
      addLog('Checking authentication...')
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error(`Authentication failed: ${authError?.message || 'Not logged in'}`)
      }
      
      addLog(`Authenticated as: ${user.email}`)
      
      // Get test data for selected type
      const testData = comprehensiveTestData[selectedType]
      if (!testData) {
        throw new Error(`No test data available for document type: ${selectedType}`)
      }
      
      // Extract the actual content (handle double-wrapped structure)
      const testContent = testData.content || testData
      
      addLog(`Using test data for: ${selectedType}`)
      addLog(`Test data keys: ${Object.keys(testData).join(', ')}`)
      addLog(`Content keys: ${Object.keys(testContent).join(', ')}`)
      
      // Log content structure for debugging
      if (testContent.executiveSummary) {
        addLog('✓ Found executiveSummary')
      }
      if (testContent.projectDefinition) {
        addLog('✓ Found projectDefinition')
      }
      
      // Prepare test document with ONLY the content, not the wrapper
      const testDocument = {
        documentType: selectedType,
        content: testContent,
        projectName: 'Enterprise Digital Transformation Initiative',
        companyName: 'Global Tech Solutions Inc.',
        options: {
          whiteLabel: false,
          watermarkText: 'Project Genie Test',
          showDraft: false,
          pageNumbers: true,
          useCache: false, // Disable cache for testing
          headerText: `${selectedType.toUpperCase()} - Test Document`,
          footerText: 'Confidential - Internal Use Only'
        }
      }
      
      addLog('Sending request to /api/pdf/generate...')
      addLog(`Payload size: ${JSON.stringify(testDocument).length} bytes`)
      
      // Get session for authorization header
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(testDocument)
      })
      
      addLog(`Response status: ${response.status} ${response.statusText}`)
      addLog(`Content-Type: ${response.headers.get('content-type')}`)
      addLog(`X-PDF-Cached: ${response.headers.get('x-pdf-cached') || 'not set'}`)
      addLog(`X-PDF-Generator: ${response.headers.get('x-pdf-generator') || 'not set'}`)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          if (errorData.details) {
            addLog(`Error details: ${JSON.stringify(errorData.details)}`)
          }
        } catch {
          // Response might not be JSON
          const text = await response.text()
          addLog(`Error response: ${text}`)
        }
        throw new Error(errorMessage)
      }
      
      // Check if response is PDF or JSON
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/pdf')) {
        addLog('✅ PDF binary received directly')
        
        // Download the PDF
        const blob = await response.blob()
        const size = (blob.size / 1024).toFixed(2)
        addLog(`PDF size: ${size} KB`)
        
        // Create download link and preview URL
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedType}-test-${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        addLog('✅ PDF downloaded successfully!')
        addLog('📄 PDF available for preview below')
        
      } else if (contentType?.includes('application/json')) {
        const data = await response.json()
        addLog('✅ JSON response received')
        addLog(`URL: ${data.url || 'not provided'}`)
        addLog(`Cached: ${data.cached || false}`)
        addLog(`Page count: ${data.pageCount || 'unknown'}`)
        addLog(`Size: ${data.size ? (data.size / 1024).toFixed(2) + ' KB' : 'unknown'}`)
        
        if (data.url) {
          setPdfUrl(data.url)
          // Open PDF URL in new tab
          window.open(data.url, '_blank')
          addLog('✅ Opened PDF in new tab')
        }
      }
      
      addLog('🎉 Test completed successfully!')
      addLog('---')
      addLog('Next steps:')
      addLog('1. Check if all content sections are present')
      addLog('2. Verify formatting and layout')
      addLog('3. Test charts and visualizations')
      addLog('4. Verify TOC links are clickable')
      addLog('5. Compare with document viewer output')
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      addLog(`❌ Error: ${errorMsg}`)
      setError(errorMsg)
      console.error('PDF test error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setError(null)
    setPdfUrl(null)
  }

  const testAllTypes = async () => {
    addLog('🚀 Starting batch test of all document types...')
    
    for (const type of documentTypes) {
      addLog(`---`)
      addLog(`Testing ${type.label}...`)
      setSelectedType(type.value)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Small delay between tests
      await testPDFGeneration()
    }
    
    addLog('🏁 Batch test completed!')
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Comprehensive PDF Generation Test</h1>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Control Panel */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Control Panel</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Document Type</label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as DocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Test PDF generation with comprehensive sample data for each document type.
              </p>
              <p className="text-sm text-muted-foreground">
                Features tested: Charts, tables, TOC, formatting, Mermaid diagrams, timelines.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={testPDFGeneration}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? 'Generating...' : `Generate ${selectedType.toUpperCase()} PDF`}
              </Button>
              
              <Button 
                onClick={testAllTypes}
                disabled={isGenerating}
                variant="secondary"
              >
                Test All
              </Button>
              
              <Button 
                onClick={clearLogs}
                variant="outline"
                disabled={isGenerating}
              >
                Clear
              </Button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600 font-medium">Error:</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </Card>
        
        {/* Log Output */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generation Log</h2>
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-md h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <span className="text-gray-500">No logs yet. Select a document type and click "Generate PDF" to start.</span>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`
                    ${log.includes('✅') ? 'text-green-400' : ''}
                    ${log.includes('❌') ? 'text-red-400' : ''}
                    ${log.includes('🎉') ? 'text-yellow-400' : ''}
                    ${log.includes('🚀') ? 'text-blue-400' : ''}
                    ${log.includes('📄') ? 'text-purple-400' : ''}
                    ${log.includes('---') ? 'text-gray-500 my-2' : ''}
                  `}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      
      {/* PDF Preview */}
      {pdfUrl && (
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">PDF Preview</h2>
          <iframe 
            src={pdfUrl}
            className="w-full h-[600px] border rounded"
            title="PDF Preview"
          />
        </Card>
      )}
      
      {/* System Status */}
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">PDF Generator</p>
            <p className="text-sm">✅ Puppeteer (HTML to PDF)</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Chart Rendering</p>
            <p className="text-sm">✅ Chart.js + Canvas</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Diagram Support</p>
            <p className="text-sm">✅ Mermaid Diagrams</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Storage</p>
            <p className="text-sm">✅ Supabase Storage</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-4 mt-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Environment</p>
            <p className="text-sm">{process.env.NODE_ENV}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">API Endpoint</p>
            <p className="text-sm">/api/pdf/generate</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available Types</p>
            <p className="text-sm">{documentTypes.length} document types</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Test Data</p>
            <p className="text-sm">✅ Comprehensive data loaded</p>
          </div>
        </div>
      </Card>
      
      {/* Feature Checklist */}
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-semibold mb-4">Feature Verification Checklist</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">Content & Structure</h3>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Executive Summary present</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>All sections included</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Table of Contents generated</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Page numbers correct</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Visualizations</h3>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Charts rendered (Gantt, Risk Matrix)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Mermaid diagrams visible</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Tables formatted correctly</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Timelines displayed</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Formatting</h3>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Headers and footers present</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Professional typography</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Consistent spacing</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Page breaks appropriate</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Navigation</h3>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>TOC links clickable</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>PDF bookmarks created</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Internal links working</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>Searchable text</span>
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}