'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { 
  Sparkles, 
  Check,
  X,
  ArrowRight,
  Zap,
  Shield,
  Users,
  FileText,
  Brain,
  BarChart3,
  MessageSquare,
  Globe,
  Infinity
} from 'lucide-react'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      name: 'Free',
      price: billingCycle === 'monthly' ? '0' : '0',
      description: 'Perfect for trying out Project Genie',
      color: 'from-gray-500 to-gray-600',
      features: [
        { name: '1 Project', included: true },
        { name: '2 Team Members', included: true },
        { name: 'Basic Document Generation', included: true },
        { name: 'Agile Methodology Only', included: true },
        { name: 'Community Support', included: true },
        { name: '7-Day History', included: true },
        { name: 'Basic Templates', included: true },
        { name: 'Conversational AI', included: false },
        { name: 'Advanced Analytics', included: false },
        { name: 'Custom Integrations', included: false },
        { name: 'Priority Support', included: false },
        { name: 'Custom Branding', included: false }
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Basic',
      price: billingCycle === 'monthly' ? '19' : '15',
      description: 'For small teams and growing projects',
      color: 'from-blue-500 to-indigo-600',
      features: [
        { name: '10 Projects', included: true },
        { name: '10 Team Members', included: true },
        { name: 'Full Document Generation', included: true },
        { name: 'All Methodologies', included: true },
        { name: 'Email Support', included: true },
        { name: '90-Day History', included: true },
        { name: 'Premium Templates', included: true },
        { name: 'Conversational AI', included: true },
        { name: 'Basic Analytics', included: true },
        { name: 'API Access', included: true },
        { name: 'Priority Support', included: false },
        { name: 'Custom Branding', included: false }
      ],
      cta: 'Start Basic',
      popular: true
    },
    {
      name: 'Premium',
      price: billingCycle === 'monthly' ? '49' : '39',
      description: 'For enterprises and large teams',
      color: 'from-purple-500 to-pink-600',
      features: [
        { name: 'Unlimited Projects', included: true },
        { name: 'Unlimited Team Members', included: true },
        { name: 'Advanced AI Generation', included: true },
        { name: 'Custom Methodologies', included: true },
        { name: '24/7 Priority Support', included: true },
        { name: 'Unlimited History', included: true },
        { name: 'Custom Templates', included: true },
        { name: 'Advanced Conversational AI', included: true },
        { name: 'Predictive Analytics', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'Dedicated Account Manager', included: true },
        { name: 'White Label Options', included: true }
      ],
      cta: 'Go Premium',
      popular: false
    }
  ]

  const allFeatures = [
    { name: 'Projects', icon: FileText, free: '1', basic: '10', premium: 'Unlimited' },
    { name: 'Team Members', icon: Users, free: '2', basic: '10', premium: 'Unlimited' },
    { name: 'AI Document Generation', icon: Brain, free: 'Basic', basic: 'Full', premium: 'Advanced' },
    { name: 'Methodologies', icon: Zap, free: 'Agile Only', basic: 'All Standard', premium: 'Custom + All' },
    { name: 'Conversational AI', icon: MessageSquare, free: false, basic: true, premium: true },
    { name: 'Analytics & Reporting', icon: BarChart3, free: false, basic: 'Basic', premium: 'Predictive' },
    { name: 'Data History', icon: Globe, free: '7 Days', basic: '90 Days', premium: 'Unlimited' },
    { name: 'Support', icon: Shield, free: 'Community', basic: 'Email', premium: '24/7 Priority' },
    { name: 'API Access', icon: Infinity, free: false, basic: true, premium: true },
    { name: 'Custom Branding', icon: Sparkles, free: false, basic: false, premium: true }
  ]

  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      
      <Navigation />

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-200 max-w-3xl mx-auto">
              Choose the perfect plan for your team. Upgrade or downgrade anytime.
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
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative z-10 px-6 pb-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={`backdrop-blur-sm bg-white/5 border-white/10 relative ${
                  plan.popular ? 'scale-105 border-blue-500/50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8 pt-8">
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4`}>
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <p className="text-gray-300 mt-2">{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-gray-300">/{billingCycle === 'monthly' ? 'month' : 'month'}</span>
                    <div className="h-6 mt-2">
                      {billingCycle === 'annual' && plan.price !== '0' && (
                        <span className="text-sm text-green-400">
                          Billed ${parseInt(plan.price) * 12} annually
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <Link href="/signup">
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <div className="space-y-3 pt-4">
                    {plan.features.slice(0, 7).map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        <span className={feature.included ? 'text-gray-200' : 'text-gray-500'}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="relative z-10 px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Detailed Feature Comparison
          </h2>
          
          <Card className="backdrop-blur-sm bg-white/5 border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-6 text-white font-semibold">Feature</th>
                    <th className="text-center p-6 text-gray-300">Free</th>
                    <th className="text-center p-6 text-blue-400 font-semibold">Basic</th>
                    <th className="text-center p-6 text-purple-400 font-semibold">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-200">{feature.name}</span>
                        </div>
                      </td>
                      <td className="text-center p-6">
                        {typeof feature.free === 'boolean' ? (
                          feature.free ? (
                            <Check className="h-5 w-5 text-green-400 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{feature.free}</span>
                        )}
                      </td>
                      <td className="text-center p-6">
                        {typeof feature.basic === 'boolean' ? (
                          feature.basic ? (
                            <Check className="h-5 w-5 text-green-400 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{feature.basic}</span>
                        )}
                      </td>
                      <td className="text-center p-6">
                        {typeof feature.premium === 'boolean' ? (
                          feature.premium ? (
                            <Check className="h-5 w-5 text-green-400 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-300">{feature.premium}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* FAQ or CTA */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Not sure which plan is right for you?
            </h3>
            <p className="text-gray-300 mb-8">
              Start with our free plan and upgrade as you grow. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}