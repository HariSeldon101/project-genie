'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ArrowLeft, ArrowRight, Loader2, Sparkles, FileText, Users, Globe, Building2 } from 'lucide-react'
import { AnimatedBackgroundSubtle } from '@/components/animated-background-subtle'
import { DemoSelector } from '@/components/demo-selector'
import { demoProjects, DemoProjectKey } from '@/lib/demo-data'
// Profile creation handled automatically by database trigger
import { AlertCircle, CheckCircle2, ExternalLink, Search, Shield } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { permanentLogger } from '@/lib/utils/permanent-logger'

type MethodologyType = 'agile' | 'prince2' | 'hybrid'

interface Stakeholder {
  name: string
  email: string
  title: string
}

interface ProjectData {
  name: string
  description: string
  vision: string
  businessCase: string
  methodology: MethodologyType
  companyWebsite: string
  sector: string
  budget: string
  timeline: string
  startDate: string
  endDate: string
  stakeholders: Stakeholder[]
  prince2Stakeholders?: {
    seniorUser: Stakeholder
    seniorSupplier: Stakeholder
    executive: Stakeholder
  }
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
  companyIntelligencePack?: {
    id: string
    domain: string
    companyName: string
    description: string
    industry: string
    targetMarket: string
    competitorCount: number
    productCount: number
    serviceCount: number
  }
}

const SECTORS = [
  'Technology',
  'Healthcare',
  'Finance & Banking',
  'Retail & E-commerce',
  'Manufacturing',
  'Education',
  'Government & Public Sector',
  'Energy & Utilities',
  'Real Estate',
  'Transportation & Logistics',
  'Media & Entertainment',
  'Telecommunications',
  'Agriculture',
  'Hospitality & Tourism',
  'Non-profit',
  'Other'
]

