# Module Optimization Plan - January 20, 2025

## 📊 Current State Analysis

### Problem Summary
The `/documents` page is compiling **6,220 modules**, causing:
- Memory exhaustion (crashes at 1GB, needs 4GB)
- Slow compilation times (7.8 seconds)
- Poor developer experience
- Increased deployment costs

### Module Count Breakdown
```
Base Next.js + React:          ~500 modules
Radix UI (20+ packages):     ~2,500 modules
Mermaid:                      ~1,500 modules
Supabase + Auth:                ~400 modules
Document Formatters (10):       ~500 modules
React-icons:                    ~500 modules
Testing libs (in prod):         ~800 modules
Other dependencies:           ~1,020 modules
-------------------------------------------
TOTAL:                        ~7,720 modules
```

## 🎯 Optimization Goals

- **Short-term**: Reduce to ~4,000 modules (48% reduction)
- **Medium-term**: Reduce to ~2,500 modules (68% reduction)
- **Memory Target**: Drop from 4GB to 1.5-2GB
- **Compile Time**: Reduce from 7.8s to <3s

## 🚀 Phase 1: Quick Wins (1-2 hours)
*Expected reduction: ~1,900 modules* (Updated: Playwright stays in production)

### 1. Move Development Dependencies (30 mins)
**Impact: -900 modules**

```bash
# Move these from dependencies to devDependencies:
npm uninstall jsdom canvas
npm install --save-dev jsdom canvas
```

**Files to move:**
- ~~`playwright`: KEEP IN PRODUCTION (used for scraping)~~ ✅
- `jsdom`: 26.1.0 → devDependencies (-600 modules)
- `canvas`: 3.2.0 → devDependencies (-300 modules)

**⚠️ IMPORTANT**: Playwright must stay in production dependencies as it's used for:
- Company Intelligence web scraping
- PDF generation via browser automation
- Dynamic content extraction from SPAs

### 2. Remove Duplicate Libraries (20 mins)
**Impact: -400 modules**

```bash
# Remove duplicates, keep only one of each type:
npm uninstall isomorphic-dompurify sanitize-html  # Keep dompurify
npm uninstall axios                                # Keep node-fetch
npm uninstall marked                                # Keep react-markdown
```

**Consolidation:**
- **Sanitization**: Keep `dompurify`, remove `sanitize-html` and `isomorphic-dompurify`
- **HTTP**: Keep `node-fetch`, remove `axios`
- **Markdown**: Keep `react-markdown`, remove `marked`

### 3. Remove Unused Dependencies (20 mins)
**Impact: -600 modules**

Check and remove if unused:
```bash
# Check usage first with:
grep -r "react-icons" --include="*.tsx" --include="*.ts"
grep -r "chart.js" --include="*.tsx" --include="*.ts"
grep -r "user-agents" --include="*.tsx" --include="*.ts"

# If unused, remove:
npm uninstall react-icons chart.js user-agents
```

### 4. Update package.json Memory Setting
Already done - keep at 4GB for now:
```json
"dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
```

## 📦 Phase 2: Dynamic Imports (2-4 hours)
*Expected reduction: ~1,500 modules*

### 1. Lazy Load Mermaid Component
**Impact: -1,500 modules**

**File**: `/components/documents/document-viewer.tsx`
```typescript
// Replace:
import { MermaidDiagram } from '@/components/mermaid-diagram'

// With:
import dynamic from 'next/dynamic'
const MermaidDiagram = dynamic(
  () => import('@/components/mermaid-diagram'),
  {
    ssr: false,
    loading: () => <div>Loading diagram...</div>
  }
)
```

### 2. Lazy Load Document Formatters
**Impact: -400 modules**

**File**: `/components/documents/document-viewer.tsx`
```typescript
// Instead of importing all 10 formatters at top:
const getFormatter = async (type: string) => {
  switch(type) {
    case 'pid':
      const { UnifiedPIDFormatter } = await import(
        '@/lib/documents/formatters/unified-pid-formatter'
      )
      return UnifiedPIDFormatter
    case 'business_case':
      const { UnifiedBusinessCaseFormatter } = await import(
        '@/lib/documents/formatters/unified-business-case-formatter'
      )
      return UnifiedBusinessCaseFormatter
    // ... etc for other types
  }
}
```

### 3. Lazy Load PDF Components
**File**: `/app/(dashboard)/documents/page.tsx`
```typescript
// Replace:
import { DirectPDFDownloadButton } from '@/components/documents/pdf-download-button'

// With:
const DirectPDFDownloadButton = dynamic(
  () => import('@/components/documents/pdf-download-button')
    .then(mod => ({ default: mod.DirectPDFDownloadButton })),
  { ssr: false }
)
```

