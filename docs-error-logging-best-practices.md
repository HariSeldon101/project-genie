# Error Logging Best Practices

## 🚨 CRITICAL: PermanentLogger Method Signatures

### ONLY These Methods Exist
```typescript
import { permanentLogger } from '@/lib/utils/permanent-logger'

// ✅ THESE ARE THE ONLY AVAILABLE METHODS:
permanentLogger.info(category: string, message: string, data?: any): void
permanentLogger.warn(category: string, message: string, data?: any): void
permanentLogger.debug(category: string, message: string, data?: any): void
permanentLogger.captureError(category: string, error: Error, context?: any): void
permanentLogger.breadcrumb(action: string, message: string, data?: any): void
permanentLogger.timing(label: string, metadata?: any): TimingHandle

// ❌ THESE DO NOT EXIST - COMPILATION WILL FAIL:
permanentLogger.error()    // NO! Use captureError()
permanentLogger.log()      // NO! Use info()
```

### TypeScript Will Enforce This
```typescript
// This is enforced at compile time
// If you try to use .error(), TypeScript will fail:
// Property 'error' does not exist on type 'PermanentLogger'

// Additionally, a runtime trap exists:
Object.defineProperty(permanentLogger, 'error', {
  get() {
    throw new Error('permanentLogger.error() does not exist! Use captureError() instead')
  }
})
```

## Core Logging Principles

### 1. **Always Use captureError() for Errors**
```typescript
// ❌ WRONG - These methods don't exist
permanentLogger.error('CATEGORY', 'Error occurred')  // FAILS!
logger.error('Something went wrong')                 // FAILS!

// ✅ CORRECT - Use captureError with proper signature
try {
  // code that might fail
} catch (error) {
  permanentLogger.captureError('CATEGORY', error as Error, {
    operation: 'fetchData',
    userId: user.id,
    timestamp: new Date().toISOString()
  })
}
```

### 2. **Category Always Comes First**
```typescript
// ❌ WRONG - Message before category
permanentLogger.info('User logged in', 'AUTH')

// ✅ CORRECT - Category first
permanentLogger.info('AUTH', 'User logged in', { userId })
```

### 3. **Use Proper Category Naming**
```typescript
// Use SCREAMING_SNAKE_CASE for categories:
'API_USERS'           // API endpoints
'REPO_PROJECTS'       // Repository operations
'SERVICE_EMAIL'       // Service layer
'SCRAPER_MAIN'        // Scraper operations
'AUTH_FLOW'           // Authentication
'MIGRATION_RUN'       // Database migrations
'UI_DASHBOARD'        // UI components
'WEBHOOK_STRIPE'      // External webhooks
```

## Breadcrumbs at Interface Boundaries

### What Are Interface Boundaries?
Interface boundaries are points where data crosses between different layers of the application:
- UI → API
- API → Repository
- Repository → Database
- Application → External Service
- User Action → System Response

### Where to Add Breadcrumbs
```typescript
// 1. API Route Entry/Exit
export async function POST(req: NextRequest) {
  permanentLogger.breadcrumb('api_entry', 'POST request received', {
    endpoint: '/api/users',
    method: 'POST'
  })
  
  // ... processing ...
  
  permanentLogger.breadcrumb('api_exit', 'Response sent', {
    status: 200,
    duration: timer.stop()
  })
}

// 2. External Service Calls
permanentLogger.breadcrumb('external_call_start', 'Calling Stripe API', {
  endpoint: 'customers.create'
})

const customer = await stripe.customers.create(data)

permanentLogger.breadcrumb('external_call_end', 'Stripe API responded', {
  customerId: customer.id,
  status: 'success'
})

// 3. Database Operations
permanentLogger.breadcrumb('db_query_start', 'Executing query', {
  table: 'users',
  operation: 'insert'
})

const result = await supabase.from('users').insert(data)

permanentLogger.breadcrumb('db_query_end', 'Query completed', {
  affected: result.count
})

// 4. User Interactions
permanentLogger.breadcrumb('user_action', 'Button clicked', {
  component: 'ProjectCard',
  action: 'delete',
  projectId
})

// 5. State Transitions
permanentLogger.breadcrumb('state_change', 'Status updated', {
  from: 'pending',
  to: 'active',
  entityId
})
```

