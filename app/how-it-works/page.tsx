'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { 
  Sparkles, 
  ArrowRight,
  CheckCircle
} from 'lucide-react'

export default function HowItWorksPage() {
  const stepsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    )

    stepsRef.current.forEach((step) => {
      if (step) observer.observe(step)
    })

    return () => {
      stepsRef.current.forEach((step) => {
        if (step) observer.unobserve(step)
      })
    }
  }, [])

  const steps = [
    {
      number: '01',
      title: 'Choose Your Methodology',
      description: 'Select between Agile (Scrum), Prince2, or Hybrid approach. Our intelligent system adapts to your preferred project management framework.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      number: '02',
      title: 'Input Project Details',
      description: 'Enter your project vision, objectives, and key stakeholders. Our Project Genesis Wizard guides you through the essential information needed.',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      number: '03',
      title: 'AI Generates Documents',
      description: 'Within minutes, receive a complete set of methodology-specific documents including PIDs, charters, risk registers, and project plans.',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      number: '04',
      title: 'Collaborate with Your Team',
      description: 'Invite team members, assign tasks, and track progress. Everyone stays aligned with real-time updates and role-based access.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      number: '05',
      title: 'Use Natural Language Updates',
      description: 'Simply tell the AI what you need: "Add a new risk about supplier delays" or "Create sprint tasks for authentication feature".',
      color: 'from-pink-500 to-rose-500'
    },
    {
      number: '06',
      title: 'Monitor & Predict',
      description: 'Track project health with our intelligent RAG dashboard. AI predicts potential issues before they impact your timeline.',
      color: 'from-rose-500 to-orange-500'
    }
  ]

  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      
      <style jsx>{`
        .step-card {
          opacity: 0;
          transform: translateY(40px) scale(0.95);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .step-card.animate-in {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        
        .step-card:nth-child(1) { transition-delay: 0ms; }
        .step-card:nth-child(2) { transition-delay: 100ms; }
        .step-card:nth-child(3) { transition-delay: 200ms; }
        .step-card:nth-child(4) { transition-delay: 300ms; }
        .step-card:nth-child(5) { transition-delay: 400ms; }
        .step-card:nth-child(6) { transition-delay: 500ms; }
        
        .number-gradient {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      <Navigation />

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
              How Project Genie Works
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-200 max-w-3xl mx-auto">
              From project inception to successful delivery in six simple steps
            </p>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="relative z-10 px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                ref={el => stepsRef.current[index] = el}
                className="step-card"
              >
                <Card className="backdrop-blur-sm bg-white/3 border-white/10 hover:bg-white/5 transition-all">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      {/* Step Number */}
                      <div className="flex-shrink-0">
                        <div className="text-7xl font-bold number-gradient">
                          {step.number}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-4">
                        <h3 className="text-2xl font-bold text-white mb-3">
                          {step.title}
                        </h3>
                        <p className="text-gray-300 text-lg leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Benefits Summary */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="backdrop-blur-sm bg-white/3 border-white/10 hover:bg-white/5 transition-all">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">Save 40% Time</h4>
                <p className="text-gray-300">Reduce documentation overhead significantly</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/3 border-white/10 hover:bg-white/5 transition-all">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">100% Compliant</h4>
                <p className="text-gray-300">Always aligned with methodology standards</p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/3 border-white/10 hover:bg-white/5 transition-all">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">Zero Learning Curve</h4>
                <p className="text-gray-300">Natural language interface anyone can use</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to transform your project management?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/20 bg-white/5 text-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}