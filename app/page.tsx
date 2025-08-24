'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { 
  Sparkles, 
  FileText, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle2,
  BarChart3,
  Shield,
  Clock,
  Brain
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])
  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      
      <Navigation />

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              AI-Powered Project Management
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Redefined
              </span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-200 max-w-3xl mx-auto">
              Generate methodology-specific documentation in minutes, not hours. 
              Let AI handle the paperwork while you focus on delivering exceptional projects.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/how-it-works">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/20 bg-white/10 text-white hover:bg-white/20">
                      See How It Works
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="backdrop-blur-md bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-400">40%</div>
                <p className="mt-2 text-gray-200">
                  Less time on documentation
                </p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-md bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-purple-400">5 min</div>
                <p className="mt-2 text-gray-200">
                  To generate complete project docs
                </p>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-md bg-white/5 border-white/10">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-pink-400">100%</div>
                <p className="mt-2 text-gray-200">
                  Methodology compliance
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white">
              Everything You Need to Manage Projects Like a Pro
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Powerful features designed for professional project managers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" 
                     style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">AI Document Generation</h3>
                <p className="text-gray-300">
                  Automatically generate PIDs, charters, risk registers, and more based on your chosen methodology.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Conversational AI Interface</h3>
                <p className="text-gray-300">
                  Update documents and manage tasks using natural language commands. No forms, just conversation.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Predictive RAG Dashboard</h3>
                <p className="text-gray-300">
                  AI-powered project health monitoring that predicts issues before they become problems.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' }}>
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Methodology Support</h3>
                <p className="text-gray-300">
                  Full support for Prince2, Agile (Scrum), and Hybrid approaches with tailored workflows.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Team Collaboration</h3>
                <p className="text-gray-300">
                  Real-time collaboration with role-based access control and activity tracking.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)' }}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Enterprise Security</h3>
                <p className="text-gray-300">
                  Bank-level security with optional on-premise deployment for sensitive projects.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Card className="backdrop-blur-md bg-white/5 border-white/10 p-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your Project Management?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join thousands of project managers who've already automated their documentation workflow.
            </p>
            {user ? (
              <div className="flex flex-col items-center">
                <Link href="/dashboard">
                  <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                    Continue to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="mt-6 text-sm text-gray-400">
                  Welcome back! Continue managing your projects.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                      Start Your Free Trial
                      <Sparkles className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/20 bg-white/10 text-white hover:bg-white/20">
                      Book a Demo
                    </Button>
                  </Link>
                </div>
                <p className="mt-6 text-sm text-gray-400">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </>
            )}
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-24">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-semibold text-white">
                Project Genie
              </span>
            </div>
            <p className="text-sm text-gray-400">
              © 2025 Project Genie. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
