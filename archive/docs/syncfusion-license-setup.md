# Syncfusion License Setup Documentation

## Overview
This document explains how Syncfusion licensing is configured in the Project Genie application to remove trial version messages.

## ⚠️ CRITICAL: Package Version Management

### Current Version: 31.1.17
All Syncfusion packages MUST be kept on the same version to avoid compatibility issues.

**Current packages and versions:**
```json
"@syncfusion/ej2-react-charts": "^31.1.17",
"@syncfusion/ej2-react-grids": "^31.1.17",
"@syncfusion/ej2-react-navigations": "^31.1.17",
"@syncfusion/ej2-react-pdfviewer": "^31.1.17",
"@syncfusion/ej2-react-popups": "^31.1.17",
"@syncfusion/ej2-react-treemap": "^31.1.17"
```

### Version Update Procedure
When updating Syncfusion packages, ALWAYS update all packages together:

```bash
# To update all packages to a specific version (example: 31.2.0)
npm install @syncfusion/ej2-react-charts@31.2.0 \
            @syncfusion/ej2-react-grids@31.2.0 \
            @syncfusion/ej2-react-navigations@31.2.0 \
            @syncfusion/ej2-react-pdfviewer@31.2.0 \
            @syncfusion/ej2-react-popups@31.2.0 \
            @syncfusion/ej2-react-treemap@31.2.0

# Verify all versions match
npm list | grep "@syncfusion"
```

### Why Version Consistency Matters
- **Prevents compatibility issues** between interdependent Syncfusion components
- **Ensures license validation** works correctly across all components  
- **Avoids runtime errors** from mismatched internal APIs
- **Maintains consistent UI/UX** across all Syncfusion components

## License Key Configuration

**CRITICAL**: License keys must ONLY be stored in environment variables (`.env.local` or `.env`). 
NEVER hardcode license keys directly in source code files.

**Important**: The license key is a full commercial license, not a trial version.

## Implementation Architecture (Multi-Layer Approach)

### 1. Server-Side Registration via Instrumentation
**File**: `/instrumentation.ts`
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    const { registerLicense } = await import('@syncfusion/ej2-base')
    const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
    if (licenseKey) {
      registerLicense(licenseKey)
    }
  }
}
```

### 2. Client-Side Module Registration (Critical)
**File**: `/lib/register-syncfusion.ts`
```typescript
import { registerLicense } from '@syncfusion/ej2-base'

// Register immediately when module loads on client
if (typeof window !== 'undefined') {
  const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
  if (licenseKey) {
    registerLicense(licenseKey)
  }
}
```

### 3. Component-Level Import (Before Syncfusion Components)
Each component that uses Syncfusion must import the registration first:
```typescript
'use client'

// Register license before importing Syncfusion components
import '@/lib/register-syncfusion'

import { TooltipComponent } from '@syncfusion/ej2-react-popups'
```

### 4. React Component Registration
**File**: `/app/syncfusion-init.tsx`
```typescript
'use client'

import { useEffect } from 'react'
import { registerLicense } from '@syncfusion/ej2-base'

export function SyncfusionInit() {
  useEffect(() => {
    const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
    if (licenseKey) {
      registerLicense(licenseKey)
    }
  }, [])
  
  return null
}
```

This component is included in the root layout to ensure client-side registration.

### 2. Environment Variable Configuration (REQUIRED)
**File**: `/.env.local`
```env
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY=your_syncfusion_license_key_here
```

**Important**: Always use environment variables for license keys. Never hardcode them in the source files.

### 3. Fallback Registration Helper
**File**: `/lib/syncfusion-license.ts`
```typescript
import { registerLicense } from '@syncfusion/ej2-base';

export function registerSyncfusionLicense() {
  if (typeof window === 'undefined') return;
  
  const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY;
  if (licenseKey) {
    registerLicense(licenseKey);
  }
}
```

## Components Using Syncfusion

### 1. Tooltip Component
- **File**: `/components/company-intelligence/tooltip-wrapper.tsx`
- **Usage**: Provides tooltips throughout the UI
- **Syncfusion Component**: `TooltipComponent` from `@syncfusion/ej2-react-popups`

### 2. Sitemap Tree Component
- **File**: `/components/company-intelligence/sitemap-tree.tsx`
- **Usage**: Displays website structure as a tree
- **Syncfusion Component**: `TreeViewComponent` from `@syncfusion/ej2-react-navigations`

### 3. PDF Viewer Component
- **File**: `/lib/pdf-generation/viewer/pdf-viewer.tsx`
- **Usage**: Displays PDF documents
- **Syncfusion Component**: `PdfViewerComponent` from `@syncfusion/ej2-react-pdfviewer`

## Troubleshooting

### If Trial Message Still Appears:

1. **Verify Environment Variable**:
   - Check `.env.local` contains the license key
   - Ensure the key starts with `NEXT_PUBLIC_` prefix

2. **Check Instrumentation**:
   - Verify `/instrumentation.ts` exists at project root
   - Check console for "[Instrumentation] Syncfusion license registered" message

3. **Clear Next.js Cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Verify License Key Format**:
   - Must be a valid base64 string
   - Should end with `=` padding character
   - No spaces or line breaks

### Common Issues and Solutions:

| Issue | Solution |
|-------|----------|
| Trial message persists | Restart dev server after adding license |
| License not found | Check environment variable name spelling |
| Components not working | Ensure @syncfusion packages are installed |
| Build errors | Clear node_modules and reinstall |

## Best Practices

### ⚠️ CRITICAL RULES:
1. **NEVER** hardcode license keys in source files
2. **ALWAYS** use environment variables (NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY)
3. **NEVER** commit license keys to version control (except in .env.example with placeholder)

### General Guidelines:
1. **DO NOT** register license in individual components
2. **DO** register license via instrumentation.ts for server-side
3. **DO** register license via lib/register-syncfusion.ts for client-side
4. **DO** restart dev server after license changes
5. **DO** clear .next cache if license issues persist
6. **DO** verify both .env and .env.local have the same license key

## License Type
This is a **Commercial License** for Syncfusion Essential Studio.
- Removes all trial messages
- Enables all features
- Valid for production use

## Security Notes
- License keys are client-side validated
- Safe to include in NEXT_PUBLIC_ variables
- Does not expose sensitive data
- Validation is offline (no API calls)

## Migration Notes (Historical Context)

Previously, the application had multiple duplicate license registrations:
- Individual component registrations (removed)
- Multiple license files (consolidated)
- Runtime registrations (replaced with instrumentation)

The current setup uses a single, centralized registration point via instrumentation.ts, which is the recommended approach for Next.js 15+ applications.

## References
- [Syncfusion License Registration Guide](https://help.syncfusion.com/common/essential-studio/licensing/how-to-register-in-an-application)
- [Next.js Instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)
- [Syncfusion React Components](https://www.syncfusion.com/react-components)