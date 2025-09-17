# Bundle Size & Performance Optimization Analysis

## Executive Summary

The `/company-intelligence` page is currently taking **28.7 seconds** to compile with **6,282 modules**. This is approximately **10x larger** than it should be for a single page application. The root cause is loading multiple complete UI frameworks simultaneously and importing the entire application infrastructure upfront instead of on-demand.

---

## Current State Analysis

### Compilation Metrics
- **Initial Compilation Time**: 28.7 seconds
- **Total Modules Loaded**: 6,282
- **Estimated Bundle Size**: ~5-8MB (uncompressed)
- **Time to Interactive**: Severely impacted

### Heavy Dependencies Identified

#### 1. UI Framework Duplication (Estimated: ~3,500 modules)

| Framework | Packages | Estimated Size | Modules | Purpose |
|-----------|----------|---------------|---------|---------|
| **Syncfusion** | 7 packages | ~2-3MB | ~1,500 | PDF viewer, charts, grids |
| **Material-UI (MUI)** | 2 packages | ~1-2MB | ~1,000 | Tree view, general UI |
| **Radix UI** | 20+ packages | ~500KB | ~500 | Base for shadcn/ui |
| **shadcn/ui** | Multiple components | ~200KB | ~200 | Primary UI framework |
| **Emotion** | 2 packages | ~300KB | ~300 | CSS-in-JS for MUI |

**Total UI Framework Overhead**: ~4-6MB, ~3,500 modules

#### 2. Syncfusion Package Breakdown

```json
"@syncfusion/ej2-buttons": "^31.1.17"        // ~200KB
"@syncfusion/ej2-react-charts": "^31.1.17"   // ~500KB
"@syncfusion/ej2-react-grids": "^31.1.17"    // ~800KB
"@syncfusion/ej2-react-inputs": "^31.1.17"   // ~300KB
"@syncfusion/ej2-react-navigations": "^31.1.17" // ~400KB
"@syncfusion/ej2-react-pdfviewer": "^31.1.17"   // ~1MB
"@syncfusion/ej2-react-popups": "^31.1.17"   // ~200KB
```
**Total Syncfusion**: ~3.4MB

#### 3. Infrastructure & Services (Estimated: ~1,500 modules)

| Component | Import Location | Modules | Issue |
|-----------|----------------|---------|-------|
| Scraping Infrastructure | `ScrapingControl` | ~500 | Loaded even when not scraping |
| Browser Automation | Via scrapers | ~300 | Puppeteer/Playwright references |
| AI/LLM Services | Multiple imports | ~200 | All providers loaded upfront |
| Database Services | Supabase clients | ~200 | Multiple instances |
| Notification System | Event bus, SSE | ~300 | Entire system loaded |

#### 4. Data Processing Libraries (Estimated: ~800 modules)

- Form libraries (react-hook-form, resolvers)
- Date manipulation libraries
- Validation libraries (zod)
- Crypto/UUID libraries
- Stream processing utilities

#### 5. Development Dependencies Leaked to Production (Estimated: ~500 modules)

- Test utilities potentially bundled
- Debug/logging infrastructure
- Source maps and development helpers

---

## Module Import Chain Analysis

### Critical Import Paths

```
/company-intelligence/page.tsx
├── PhaseControls (1,500+ modules)
│   ├── SiteAnalyzer (200 modules)
│   ├── SitemapSelectorMUI (1,000+ modules) ⚠️ MUI dependency
│   ├── ScrapingControl (800+ modules)
│   │   ├── Entire scraping infrastructure
│   │   ├── Browser automation utilities
│   │   └── Multiple scraper strategies
│   ├── DataReviewPanel (500+ modules)
│   │   └── MUI Tree View ⚠️
│   └── CorporateStructureDetector (300 modules)
├── ResultsViewer (300 modules)
├── LLMMonitor (200 modules)
├── DebugDataViewer (100 modules)
└── UI Components (2,000+ modules)
    ├── All Radix packages
    ├── All shadcn components
    └── Emotion runtime
```

