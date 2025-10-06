# Repository Type Safety Implementation Guide

## Overview
Every repository in this project enforces complete type safety through Supabase's generated types. This creates a **compile-time data contract** that prevents runtime errors.

## Type Safety Chain

### 1. Database Schema → TypeScript Types
```bash
# Generate types from database schema
supabase gen types typescript --local > lib/database.types.ts
```

This creates strongly-typed interfaces for:
- Every table (Row, Insert, Update types)
- Every column with exact types (string, number, boolean, JSON)
- Relationships between tables
- Database functions and their return types

### 2. Repository Type Definitions

Every repository imports and uses these types:

```typescript
import type { Database } from '@/lib/database.types'

// Extract specific table types
type AdminSetting = Database['public']['Tables']['admin_settings']['Row']
type AdminSettingInsert = Database['public']['Tables']['admin_settings']['Insert']
type AdminSettingUpdate = Database['public']['Tables']['admin_settings']['Update']
```

### 3. Method Signatures with Full Type Safety

All repository methods have **fully typed signatures**:

```typescript
class AdminSettingsRepository extends BaseRepository {
  // Return type is explicitly typed
  async getAllSettings(): Promise<AdminSetting[]> { }

  // Parameters and return types are typed
  async getSetting(key: string): Promise<AdminSetting | null> { }

  // Insert operations exclude 'id' (database generates it)
  async upsertSetting(setting: Omit<AdminSettingInsert, 'id'>): Promise<AdminSetting> { }

  // Update operations use the Update type
  async updateTemplate(id: string, updates: AdminSettingUpdate): Promise<AdminSetting> { }
}
```

## Benefits of This Approach

### 1. Compile-Time Safety
```typescript
// ✅ TypeScript catches errors at compile time
const setting = await repo.upsertSetting({
  key: 'llm.model',
  value: 'gpt-5-nano',
  // TypeScript error if you add a non-existent column:
  // wrongColumn: 'value' // ❌ Compile error!
})

// ✅ IDE autocomplete shows exact columns
setting. // IDE shows: id, key, value, created_at, updated_at
```

### 2. Automatic Null Safety
```typescript
const setting = await repo.getSetting('missing-key')
// TypeScript knows this could be null
if (setting) {
  // TypeScript knows setting is AdminSetting here
  console.log(setting.value)
}
```

### 3. Prevents SQL Injection
```typescript
// Repository methods use parameterised queries internally
await repo.getSetting(userInput) // Safe - no SQL injection possible
```

### 4. Consistent Error Handling
```typescript
// All repositories inherit error handling from BaseRepository
try {
  const data = await repo.getAllSettings()
} catch (error) {
  // Error is automatically logged with context
}
```

## Data Contract Examples

### Example 1: Projects Repository
```typescript
interface ProjectInsert {
  name: string           // Required
  description?: string   // Optional
  user_id: string       // Required FK
  status: 'draft' | 'active' | 'completed'  // Enum
  settings: JsonValue   // JSON column
  created_at?: string   // Optional (DB default)
}

// Usage
const project = await projectsRepo.createProject({
  name: 'New Project',
  user_id: userId,
  status: 'draft',
  settings: { theme: 'dark' }
  // id is NOT provided - database generates it
})
```

### Example 2: Company Intelligence Repository
```typescript
interface CompanyIntelligenceSession {
  id: string
  domain: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  phase: number
  metadata: {
    discovered_urls?: string[]
    technologies?: string[]
    [key: string]: any
  }
  created_at: string
  updated_at: string
}

// Methods return typed data
async getSession(id: string): Promise<CompanyIntelligenceSession | null>
async updatePhase(id: string, phase: number): Promise<CompanyIntelligenceSession>
```

## Type Generation Workflow

### Automatic Type Updates
In `package.json`:
```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/database.types.ts",
    "predev": "npm run db:types",
    "prebuild": "npm run db:types"
  }
}
```

This ensures types are **always in sync** with the database schema.

## Testing Type Safety

### 1. Compile-Time Checks
```bash
# TypeScript compilation will fail if types don't match
npm run type-check
```

### 2. IDE Integration
- VSCode/Cursor shows errors immediately
- Autocomplete shows exact column names
- Hover shows exact types

### 3. Runtime Safety
Even if TypeScript is bypassed:
- Supabase validates against actual schema
- Repositories log all errors with context
- No silent failures

## Migration Safety

When database schema changes:
1. Migration is applied: `supabase db push`
2. Types are regenerated: `npm run db:types`
3. TypeScript immediately shows breaking changes
4. Fix compilation errors before deployment

## Best Practices

### 1. Never Use `any`
```typescript
// ❌ BAD - Loses all type safety
async updateSetting(data: any) { }

// ✅ GOOD - Full type safety
async updateSetting(data: AdminSettingUpdate) { }
```

### 2. Use Omit for ID Fields
```typescript
// ✅ Database generates IDs
async create(data: Omit<Insert, 'id'>) { }
```

### 3. Return Explicit Types
```typescript
// ✅ Clear return types
async getAll(): Promise<AdminSetting[]> { }
async getOne(id: string): Promise<AdminSetting | null> { }
```

### 4. Handle Nulls Properly
```typescript
const item = await repo.getById(id)
if (!item) {
  throw new Error(`Item ${id} not found`)
}
// TypeScript knows item is non-null here
```

## Summary

The repository pattern with TypeScript provides:
- **100% type safety** from database to API
- **Zero runtime type errors** for database operations
- **Automatic documentation** through types
- **Refactoring safety** - schema changes break compilation
- **IDE support** - autocomplete and error detection

This is why using repositories is **mandatory** - they provide a type-safe abstraction layer that prevents entire classes of bugs.