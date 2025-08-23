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
import { Slider } from '@/components/ui/slider'
import { ArrowLeft, ArrowRight, Loader2, Sparkles, FileText, Users } from 'lucide-react'
import { AnimatedBackgroundSubtle } from '@/components/animated-background-subtle'

type MethodologyType = 'agile' | 'prince2' | 'hybrid'

interface ProjectData {
  name: string
  description: string
  vision: string
  businessCase: string
  methodology: MethodologyType
  stakeholders: string[]
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}

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
    stakeholders: [''],
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
        return true
      case 'basics':
        return projectData.name && projectData.vision
      case 'stakeholders':
        return projectData.stakeholders.some(s => s.trim() !== '')
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          vision: projectData.vision,
          business_case: projectData.businessCase,
          methodology_type: projectData.methodology,
          owner_id: user.id,
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Add stakeholders
      if (project && projectData.stakeholders.length > 0) {
        const stakeholdersToInsert = projectData.stakeholders
          .filter(s => s.trim() !== '')
          .map(name => ({
            project_id: project.id,
            name: name.trim(),
            role: 'Stakeholder',
          }))

        if (stakeholdersToInsert.length > 0) {
          await supabase.from('stakeholders').insert(stakeholdersToInsert)
        }
      }

      // Generate initial documents (this will be handled by the document generation engine)
      // For now, we'll just redirect to the project page
      router.push(`/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
      setLoading(false)
    }
  }

  const renderStep = () => {
    const stepId = activeSteps[currentStep].id

    switch (stepId) {
      case 'methodology':
        return (
          <div className="space-y-6">
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
            <div className="space-y-4">
              {projectData.stakeholders.map((stakeholder, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={stakeholder}
                    onChange={(e) => {
                      const newStakeholders = [...projectData.stakeholders]
                      newStakeholders[index] = e.target.value
                      setProjectData({ ...projectData, stakeholders: newStakeholders })
                    }}
                    placeholder="Stakeholder name and role"
                  />
                  {projectData.stakeholders.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newStakeholders = projectData.stakeholders.filter((_, i) => i !== index)
                        setProjectData({ ...projectData, stakeholders: newStakeholders })
                      }}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setProjectData({ 
                ...projectData, 
                stakeholders: [...projectData.stakeholders, ''] 
              })}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Add Stakeholder
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
                <ul className="text-sm text-gray-600 dark:text-gray-400">
                  {projectData.stakeholders.filter(s => s).map((stakeholder, i) => (
                    <li key={i}>• {stakeholder}</li>
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