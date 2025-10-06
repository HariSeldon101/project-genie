# 🎯 Unified Event System

## ⚠️ CRITICAL: This is the ONLY event system to use!

As of January 13, 2025, this unified event system replaces ALL previous event factories.

### ❌ DO NOT USE these deprecated systems:
- `SSEEventFactory` from `/lib/company-intelligence/utils/sse-event-factory`
- `EventFactory` from `/lib/notifications/utils/event-factory`
- `SSEStreamManager` from `/lib/company-intelligence/utils/sse-stream-manager`
- `StreamHandler` from `/lib/notifications/utils/stream-handler`

### ✅ ALWAYS USE this unified system:
- `EventFactory` from `/lib/realtime-events`
- `StreamWriter` from `/lib/realtime-events` (server-side)
- `StreamReader` from `/lib/realtime-events` (client-side)

## 📚 Quick Start

### Creating Events (Universal)

```typescript
import { EventFactory } from '@/lib/realtime-events'

// Progress events
const progress = EventFactory.progress(50, 100, 'Processing...')

// Error events
const error = EventFactory.error(new Error('Something went wrong'))

// Notification events (for toasts)
const notification = EventFactory.notification('Success!', 'success')

// Data events
const data = EventFactory.data({ results: [...] })

// Phase events (multi-stage operations)
const phase = EventFactory.phase('scraping', 'completed')
```

### Server-Side Streaming

```typescript
import { StreamWriter } from '@/lib/realtime-events'

export async function POST(request: NextRequest) {
  const streamWriter = new StreamWriter(
    sessionId,
    correlationId,
    request.signal // CRITICAL: Pass signal for cleanup!
  )

  // Create SSE response
  return new Response(streamWriter.createStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  })
}

// Send events
await streamWriter.sendEvent(EventFactory.progress(10, 100))
await streamWriter.sendNotification('Started processing', 'info')
```

### Client-Side Streaming

```typescript
import { StreamReader } from '@/lib/realtime-events'

const reader = new StreamReader({
  url: '/api/company-intelligence/scraping/execute',
  sessionId: sessionId,
  onEvent: (event) => {
    // Handle all events here
    console.log('Event received:', event)
  },
  onError: (error) => {
    console.error('Stream error:', error)
  },
  reconnect: true, // Auto-reconnection built-in!
  reconnectOptions: {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000
  }
})

// Connect to stream
await reader.connect()

// Disconnect when done
reader.disconnect()
```

## 🔄 Migration Guide

### Step 1: Update Imports

```typescript
// ❌ OLD - Multiple imports from different places
import { SSEEventFactory } from '@/lib/company-intelligence/utils/sse-event-factory'
import { EventFactory } from '@/lib/notifications/utils/event-factory'
import { SSEStreamManager } from '@/lib/company-intelligence/utils/sse-stream-manager'
import { StreamHandler } from '@/lib/notifications/utils/stream-handler'

// ✅ NEW - Single import location
import {
  EventFactory,
  StreamWriter,
  StreamReader
} from '@/lib/realtime-events'
```

### Step 2: Update Event Creation

```typescript
// ❌ OLD - Different factories for different purposes
const sseEvent = SSEEventFactory.progress(50, 100)
const notifEvent = NotificationEventFactory.notification('Hello', 'info')

// ✅ NEW - One factory for all events
const progressEvent = EventFactory.progress(50, 100)
const notifEvent = EventFactory.notification('Hello', 'info')
```

### Step 3: Update Streaming

```typescript
// ❌ OLD - Server streaming
const sseManager = new SSEStreamManager(sessionId, correlationId, signal)
const stream = sseManager.createStream()

// ✅ NEW - Server streaming with better cleanup
const streamWriter = new StreamWriter(sessionId, correlationId, signal)
const stream = streamWriter.createStream()

// ❌ OLD - Client streaming
const handler = new StreamHandler({ onData: ... })
await handler.processStream(response)

// ✅ NEW - Client streaming with auto-reconnect
const reader = new StreamReader({
  url: '/api/stream',
  onEvent: ...,
  reconnect: true
})
await reader.connect()
```

## 🎯 Key Benefits

1. **Single Source of Truth**: One event system for everything
2. **Type Safety**: Full TypeScript support with generics
3. **Memory Safe**: Proper cleanup prevents leaks
4. **Auto-Reconnection**: Built-in exponential backoff
5. **Consistent Structure**: Same event format everywhere
6. **Better DX**: Clear which factory to use
7. **Extensible**: Easy to add new event types

## 🏗️ Architecture

```
RealtimeEvent<T>              // Universal event interface
├── EventFactory              // Creates all events
├── StreamWriter (server)     // Sends events via SSE
└── StreamReader (client)     // Receives events with reconnection
```

## ⚠️ Important Notes

### Memory Management
- **ALWAYS** pass `request.signal` to StreamWriter
- **ALWAYS** call `disconnect()` on StreamReader when done
- The system automatically cleans up on disconnection

### Event Ordering
- Events include sequence numbers
- Gap detection alerts you to missing events
- Buffer handles out-of-order delivery

### Heartbeat
- Server sends heartbeat every 30 seconds
- Keeps connections alive through proxies
- Automatic cleanup if heartbeat fails

### Type Safety
```typescript
// Events are fully typed
import { RealtimeEvent, ProgressInfo } from '@/lib/realtime-events'

function handleProgress(event: RealtimeEvent<ProgressInfo>) {
  console.log(event.data.percentage) // TypeScript knows this exists!
}
```

## 🚨 Common Mistakes to Avoid

### ❌ DON'T create new event factories
```typescript
// WRONG - Don't create your own
class MyEventFactory { ... }
```

### ❌ DON'T import from old locations
```typescript
// WRONG - These are deprecated
import { SSEEventFactory } from '@/lib/company-intelligence/utils/sse-event-factory'
```

### ❌ DON'T forget the signal for cleanup
```typescript
// WRONG - Memory leak risk!
new StreamWriter(sessionId, correlationId) // Missing signal!

// RIGHT - Proper cleanup
new StreamWriter(sessionId, correlationId, request.signal)
```

### ❌ DON'T forget to handle reconnection
```typescript
// WRONG - No reconnection
new StreamReader({ url: '/api/stream', onEvent: ... })

// RIGHT - Auto-reconnection
new StreamReader({ url: '/api/stream', onEvent: ..., reconnect: true })
```

## 📊 Event Types Reference

| Event Type | Purpose | Method |
|------------|---------|--------|
| `PROGRESS` | Track operation progress | `EventFactory.progress()` |
| `DATA` | Transmit data | `EventFactory.data()` |
| `ERROR` | Report errors | `EventFactory.error()` |
| `NOTIFICATION_*` | User notifications | `EventFactory.notification()` |
| `PHASE_*` | Multi-phase operations | `EventFactory.phase()` |
| `CONNECTION_*` | Connection lifecycle | Automatic |
| `STREAM_*` | Stream control | Automatic |
| `SCRAPING_*` | Scraping specific | `EventFactory.scraping()` |

## 🔍 Debugging

Enable debug logging:
```typescript
// All events are logged via permanentLogger
// Check breadcrumbs for event flow
// Monitor console for deprecation warnings
```

## 📚 Further Reading

- Event types: `/lib/realtime-events/core/event-types.ts`
- Factory implementation: `/lib/realtime-events/factories/event-factory.ts`
- Migration examples: `/lib/realtime-events/index.ts`
- Implementation report: `/event-system-implementation-report-2025-01-13.md`

---

**Remember**: This is the ONLY event system. Don't create alternatives!