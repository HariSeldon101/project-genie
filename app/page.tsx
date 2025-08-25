'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { FAQSection } from '@/components/ui/faq'
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
  Brain,
  GitBranch,
  Lock,
  RefreshCw,
  Download,
  UserCheck,
  BookOpen,
  AlertTriangle,
  Layers
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const faqItems = [
    {
      question: "Is my project data secure?",
      answer: "Yes. We use encryption to protect your data and your intellectual property remains 100% yours. Your project information is kept private and secure in your workspace."
    },
    {
      question: "Can I try it before subscribing?",
      answer: "Yes! Start with our free tier - no credit card required. You get full access to all methodologies and 1 project slot. Upgrade only when you need more projects or advanced features."
    },
    {
      question: "What if I'm not familiar with PRINCE2 or Agile?",
      answer: "No problem! Project Genie includes built-in templates and best practices for each methodology. The system guides you through creating compliant documents step by step."
    },
    {
      question: "Can I export documents to use outside the platform?",
      answer: "Yes, everything you create can be exported. Download as Word docs for editing, PDFs for sharing, or Excel files with full formatting. Your documents work seamlessly with your existing tools and workflows."
    },
    {
      question: "How accurate is the AI-generated content?",
      answer: "Our AI is specifically trained on project management methodologies and frameworks. Every output follows the structure and requirements of your chosen methodology. Plus, you can edit anything before finalizing."
    },
    {
      question: "What happens if I cancel my subscription?",
      answer: "Your data remains yours. Export all your documents before canceling, and we'll keep your account data for 30 days in case you change your mind. No lock-in, no penalties, cancel anytime."
    },
    {
      question: "Can my team collaborate on projects?",
      answer: "Yes! Free tier includes 2 team members who can view projects. Basic tier (5 members) allows viewing of dashboards and documents. Premium tier (up to 25 members) includes full collaboration features."
    },
    {
      question: "Do you offer support?",
      answer: "Yes! Free tier includes access to our documentation and community. Basic tier includes email support. Premium tier includes priority email support for faster responses."
    },
    {
      question: "Can I customize the generated documents?",
      answer: "Absolutely. Edit any generated content directly in our editor, apply your company branding, add custom sections, and save templates for future use. Premium plans include white-label options."
    },
    {
      question: "How is this different from other PM tools like Jira or Monday?",
      answer: "Traditional PM tools focus on task tracking. Project Genie focuses on documentation and compliance. We generate the reports, plans, and documents that PM tools don't create automatically. Use us alongside your favorite PM tool."
    }
  ]

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

      {/* Why Not ChatGPT Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              "Why Can't I Just Use ChatGPT?"
            </h2>
            <p className="text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
              Great question! While ChatGPT is brilliant for many things, managing complex projects requires more than just AI conversations. 
              Here's what makes Project Genie your unfair advantage:
            </p>
          </div>

          {/* The Story */}
          <div className="mb-16 max-w-4xl mx-auto">
            <Card className="backdrop-blur-md bg-white/5 border-white/10 p-8">
              <div className="prose prose-lg prose-invert mx-auto">
                <p className="text-gray-200 leading-relaxed mb-6">
                  <span className="text-xl font-semibold text-blue-400">Imagine this:</span> You're managing a critical project. 
                  You could copy-paste requirements into ChatGPT and get... something. But what happens next week when you need to update that document? 
                  Where's version 1? What did your team change? Is it even compliant with PRINCE2 standards?
                </p>
                <p className="text-gray-200 leading-relaxed">
                  <span className="text-xl font-semibold text-blue-400">Project Genie remembers everything.</span> Every decision, every update, every version. 
                  Your project lives and breathes in one secure place, with your whole team on the same page. 
                  No more "which version is this?" or "who changed what?" or "does this follow our methodology?"
                </p>
              </div>
            </Card>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <GitBranch className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Version Control Built-In</h3>
                <p className="text-gray-300 text-sm">
                  Every change tracked automatically. Roll back mistakes instantly. See who changed what and when.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <BookOpen className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Methodology Intelligence</h3>
                <p className="text-gray-300 text-sm">
                  Built-in PRINCE2, Agile, and Hybrid frameworks. Not just text generation - real compliance and structure.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <Users className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Team Collaboration</h3>
                <p className="text-gray-300 text-sm">
                  Share projects with your team. Premium plans allow full team access and collaboration features.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <Download className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">One-Click Exports</h3>
                <p className="text-gray-300 text-sm">
                  Professional Word, PDF, and Excel exports. Formatted, branded, and ready for stakeholders.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <Lock className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Secure Platform</h3>
                <p className="text-gray-300 text-sm">
                  Your project data is encrypted and secure. Private workspaces keep your information confidential.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <RefreshCw className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Living Documents</h3>
                <p className="text-gray-300 text-sm">
                  Documents that evolve with your project. Update once, reflected everywhere. No manual syncing.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <AlertTriangle className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Quality Validation</h3>
                <p className="text-gray-300 text-sm">
                  Built-in compliance checks prevent errors. No missing sections, no methodology mistakes.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 hover:border-blue-400/40 transition-all group">
              <CardContent className="p-6">
                <Sparkles className="h-10 w-10 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">Smart Templates</h3>
                <p className="text-gray-300 text-sm">
                  Pre-built templates for all document types. Customize and save your own for future projects.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Bottom line */}
          <div className="text-center">
            <Card className="backdrop-blur-md bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-white/20 p-8 max-w-3xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">The Bottom Line</h3>
              <p className="text-lg text-gray-200 leading-relaxed">
                ChatGPT gives you text. Project Genie gives you a complete project management system with AI superpowers. 
                It's the difference between having a calculator and having a complete accounting system.
              </p>
              <div className="mt-6">
                <Link href="/signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    See the Difference for Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <FAQSection
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about Project Genie. Can't find what you're looking for? Contact our support team."
            items={faqItems}
          />
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
