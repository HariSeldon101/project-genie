'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Rocket, 
  Building2, 
  Heart,
  Sparkles,
  AlertTriangle,
  Code,
  Shield,
  Stethoscope
} from 'lucide-react'
import { demoProjects, DemoProjectKey } from '@/lib/demo-data'

interface DemoSelectorProps {
  onSelectDemo: (projectKey: DemoProjectKey) => void
  isVisible?: boolean
}

export function DemoSelector({ onSelectDemo, isVisible = true }: DemoSelectorProps) {
  // Show demo selector in both development and production for beta testing
  if (!isVisible) {
    return null
  }

  const demos = [
    {
      key: 'techStartup' as DemoProjectKey,
      icon: <Rocket className="h-5 w-5" />,
      title: 'Tech Startup',
      subtitle: 'CloudSync Platform',
      description: 'SaaS collaboration platform with AI features',
      methodology: 'Agile',
      methodologyColor: 'bg-green-500',
      industry: 'Technology',
      budget: '$2.5M',
      duration: '9 months',
      dates: 'Oct 2025 - Jun 2026',
      techStack: ['React', 'Node.js', 'AWS', 'AI/ML']
    },
    {
      key: 'bankingCompliance' as DemoProjectKey,
      icon: <Building2 className="h-5 w-5" />,
      title: 'Banking System',
      subtitle: 'Digital Transformation',
      description: 'PSD2 compliance & core banking overhaul',
      methodology: 'PRINCE2',
      methodologyColor: 'bg-blue-500',
      industry: 'Financial Services',
      budget: '£12M',
      duration: '18 months',
      dates: 'Jul 2025 - Jan 2027',
      techStack: ['Java', 'Oracle', 'Kubernetes', 'Blockchain']
    },
    {
      key: 'healthcareSystem' as DemoProjectKey,
      icon: <Heart className="h-5 w-5" />,
      title: 'Healthcare Platform',
      subtitle: 'Patient Care System',
      description: 'Integrated NHS patient management with AI',
      methodology: 'Hybrid',
      methodologyColor: 'bg-purple-500',
      industry: 'Healthcare',
      budget: '£8M',
      duration: '12 months',
      dates: 'Sep 2025 - Aug 2026',
      techStack: ['Python', 'PostgreSQL', 'FHIR', 'AI Diagnostics']
    }
  ]

  return (
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-400 dark:border-yellow-600 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
          Development Mode - Demo Projects
        </h3>
        <Badge variant="outline" className="ml-auto bg-yellow-100 dark:bg-yellow-800">
          BETA TESTING
        </Badge>
      </div>
      
      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
        Select a demo project to auto-fill the wizard with realistic test data for beta testing.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {demos.map((demo) => (
          <Card 
            key={demo.key}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2"
            onClick={() => onSelectDemo(demo.key)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    {demo.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{demo.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {demo.subtitle}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={`${demo.methodologyColor} text-white text-xs`}>
                  {demo.methodology}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {demo.description}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span>{demo.industry}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span>{demo.budget}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-muted-foreground" />
                  <span>{demo.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Code className="h-3 w-3 text-muted-foreground" />
                  <span>{demo.techStack.length} techs</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground font-medium">
                📅 {demo.dates}
              </div>

              <div className="flex flex-wrap gap-1 pt-2">
                {demo.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>

              <Button 
                className="w-full mt-3" 
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectDemo(demo.key)
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Use This Demo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-md">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Demo data includes realistic project information, stakeholders with 
          fictional names and emails, and appropriate methodology settings. All data is for testing 
          purposes only and will be clearly marked in generated documents.
        </p>
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function DemoSelectorCompact({ onSelectDemo }: DemoSelectorProps) {
  // Available in production for beta testing

  return (
    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-md">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Quick Demo:</span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelectDemo('techStartup')}
          className="text-xs"
        >
          <Rocket className="h-3 w-3 mr-1" />
          Tech
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelectDemo('bankingCompliance')}
          className="text-xs"
        >
          <Building2 className="h-3 w-3 mr-1" />
          Banking
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSelectDemo('healthcareSystem')}
          className="text-xs"
        >
          <Stethoscope className="h-3 w-3 mr-1" />
          Healthcare
        </Button>
      </div>
      <Badge variant="outline" className="ml-auto text-xs bg-yellow-100 dark:bg-yellow-800">
        DEV MODE
      </Badge>
    </div>
  )
}