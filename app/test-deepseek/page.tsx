'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CharterView } from '@/components/documents/charter-view'
import { RiskRegisterView } from '@/components/documents/risk-register-view'
import { 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  Download,
  Eye,
  Zap
} from 'lucide-react'

interface TestResults {
  projectId?: string
  documents?: any[]
  error?: string
  timeTaken?: number
  provider?: string
}

export default function TestDeepSeekPage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResults>({})
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [userTier, setUserTier] = useState<'free' | 'basic' | 'premium'>('free')

  const testProjectData = {
    name: 'AI-Powered Healthcare Platform',
    description: 'A revolutionary healthcare management system using artificial intelligence to improve patient outcomes and streamline medical operations.',
    vision: 'To transform healthcare delivery through intelligent automation and data-driven insights, making quality healthcare accessible to all.',
    businessCase: 'The healthcare industry faces critical challenges including rising costs, physician burnout, and inefficient processes. Our AI platform addresses these by automating routine tasks, providing predictive analytics, and improving diagnostic accuracy.',
    methodology: 'agile',
    sector: 'Healthcare Technology',
    companyWebsite: 'https://healthtech-example.com',
    stakeholders: [
      { name: '[CHIEF_MEDICAL_OFFICER]', title: 'Chief Medical Officer', email: 'cmo@example.com' },
      { name: '[HEAD_OF_IT]', title: 'Head of IT', email: 'it@example.com' },
      { name: '[PATIENT_ADVOCATE]', title: 'Patient Advocate', email: 'advocate@example.com' },
      { name: '[REGULATORY_OFFICER]', title: 'Regulatory Compliance Officer', email: 'compliance@example.com' }
    ]
  }

  const runDeepSeekTest = async () => {
    setTesting(true)
    setResults({})
    const startTime = Date.now()

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get or create test user
      const { data: { user } } = await supabase.auth.getUser()
      
      // For testing, use a fixed user ID if not authenticated
      const testUserId = user?.id || '00000000-0000-0000-0000-000000000000'

      // Create test project in database
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: testProjectData.name,
          description: testProjectData.description,
          vision: testProjectData.vision,
          business_case: testProjectData.businessCase,
          methodology_type: testProjectData.methodology,
          owner_id: testUserId,
          status: 'active'
        })
        .select()
        .single()

      if (projectError) throw projectError

      console.log('✅ Test project created:', project.id)

      // Call document generation API
      const { data: { session } } = await supabase.auth.getSession()
      const headers: any = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: project.id,
          projectData: testProjectData,
          forceProvider: 'deepseek' // Force DeepSeek usage
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Generation failed')
      }

      const result = await response.json()
      console.log('✅ Documents generated successfully')

      // Fetch the generated documents
      const { data: documents, error: docsError } = await supabase
        .from('artifacts')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError

      const timeTaken = Math.round((Date.now() - startTime) / 1000)

      setResults({
        projectId: project.id,
        documents: documents || [],
        timeTaken,
        provider: result.provider || 'deepseek'
      })

      console.log(`✅ Test completed in ${timeTaken}s with ${documents?.length} documents`)

    } catch (error: any) {
      console.error('❌ Test failed:', error)
      setResults({
        error: error.message || 'Test failed',
        timeTaken: Math.round((Date.now() - startTime) / 1000)
      })
    } finally {
      setTesting(false)
    }
  }

  const getBrandingSettings = (tier: string) => {
    switch (tier) {
      case 'premium':
        return {
          showBranding: false,
          brandingText: '',
          logoUrl: '/custom-logo.png',
          primaryColor: '#0EA5E9',
          footerText: '© 2024 Your Company. All rights reserved.'
        }
      case 'basic':
        return {
          showBranding: true,
          brandingText: 'Powered by Your Company',
          logoUrl: '/company-logo.png',
          primaryColor: '#3B82F6',
          footerText: 'Generated with Project Genie'
        }
      default: // free
        return {
          showBranding: true,
          brandingText: '🚀 Generated by Project Genie - Upgrade for custom branding',
          logoUrl: null,
          primaryColor: '#6B7280',
          footerText: 'Generated by Project Genie'
        }
    }
  }

  const branding = getBrandingSettings(userTier)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DeepSeek Document Generation Test</h1>
        <p className="text-muted-foreground">
          Test the complete document generation flow with DeepSeek API and verify formatting/branding
        </p>
      </div>

      {/* Test Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure test parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Subscription Tier (for branding test)</label>
            <div className="flex gap-2">
              <Button
                variant={userTier === 'free' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('free')}
              >
                Free Tier
              </Button>
              <Button
                variant={userTier === 'basic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('basic')}
              >
                Basic Tier
              </Button>
              <Button
                variant={userTier === 'premium' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserTier('premium')}
              >
                Premium Tier
              </Button>
            </div>
          </div>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Project:</strong> {testProjectData.name}
              <br />
              <strong>Methodology:</strong> {testProjectData.methodology.toUpperCase()}
              <br />
              <strong>Stakeholders:</strong> {testProjectData.stakeholders.length} (with placeholders)
            </AlertDescription>
          </Alert>

          <Button 
            onClick={runDeepSeekTest} 
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Documents with DeepSeek...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Run DeepSeek Test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {results.error}
            <br />
            <strong>Time:</strong> {results.timeTaken}s
          </AlertDescription>
        </Alert>
      )}

      {results.documents && results.documents.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Test Successful
              </CardTitle>
              <CardDescription>
                Generated {results.documents.length} documents in {results.timeTaken}s using {results.provider}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.documents.map((doc) => (
                  <Card key={doc.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedDoc(doc)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <Badge>{doc.type}</Badge>
                      </div>
                      <CardDescription>
                        Version {doc.version} • {new Date(doc.created_at).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Viewer */}
          {selectedDoc && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Document Preview: {selectedDoc.title}</CardTitle>
                  <Button variant="ghost" onClick={() => setSelectedDoc(null)}>
                    Close
                  </Button>
                </div>
                <CardDescription>
                  Showing formatted view with {userTier} tier branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="formatted">
                  <TabsList className="mb-4">
                    <TabsTrigger value="formatted">Formatted View</TabsTrigger>
                    <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="formatted" className="border rounded-lg overflow-auto max-h-[600px]">
                    {selectedDoc.type === 'charter' && (
                      <CharterView 
                        content={selectedDoc.content}
                        showBranding={branding.showBranding}
                        brandingText={branding.brandingText}
                      />
                    )}
                    {selectedDoc.type === 'risk_register' && (
                      <RiskRegisterView 
                        content={selectedDoc.content}
                        showBranding={branding.showBranding}
                        brandingText={branding.brandingText}
                      />
                    )}
                    {selectedDoc.type !== 'charter' && selectedDoc.type !== 'risk_register' && (
                      <div className="p-6">
                        <h2 className="text-2xl font-bold mb-4">{selectedDoc.title}</h2>
                        <pre className="whitespace-pre-wrap text-sm">
                          {JSON.stringify(selectedDoc.content, null, 2)}
                        </pre>
                        {branding.showBranding && (
                          <div className="mt-8 pt-4 border-t text-center">
                            <p className="text-sm text-muted-foreground">{branding.brandingText}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="raw" className="overflow-auto max-h-[600px]">
                    <pre className="text-xs bg-muted p-4 rounded">
                      {JSON.stringify(selectedDoc.content, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">DeepSeek API</span>
              <Badge variant={process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ? 'default' : 'secondary'}>
                {process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">OpenAI API</span>
              <Badge variant={process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'default' : 'secondary'}>
                {process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fallback Mode</span>
              <Badge variant="outline">Mock Provider Available</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}