## 🔧 Phase 3: Icon Optimization (1-2 hours)
*Expected reduction: ~400 modules*

### 1. Tree-shake Lucide Icons
**Impact: -200 modules**

```typescript
// Instead of:
import { FileText, Download, Eye } from 'lucide-react'

// Use direct imports:
import FileText from 'lucide-react/dist/esm/icons/file-text'
import Download from 'lucide-react/dist/esm/icons/download'
import Eye from 'lucide-react/dist/esm/icons/eye'
```

### 2. Remove react-icons if Unused
**Impact: -500 modules**

If still needed, replace with specific icon imports:
```typescript
// Instead of:
import { FaGithub } from 'react-icons/fa'

// Install and use:
npm install @react-icons/fa
import FaGithub from '@react-icons/fa/FaGithub'
```

## 🏗️ Phase 4: Component Library Optimization (4-8 hours)
*Expected reduction: ~1,000 modules*

### 1. Replace Heavy Radix Components
Identify which Radix components are actually used and consider alternatives:

**Simple replacements:**
- `@radix-ui/react-checkbox` → Native `<input type="checkbox">`
- `@radix-ui/react-switch` → CSS-styled checkbox
- `@radix-ui/react-separator` → Simple `<hr>` with styles

**Keep complex ones:**
- Dialog, Dropdown Menu, Select (these provide real value)

### 2. Bundle Radix Imports
Create a single export file:
```typescript
// lib/ui/radix-exports.ts
export {
  Dialog,
  DialogContent,
  DialogHeader
} from '@radix-ui/react-dialog'
// ... other exports

// Then import from single file:
import { Dialog, DialogContent } from '@/lib/ui/radix-exports'
```

## 📈 Phase 5: Build Configuration (2 hours)
*Expected improvement: Better tree-shaking*

### 1. Update next.config.js
```javascript
module.exports = {
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-*',
      'date-fns'
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace large modules with smaller alternatives
      config.resolve.alias = {
        ...config.resolve.alias,
        'canvas': false,  // Disable canvas for client
      }
    }
    return config
  }
}
```

### 2. Add .babelrc for Better Tree-shaking
```json
{
  "presets": ["next/babel"],
  "plugins": [
    ["transform-imports", {
      "lucide-react": {
        "transform": "lucide-react/dist/esm/icons/${member}",
        "preventFullImport": true
      }
    }]
  ]
}
```

## 📊 Expected Results After Each Phase

| Phase | Modules | Memory | Time | Effort |
|-------|---------|--------|------|--------|
| Current | 6,220 | 4GB | 7.8s | - |
| Phase 1 (Quick Wins) | ~4,300 | 2.5GB | 5s | 2 hrs |
| Phase 2 (Dynamic) | ~2,800 | 2GB | 3s | 4 hrs |
| Phase 3 (Icons) | ~2,600 | 1.8GB | 2.5s | 2 hrs |
| Phase 4 (Components) | ~2,000 | 1.5GB | 2s | 8 hrs |
| Phase 5 (Build) | ~1,800 | 1.3GB | 1.8s | 2 hrs |

## 🔍 How to Measure Progress

### 1. Count Modules During Compilation
Watch the dev server output:
```
✓ Compiled /documents in X.Xs (XXXX modules)
```

### 2. Analyze Bundle Size
```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({...})

# Run analysis
ANALYZE=true npm run build
```

### 3. Check Memory Usage
```bash
# During dev server running
ps aux | grep node | grep next
```

## ⚠️ Testing After Each Phase

After each optimization phase:

1. **Clear cache and rebuild**:
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Test critical paths**:
   - Load /documents page
   - Open document viewer modal
   - Test PDF export
   - Test all document formatters

3. **Check for errors**:
   - Console errors
   - Build warnings
   - TypeScript errors

## 🎯 Priority Order

1. **Do Phase 1 immediately** - Quick wins with minimal risk
2. **Do Phase 2 next** - High impact, moderate effort
3. **Phase 3-5 as time permits** - Diminishing returns

## 📝 Notes

- Keep `package-lock.json` in git to track changes
- Test in production build before deploying
- Consider using `npm dedupe` after changes
- Document any functionality changes

## 🚨 Rollback Plan

If issues occur:
1. Revert package.json changes
2. Run `npm install`
3. Clear .next cache
4. Restart dev server

Keep this plan updated as you progress through each phase!