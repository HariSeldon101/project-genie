'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StarfieldBackground } from '@/components/starfield-background'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { 
  Mail, 
  MessageSquare, 
  Send,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      subject: value
    }))
  }

  return (
    <div className="min-h-screen relative">
      <StarfieldBackground />
      
      <Navigation />

      <section className="relative z-10 px-6 pt-20 pb-24 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-200">
              Have a feature request? Found a bug? We're here to help and we're listening.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="backdrop-blur-md bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Us
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href="mailto:hello@bigfluffy.ai" 
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    hello@bigfluffy.ai
                  </a>
                  <p className="text-gray-400 text-sm mt-2">
                    We typically respond within 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-md bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Feature Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    We're building this for you! Share your ideas and we'll implement the best ones.
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-md bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Quick Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    Unlike typical enterprise software, we move fast. Great ideas get implemented in days, not months.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-md bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-2xl">Send us a message</CardTitle>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                      <p className="text-gray-300">
                        Thanks for reaching out. We'll get back to you soon.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name" className="text-white">
                            Name <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="Your name"
                          />
                        </div>

                        <div>
                          <Label htmlFor="email" className="text-white">
                            Email <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="subject" className="text-white">
                          Subject <span className="text-red-400">*</span>
                        </Label>
                        <Select value={formData.subject} onValueChange={handleSelectChange}>
                          <SelectTrigger className="mt-2 bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-white/20">
                            <SelectItem value="feature-request" className="text-white hover:bg-white/10">
                              New Feature Request
                            </SelectItem>
                            <SelectItem value="bug-report" className="text-white hover:bg-white/10">
                              Bug Report
                            </SelectItem>
                            <SelectItem value="general-inquiry" className="text-white hover:bg-white/10">
                              General Inquiry
                            </SelectItem>
                            <SelectItem value="partnership" className="text-white hover:bg-white/10">
                              Partnership Opportunity
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-white">
                          Message <span className="text-red-400">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={6}
                          className="mt-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          placeholder="Tell us what's on your mind..."
                        />
                      </div>

                      <Button 
                        type="submit" 
                        size="lg" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}