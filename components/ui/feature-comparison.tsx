'use client'

import { useState, useEffect } from 'react'
import { 
  Check, 
  X, 
  Shield, 
  Brain, 
  FileCheck, 
  GitBranch, 
  Users, 
  AlertTriangle,
  Sparkles,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface ComparisonFeature {
  id: string
  feature: string
  icon: React.ReactNode
  adhoc: {
    text: string
    status: 'bad' | 'neutral'
  }
  ourPlatform: {
    text: string
    status: 'good' | 'excellent'
  }
}

const comparisonFeatures: ComparisonFeature[] = [
  {
    id: 'consistency',
    feature: 'Consistency',
    icon: <FileCheck className="h-5 w-5" />,
    adhoc: {
      text: 'Varies by user skill',
      status: 'bad'
    },
    ourPlatform: {
      text: 'Refined by qualified PMs + industry standards',
      status: 'excellent'
    }
  },
  {
    id: 'compliance',
    feature: 'Compliance',
    icon: <Shield className="h-5 w-5" />,
    adhoc: {
      text: 'No guarantee',
      status: 'bad'
    },
    ourPlatform: {
      text: 'Outputs benchmarked against PMI/PRINCE2/Agile',
      status: 'excellent'
    }
  },
  {
    id: 'privacy',
    feature: 'Privacy',
    icon: <Lock className="h-5 w-5" />,
    adhoc: {
      text: 'Manual, error-prone',
      status: 'bad'
    },
    ourPlatform: {
      text: 'Multi-stage sanitisation across the workflow',
      status: 'excellent'
    }
  },
  {
    id: 'context',
    feature: 'Context',
    icon: <Brain className="h-5 w-5" />,
    adhoc: {
      text: 'Generic outputs',
      status: 'neutral'
    },
    ourPlatform: {
      text: 'Researches your industry + lessons learned',
      status: 'excellent'
    }
  },
  {
    id: 'quality',
    feature: 'Quality',
    icon: <Sparkles className="h-5 w-5" />,
    adhoc: {
      text: 'Depends on phrasing',
      status: 'neutral'
    },
    ourPlatform: {
      text: 'Trained on thousands of practitioner-reviewed reports',
      status: 'excellent'
    }
  },
  {
    id: 'versioning',
    feature: 'Versioning',
    icon: <GitBranch className="h-5 w-5" />,
    adhoc: {
      text: 'Manual copies',
      status: 'bad'
    },
    ourPlatform: {
      text: 'Built-in version control & doc history',
      status: 'good'
    }
  },
  {
    id: 'risk',
    feature: 'Risk Management',
    icon: <AlertTriangle className="h-5 w-5" />,
    adhoc: {
      text: 'Not included',
      status: 'bad'
    },
    ourPlatform: {
      text: "Proactive PM 'agents' assess risks",
      status: 'excellent'
    }
  },
  {
    id: 'human',
    feature: 'Human Role',
    icon: <Users className="h-5 w-5" />,
    adhoc: {
      text: 'Risk of being sidelined',
      status: 'bad'
    },
    ourPlatform: {
      text: 'PM empowered to lead and add unique value',
      status: 'excellent'
    }
  }
]

export function FeatureComparison() {
  const [visibleCards, setVisibleCards] = useState<string[]>([])

  useEffect(() => {
    // Animate cards appearing one by one
    const timer = setTimeout(() => {
      comparisonFeatures.forEach((feature, index) => {
        setTimeout(() => {
          setVisibleCards(prev => [...prev, feature.id])
        }, index * 100)
      })
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-8">
      {/* Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-400 mb-2">Ad-hoc AI Prompts</h3>
          <p className="text-sm text-gray-500">Generic tools, generic results</p>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-blue-400 mb-2">Our SaaS Framework</h3>
          <p className="text-sm text-blue-300">Purpose-built for project management</p>
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">RECOMMENDED</span>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="space-y-4">
        {comparisonFeatures.map((feature) => (
          <div 
            key={feature.id}
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500",
              visibleCards.includes(feature.id) 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
          >
            {/* Ad-hoc Side */}
            <Card className={cn(
              "backdrop-blur-md border transition-all hover:scale-[1.02] cursor-pointer",
              feature.adhoc.status === 'bad' 
                ? "bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-400/40" 
                : "bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20 hover:border-gray-400/40"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    feature.adhoc.status === 'bad' 
                      ? "bg-red-500/20" 
                      : "bg-gray-500/20"
                  )}>
                    <X className={cn(
                      "h-5 w-5",
                      feature.adhoc.status === 'bad' 
                        ? "text-red-400" 
                        : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-gray-400">{feature.icon}</div>
                      <h4 className="font-semibold text-gray-300">{feature.feature}</h4>
                    </div>
                    <p className="text-sm text-gray-400">{feature.adhoc.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Our Platform Side */}
            <Card className={cn(
              "backdrop-blur-md border transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden",
              feature.ourPlatform.status === 'excellent' 
                ? "bg-gradient-to-br from-blue-500/10 to-green-500/10 border-blue-500/20 hover:border-blue-400/40" 
                : "bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40"
            )}>
              {feature.ourPlatform.status === 'excellent' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-green-500/5 animate-pulse" />
              )}
              <CardContent className="p-4 relative">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    feature.ourPlatform.status === 'excellent' 
                      ? "bg-gradient-to-br from-blue-500/20 to-green-500/20" 
                      : "bg-blue-500/20"
                  )}>
                    <Check className={cn(
                      "h-5 w-5",
                      feature.ourPlatform.status === 'excellent' 
                        ? "text-green-400" 
                        : "text-blue-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-blue-400">{feature.icon}</div>
                      <h4 className="font-semibold text-white">{feature.feature}</h4>
                    </div>
                    <p className="text-sm text-blue-200 font-medium">{feature.ourPlatform.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

    </div>
  )
}