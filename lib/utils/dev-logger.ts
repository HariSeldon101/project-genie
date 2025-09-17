/**
 * Development Logger for Debugging Document Generation Issues
 * Logs to console with detailed information for debugging
 */

export class DevLogger {
  private static enabled = process.env.NODE_ENV === 'development'
  private static logToFile = false // Can be enabled to write to file

  static logSection(title: string) {
    if (!this.enabled) return
    console.log('\n' + '='.repeat(80))
    console.log(`🔍 ${title}`)
    console.log('='.repeat(80))
  }

  static logStep(step: string, data?: any) {
    if (!this.enabled) return
    console.log(`\n➡️  ${step}`)
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2).substring(0, 500))
    }
  }

  static logSuccess(message: string, data?: any) {
    if (!this.enabled) return
    console.log(`✅ ${message}`)
    if (data) {
      console.log('   Result:', JSON.stringify(data, null, 2).substring(0, 500))
    }
  }

  static logError(message: string, error?: any) {
    if (!this.enabled) return
    console.error(`❌ ${message}`)
    if (error) {
      console.error('   Error:', error)
    }
  }

  static logWarning(message: string, data?: any) {
    if (!this.enabled) return
    console.warn(`⚠️  ${message}`)
    if (data) {
      console.warn('   Warning data:', data)
    }
  }

  static logUsageTracking(stage: string, usage: any) {
    if (!this.enabled) return
    console.log(`\n📊 Usage Tracking - ${stage}:`)
    console.log('   Input Tokens:', usage?.inputTokens || 'MISSING')
    console.log('   Output Tokens:', usage?.outputTokens || 'MISSING')
    console.log('   Reasoning Tokens:', usage?.reasoningTokens || 'N/A')
    console.log('   Total Tokens:', usage?.totalTokens || 'MISSING')
    console.log('   Raw usage object:', usage)
  }

  static logDocumentContent(docType: string, content: any) {
    if (!this.enabled) return
    console.log(`\n📄 Document Content - ${docType}:`)
    console.log('   Type of content:', typeof content)
    console.log('   Is Array:', Array.isArray(content))
    console.log('   Keys:', content && typeof content === 'object' ? Object.keys(content) : 'N/A')
    console.log('   Sample:', JSON.stringify(content, null, 2).substring(0, 300))
  }

  static logFormatterCall(docType: string, hasFormatter: boolean, error?: any) {
    if (!this.enabled) return
    console.log(`\n🎨 Formatter Call - ${docType}:`)
    console.log('   Has formatter:', hasFormatter)
    if (error) {
      console.log('   Formatter error:', error)
    }
  }

  static logAPIResponse(endpoint: string, response: any) {
    if (!this.enabled) return
    console.log(`\n🌐 API Response - ${endpoint}:`)
    console.log('   Status:', response?.status || 'unknown')
    console.log('   Has usage:', !!response?.usage)
    console.log('   Has documents:', !!response?.documents)
    console.log('   Document count:', response?.documents?.length || 0)
    if (response?.usage) {
      this.logUsageTracking('API Response', response.usage)
    }
  }

  static logDatabaseOperation(operation: string, data: any, result?: any) {
    if (!this.enabled) return
    console.log(`\n💾 Database Operation - ${operation}:`)
    console.log('   Data keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A')
    console.log('   Has usage metadata:', !!data?.generation_metadata)
    if (result) {
      console.log('   Result:', result)
    }
  }

  static summary(issues: string[]) {
    if (!this.enabled) return
    console.log('\n' + '='.repeat(80))
    console.log('📋 DEBUG SUMMARY')
    console.log('='.repeat(80))
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`)
    })
    console.log('='.repeat(80) + '\n')
  }
}

export default DevLogger