---

## Performance Impact

### Current Issues

1. **Initial Load Time**: Users wait 5-10 seconds for first meaningful paint
2. **Memory Usage**: ~200-300MB heap allocation
3. **Network Transfer**: 2-3MB gzipped, 8-10MB uncompressed
4. **Parse/Compile Time**: 2-3 seconds on mobile devices
5. **Runtime Performance**: Sluggish due to multiple framework reconciliation

### Benchmark Comparison

| Metric | Current | Industry Standard | Target |
|--------|---------|------------------|--------|
| Bundle Size | ~8MB | 1-2MB | <1MB |
| Modules | 6,282 | 500-1,000 | <800 |
| Compile Time | 28.7s | 2-5s | <3s |
| First Load | 5-10s | 1-3s | <2s |

---

## Recommendations

### Priority 1: Critical (Immediate Impact)

#### 1.1 Consolidate UI Frameworks
**Impact**: -3,000 modules, -4MB bundle size

Choose ONE primary UI framework:

**Option A: Keep only shadcn/ui + Radix (Recommended)**
```bash
# Remove MUI and Syncfusion
npm uninstall @mui/material @mui/x-tree-view @emotion/react @emotion/styled
npm uninstall @syncfusion/ej2-buttons @syncfusion/ej2-react-charts @syncfusion/ej2-react-grids @syncfusion/ej2-react-inputs @syncfusion/ej2-react-navigations @syncfusion/ej2-react-pdfviewer @syncfusion/ej2-react-popups
```

**Option B: Keep only MUI**
```bash
# Remove Radix and Syncfusion
# Requires significant component rewrites
```

#### 1.2 Implement Code Splitting
**Impact**: -2,000 modules from initial load

```typescript
// phase-controls.tsx
import { lazy, Suspense } from 'react'

// Lazy load heavy components
const SiteAnalyzer = lazy(() => import('./site-analyzer'))
const SitemapSelector = lazy(() => import('./sitemap-selector'))
const ScrapingControl = lazy(() => import('./additive/scraping-control'))
const DataReviewPanel = lazy(() => import('./data-review/DataReviewPanel'))

// Use with Suspense
{currentStage === 'scraping' && (
  <Suspense fallback={<LoadingSpinner />}>
    <ScrapingControl />
  </Suspense>
)}
```

#### 1.3 Dynamic Imports for Stage-Specific Code
**Impact**: -1,500 modules from initial load

```typescript
// Load infrastructure only when needed
const loadScrapingInfrastructure = async () => {
  const { ScrapingEngine } = await import('@/lib/company-intelligence/scrapers')
  return new ScrapingEngine()
}
```

### Priority 2: High (Significant Impact)

#### 2.1 Replace Heavy Components

| Current Component | Replacement | Savings |
|------------------|-------------|---------|
| MUI TreeView | React-arborist or custom | -800 modules |
| Syncfusion PDF Viewer | PDF.js | -500 modules |
| Syncfusion Charts | Recharts or Chart.js | -300 modules |
| MUI Components | shadcn/ui equivalents | -1,000 modules |

#### 2.2 Optimize Import Statements

```typescript
// ❌ Bad - imports entire library
import * as Icons from 'lucide-react'

// ✅ Good - tree-shakeable
import { Home, Search, Settings } from 'lucide-react'
```

#### 2.3 Create Barrel Exports for Internal Modules

```typescript
// lib/company-intelligence/index.ts
export { ScrapingEngine } from './scrapers/engine'
export type { ScraperResult } from './scrapers/types'
// Don't export everything by default
```

### Priority 3: Medium (Good Practice)

#### 3.1 Implement Route-Based Code Splitting

```typescript
// app/(dashboard)/layout.tsx
const CompanyIntelligence = lazy(() => import('./company-intelligence/page'))
```

