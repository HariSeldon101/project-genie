'use client'

// ULTRA-NUCLEAR: Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { FAQSection } from '@/components/ui/faq'
import { FeatureComparison } from '@/components/ui/feature-comparison'
import { 
  Sparkles, 
  FileText, 
  Users, 
  Zap, 
  ArrowRight, 
  CheckCircle2,
  Shield,
  Brain,
  MessageSquare,
  Check,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const faqItems = [
    {
      question: "Is this replacing project managers?",
      answer: "Not at all. The app doesn't claim to produce the \"finished article.\" Instead, it provides a high-quality starting point so PMs can focus on the higher-value human tasks — leadership, judgement, and stakeholder relationships."
    },
    {
      question: "How do you handle data privacy?",
      answer: "Privacy checks are built in at multiple points: before data enters the prompt, during processing, and after outputs are generated. Sensitive information is automatically sanitised throughout."
    },
    {
      question: "Do I need to upload my own templates?",
      answer: "No. Our system already incorporates best practices from thousands of practitioner-reviewed reports. You get industry-aligned outputs out of the box."
    },
    {
      question: "What happens if my project changes?",
      answer: "Built-in version control and document history let you update documents seamlessly while keeping a full audit trail."
    },
    {
      question: "How does it help me anticipate risks?",
      answer: "Our PM \"agents\" proactively scan your project context and flag potential risks and challenges, so you can address them early."
    },
    {
      question: "Can I try it before subscribing?",
      answer: "Yes! Start with our free tier - no credit card required. You get full access to all methodologies and 1 project slot. Upgrade only when you need more projects or advanced features."
    },
    {
      question: "Can I export documents to use outside the platform?",
      answer: "Yes, everything you create can be exported. Download as Word documents for editing, PDFs for sharing, or Excel files with full formatting. Your documents work seamlessly with your existing tools and workflows."
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
              Let AI handle the paperwork while you focus on the tasks only humans can do — adding value through leadership, judgement, and stakeholder relationships.
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
                  <Link href="/how-it-works">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-white/20 bg-white/10 text-white hover:bg-white/20">
                      See How It Works
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
            {!user && (
              <p className="mt-4 text-sm text-gray-300">
                Your first compliant project document in under 5 minutes
              </p>
            )}
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
                  To generate complete project documents
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
            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" 
                     style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Practitioner-Approved Quality</h3>
                <p className="text-gray-300">
                  Trained on thousands of project reports. Reviewed by qualified project managers to refine outputs. Every document reflects industry standards and real-world practice.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">A Strong Starting Point, Not the Finished Article</h3>
                <p className="text-gray-300">
                  Creates a high-quality first draft in minutes. PMs can refine, adapt, and tailor it as needed. Frees up time so PMs shine at the human-only tasks: building trust, stakeholder management, decision-making.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Smarter Than Templates</h3>
                <p className="text-gray-300">
                  No need to upload your own — it's already built-in. Draws from PMI, PRINCE2, Agile methodologies. Outputs are ready for refinement and stakeholder use straight away.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' }}>
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Context-Aware Intelligence</h3>
                <p className="text-gray-300">
                  AI "wizard" researches your industry and technology landscape. Pulls "lessons learned" from comparable projects in the public domain. Generates strategies and risks informed by real-world data.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Control, Privacy & Confidence</h3>
                <p className="text-gray-300">
                  Version control & document history built-in. Privacy sanitisation happens at multiple stages of processing. PM "agents" proactively assess risks and flag issues. Post-response validation ensures outputs meet recognised standards.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:animate-shake transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                     style={{ background: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)' }}>
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">Partnership, Not Replacement</h3>
                <p className="text-gray-300">
                  Designed to enable, not replace project managers. AI handles the documentation grunt work. PMs focus on what only humans can do: judgement, leadership, relationships. AI strengths + human strengths = stronger outcomes.
                </p>
              </CardContent>
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

      {/* Pricing Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-200">
              Start free, upgrade when you're ready
            </p>
            
            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-8 w-14 items-center rounded-full bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-blue-600 transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-lg ${billingCycle === 'annual' ? 'text-white' : 'text-gray-400'}`}>
                Annual
                <span className="ml-2 text-sm text-green-400">Save 20%</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="backdrop-blur-sm bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                  <p className="text-gray-300 text-sm mb-4">Perfect for trying out Project Genie</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-gray-300">/month</span>
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-white/10 hover:bg-white/20">
                      Start Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">1 Project</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">2 Team Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">All Methodologies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">7-Day History</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-500 text-sm">Conversational AI</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Plan */}
            <Card className="backdrop-blur-sm bg-white/5 border-blue-500/50 scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Basic</h3>
                  <p className="text-gray-300 text-sm mb-4">For small teams and growing projects</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">
                      ${billingCycle === 'monthly' ? '19' : '15'}
                    </span>
                    <span className="text-gray-300">/month</span>
                    {billingCycle === 'annual' && (
                      <div className="text-sm text-green-400 mt-1">
                        Billed $180 annually
                      </div>
                    )}
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Start Basic
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">3 Projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">5 Team Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">Conversational AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">90-Day History</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">Email Support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="backdrop-blur-sm bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                  <p className="text-gray-300 text-sm mb-4">For enterprises and large teams</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">
                      ${billingCycle === 'monthly' ? '49' : '39'}
                    </span>
                    <span className="text-gray-300">/month</span>
                    {billingCycle === 'annual' && (
                      <div className="text-sm text-green-400 mt-1">
                        Billed $468 annually
                      </div>
                    )}
                  </div>
                  <Link href="/signup">
                    <Button className="w-full bg-white/10 hover:bg-white/20">
                      Go Premium
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">20 Projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">Up to 25 Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">Advanced AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">White Label</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-200 text-sm">Priority Support</span>
                  </div>
                </div>
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

      {/* Built by Project Managers Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Built by Project Managers, for Project Managers
            </h2>
            <p className="text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-8">
              We believe the best tools are shaped by the people who use them. That's why we welcome your feedback and feature requests — and commit to implementing the best ideas in days or weeks, not months.
            </p>
            <Link href="/contact">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                <MessageSquare className="mr-2 h-5 w-5" />
                What do you need? We're listening
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
