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
  { id: 'methodology', title: 'Choose Methodology', description: 'Select your project management approach' },
  { id: 'basics', title: 'Project Basics', description: 'Define your project fundamentals' },
  { id: 'stakeholders', title: 'Key Stakeholders', description: 'Identify project stakeholders' },
  { id: 'agilometer', title: 'Agilometer', description: 'Fine-tune your hybrid approach' },
  { id: 'review', title: 'Review & Create', description: 'Confirm your project setup' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    vision: '',
    businessCase: '',
    methodology: 'agile',
    companyWebsite: '',
    sector: '',
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const isHybrid = projectData.methodology === 'hybrid'
  const activeSteps = isHybrid ? STEPS : STEPS.filter(s => s.id !== 'agilometer')
  const progressPercentage = ((currentStep + 1) / activeSteps.length) * 100

  const canProceed = () => {
    switch (activeSteps[currentStep].id) {
      case 'methodology':
        return projectData.companyWebsite && projectData.sector
      case 'basics':
        return projectData.name && projectData.vision
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
      // Get current user with proper auth context
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

      // Verify profile exists (or create it if missing)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Profile not found, attempting to create...', profileError)
        
        // Try to create profile if it doesn't exist
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          })
          .select()
          .single()
        
        if (createProfileError) {
          console.error('Failed to create profile:', createProfileError)
          throw new Error('Unable to create user profile. Please contact support.')
        }
        
        console.log('Profile created successfully:', newProfile)
      }

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
          sector: projectData.sector
        }
      }

      console.log('Creating project with payload:', projectPayload)

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectPayload)
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error details:', {
          error: projectError,
          code: projectError.code,
          message: projectError.message,
          details: projectError.details,
          hint: projectError.hint
        })
        
        // Provide more helpful error messages
        if (projectError.code === '42501') {
          throw new Error('Permission denied. The database policies need to be updated. Please contact support.')
        } else if (projectError.code === '23503') {
          // Show actual user ID in error for debugging
          throw new Error(`Profile setup required for user ${user.id}. The system will attempt to create your profile automatically. Please try again.`)
        } else {
          throw new Error(`Failed to create project: ${projectError.message}`)
        }
      }

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
          await supabase.from('stakeholders').insert(stakeholdersToInsert)
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
      if (error?.code === '42P17' || error?.message?.includes('infinite recursion')) {
        alert(
          'Database configuration issue detected.\n\n' +
          'Please run the following in your Supabase SQL Editor:\n\n' +
          'ALTER TABLE projects DISABLE ROW LEVEL SECURITY;\n' +
          'ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;\n\n' +
          'Then try creating the project again.'
        )
      } else {
        alert(`Error creating project: ${error?.message || 'Unknown error'}`)
      }
    }
  }

  const renderStep = () => {
    const stepId = activeSteps[currentStep].id

    switch (stepId) {
      case 'methodology':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Company information is required to help our AI research and generate relevant project documentation.
              </p>
            </div>
            
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
                  onChange={(e) => setProjectData({ ...projectData, companyWebsite: e.target.value })}
                  placeholder="https://www.example.com"
                />
                <p className="text-xs text-gray-500">Your company's main website for context and research</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sector">
                  <Building2 className="inline-block w-4 h-4 mr-1" />
                  Industry Sector *
                </Label>
                <Select 
                  value={projectData.sector} 
                  onValueChange={(value) => setProjectData({ ...projectData, sector: value })}
                >
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Select your industry sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Helps generate industry-specific documentation</p>
              </div>
            </div>
            
            <div className="border-t pt-6">
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
              <div>
                <h4 className="font-medium mb-1">Company Information</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Website:</strong> {projectData.companyWebsite}<br />
                  <strong>Sector:</strong> {projectData.sector}
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
                        <li>• Project Initiation Document (PID)</li>
                        <li>• Business Case</li>
                        <li>• Risk Register</li>
                        <li>• Project Plan</li>
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