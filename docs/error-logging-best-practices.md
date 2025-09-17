# Error Logging Best Practices

## 🚨 CRITICAL: Always Use captureError for Error Logging

**Last Updated: 2025-09-12**

### The Rule
**NEVER use `permanentLogger.error()` or `logger.error()` directly.**
**ALWAYS use `permanentLogger.captureError()` or `logger.captureError()` instead.**

### Why This Matters
1. **Breadcrumb Trail**: `captureError` automatically adds error details to the breadcrumb trail for debugging
2. **Full Context**: Captures complete error stack, cause, and metadata
3. **Error Similarity**: Detects similar errors to identify patterns
4. **Request Correlation**: Links errors to specific request IDs
5. **Performance Timing**: Includes performance waterfall at error time

### How to Use captureError

#### Basic Usage
```typescript
// ❌ WRONG - Don't use error()
permanentLogger.error('MODULE_NAME', 'Something went wrong', { data })

// ✅ CORRECT - Use captureError()
permanentLogger.captureError('MODULE_NAME', error, { 
  context: 'Something went wrong',
  data 
})
```

#### Common Patterns

##### 1. Catching Errors in Try-Catch
```typescript
try {
  await someOperation()
} catch (error) {
  // Capture the actual error object with context
  permanentLogger.captureError('API_HANDLER', error, {
    context: 'Failed to process request',
    endpoint: '/api/example',
    method: 'POST',
    requestData
  })
}
```

##### 2. Creating Error from String
```typescript
// When you only have an error message string
const errorMessage = 'Database connection failed'
permanentLogger.captureError('DATABASE', new Error(errorMessage), {
  context: 'Connection attempt failed',
  connectionString: 'postgres://...',
  retryCount: 3
})
```

##### 3. API Error Handling
```typescript
// Use specialized captureApiError for external APIs
permanentLogger.captureApiError('OpenAI', error, {
  requestStartTime: startTime,
  retryAttempt: 1,
  expectedStatusCodes: [200, 201]
})
```

##### 4. Stream Error Handling
```typescript
stream.on('error', (error) => {
  permanentLogger.captureError('STREAM_HANDLER', error, {
    context: 'Stream processing failed',
    streamId,
    correlationId,
    bytesProcessed
  })
})
```

### What Gets Captured

When you use `captureError`, the following is automatically captured:

```typescript
{
  // Error Details
  message: string           // Error message
  stack: string            // Stack trace
  code: string            // Error code (if available)
  statusCode: number      // HTTP status (if applicable)
  
  // Request Context
  requestId: string       // Current request ID
  breadcrumbs: []        // Last 20 actions before error
  timing: []             // Performance waterfall
  
  // Error Analysis
  similarity: {          // Similar errors detected
    score: number
    previousOccurrence: Date
  }
  
  // Custom Context
  ...yourContext        // Whatever you pass in context param
}
```

### Migration Guide

If you have existing code using `error()`, update it:

```typescript
// Before
logger.error('SCRAPING', 'Failed to scrape page', { url, error })

// After - Option 1: If you have an error object
logger.captureError('SCRAPING', error, { 
  context: 'Failed to scrape page',
  url 
})

// After - Option 2: If you only have a message
logger.captureError('SCRAPING', new Error('Failed to scrape page'), {
  context: 'Page scraping failed',
  url
})
```

### Automated Migration

Run the migration script to update all files:

```bash
chmod +x scripts/update-error-logging.sh
./scripts/update-error-logging.sh
```

### Integration with Breadcrumbs

`captureError` automatically adds an entry to the breadcrumb trail:

```typescript
// This happens automatically inside captureError
this.breadcrumb('BUSINESS_LOGIC', `ERROR: ${errorDetails.message}`, {
  error: errorDetails,
  context
})
```

This means when debugging, you can see:
1. What actions led up to the error
2. The exact error details
3. The state at the time of error
4. Performance metrics before failure

### Best Practices

1. **Always provide context**: Include relevant data that helps debug
2. **Use appropriate category**: GROUP errors by module/component
3. **Include identifiers**: Add IDs, URLs, user info when relevant
4. **Capture early**: Log errors as close to source as possible
5. **Don't double-log**: If parent catches error, child shouldn't log
6. **Sanitize sensitive data**: Logger auto-sanitizes, but be careful

### Examples from Codebase

#### Company Intelligence Scraping
```typescript
permanentLogger.captureError('SCRAPING_CONTROL', error, {
  context: 'Scraping execution failed',
  scraperId,
  sessionId,
  domain,
  attemptNumber
})
```

#### Database Operations
```typescript
permanentLogger.captureError('DATABASE', error, {
  context: 'Failed to insert session',
  table: 'company_intelligence_sessions',
  operation: 'INSERT',
  data: sanitizedData
})
```

#### LLM API Calls
```typescript
permanentLogger.captureApiError('GPT5', error, {
  model: 'gpt-5-mini',
  tokens: estimatedTokens,
  requestStartTime: startTime,
  retryAttempt: attempt
})
```

### Viewing Captured Errors

Errors are stored in:
1. **Permanent Logs Table**: `permanent_logs` in Supabase
2. **Memory Buffer**: Last 100 errors in `recentErrors`
3. **Log Files**: `logs/enhanced-logger.md` on server

Query errors with breadcrumbs:
```sql
SELECT 
  log_timestamp,
  category,
  message,
  breadcrumbs,
  error_details
FROM permanent_logs
WHERE log_level = 'ERROR'
  AND breadcrumbs IS NOT NULL
ORDER BY log_timestamp DESC
LIMIT 10;
```

### Testing Error Capture

```typescript
// Test that errors are properly captured
const testError = new Error('Test error for breadcrumb capture')
testError.code = 'TEST_ERROR'
testError.statusCode = 500

permanentLogger.captureError('TEST', testError, {
  context: 'Testing error capture',
  testData: { foo: 'bar' }
})

// Check breadcrumbs
const breadcrumbs = permanentLogger.getBreadcrumbs()
const errorBreadcrumb = breadcrumbs.find(b => 
  b.action.includes('ERROR:')
)
console.log('Error in breadcrumbs:', errorBreadcrumb)
```

## Summary

Using `captureError` instead of `error` ensures:
- ✅ Complete error context is preserved
- ✅ Breadcrumb trail includes error details
- ✅ Similar errors are detected
- ✅ Performance data at error time is captured
- ✅ Request correlation is maintained
- ✅ Debugging is significantly easier

**Remember: ALWAYS use captureError for ALL error logging!**