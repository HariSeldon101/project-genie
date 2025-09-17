'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
// Using TooltipWrapper as the standard tooltip component across the app
import { Loader2, Search, Globe, Server, Code, Database, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { persistentToast } from '@/lib/hooks/use-persistent-toast'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { eventBus, EventFactory } from '@/lib/notifications'

// Technology logos from react-icons
import { 
  FaReact, 
  FaVuejs, 
  FaAngular, 
  FaWordpress, 
  FaShopify,
  FaHtml5,
  FaGoogle,
  FaCloudflare,
  FaAws,
  FaNodeJs,
  FaPython,
  FaPhp,
  FaJava,
  FaDocker,
  FaGitAlt,
  FaJs,
  FaCss3Alt,
  FaSass,
  FaBootstrap,
  FaNpm,
  FaYarn,
  FaLinux,
  FaWindows,
  FaApple,
  FaChrome,
  FaFirefox,
  FaEdge,
  FaSafari
} from 'react-icons/fa'
import { 
  SiNextdotjs, 
  SiNuxtdotjs,
  SiSvelte,
  SiTypescript,
  SiTailwindcss,
  SiVercel,
  SiNetlify,
  SiSupabase,
  SiFirebase,
  SiMongodb,
  SiPostgresql,
  SiMysql,
  SiRedis,
  SiNginx,
  SiApache,
  SiWix,
  SiSquarespace,
  SiDrupal,
  SiJoomla,
  SiGoogleanalytics,
  SiGoogletagmanager,
  SiHotjar,
  SiMixpanel,
  SiGraphql,
  SiWebpack,
  SiVite,
  SiEslint,
  SiPrettier,
  SiJest,
  SiCypress,
  SiPlaywright,
  SiStorybook,
  SiFramer,
  SiStripe,
  SiPaypal,
  SiCloudinary,
  SiContentful,
  SiSanity,
  SiPrisma,
  SiExpress,
  SiFastapi,
  SiDjango,
  SiFlask,
  SiLaravel,
  SiRubyonrails,
  SiSpring,
  SiDotnet,
  SiGo,
  SiRust,
  SiKubernetes,
  SiTerraform,
  SiJenkins,
  SiGithubactions,
  SiGitlab,
  SiBitbucket,
  SiJquery,
  SiWebflow,
  SiMagento,
  SiPrestashop,
  SiWoocommerce,
  SiNodedotjs
} from 'react-icons/si'

// Helper function to get schema.org type descriptions
function getSchemaTooltip(schemaType: string): string {
  const schemaDescriptions: Record<string, string> = {
    'Organization': 'General organization/company - Basic business entity with name, logo, and contact info',
    'Corporation': 'Corporate entity - Formal business corporation with shareholders and governance',
    'LocalBusiness': 'Local business - Physical location serving local customers, includes address and hours',
    'ProfessionalService': 'Professional service provider - Consulting, legal, accounting, or other professional services',
    'Store': 'Retail store - Physical or online store selling products to consumers',
    'Restaurant': 'Restaurant or food service - Dining establishment with menu and service info',
    'Hotel': 'Hospitality business - Accommodation provider with rooms and amenities',
    'EducationalOrganization': 'Educational institution - School, university, or training provider',
    'MedicalOrganization': 'Healthcare provider - Hospital, clinic, or medical practice',
    'SportsOrganization': 'Sports team or organization - Athletic clubs and sports entities',
    'NGO': 'Non-governmental organization - Non-profit or charitable organization',
    'GovernmentOrganization': 'Government entity - Public sector organization or agency',
    'FinancialService': 'Financial services - Banking, insurance, or investment services',
    'TechnologyCompany': 'Technology company - Software, hardware, or IT services provider',
    'Product': 'Product listing - Specific product with pricing and availability',
    'Service': 'Service offering - Specific service with description and pricing',
    'WebSite': 'Website - General website with search and navigation features',
    'WebPage': 'Web page - Individual page with specific content and purpose',
    'Article': 'Article or blog post - Written content with author and publication date',
    'BlogPosting': 'Blog post - Blog article with comments and categories',
    'NewsArticle': 'News article - Journalistic content with headline and dateline'
  }
  
  return schemaDescriptions[schemaType] || `${schemaType} - Structured data markup for search engine understanding`
}

interface SiteAnalyzerProps {
  domain: string
  onAnalysisComplete: (analysis: SiteAnalysis) => void
}

export interface SiteAnalysis {
  domain: string
  technologies: {
    frontend: string[]
    backend: string[]
    cms: string[]
    analytics: string[]
    hosting: string[]
    security: string[]
  }
  metadata: {
    title?: string
    description?: string
    keywords?: string[]
    favicon?: string
    ogImage?: string
    ogTitle?: string
    ogDescription?: string
    twitterImage?: string
    twitterCard?: string
    twitterTitle?: string
    schemaType?: string
    language?: string
    charset?: string
  }
  performance: {
    loadTime?: number
    pageSize?: number
    requestCount?: number
  }
  siteType: 'wordpress' | 'shopify' | 'wix' | 'squarespace' | 'joomla' | 'drupal' | 
           'webflow' | 'react' | 'nextjs' | 'angular' | 'vue' | 'svelte' | 
           'nodejs' | 'express' | 'woocommerce' | 'magento' | 'prestashop' | 
           'bigcommerce' | 'aspnet' | 'jquery' | 'static' | 'unknown'
  confidence: number
}

export function SiteAnalyzer({ domain, onAnalysisComplete }: SiteAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDomainValid, setIsDomainValid] = useState(false)
  
  // Validate domain whenever it changes
  useEffect(() => {
    if (domain) {
      const validation = validateDomain(domain)
      setIsDomainValid(validation.isValid)
      if (!validation.isValid && domain.trim()) {
        // Only show format errors while typing, not reachability errors
        setError(validation.error || 'Invalid domain format')
      } else {
        setError(null)
      }
    } else {
      setIsDomainValid(false)
      setError(null)
    }
  }, [domain])

  // Get technology icon based on name
  const getTechLogo = (tech: string, size: 'normal' | 'large' | 'xlarge' = 'normal'): React.ReactNode => {
    const iconClass = size === 'xlarge' ? "h-12 w-12" : size === 'large' ? "h-8 w-8" : "h-4 w-4"
    const techLower = tech.toLowerCase()
    
    // Frontend frameworks
    if (techLower.includes('next')) return <SiNextdotjs className={iconClass} />
    if (techLower.includes('react')) return <FaReact className={iconClass + " text-cyan-500"} />
    if (techLower.includes('vue')) return <FaVuejs className={iconClass + " text-green-500"} />
    if (techLower.includes('angular')) return <FaAngular className={iconClass + " text-red-600"} />
    if (techLower.includes('svelte')) return <SiSvelte className={iconClass + " text-orange-500"} />
    if (techLower.includes('nuxt')) return <SiNuxtdotjs className={iconClass + " text-green-600"} />
    if (techLower.includes('jquery')) return <SiJquery className={iconClass + " text-blue-600"} />
    if (techLower.includes('node')) return <SiNodedotjs className={iconClass + " text-green-600"} />
    if (techLower.includes('express')) return <SiExpress className={iconClass} />
    
    // CMS & Website Builders
    if (techLower.includes('wordpress')) return <FaWordpress className={iconClass + " text-blue-700"} />
    if (techLower.includes('shopify')) return <FaShopify className={iconClass + " text-green-600"} />
    if (techLower.includes('wix')) return <SiWix className={iconClass} />
    if (techLower.includes('squarespace')) return <SiSquarespace className={iconClass} />
    if (techLower.includes('drupal')) return <SiDrupal className={iconClass + " text-blue-600"} />
    if (techLower.includes('joomla')) return <SiJoomla className={iconClass + " text-orange-600"} />
    if (techLower.includes('webflow')) return <SiWebflow className={iconClass + " text-blue-500"} />
    
    // E-commerce
    if (techLower.includes('woocommerce')) return <SiWoocommerce className={iconClass + " text-purple-600"} />
    if (techLower.includes('magento')) return <SiMagento className={iconClass + " text-orange-600"} />
    if (techLower.includes('prestashop')) return <SiPrestashop className={iconClass + " text-pink-600"} />
    if (techLower.includes('bigcommerce')) return <FaShoppingCart className={iconClass + " text-blue-600"} />
    
    // Server-side
    if (techLower.includes('asp.net') || techLower.includes('aspnet') || techLower.includes('.net')) return <SiDotnet className={iconClass + " text-purple-600"} />
    
    // Analytics
    if (techLower.includes('google analytics')) return <SiGoogleanalytics className={iconClass + " text-orange-500"} />
    if (techLower.includes('google tag')) return <SiGoogletagmanager className={iconClass + " text-blue-600"} />
    if (techLower.includes('hotjar')) return <SiHotjar className={iconClass + " text-red-500"} />
    if (techLower.includes('segment')) return <FaGoogle className={iconClass + " text-green-500"} /> // Using Google icon as fallback for Segment
    if (techLower.includes('mixpanel')) return <SiMixpanel className={iconClass + " text-purple-600"} />
    
    // Hosting/Infrastructure
    if (techLower.includes('cloudflare')) return <FaCloudflare className={iconClass + " text-orange-500"} />
    if (techLower.includes('vercel')) return <SiVercel className={iconClass} />
    if (techLower.includes('netlify')) return <SiNetlify className={iconClass + " text-teal-500"} />
    if (techLower.includes('nginx')) return <SiNginx className={iconClass + " text-green-600"} />
    if (techLower.includes('apache')) return <SiApache className={iconClass + " text-red-600"} />
    if (techLower.includes('aws')) return <FaAws className={iconClass + " text-orange-600"} />
    
    // CSS/Styling
    if (techLower.includes('tailwind')) return <SiTailwindcss className={iconClass + " text-cyan-500"} />
    if (techLower.includes('bootstrap')) return <FaBootstrap className={iconClass + " text-purple-600"} />
    if (techLower.includes('sass')) return <FaSass className={iconClass + " text-pink-500"} />
    
    // Default icon
    return <Code className={iconClass} />
  }

  const analyzeSite = async () => {
    setIsAnalyzing(true)
    setError(null)
    
    // Emit site analysis started event
    eventBus.emit(EventFactory.notification('Starting site analysis...', 'info'))
    eventBus.emit(EventFactory.phase('site-analysis', 'started', 'Analyzing website structure and technologies'))
    
    // Validate domain format first
    const domainValidation = validateDomain(domain)
    if (!domainValidation.isValid) {
      const errorMsg = domainValidation.error || 'Invalid domain'
      setError(errorMsg)
      persistentToast.error(errorMsg)
      eventBus.emit(EventFactory.notification(errorMsg, 'error'))
      eventBus.emit(EventFactory.phase('site-analysis', 'failed', errorMsg))
      setIsAnalyzing(false)
      return
    }
    
    // Now verify the domain actually exists and is reachable
    try {
      const validationResponse = await fetch('/api/company-intelligence/validate-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainValidation.normalizedDomain })
      })
      
      const validationResult = await validationResponse.json()
      
      if (!validationResult.valid) {
        const errorMessage = validationResult.suggestion || validationResult.error || 'Domain is not reachable'
        setError(errorMessage)
        persistentToast.error(errorMessage)
        setIsAnalyzing(false)
        return
      }
      
      // Domain is valid and reachable, proceed with analysis
      const response = await fetch('/api/company-intelligence/analyze-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: validationResult.domain || domainValidation.normalizedDomain })
      })
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Analysis failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || response.statusText
        } catch {
          errorMessage = `Analysis failed: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      setAnalysis(data)
      
      // Emit success events
      eventBus.emit(EventFactory.notification('Site analysis completed successfully!', 'success'))
      eventBus.emit(EventFactory.phase('site-analysis', 'completed', 'Site analysis complete'))
      
      // Call completion handler immediately when analysis finishes
      onAnalysisComplete(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze site'
      setError(message)
      persistentToast.error(message)
      
      // Emit error events
      eventBus.emit(EventFactory.notification(message, 'error'))
      eventBus.emit(EventFactory.phase('site-analysis', 'failed', message))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const validateDomain = (domain: string): { isValid: boolean; normalizedDomain?: string; error?: string } => {
    // Remove whitespace
    domain = domain.trim()
    
    // Check for empty input
    if (!domain) {
      return { isValid: false, error: 'Please enter a domain name' }
    }
    
    // Remove protocol if present
    let cleanDomain = domain.replace(/^https?:\/\//i, '')
    
    // Remove www. if present
    cleanDomain = cleanDomain.replace(/^www\./i, '')
    
    // Remove path if present
    cleanDomain = cleanDomain.split('/')[0]
    
    // Remove port if present
    cleanDomain = cleanDomain.split(':')[0]
    
    // Check for basic domain structure
    const domainParts = cleanDomain.split('.')
    
    if (domainParts.length < 2) {
      return { 
        isValid: false, 
        error: 'Please enter a valid domain (e.g., example.com)' 
      }
    }
    
    // Validate each part of the domain
    for (const part of domainParts) {
      // Each part must be non-empty and contain only valid characters
      if (!part || !/^[a-zA-Z0-9-]+$/.test(part)) {
        return { 
          isValid: false, 
          error: 'Domain contains invalid characters' 
        }
      }
      
      // Parts cannot start or end with hyphen
      if (part.startsWith('-') || part.endsWith('-')) {
        return { 
          isValid: false, 
          error: 'Domain parts cannot start or end with hyphens' 
        }
      }
    }
    
    // Validate TLD (must be at least 2 characters)
    const tld = domainParts[domainParts.length - 1]
    if (tld.length < 2) {
      return { 
        isValid: false, 
        error: 'Invalid top-level domain (TLD must be at least 2 characters)' 
      }
    }
    
    // Check for common TLD patterns (letters only, no numbers in TLD)
    if (!/^[a-zA-Z]+$/.test(tld)) {
      return { 
        isValid: false, 
        error: 'Invalid top-level domain (TLD must contain only letters)' 
      }
    }
    
    // Check for localhost or IP addresses
    if (cleanDomain === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanDomain)) {
      return { 
        isValid: false, 
        error: 'Please enter a public domain name, not localhost or IP addresses' 
      }
    }
    
    // Additional validation for known invalid patterns
    if (cleanDomain.includes('..') || cleanDomain.includes('--')) {
      return { 
        isValid: false, 
        error: 'Domain contains invalid character sequences' 
      }
    }
    
    return { isValid: true, normalizedDomain: cleanDomain }
  }

  const getTechIcon = (type: string) => {
    const techLower = type.toLowerCase()
    
    // Try to get specific icon first
    const specificIcon = getTechLogo(type)
    if (specificIcon) return specificIcon
    
    // Fallback to category icons
    if (techLower.includes('database')) return <Database className="h-4 w-4" />
    if (techLower.includes('security')) return <Shield className="h-4 w-4" />
    if (techLower.includes('server')) return <Server className="h-4 w-4" />
    
    return <Code className="h-4 w-4" />
  }

  const getSiteTypeBadgeColor = (type: string) => {
    switch (type) {
      // CMS & Website Builders
      case 'wordpress': return 'bg-blue-500'
      case 'shopify': return 'bg-green-600'
      case 'wix': return 'bg-black'
      case 'squarespace': return 'bg-black'
      case 'joomla': return 'bg-orange-600'
      case 'drupal': return 'bg-blue-600'
      case 'webflow': return 'bg-blue-500'
      
      // JavaScript Frameworks
      case 'react': return 'bg-cyan-500'
      case 'nextjs': return 'bg-black'
      case 'vue': return 'bg-green-500'
      case 'angular': return 'bg-red-500'
      case 'svelte': return 'bg-orange-500'
      case 'nodejs': return 'bg-green-600'
      case 'express': return 'bg-gray-700'
      case 'jquery': return 'bg-blue-600'
      
      // E-commerce
      case 'woocommerce': return 'bg-purple-600'
      case 'magento': return 'bg-orange-600'
      case 'prestashop': return 'bg-pink-600'
      case 'bigcommerce': return 'bg-blue-600'
      
      // Server-side
      case 'aspnet': return 'bg-purple-600'
      
      // Static
      case 'static': return 'bg-gray-500'
      
      default: return 'bg-gray-400'
    }
  }
  
  const getSiteTypeLogo = (type: string, size: 'normal' | 'large' | 'xlarge' = 'normal'): React.ReactNode => {
    const iconClass = size === 'xlarge' ? "h-12 w-12" : size === 'large' ? "h-8 w-8" : "h-5 w-5"
    switch (type) {
      // CMS & Website Builders
      case 'wordpress': return <FaWordpress className={iconClass} />
      case 'shopify': return <FaShopify className={iconClass} />
      case 'wix': return <SiWix className={iconClass} />
      case 'squarespace': return <SiSquarespace className={iconClass} />
      case 'joomla': return <SiJoomla className={iconClass} />
      case 'drupal': return <SiDrupal className={iconClass} />
      case 'webflow': return <SiWebflow className={iconClass} />
      
      // JavaScript Frameworks
      case 'react': return <FaReact className={iconClass} />
      case 'nextjs': return <SiNextdotjs className={iconClass} />
      case 'vue': return <FaVuejs className={iconClass} />
      case 'angular': return <FaAngular className={iconClass} />
      case 'svelte': return <SiSvelte className={iconClass} />
      case 'nodejs': return <SiNodedotjs className={iconClass} />
      case 'express': return <SiExpress className={iconClass} />
      case 'jquery': return <SiJquery className={iconClass} />
      
      // E-commerce
      case 'woocommerce': return <SiWoocommerce className={iconClass} />
      case 'magento': return <SiMagento className={iconClass} />
      case 'prestashop': return <SiPrestashop className={iconClass} />
      case 'bigcommerce': return <FaShoppingCart className={iconClass} />
      
      // Server-side
      case 'aspnet': return <SiDotnet className={iconClass} />
      
      // Static
      case 'static': return <FaHtml5 className={iconClass} />
      
      default: return <Globe className={iconClass} />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Site Analysis
        </CardTitle>
        <CardDescription>
          Detect technology stack and site configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && (
          <Button 
            onClick={analyzeSite}
            disabled={!domain || !isDomainValid || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing {domain}...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Site
              </>
            )}
          </Button>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {analysis && (
          <div className="space-y-4 relative">
            {/* NextJS Logo in TOP RIGHT CORNER - 30px from right */}
            <div className="absolute top-0 right-[30px] flex items-center gap-2">
              {getSiteTypeLogo(analysis.siteType, 'xlarge')}
              <TooltipWrapper content={`Site type: ${analysis.siteType.toUpperCase()} - ${analysis.siteType === 'ecommerce' ? 'E-commerce platform for online shopping' : analysis.siteType === 'blog' ? 'Blog or content publishing platform' : analysis.siteType === 'portfolio' ? 'Portfolio showcasing work or projects' : analysis.siteType === 'saas' ? 'Software as a Service application' : 'Corporate or business website'}`}>
                <Badge className={`${getSiteTypeBadgeColor(analysis.siteType)} text-white px-3 py-1`}>
                  <span className="font-semibold">{analysis.siteType.toUpperCase()}</span>
                </Badge>
              </TooltipWrapper>
            </div>
            
            {/* Site Type and Confidence - left side, make room for logo */}
            <div className="flex gap-8 pt-12">
              <TooltipWrapper content="Detected website platform/framework (Next.js, React, WordPress, etc.)">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Site Type:</span>
                  <span className="text-sm">{analysis.siteType}</span>
                </div>
              </TooltipWrapper>
              
              <div className="flex items-center gap-2">
                <TooltipWrapper content="How confident we are in the technology detection accuracy">
                  <span className="text-sm font-medium">Confidence:</span>
                </TooltipWrapper>
                <TooltipWrapper content="Confidence score based on: Technology stack detection accuracy, Number of indicators found, Metadata completeness, Security headers presence">
                  <span className="text-sm font-semibold text-primary">
                    {Math.round(analysis.confidence * 100)}%
                  </span>
                </TooltipWrapper>
              </div>
            </div>
            
            {/* Technology Stack - Grid layout for better space usage */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Detected Technologies</h4>
              
              <div className="grid grid-cols-4 gap-3">
                {/* Frontend */}
                {analysis.technologies.frontend.length > 0 && (
                  <div className="space-y-1">
                    <TooltipWrapper content="Frontend frameworks and libraries used to build the user interface">
                      <span className="text-xs text-muted-foreground">Frontend</span>
                    </TooltipWrapper>
                    <div className="flex flex-wrap gap-1">
                      {analysis.technologies.frontend.map((tech, i) => (
                        <TooltipWrapper key={i} content={
                          tech === 'Next.js' ? 'React framework with server-side rendering and static site generation' :
                          tech === 'React' ? 'JavaScript library for building user interfaces' :
                          tech === 'Vue.js' ? 'Progressive JavaScript framework for building UIs' :
                          tech === 'Angular' ? 'TypeScript-based web application framework' :
                          tech === 'Svelte' ? 'Compile-time optimized frontend framework' :
                          `${tech} - Frontend technology`
                        }>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {getTechLogo(tech)}
                            {tech}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* CMS */}
                {analysis.technologies.cms.length > 0 && (
                  <div className="space-y-1">
                    <TooltipWrapper content="Content Management Systems used to manage website content">
                      <span className="text-xs text-muted-foreground">CMS</span>
                    </TooltipWrapper>
                    <div className="flex flex-wrap gap-1">
                      {analysis.technologies.cms.map((tech, i) => (
                        <TooltipWrapper key={i} content={
                          tech === 'WordPress' ? 'Popular open-source CMS powering 40% of the web' :
                          tech === 'Shopify' ? 'E-commerce platform for online stores' :
                          tech === 'Wix' ? 'Drag-and-drop website builder' :
                          tech === 'Squarespace' ? 'All-in-one website building platform' :
                          tech === 'Drupal' ? 'Enterprise-grade open-source CMS' :
                          tech === 'Joomla' ? 'Flexible open-source CMS' :
                          `${tech} - Content Management System`
                        }>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {getTechLogo(tech)}
                            {tech}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Analytics */}
                {analysis.technologies.analytics.length > 0 && (
                  <div className="space-y-1">
                    <TooltipWrapper content="Analytics and tracking tools used to measure website performance and user behavior">
                      <span className="text-xs text-muted-foreground">Analytics</span>
                    </TooltipWrapper>
                    <div className="flex flex-wrap gap-1">
                      {analysis.technologies.analytics.map((tech, i) => (
                        <TooltipWrapper key={i} content={
                          tech === 'Google Analytics' ? 'Web analytics service that tracks website traffic and user behavior' :
                          tech === 'Google Tag Manager' ? 'Tag management system for tracking codes and pixels' :
                          tech === 'Hotjar' ? 'Behavior analytics with heatmaps and session recordings' :
                          tech === 'Mixpanel' ? 'Product analytics for tracking user interactions' :
                          tech === 'Segment' ? 'Customer data platform for collecting and routing analytics' :
                          `${tech} - Analytics tool`
                        }>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {getTechLogo(tech)}
                            {tech}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Hosting */}
                {analysis.technologies.hosting.length > 0 && (
                  <div className="space-y-1">
                    <TooltipWrapper content="Hosting providers and infrastructure services powering the website">
                      <span className="text-xs text-muted-foreground">Hosting/Infrastructure</span>
                    </TooltipWrapper>
                    <div className="flex flex-wrap gap-1">
                      {analysis.technologies.hosting.map((tech, i) => (
                        <TooltipWrapper key={i} content={
                          tech === 'Vercel' ? 'Platform for frontend frameworks with edge functions and analytics' :
                          tech === 'Netlify' ? 'Platform for modern web projects with CI/CD' :
                          tech === 'AWS' ? 'Amazon Web Services - Cloud computing platform' :
                          tech === 'Cloudflare' ? 'CDN and DDoS protection service' :
                          tech === 'Google Cloud' ? 'Google Cloud Platform for hosting and services' :
                          tech === 'Azure' ? 'Microsoft cloud computing platform' :
                          `${tech} - Hosting/Infrastructure provider`
                        }>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {getTechLogo(tech)}
                            {tech}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Security */}
                {analysis.technologies.security.length > 0 && (
                  <div className="space-y-1">
                    <TooltipWrapper content="HTTP security headers that protect against common web vulnerabilities">
                      <span className="text-xs text-muted-foreground">Security Headers</span>
                    </TooltipWrapper>
                    <div className="flex flex-wrap gap-1">
                      {analysis.technologies.security.map((tech, i) => (
                        <TooltipWrapper key={i} content={
                          tech === 'HSTS' ? 'HTTP Strict Transport Security - Forces HTTPS connections to prevent downgrade attacks' :
                          tech === 'X-Frame-Options' ? 'Prevents clickjacking attacks by controlling iframe embedding' :
                          tech === 'X-Content-Type-Options' ? 'Prevents MIME type sniffing attacks' :
                          tech === 'CSP' ? 'Content Security Policy - Controls which resources can be loaded' :
                          tech === 'X-XSS-Protection' ? 'Legacy XSS protection header (deprecated in modern browsers)' :
                          `${tech} - Security header`
                        }>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {tech}
                          </Badge>
                        </TooltipWrapper>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced Metadata Display */}
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-semibold">SEO & Social Metadata</h4>
              
              <div className="space-y-3">
                {/* Basic SEO - Changed from grid to stacked layout for better alignment */}
                {analysis.metadata.title && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Page Title</span>
                    <p className="text-sm font-medium">{analysis.metadata.title}</p>
                  </div>
                )}
                
                {analysis.metadata.description && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Meta Description</span>
                    <p className="text-sm text-muted-foreground">{analysis.metadata.description}</p>
                  </div>
                )}
              </div>
              
              {/* Social Media and Additional Info - Reorganized for better alignment */}
              <div className="space-y-3">
                {/* Social Media */}
                {(analysis.metadata.ogTitle || analysis.metadata.twitterTitle || analysis.metadata.ogImage || analysis.metadata.twitterImage || analysis.metadata.schemaType) && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Link Preview Metadata (Open Graph/Twitter Cards)</span>
                    <div className="flex flex-wrap gap-2">
                      {analysis.metadata.ogImage && (
                        <div className="relative group">
                          <TooltipWrapper content="Open Graph Image - Click to view full size">
                            <div className="cursor-pointer">
                              <Badge variant="outline" className="text-xs pr-1">
                                <span className="mr-1">📘</span> OG Image
                                <img 
                                  src={analysis.metadata.ogImage}
                                  alt="OG Image thumbnail"
                                  className="inline-block ml-2 h-8 w-12 object-cover rounded border border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </Badge>
                              {/* Hover preview */}
                              <div className="absolute z-50 hidden group-hover:block top-full mt-2 left-0">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2">
                                  <img 
                                    src={analysis.metadata.ogImage}
                                    alt="OG Image preview"
                                    className="max-w-xs max-h-64 object-contain rounded"
                                  />
                                  <p className="text-xs text-muted-foreground mt-2 max-w-xs break-all">
                                    {analysis.metadata.ogImage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TooltipWrapper>
                        </div>
                      )}
                      {analysis.metadata.twitterImage && (
                        <div className="relative group">
                          <TooltipWrapper content="Twitter Card Image - Click to view full size">
                            <div className="cursor-pointer">
                              <Badge variant="outline" className="text-xs pr-1">
                                <span className="mr-1">🐦</span> Twitter Image
                                <img 
                                  src={analysis.metadata.twitterImage}
                                  alt="Twitter Image thumbnail"
                                  className="inline-block ml-2 h-8 w-12 object-cover rounded border border-gray-200"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </Badge>
                              {/* Hover preview */}
                              <div className="absolute z-50 hidden group-hover:block top-full mt-2 left-0">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2">
                                  <img 
                                    src={analysis.metadata.twitterImage}
                                    alt="Twitter Image preview"
                                    className="max-w-xs max-h-64 object-contain rounded"
                                  />
                                  <p className="text-xs text-muted-foreground mt-2 max-w-xs break-all">
                                    {analysis.metadata.twitterImage}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </TooltipWrapper>
                        </div>
                      )}
                      {analysis.metadata.twitterCard && !analysis.metadata.twitterImage && (
                        <TooltipWrapper content={`Twitter Card: ${analysis.metadata.twitterCard === 'summary_large_image' ? 'Large image preview - Shows a prominent image when links are shared on Twitter/X, ideal for visual content and articles' : analysis.metadata.twitterCard === 'summary' ? 'Standard summary - Compact preview with small thumbnail for Twitter/X shares' : `${analysis.metadata.twitterCard} - Custom Twitter card configuration for enhanced social sharing`}`}>
                          <Badge variant="outline" className="text-xs cursor-help">
                            <span className="mr-1">🐦</span> {analysis.metadata.twitterCard}
                          </Badge>
                        </TooltipWrapper>
                      )}
                      {analysis.metadata.schemaType && (
                        <TooltipWrapper content={getSchemaTooltip(analysis.metadata.schemaType)}>
                          <Badge variant="outline" className="text-xs cursor-help">
                            <span className="mr-1">📋</span> {analysis.metadata.schemaType}
                          </Badge>
                        </TooltipWrapper>
                      )}
                      {/* Show message if no link preview optimization detected */}
                      {!analysis.metadata.ogImage && !analysis.metadata.twitterImage && !analysis.metadata.ogTitle && !analysis.metadata.twitterCard && (
                        <TooltipWrapper content="No Open Graph or Twitter Card meta tags detected. This site may not display rich previews when shared.">
                          <Badge variant="secondary" className="text-xs cursor-help">
                            <span className="mr-1">⚠️</span> No link preview tags
                          </Badge>
                        </TooltipWrapper>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Social Media Account extraction moved to Scraping Phase */}
                {/* Social media accounts are now extracted during the scraping phase for more reliable detection */}
                
                {/* Additional Info - LEFT ALIGNED LIST */}
                <div className="space-y-2">
                  <TooltipWrapper content="Technical metadata and configuration details extracted from the website">
                    <span className="text-xs text-muted-foreground">Additional Info</span>
                  </TooltipWrapper>
                  <div className="space-y-1.5 pl-0">
                    {analysis.metadata.language && (
                      <TooltipWrapper content="Primary language declared in the HTML lang attribute">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Language: </span>
                          <span className="font-medium">{analysis.metadata.language}</span>
                        </div>
                      </TooltipWrapper>
                    )}
                    {analysis.metadata.charset && (
                      <TooltipWrapper content="Character encoding for text display (UTF-8 is standard for international support)">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Charset: </span>
                          <span className="font-medium">{analysis.metadata.charset}</span>
                        </div>
                      </TooltipWrapper>
                    )}
                    {analysis.metadata.viewport && (
                      <TooltipWrapper content="Viewport meta tag detected - indicates mobile-responsive design">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Mobile: </span>
                          <span className="font-medium">✓ Responsive</span>
                        </div>
                      </TooltipWrapper>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Completion message - Phase controls will handle progression */}
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Analysis complete! Review the results above and use the approval panel to proceed.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
}