const STEPS = [
  { id: 'company', title: 'Company Intelligence', description: 'Research your company for enhanced context' },
  { id: 'methodology', title: 'Choose Methodology', description: 'Select your project management approach' },
  { id: 'basics', title: 'Project Basics', description: 'Define your project fundamentals' },
  { id: 'timeline', title: 'Timeline & Budget', description: 'Set project timeline and budget' },
  { id: 'stakeholders', title: 'Key Stakeholders', description: 'Identify project stakeholders' },
  { id: 'agilometer', title: 'Agilometer', description: 'Fine-tune your hybrid approach' },
  { id: 'review', title: 'Review & Create', description: 'Confirm your project setup' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [researchInProgress, setResearchInProgress] = useState(false)
  const [researchStatus, setResearchStatus] = useState<string>('')
  const [domainError, setDomainError] = useState<string>('')
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    vision: '',
    businessCase: '',
    methodology: 'agile',
    companyWebsite: '',
    sector: '',
    budget: '',
    timeline: '',
    startDate: '',
    endDate: '',
    stakeholders: [{ name: '', email: '', title: '' }],
    prince2Stakeholders: {
      seniorUser: { name: '', email: '', title: '' },
      seniorSupplier: { name: '', email: '', title: '' },
      executive: { name: '', email: '', title: '' }
    },
    agilometer: {
      flexibility: 50,
      teamExperience: 50,
      riskTolerance: 50,
      documentation: 50,
      governance: 50,
    }
  })

  // Create Supabase client ONLY for authentication (not database access)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isHybrid = projectData.methodology === 'hybrid'
  const activeSteps = isHybrid ? STEPS : STEPS.filter(s => s.id !== 'agilometer')
  const progressPercentage = ((currentStep + 1) / activeSteps.length) * 100

  // Handle demo data selection
  // Helper function to parse budget strings like "£2m" or "$50M" to numbers
  const parseBudgetString = (budgetStr: string): number | null => {
    if (!budgetStr) return null
    
    // Remove spaces and convert to lowercase for parsing
    const cleaned = budgetStr.replace(/\s/g, '').toLowerCase()
    
    // Extract number and multiplier
    const match = cleaned.match(/([£$€]?)(\d+(?:\.\d+)?)(k|m|b)?/)
    if (!match) return null
    
    const [, currency, numberStr, multiplier] = match
    let value = parseFloat(numberStr)
    
    // Apply multiplier
    if (multiplier === 'k') value *= 1000
    else if (multiplier === 'm') value *= 1000000
    else if (multiplier === 'b') value *= 1000000000
    
    return value
  }

  const handleDemoSelect = (projectKey: DemoProjectKey) => {
    const demo = demoProjects[projectKey]
    
    // Map demo data to project data structure
    const demoStakeholders = demo.stakeholders.map(s => ({
      name: s.name,
      email: s.email,
      title: s.role
    }))

    setProjectData({
      name: demo.projectName,
      description: demo.description,
      vision: demo.vision,
      businessCase: demo.businessCase,
      methodology: demo.methodology,
      companyWebsite: demo.companyWebsite,
      sector: demo.sector,
      budget: demo.budget?.toString() || '',
      timeline: demo.timeline || '',
      startDate: demo.startDate || '',
      endDate: demo.endDate || '',
      stakeholders: demoStakeholders.slice(0, 3), // Take first 3 for general stakeholders
      prince2Stakeholders: demo.prince2Stakeholders ? {
        seniorUser: {
          name: demo.prince2Stakeholders.seniorUser.name,
          email: `${demo.prince2Stakeholders.seniorUser.name.toLowerCase().replace(' ', '.')}@example.com`,
          title: demo.prince2Stakeholders.seniorUser.role
        },
        seniorSupplier: {
          name: demo.prince2Stakeholders.seniorSupplier.name,
          email: `${demo.prince2Stakeholders.seniorSupplier.name.toLowerCase().replace(' ', '.')}@example.com`,
          title: demo.prince2Stakeholders.seniorSupplier.role
        },
        executive: {
          name: demo.prince2Stakeholders.executive.name,
          email: `${demo.prince2Stakeholders.executive.name.toLowerCase().replace(' ', '.')}@example.com`,
          title: demo.prince2Stakeholders.executive.role
        }
      } : projectData.prince2Stakeholders,
      agilometer: demo.agilometer || projectData.agilometer
    })

    // Skip company intelligence step if demo selected (already has company info)
    if (currentStep === 0) {
      setCurrentStep(2) // Skip to methodology step
    }
  }

  const canProceed = () => {
    switch (activeSteps[currentStep].id) {
      case 'company':
        return projectData.companyIntelligencePack !== undefined
      case 'methodology':
        return projectData.sector !== ''
      case 'basics':
        return projectData.name && projectData.vision
      case 'timeline':
        return true // All fields are optional
      case 'stakeholders':
        if (projectData.methodology === 'prince2') {
          return projectData.prince2Stakeholders?.seniorUser.name && 
                 projectData.prince2Stakeholders?.seniorSupplier.name && 
                 projectData.prince2Stakeholders?.executive.name
        }
        return projectData.stakeholders.some(s => s.name.trim() !== '')
      case 'agilometer':
        return true
      case 'review':
        return true
      default:
        return false
    }
  }

  const validateAndNormalizeUrl = (url: string): { domain: string | null; error?: string } => {
    try {
      // Remove whitespace
      url = url.trim()
      
      // Check for empty input
      if (!url) {
        return { domain: null, error: 'Please enter a company website URL' }
      }
      
      // Check for basic domain pattern
      const domainPattern = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/.*)?$/
      if (!domainPattern.test(url)) {
        return { 
          domain: null, 
          error: 'Invalid URL format. Please enter a valid domain (e.g., example.com or https://example.com)' 
        }
      }
      
      // Add https:// if no protocol
      if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url
      }
      
      // Parse and validate
      const parsed = new URL(url)
      
      // Check for localhost or IP addresses
      if (parsed.hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
        return { 
          domain: null, 
          error: 'Please enter a public domain name, not localhost or IP addresses' 
        }
      }
      
      // Extract domain for research
      const domain = parsed.hostname.replace(/^www\./, '')
      
      // Validate domain has at least one dot (e.g., example.com)
      if (!domain.includes('.')) {
        return { 
          domain: null, 
          error: 'Invalid domain. Please include the full domain name (e.g., example.com)' 
        }
      }
      
      return { domain }
    } catch {
      return { 
        domain: null, 
        error: 'Invalid URL. Please check the format and try again (e.g., example.com or https://example.com)' 
      }
    }
  }

  const startCompanyResearch = async () => {
    setDomainError('')  // Clear any previous errors
    
    const validation = validateAndNormalizeUrl(projectData.companyWebsite)
    
    if (!validation.domain) {
      setDomainError(validation.error || 'Please enter a valid company website URL')
      return
    }
    
    const domain = validation.domain
    
    setResearchInProgress(true)
    setResearchStatus('Starting company intelligence research...')
    
    try {
      permanentLogger.info('COMPANY_RESEARCH', 'Starting research from project wizard', {
        domain,
        website: projectData.companyWebsite
      })
      
      // Call the research API
      const response = await fetch('/api/company-intelligence/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          depth: 'standard',
          options: {
            includeNews: true,
            includeCompetitors: true,
            includeTechStack: true,
            maxPages: 15,
            timeout: 90000
          }
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Research failed')
      }
      
      const result = await response.json()
      
      permanentLogger.info('COMPANY_RESEARCH', 'Research completed successfully', {
        domain,
        packId: result.packId,
        dataQuality: result.metrics?.dataQuality
      })
      
      // Store the pack summary in project data
      const pack = result.pack
      setProjectData(prev => ({
        ...prev,
        companyIntelligencePack: {
          id: pack.id,
          domain: pack.domain,
          companyName: pack.companyName,
          description: pack.basics?.description || '',
          industry: pack.business?.industry || prev.sector,
          targetMarket: pack.business?.targetMarket || '',
          competitorCount: pack.marketPosition?.competitors?.length || 0,
          productCount: pack.productsServices?.products?.length || 0,
          serviceCount: pack.productsServices?.services?.length || 0
        },
        // Auto-fill sector if detected
        sector: pack.business?.industry || prev.sector
      }))
      
      setResearchStatus('Research completed successfully!')
      
      // Store the full pack ID for later use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('company_intelligence_pack_id', pack.id)
      }
      
      // Auto-advance after a brief delay
      setTimeout(() => {
        setCurrentStep(currentStep + 1)
        setResearchInProgress(false)
        setResearchStatus('')
      }, 1500)
      
    } catch (error) {
      permanentLogger.captureError('COMPANY_RESEARCH', error as Error, {
        message: 'Research failed',
        domain
      })
      
      setResearchStatus(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setResearchInProgress(false)
    }
  }

  const handleNext = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreateProject = async () => {
    setLoading(true)

    try {
      // First ensure the user has a profile via API
      const profileResponse = await fetch('/api/profile', {
        method: 'POST', // POST will create if doesn't exist
        headers: { 'Content-Type': 'application/json' }
      })

      if (!profileResponse.ok) {
        console.error('Profile setup failed')
        throw new Error('Error creating project: Profile setup required. Please try again or contact support.')
      }
      
      // Get current user (auth operations are allowed to use Supabase directly)
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication error. Please sign in again.')
      }

      if (!user) {
        throw new Error('Not authenticated. Please sign in again.')
      }

      console.log('Authenticated user:', user.email, user.id)
      
      // IMPORTANT: Show the actual user ID in the error for debugging
      if (typeof window !== 'undefined') {
        console.log('Current session user ID:', user.id)
        console.log('This should match the owner_id being sent to the database')
      }

      // Profile is now guaranteed to exist from ensureUserProfile() call above
      console.log('Profile verified for user:', user.id)

      // Create project with proper owner_id
      const projectPayload = {
        name: projectData.name,
        description: projectData.description || '',
        vision: projectData.vision || '',
        business_case: projectData.businessCase || null,
        methodology_type: projectData.methodology,
        owner_id: user.id, // Use the authenticated user's ID directly
        rag_status: 'green',
        status: 'planning',
        company_info: {
          website: projectData.companyWebsite,
          sector: projectData.sector || projectData.companyIntelligencePack?.industry,
          budget: projectData.budget || null,
          budgetNumeric: parseBudgetString(projectData.budget) || null, // Store parsed numeric value
          timeline: projectData.timeline || null,
          startDate: projectData.startDate || null,
          endDate: projectData.endDate || null,
          // Add company intelligence pack reference
          companyIntelligencePackId: projectData.companyIntelligencePack?.id || null,
          companyName: projectData.companyIntelligencePack?.companyName || null,
          companyDomain: projectData.companyIntelligencePack?.domain || null
        }
      }

      console.log('Creating project with payload:', projectPayload)

      // Create project via API endpoint (uses ProjectsRepository)
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload)
      })

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json()
        console.error('Project creation error:', errorData)

        // Provide helpful error messages
        if (projectResponse.status === 403) {
          throw new Error('Permission denied. Please ensure you are logged in.')
        } else if (projectResponse.status === 400) {
          throw new Error(errorData.error || 'Invalid project data')
        } else {
          throw new Error(errorData.error || 'Failed to create project')
        }
      }

      const project = await projectResponse.json()

      // Add stakeholders
      if (project) {
        const stakeholdersToInsert = []
        
        // Add Prince2 stakeholders if applicable
        if (projectData.methodology === 'prince2' && projectData.prince2Stakeholders) {
          if (projectData.prince2Stakeholders.seniorUser.name) {
            stakeholdersToInsert.push({
              project_id: project.id,
              name: projectData.prince2Stakeholders.seniorUser.name,
              role: projectData.prince2Stakeholders.seniorUser.title || 'Senior User',
              email: projectData.prince2Stakeholders.seniorUser.email,
            })
          }
          if (projectData.prince2Stakeholders.seniorSupplier.name) {
            stakeholdersToInsert.push({
              project_id: project.id,
              name: projectData.prince2Stakeholders.seniorSupplier.name,
              role: projectData.prince2Stakeholders.seniorSupplier.title || 'Senior Supplier',
              email: projectData.prince2Stakeholders.seniorSupplier.email,
            })
          }
          if (projectData.prince2Stakeholders.executive.name) {
            stakeholdersToInsert.push({
              project_id: project.id,
              name: projectData.prince2Stakeholders.executive.name,
              role: projectData.prince2Stakeholders.executive.title || 'Executive',
              email: projectData.prince2Stakeholders.executive.email,
            })
          }
        }
        
        // Add regular stakeholders
        projectData.stakeholders
          .filter(s => s.name.trim() !== '')
          .forEach(stakeholder => {
            stakeholdersToInsert.push({
              project_id: project.id,
              name: stakeholder.name.trim(),
              role: stakeholder.title || 'Stakeholder',
              email: stakeholder.email,
            })
          })

        if (stakeholdersToInsert.length > 0) {
          // Create stakeholders via API endpoint (uses StakeholdersRepository)
          const stakeholderResponse = await fetch('/api/stakeholders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stakeholdersToInsert)
          })

          if (!stakeholderResponse.ok) {
            console.error('Failed to create stakeholders:', await stakeholderResponse.text())
            // Don't throw error for stakeholders - project is already created
          }
        }
      }

      // Store project data in session for document generation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`project_data_${project.id}`, JSON.stringify(projectData))
      }
      
      // Redirect to document generation page
      router.push(`/projects/${project.id}/generate`)
    } catch (error: any) {
      console.error('Error creating project:', error)
      setLoading(false)
      
      // Handle specific RLS error
      if (error?.code === '42501') {
        alert(
          'Permission denied. Please ensure you are logged in and try again.\n\n' +
          'If the problem persists, please contact support.'
        )
      } else if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        alert(
          'Database configuration error detected.\n\n' +
          'The security policies have been recently updated. Please refresh the page and try again.\n\n' +
          'If the problem persists, please contact support.'
        )
      } else {
        alert(`Error creating project: ${error?.message || 'Unknown error'}`)
      }
    }
  }

  const renderStep = () => {
    const stepId = activeSteps[currentStep].id

    switch (stepId) {
      case 'company':
        return (
          <div className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Company Intelligence is Critical for Document Quality</strong>
                <br />
                Our AI will research your company website to gather essential context about your business, 
                products, services, and market position. This ensures all generated documents are highly 
                relevant and tailored to your specific organization.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="inline-block w-4 h-4 mr-1" />
                  Company Website URL *
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={projectData.companyWebsite}
                  onChange={(e) => {
                    setProjectData({ ...projectData, companyWebsite: e.target.value })
                    setDomainError('')  // Clear error on input change
                  }}
                  placeholder="https://www.example.com"
                  disabled={researchInProgress}
                  className={domainError ? 'border-red-500' : ''}
                />
                {domainError ? (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{domainError}</AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-xs text-gray-500">
                    Enter your company's main website. We'll analyze it to understand your business context.
                  </p>
                )}
              </div>
              
              {!projectData.companyIntelligencePack && (
                <Button
                  onClick={startCompanyResearch}
                  disabled={!projectData.companyWebsite || researchInProgress}
                  className="w-full"
                  size="lg"
                >
                  {researchInProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Researching Company...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Start Company Research
                    </>
                  )}
                </Button>
              )}
              
              {researchStatus && (
                <Alert className={
                  researchStatus.includes('failed') 
                    ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                    : researchStatus.includes('completed')
                    ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                    : "border-blue-200 bg-blue-50 dark:bg-blue-900/20"
                }>
                  {researchStatus.includes('failed') ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : researchStatus.includes('completed') ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  )}
                  <AlertDescription className={
                    researchStatus.includes('failed')
                      ? "text-red-800 dark:text-red-200"
                      : researchStatus.includes('completed')
                      ? "text-green-800 dark:text-green-200"
                      : "text-blue-800 dark:text-blue-200"
                  }>
                    {researchStatus}
                  </AlertDescription>
                </Alert>
              )}
              
              {projectData.companyIntelligencePack && (
                <div className="rounded-lg border bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Company Research Complete
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Successfully gathered intelligence about <strong>{projectData.companyIntelligencePack.companyName}</strong>
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Industry:</span>
                      <p className="font-medium">{projectData.companyIntelligencePack.industry || 'Detected'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Target Market:</span>
                      <p className="font-medium">{projectData.companyIntelligencePack.targetMarket || 'Analyzed'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Products:</span>
                      <p className="font-medium">{projectData.companyIntelligencePack.productCount} identified</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Services:</span>
                      <p className="font-medium">{projectData.companyIntelligencePack.serviceCount} identified</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Competitors:</span>
                      <p className="font-medium">{projectData.companyIntelligencePack.competitorCount} analyzed</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Pack ID:</span>
                      <p className="font-mono text-xs">{projectData.companyIntelligencePack.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      This intelligence will be used to enhance all generated project documents with relevant 
                      company-specific context, ensuring accuracy and alignment with your business.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                  What happens during research?
                </h4>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <li>• We analyze your website's content and structure</li>
                  <li>• Extract information about products, services, and mission</li>
                  <li>• Identify your industry and target market</li>
                  <li>• Research competitors and market position</li>
                  <li>• Generate SWOT analysis and strategic insights</li>
                </ul>
              </div>
            </div>
          </div>
        )
        
      case 'methodology':
        return (
          <div className="space-y-6">
            {projectData.companyIntelligencePack && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Using intelligence for: {projectData.companyIntelligencePack.companyName}
                  </p>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Industry: {projectData.companyIntelligencePack.industry} • 
                  {projectData.companyIntelligencePack.productCount} Products • 
                  {projectData.companyIntelligencePack.serviceCount} Services
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sector">
                  <Building2 className="inline-block w-4 h-4 mr-1" />
                  Industry Sector
                </Label>
                <Select 
                  value={projectData.sector || projectData.companyIntelligencePack?.industry || ''} 
                  onValueChange={(value) => setProjectData({ ...projectData, sector: value })}
                >
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select or confirm your industry sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {projectData.companyIntelligencePack?.industry 
                    ? `Auto-detected as ${projectData.companyIntelligencePack.industry}. You can adjust if needed.`
                    : 'Helps generate industry-specific documentation'}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <Label className="text-base font-medium mb-4 block">Select Project Methodology</Label>
              <RadioGroup
                value={projectData.methodology}
                onValueChange={(value: MethodologyType) => 
                  setProjectData({ ...projectData, methodology: value })
                }
              >
                <div className="grid gap-4">
                  <Label
                    htmlFor="agile"
                    className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <RadioGroupItem value="agile" id="agile" />
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">Agile (Scrum)</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Iterative development with sprints, user stories, and continuous delivery
                      </div>
                    </div>
                  </Label>

                  <Label
                    htmlFor="prince2"
                    className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <RadioGroupItem value="prince2" id="prince2" />
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">Prince2</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Structured approach with defined stages, formal governance, and comprehensive documentation
                      </div>
                    </div>
                  </Label>

                  <Label
                    htmlFor="hybrid"
                    className="flex items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <RadioGroupItem value="hybrid" id="hybrid" />
                    <div className="space-y-1 flex-1">
                      <div className="font-medium">Hybrid</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Combine Prince2 governance with Agile delivery, customized to your needs
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )

      case 'basics':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                placeholder="e.g., Customer Portal Redesign"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vision">Project Vision *</Label>
              <Textarea
                id="vision"
                value={projectData.vision}
                onChange={(e) => setProjectData({ ...projectData, vision: e.target.value })}
                placeholder="Describe the overarching goal and vision for this project..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={projectData.description}
                onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                placeholder="Provide additional context about the project..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessCase">Business Case</Label>
              <Textarea
                id="businessCase"
                value={projectData.businessCase}
                onChange={(e) => setProjectData({ ...projectData, businessCase: e.target.value })}
                placeholder="Outline the business justification, ROI, and expected benefits..."
                rows={4}
              />
            </div>
          </div>
        )

      case 'timeline':
        return (
          <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget">Project Budget</Label>
                <Input
                  id="budget"
                  type="text"
                  value={projectData.budget}
                  onChange={(e) => setProjectData({ ...projectData, budget: e.target.value })}
                  placeholder="e.g., $500,000 or £2.5M"
                />
                <p className="text-xs text-muted-foreground">
                  Helps generate realistic cost estimates
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Project Timeline</Label>
                <Input
                  id="timeline"
                  type="text"
                  value={projectData.timeline}
                  onChange={(e) => setProjectData({ ...projectData, timeline: e.target.value })}
                  placeholder="e.g., 6 months, 18 months"
                />
                <p className="text-xs text-muted-foreground">
                  Duration for the project
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={projectData.startDate}
                  onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  When the project will begin
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Target End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={projectData.endDate}
                  onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Expected completion date
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Why provide this information?</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Generates accurate project schedules and Gantt charts</li>
                <li>• Creates realistic resource allocation plans</li>
                <li>• Improves risk assessment and mitigation strategies</li>
                <li>• Enables better milestone and deliverable planning</li>
              </ul>
            </div>
          </div>
        )

      case 'stakeholders':
        return (
          <div className="space-y-6">
            {projectData.methodology === 'prince2' && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Prince2 requires three key stakeholder roles. These can be the same person if needed.
                  </p>
                  
                  <div className="space-y-6">
                    {/* Senior User */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">Senior User *</h4>
                      <p className="text-xs text-gray-500">Represents those who will use the project's outputs</p>
                      <div className="grid gap-3">
                        <Input
                          value={projectData.prince2Stakeholders?.seniorUser.name || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorUser: { ...projectData.prince2Stakeholders!.seniorUser, name: e.target.value }
                            }
                          })}
                          placeholder="Full name"
                        />
                        <Input
                          type="email"
                          value={projectData.prince2Stakeholders?.seniorUser.email || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorUser: { ...projectData.prince2Stakeholders!.seniorUser, email: e.target.value }
                            }
                          })}
                          placeholder="Email address (optional)"
                        />
                        <Input
                          value={projectData.prince2Stakeholders?.seniorUser.title || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorUser: { ...projectData.prince2Stakeholders!.seniorUser, title: e.target.value }
                            }
                          })}
                          placeholder="Job title (optional)"
                        />
                      </div>
                    </div>
                    
                    {/* Senior Supplier */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">Senior Supplier *</h4>
                      <p className="text-xs text-gray-500">Represents those providing resources and expertise</p>
                      <div className="grid gap-3">
                        <Input
                          value={projectData.prince2Stakeholders?.seniorSupplier.name || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorSupplier: { ...projectData.prince2Stakeholders!.seniorSupplier, name: e.target.value }
                            }
                          })}
                          placeholder="Full name"
                        />
                        <Input
                          type="email"
                          value={projectData.prince2Stakeholders?.seniorSupplier.email || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorSupplier: { ...projectData.prince2Stakeholders!.seniorSupplier, email: e.target.value }
                            }
                          })}
                          placeholder="Email address (optional)"
                        />
                        <Input
                          value={projectData.prince2Stakeholders?.seniorSupplier.title || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              seniorSupplier: { ...projectData.prince2Stakeholders!.seniorSupplier, title: e.target.value }
                            }
                          })}
                          placeholder="Job title (optional)"
                        />
                      </div>
                    </div>
                    
                    {/* Executive */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">Executive *</h4>
                      <p className="text-xs text-gray-500">Owns the business case and has decision authority</p>
                      <div className="grid gap-3">
                        <Input
                          value={projectData.prince2Stakeholders?.executive.name || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              executive: { ...projectData.prince2Stakeholders!.executive, name: e.target.value }
                            }
                          })}
                          placeholder="Full name"
                        />
                        <Input
                          type="email"
                          value={projectData.prince2Stakeholders?.executive.email || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              executive: { ...projectData.prince2Stakeholders!.executive, email: e.target.value }
                            }
                          })}
                          placeholder="Email address (optional)"
                        />
                        <Input
                          value={projectData.prince2Stakeholders?.executive.title || ''}
                          onChange={(e) => setProjectData({
                            ...projectData,
                            prince2Stakeholders: {
                              ...projectData.prince2Stakeholders!,
                              executive: { ...projectData.prince2Stakeholders!.executive, title: e.target.value }
                            }
                          })}
                          placeholder="Job title (optional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-3 block">Additional Stakeholders (Optional)</Label>
                </div>
              </>
            )}
            
            <div className="space-y-4">
              {projectData.stakeholders.map((stakeholder, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Label className="text-sm font-medium">
                      {projectData.methodology === 'prince2' ? 'Additional ' : ''}Stakeholder {index + 1}
                    </Label>
                    {projectData.stakeholders.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newStakeholders = projectData.stakeholders.filter((_, i) => i !== index)
                          setProjectData({ ...projectData, stakeholders: newStakeholders })
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <Input
                      value={stakeholder.name}
                      onChange={(e) => {
                        const newStakeholders = [...projectData.stakeholders]
                        newStakeholders[index] = { ...newStakeholders[index], name: e.target.value }
                        setProjectData({ ...projectData, stakeholders: newStakeholders })
                      }}
                      placeholder="Full name"
                    />
                    <Input
                      type="email"
                      value={stakeholder.email}
                      onChange={(e) => {
                        const newStakeholders = [...projectData.stakeholders]
                        newStakeholders[index] = { ...newStakeholders[index], email: e.target.value }
                        setProjectData({ ...projectData, stakeholders: newStakeholders })
                      }}
                      placeholder="Email address (optional)"
                    />
                    <Input
                      value={stakeholder.title}
                      onChange={(e) => {
                        const newStakeholders = [...projectData.stakeholders]
                        newStakeholders[index] = { ...newStakeholders[index], title: e.target.value }
                        setProjectData({ ...projectData, stakeholders: newStakeholders })
                      }}
                      placeholder="Job title (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setProjectData({ 
                ...projectData, 
                stakeholders: [...projectData.stakeholders, { name: '', email: '', title: '' }] 
              })}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Add {projectData.methodology === 'prince2' ? 'Additional ' : ''}Stakeholder
            </Button>
          </div>
        )

      case 'agilometer':
        return (
          <div className="space-y-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust these parameters to customize your hybrid approach between Prince2 and Agile.
            </p>

            {Object.entries({
              flexibility: 'Flexibility vs Structure',
              teamExperience: 'Team Agile Experience',
              riskTolerance: 'Risk Tolerance',
              documentation: 'Documentation Requirements',
              governance: 'Governance Level'
            }).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>{label}</Label>
                  <span className="text-gray-500">
                    {projectData.agilometer![key as keyof typeof projectData.agilometer]}%
                  </span>
                </div>
                <Slider
                  value={[projectData.agilometer![key as keyof typeof projectData.agilometer]]}
                  onValueChange={([value]) => setProjectData({
                    ...projectData,
                    agilometer: {
                      ...projectData.agilometer!,
                      [key]: value
                    }
                  })}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{key === 'flexibility' ? 'Structured' : 'Low'}</span>
                  <span>{key === 'flexibility' ? 'Flexible' : 'High'}</span>
                </div>
              </div>
            ))}
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              {projectData.companyIntelligencePack && (
                <div>
                  <h4 className="font-medium mb-1">Company Intelligence</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Company:</strong> {projectData.companyIntelligencePack.companyName}<br />
                    <strong>Industry:</strong> {projectData.companyIntelligencePack.industry}<br />
                    <strong>Products/Services:</strong> {projectData.companyIntelligencePack.productCount} products, {projectData.companyIntelligencePack.serviceCount} services<br />
                    <strong>Competitors Analyzed:</strong> {projectData.companyIntelligencePack.competitorCount}
                  </p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-1">Project Sector</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projectData.sector || projectData.companyIntelligencePack?.industry || 'Not specified'}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Methodology</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projectData.methodology.charAt(0).toUpperCase() + projectData.methodology.slice(1)}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Project Name</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{projectData.name}</p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Vision</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{projectData.vision}</p>
              </div>

              {projectData.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{projectData.description}</p>
                </div>
              )}

              {(projectData.budget || projectData.timeline || projectData.startDate || projectData.endDate) && (
                <div>
                  <h4 className="font-medium mb-1">Timeline & Budget</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {projectData.budget && (
                      <>
                        <strong>Budget:</strong> {
                          (() => {
                            // Try to parse formatted entries like "£2m" or "$50M"
                            const parsedValue = parseBudgetString(projectData.budget)
                            if (parsedValue !== null) {
                              // Detect currency from original string
                              const currencyMatch = projectData.budget.match(/^[£$€]/)
                              const currency = currencyMatch ? currencyMatch[0] : '$'
                              const currencyCode = currency === '£' ? 'GBP' : currency === '€' ? 'EUR' : 'USD'
                              
                              return new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: currencyCode,
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(parsedValue)
                            }
                            
                            // If it's a plain number, format as USD
                            if (!isNaN(Number(projectData.budget))) {
                              return new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              }).format(Number(projectData.budget))
                            }
                            
                            // Otherwise display as-is
                            return projectData.budget
                          })()
                        }<br />
                      </>
                    )}
                    {projectData.timeline && <><strong>Timeline:</strong> {projectData.timeline}<br /></>}
                    {projectData.startDate && <><strong>Start Date:</strong> {new Date(projectData.startDate).toLocaleDateString()}<br /></>}
                    {projectData.endDate && <><strong>End Date:</strong> {new Date(projectData.endDate).toLocaleDateString()}</>}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-1">Stakeholders</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {projectData.methodology === 'prince2' && projectData.prince2Stakeholders && (
                    <>
                      <li>
                        • <strong>Senior User:</strong> {projectData.prince2Stakeholders.seniorUser.name}
                        {projectData.prince2Stakeholders.seniorUser.title && ` (${projectData.prince2Stakeholders.seniorUser.title})`}
                        {projectData.prince2Stakeholders.seniorUser.email && ` - ${projectData.prince2Stakeholders.seniorUser.email}`}
                      </li>
                      <li>
                        • <strong>Senior Supplier:</strong> {projectData.prince2Stakeholders.seniorSupplier.name}
                        {projectData.prince2Stakeholders.seniorSupplier.title && ` (${projectData.prince2Stakeholders.seniorSupplier.title})`}
                        {projectData.prince2Stakeholders.seniorSupplier.email && ` - ${projectData.prince2Stakeholders.seniorSupplier.email}`}
                      </li>
                      <li>
                        • <strong>Executive:</strong> {projectData.prince2Stakeholders.executive.name}
                        {projectData.prince2Stakeholders.executive.title && ` (${projectData.prince2Stakeholders.executive.title})`}
                        {projectData.prince2Stakeholders.executive.email && ` - ${projectData.prince2Stakeholders.executive.email}`}
                      </li>
                    </>
                  )}
                  {projectData.stakeholders.filter(s => s.name).map((stakeholder, i) => (
                    <li key={i}>
                      • {stakeholder.name}
                      {stakeholder.title && ` (${stakeholder.title})`}
                      {stakeholder.email && ` - ${stakeholder.email}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Documents to be Generated
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Based on your {projectData.methodology} methodology, we'll create:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                    {projectData.methodology === 'agile' && (
                      <>
                        <li>• Agile Project Charter</li>
                        <li>• Initial Product Backlog</li>
                        <li>• Sprint Planning Template</li>
                      </>
                    )}
                    {projectData.methodology === 'prince2' && (
                      <>
                        <li className="font-semibold text-blue-800 dark:text-blue-200 mt-2">PRINCE2 Core Documents:</li>
                        <li>• Project Initiation Document (PID)</li>
                        <li>• Business Case</li>
                        <li>• Risk Register</li>
                        <li>• Project Plan</li>
                        <li>• Quality Management Strategy</li>
                        <li>• Communication Management Approach</li>
                        <li className="font-semibold text-blue-800 dark:text-blue-200 mt-3">Project Genie Enhanced Intelligence:</li>
                        <li>• Technology & Industry Landscape Analysis</li>
                        <li>• Lessons Learned from Comparable Projects</li>
                      </>
                    )}
                    {projectData.methodology === 'hybrid' && (
                      <>
                        <li>• Hybrid Project Charter</li>
                        <li>• Governance Framework</li>
                        <li>• Agile Delivery Plan</li>
                        <li>• Risk Register</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen relative p-6">
      <AnimatedBackgroundSubtle />
      
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Project Genesis Wizard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Let's set up your project in just a few steps
          </p>
        </div>

        {/* Demo Selector - Shows on company intelligence step */}
        {currentStep === 0 && (
          <div className="mb-6">
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Demo Mode Available:</strong> Select a demo project below to skip company research, 
                or enter your real company URL above for production use.
              </AlertDescription>
            </Alert>
            <DemoSelector onSelectDemo={handleDemoSelect} />
          </div>
        )}

        <Card className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-white/20">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{activeSteps[currentStep].title}</CardTitle>
                  <CardDescription>{activeSteps[currentStep].description}</CardDescription>
                </div>
                <div className="text-sm text-gray-500">
                  Step {currentStep + 1} of {activeSteps.length}
                </div>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="min-h-[400px]">
            {renderStep()}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep === activeSteps.length - 1 ? (
              <Button
                onClick={handleCreateProject}
                disabled={loading || !canProceed()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Project & Generate Documents
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}