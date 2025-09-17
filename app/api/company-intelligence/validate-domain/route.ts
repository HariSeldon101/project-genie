import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export async function POST(request: NextRequest) {
  return await permanentLogger.withRequest('validate_domain', async (requestId) => {
    // Add breadcrumb for request start
    permanentLogger.breadcrumb('VALIDATION', 'Starting domain validation')
    
    const { domain } = await request.json()
    permanentLogger.breadcrumb('VALIDATION', 'Request body parsed', { domain })
    
    if (!domain) {
      return NextResponse.json(
        { valid: false, error: 'Domain is required' },
        { status: 400 }
      )
    }
    
    permanentLogger.info('VALIDATE_DOMAIN', 'Checking domain validity', { domain })
    
    // Clean the domain
    let cleanDomain = domain.trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split(':')[0]
    
    // Try to resolve the domain using DNS
    try {
      // Performance tracking
      permanentLogger.timing('fetch_https_start')
      permanentLogger.breadcrumb('API_CALL', 'Attempting HTTPS connection', { cleanDomain })
      
      // Try to fetch the domain with a HEAD request to check if it's reachable
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(`https://${cleanDomain}`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DomainValidator/1.0)'
        }
      })
      
      clearTimeout(timeoutId)
      permanentLogger.timing('fetch_https_end')
      
      // If we get here without an error, the domain exists
      permanentLogger.info('VALIDATE_DOMAIN', 'Domain is valid and reachable', {
        domain: cleanDomain,
        status: response.status,
        protocol: 'https'
      })
      
      // Request will be automatically closed by withRequest
      return NextResponse.json({
        valid: true,
        domain: cleanDomain,
        reachable: true
      })

    } catch (fetchError: any) {
      permanentLogger.timing('fetch_https_failed')
      permanentLogger.breadcrumb('API_CALL', 'HTTPS failed, trying HTTP', { error: fetchError.message })
      
      // Try HTTP as fallback
      try {
        permanentLogger.timing('fetch_http_start')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`http://${cleanDomain}`, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DomainValidator/1.0)'
          }
        })
        
        clearTimeout(timeoutId)
        permanentLogger.timing('fetch_http_end')
        
        permanentLogger.info('VALIDATE_DOMAIN', 'Domain is valid (HTTP only)', {
          domain: cleanDomain,
          status: response.status,
          protocol: 'http'
        })
        
        return NextResponse.json({
          valid: true,
          domain: cleanDomain,
          reachable: true,
          httpOnly: true
        })
        
      } catch (httpError: any) {
        permanentLogger.timing('fetch_http_failed')
        
        // Capture API error with full context
        permanentLogger.captureError('DOMAIN_VALIDATION', httpError, {
          requestStartTime: new Date(),
          domain: cleanDomain,
          protocol: 'http'
        })
        
        // Check if it's a network error or timeout
        if (httpError.name === 'AbortError') {
          permanentLogger.captureError('VALIDATE_DOMAIN', new Error('Domain validation timeout'), {
            domain: cleanDomain,
            timeout: 5000
          })
          return NextResponse.json({
            valid: false,
            error: 'Domain took too long to respond. Please check the spelling and try again.',
            suggestion: 'The domain might be slow or unreachable. Verify the spelling is correct.'
          })
        }
        
        // Domain doesn't exist or is unreachable
        permanentLogger.captureError('VALIDATE_DOMAIN', httpError, {
          domain: cleanDomain,
          message: 'Domain is not reachable',
          errorCode: httpError.code,
          errorType: httpError.name
        })
        
        // Try to provide helpful suggestions
        let suggestion = 'Please check the spelling and ensure the domain exists.'
        
        // Check for common typos
        if (cleanDomain.includes('..')) {
          suggestion = 'Domain contains invalid characters (double dots). Please check the spelling.'
        } else if (!cleanDomain.includes('.')) {
          suggestion = 'Domain must include a top-level domain (e.g., .com, .org, .net).'
        } else if (httpError.message.includes('ENOTFOUND') || httpError.message.includes('getaddrinfo')) {
          suggestion = `Cannot find domain "${cleanDomain}". Please check the spelling or verify the domain exists.`
        }
        
        return NextResponse.json({
          valid: false,
          error: `Domain "${cleanDomain}" is not reachable`,
          suggestion
        })
      }
    }
  })
}