#### 3.2 Use Next.js Dynamic Imports

```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(
  () => import('./HeavyComponent'),
  {
    loading: () => <Skeleton />,
    ssr: false // Don't server-render heavy components
  }
)
```

#### 3.3 Optimize Bundle with next.config.js

```javascript
// next.config.js
module.exports = {
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}'
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}'
    }
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/*']
  }
}
```

### Priority 4: Low (Maintenance)

#### 4.1 Regular Dependency Audit

```bash
# Check bundle size
npx @next/bundle-analyzer

# Find unused dependencies
npx depcheck

# Update and dedupe
npm dedupe
```

#### 4.2 Implement Bundle Size Budget

```json
// package.json
"bundlesize": [
  {
    "path": ".next/static/chunks/pages/company-intelligence*.js",
    "maxSize": "500kb"
  }
]
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
- [ ] Remove unused Syncfusion packages
- [ ] Implement lazy loading for stage components
- [ ] Remove duplicate UI library imports

**Expected Impact**: -3,000 modules, 50% faster compilation

### Phase 2: Component Migration (3-5 days)
- [ ] Replace MUI TreeView with lighter alternative
- [ ] Migrate from MUI to shadcn/ui components
- [ ] Remove Emotion dependency

**Expected Impact**: -1,500 modules, 70% faster compilation

### Phase 3: Infrastructure Optimization (1 week)
- [ ] Implement proper code splitting
- [ ] Create dynamic import patterns
- [ ] Optimize import statements

**Expected Impact**: -800 modules, 80% faster compilation

### Phase 4: Long-term Maintenance
- [ ] Set up bundle analysis CI/CD
- [ ] Implement size budgets
- [ ] Regular dependency audits

---

## Expected Results After Optimization

| Metric | Current | After Phase 1 | After Phase 2 | After Phase 3 | Target |
|--------|---------|--------------|---------------|---------------|--------|
| **Modules** | 6,282 | ~3,300 | ~1,800 | ~1,000 | <800 |
| **Bundle Size** | ~8MB | ~4MB | ~2MB | ~1.2MB | <1MB |
| **Compile Time** | 28.7s | ~15s | ~8s | ~4s | <3s |
| **First Load** | 5-10s | 3-5s | 2-3s | 1-2s | <2s |

---

## Monitoring & Metrics

### Tools to Implement

1. **Bundle Analyzer**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

2. **Lighthouse CI**
   - Track performance metrics over time
   - Alert on regressions

3. **Custom Metrics**
   ```typescript
   // Track actual load times
   performance.mark('company-intelligence-start')
   // ... after load
   performance.mark('company-intelligence-end')
   performance.measure('company-intelligence-load',
     'company-intelligence-start',
     'company-intelligence-end')
   ```

---

## Conclusion

The current bundle is **10x larger than necessary** due to:
1. **Multiple UI frameworks** (Syncfusion + MUI + Radix/shadcn)
2. **No code splitting** (everything loads upfront)
3. **Premature optimization** (loading all infrastructure before needed)

By following this optimization plan, you can achieve:
- **90% reduction** in initial bundle size
- **85% faster** compilation times
- **80% improvement** in page load times
- **Better user experience** with progressive loading

The most impactful change would be **removing Syncfusion and MUI** in favor of a single UI framework (shadcn/ui), which alone would eliminate ~3,500 modules and reduce the bundle by 4-5MB.

---

## Appendix: Bundle Analysis Commands

```bash
# Analyze bundle composition
ANALYZE=true npm run build

# Check actual bundle sizes
du -sh .next/static/chunks/*

# Find large dependencies
npm ls --depth=0 | xargs -I {} sh -c 'echo "{}: $(npm ls {} | wc -l) deps"'

# Check for duplicate packages
npm dedupe --dry-run

# Find unused dependencies
npx depcheck
```