## Timing Performance-Critical Operations

### When to Use Timing
```typescript
// 1. API Route Total Duration
const totalTimer = permanentLogger.timing('api_total_duration')
// ... entire API logic ...
const duration = totalTimer.stop()

// 2. Database Queries
const queryTimer = permanentLogger.timing('db_query', {
  query: 'SELECT * FROM large_table'
})
const results = await executeQuery()
queryTimer.stop()

// 3. External API Calls
const apiTimer = permanentLogger.timing('external_api', {
  service: 'openai',
  model: 'gpt-5'
})
const response = await openai.complete(prompt)
apiTimer.stop()

// 4. Complex Computations
const calcTimer = permanentLogger.timing('heavy_calculation')
const result = performComplexCalculation(data)
calcTimer.stop()

// 5. File Operations
const fileTimer = permanentLogger.timing('file_processing', {
  filename: 'report.pdf',
  size: file.size
})
await processFile(file)
fileTimer.stop()
```

### Using Checkpoints
```typescript
const timer = permanentLogger.timing('multi_stage_process')

// Stage 1
await fetchData()
timer.checkpoint('data_fetched', { records: 100 })

// Stage 2
await processData()
timer.checkpoint('data_processed', { valid: 95, invalid: 5 })

// Stage 3
await saveResults()
timer.checkpoint('results_saved', { tables: 3 })

const totalTime = timer.stop()
permanentLogger.info('PROCESS', 'Multi-stage process complete', { 
  duration: totalTime 
})
```

## Complete Logging Pattern Examples

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { z } from 'zod'

const InputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
})

export async function POST(req: NextRequest) {
  // Start timing
  const timer = permanentLogger.timing('api_user_create')
  
  // Entry breadcrumb
  permanentLogger.breadcrumb('api_entry', 'Creating user', {
    endpoint: '/api/users',
    method: 'POST',
    timestamp: new Date().toISOString()
  })
  
  try {
    // Parse and validate
    const body = await req.json()
    permanentLogger.breadcrumb('body_parsed', 'Request body parsed')
    
    const validated = InputSchema.parse(body)
    permanentLogger.breadcrumb('validation_complete', 'Input validated')
    
    // Log the operation
    permanentLogger.info('API_USERS', 'Creating new user', {
      email: validated.email
    })
    
    // External service call
    permanentLogger.breadcrumb('db_call_start', 'Inserting user')
    const user = await createUser(validated)
    permanentLogger.breadcrumb('db_call_end', 'User inserted', {
      userId: user.id
    })
    
    // Success
    permanentLogger.info('API_USERS', 'User created successfully', {
      userId: user.id,
      duration: timer.stop()
    })
    
    return NextResponse.json(user, { status: 201 })
    
  } catch (error) {
    // Validation error
    if (error instanceof z.ZodError) {
      permanentLogger.warn('API_USERS', 'Validation failed', {
        errors: error.errors,
        duration: timer.stop()
      })
      
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    // Unexpected error
    permanentLogger.captureError('API_USERS', error as Error, {
      endpoint: '/api/users',
      method: 'POST',
      body: req.body,
      duration: timer.stop()
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Repository Pattern
```typescript
export class UserRepository extends BaseRepository<User> {
  async create(data: UserInsert): Promise<User> {
    return this.execute('create', async (client) => {
      const timer = permanentLogger.timing('repo_user_create')
      
      permanentLogger.breadcrumb('repo_create_start', 'Creating user', {
        email: data.email
      })
      
      try {
        const { data: user, error } = await client
          .from('users')
          .insert(data)
          .select()
          .single()
        
        if (error) throw error
        
        permanentLogger.info('REPO_USERS', 'User created', {
          id: user.id,
          duration: timer.stop()
        })
        
        return user
        
      } catch (error) {
        permanentLogger.captureError('REPO_USERS', error as Error, {
          operation: 'create',
          data,
          duration: timer.stop()
        })
        throw error
      }
    })
  }
}
```

### Component Pattern
```typescript
export function UserDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchUsers()
  }, [])
  
  async function fetchUsers() {
    const timer = permanentLogger.timing('ui_fetch_users')
    
    permanentLogger.breadcrumb('ui_fetch_start', 'Loading users', {
      component: 'UserDashboard'
    })
    
    try {
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setUsers(data)
      
      permanentLogger.info('UI_DASHBOARD', 'Users loaded', {
        count: data.length,
        duration: timer.stop()
      })
      
    } catch (error) {
      permanentLogger.captureError('UI_DASHBOARD', error as Error, {
        component: 'UserDashboard',
        action: 'fetchUsers',
        duration: timer.stop()
      })
      
      // Show error to user (no fallback data!)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }
  
  async function deleteUser(userId: string) {
    permanentLogger.breadcrumb('user_action', 'Delete clicked', {
      userId,
      component: 'UserDashboard'
    })
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Delete failed')
      
      permanentLogger.info('UI_DASHBOARD', 'User deleted', { userId })
      setUsers(prev => prev.filter(u => u.id !== userId))
      
    } catch (error) {
      permanentLogger.captureError('UI_DASHBOARD', error as Error, {
        action: 'deleteUser',
        userId
      })
      toast.error('Failed to delete user')
    }
  }
  
  // Render...
}
```

## Log Levels and When to Use Them

### info() - Normal Operations
```typescript
permanentLogger.info('AUTH', 'User logged in', { userId })
permanentLogger.info('PAYMENT', 'Payment processed', { amount, currency })
permanentLogger.info('CRUD', 'Entity created', { id, type })
```

### warn() - Unusual but Recoverable
```typescript
permanentLogger.warn('RATE_LIMIT', 'Approaching API limit', { remaining: 10 })
permanentLogger.warn('DEPRECATED', 'Using deprecated endpoint', { endpoint })
permanentLogger.warn('VALIDATION', 'Optional field missing', { field })
```

### debug() - Development Details
```typescript
permanentLogger.debug('PARSER', 'HTML structure', { nodeCount: 42 })
permanentLogger.debug('CACHE', 'Cache miss', { key })
permanentLogger.debug('QUERY', 'SQL generated', { sql })
```

### captureError() - ALL Errors
```typescript
permanentLogger.captureError('CRITICAL', error, { 
  impact: 'high',
  affected: 'all users' 
})
permanentLogger.captureError('EXTERNAL', error, { 
  service: 'stripe',
  retry: attemptNumber 
})
```

## Error Context Best Practices

### What to Include in Error Context
```typescript
permanentLogger.captureError('CATEGORY', error, {
  // Identity
  userId: user?.id,
  sessionId: session?.id,
  requestId: req.headers.get('x-request-id'),
  
  // Location
  endpoint: '/api/users',
  method: 'POST',
  component: 'UserForm',
  function: 'handleSubmit',
  
  // State
  stage: 'validation',  // Where in the process
  attempt: retryCount,  // If retrying
  
  // Data (sanitized!)
  input: { email: data.email },  // Don't log passwords!
  query: { limit: 10, offset: 0 },
  
  // Performance
  duration: timer.stop(),
  timestamp: new Date().toISOString()
})
```

### What NOT to Include
```typescript
// ❌ NEVER log sensitive data
permanentLogger.captureError('AUTH', error, {
  password: user.password,        // NO!
  creditCard: payment.card,       // NO!
  ssn: user.ssn,                 // NO!
  apiKey: process.env.SECRET_KEY // NO!
})

// ✅ Log identifiers instead
permanentLogger.captureError('AUTH', error, {
  userId: user.id,
  hasPassword: !!user.password,
  cardLast4: payment.card.slice(-4),
  hasApiKey: !!process.env.SECRET_KEY
})
```

## Production vs Development Logging

### Environment-Aware Logging
```typescript
const isDevelopment = process.env.NODE_ENV === 'development'

// Debug only in development
if (isDevelopment) {
  permanentLogger.debug('VERBOSE', 'Detailed debug info', { 
    fullObject: complexData 
  })
}

// Always log errors
permanentLogger.captureError('ERROR', error, context)

// Conditional verbosity
permanentLogger.info('OPERATION', 'Completed', {
  ...(isDevelopment && { details: verboseDetails }),
  summary: 'Success'
})
```

## Performance Impact

### Minimize Logging Overhead
```typescript
// ❌ BAD - Expensive operation in log
permanentLogger.info('DATA', 'Processed', {
  serialized: JSON.stringify(largeObject)  // Expensive!
})

// ✅ GOOD - Log summary only
permanentLogger.info('DATA', 'Processed', {
  count: largeObject.length,
  size: roughSizeOfObject(largeObject)
})

// ✅ GOOD - Lazy evaluation
if (shouldLog()) {
  permanentLogger.debug('DETAIL', 'Complex state', {
    expensive: computeExpensiveValue()
  })
}
```

## Common Patterns

### Retry with Logging
```typescript
async function retryOperation(fn: () => Promise<any>, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      permanentLogger.breadcrumb('retry_attempt', `Attempt ${attempt}`, {
        attempt,
        maxAttempts
      })
      
      return await fn()
      
    } catch (error) {
      if (attempt === maxAttempts) {
        permanentLogger.captureError('RETRY', error as Error, {
          finalAttempt: true,
          attempts: maxAttempts
        })
        throw error
      }
      
      permanentLogger.warn('RETRY', `Attempt ${attempt} failed`, {
        error: error.message,
        nextAttempt: attempt + 1
      })
      
      await sleep(Math.pow(2, attempt) * 1000)  // Exponential backoff
    }
  }
}
```

### Audit Trail
```typescript
function auditAction(action: string, entity: any, user: User) {
  permanentLogger.info('AUDIT', action, {
    userId: user.id,
    userEmail: user.email,
    entityId: entity.id,
    entityType: entity.constructor.name,
    action,
    timestamp: new Date().toISOString(),
    ip: getClientIp(),
    userAgent: getUserAgent()
  })
}
```

## Testing with Logging

### Mock permanentLogger in Tests
```typescript
// In test setup
jest.mock('@/lib/utils/permanent-logger', () => ({
  permanentLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    captureError: jest.fn(),
    breadcrumb: jest.fn(),
    timing: jest.fn(() => ({
      stop: jest.fn(() => 100),
      checkpoint: jest.fn(),
      cancel: jest.fn()
    }))
  }
}))

// In tests
it('should log errors', async () => {
  const error = new Error('Test error')
  await expect(operation()).rejects.toThrow(error)
  
  expect(permanentLogger.captureError).toHaveBeenCalledWith(
    'CATEGORY',
    error,
    expect.objectContaining({
      operation: 'test'
    })
  )
})
```

## Checklist for Proper Logging

Before committing code, ensure:
- [ ] All errors use `captureError()` (not `.error()`)
- [ ] Categories are SCREAMING_SNAKE_CASE
- [ ] Breadcrumbs added at all boundaries
- [ ] Timing added for slow operations
- [ ] No sensitive data in logs
- [ ] Context includes useful debugging info
- [ ] Proper log level used (info/warn/debug)
- [ ] No expensive operations in log statements
- [ ] Error context helps debugging
- [ ] Tests verify logging behavior
