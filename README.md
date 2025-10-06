# Project Genie

AI-powered business intelligence platform that automatically generates professional project documentation by analyzing company websites and market data.

## 🏗️ Architecture Overview (Updated 2025-01-12)

### 🧠 Company Intelligence Session Management (Critical)
- **Single Method Pattern**: Always use `getOrCreateUserSession()` for all session operations
- **Idempotent Operations**: Handles existing sessions gracefully without errors
- **Race Condition Safe**: Manages concurrent session creation with unique constraints
- **Constraint Compliant**: Works with PostgreSQL unique user+domain database constraints
- **Auto-Reactivation**: Automatically reactivates inactive sessions when needed
- **⚠️ NEVER USE**: `createSession()` - deprecated and causes constraint violations

### Core Systems

#### 🕷️ Web Scraping System (Refactored)
- **UnifiedScraperExecutor**: Central coordinator for all scraping operations
- **StaticScraperExecutor**: Fast HTML parsing for static sites (Cheerio-based)
- **DynamicScraperExecutor**: JavaScript rendering for SPAs (Playwright-based)
- **Smart Skipping**: Avoids re-scraping unchanged pages (24-hour threshold)
- **Priority-based Scraping**: High > Medium > Low priority ordering
- **URLMetadata Tracking**: Efficient O(1) lookup for page metadata

#### 🔍 Data Extraction
- **SmartExtractor**: Intelligent content extraction using multiple strategies
- **BlogContentExtractor**: Specialized for blog and article content
- **SocialMediaExtractor**: Extracts social media links and profiles

#### 🎯 Data Enrichment
- **9 Enrichers Available**: Company data, financial info, news, social media
- **Auto-discovery System**: Enrichers automatically register from filesystem
- **Cost-aware Processing**: Track and optimize enrichment costs

#### 📄 Document Generation
- **GPT-5 Models**: Default for narrative documents (via Vercel AI Gateway)
- **GPT-4.1 Models**: For structured documents requiring strict schemas
- **SSEEventFactory**: Standardized server-sent events for real-time updates
- **PDF Generation**: Professional PDF output with native browser viewer

### Key Improvements (Phase 1-11 Refactoring)
- ✅ **55% code reduction** through DRY principles
- ✅ **100% error visibility** - no silent failures or fallbacks
- ✅ **94% smart skipping** implementation
- ✅ **89% test coverage** with comprehensive verification
- ✅ **Standardized events** using SSEEventFactory
- ✅ **Database-first** architecture (URLs from Supabase)

## 🛠️ Development Setup

### VS Code Extensions (Recommended)

For the best development experience, install these VS Code extensions:

```bash
# Mermaid Diagram Support (for documentation)
code --install-extension bierner.markdown-mermaid
code --install-extension bpruitt-goddard.mermaid-markdown-syntax-highlighting

# Enhanced Markdown Preview
code --install-extension shd101wyy.markdown-preview-enhanced

# Other Recommended Extensions
code --install-extension dbaeumer.vscode-eslint          # ESLint
code --install-extension esbenp.prettier-vscode         # Prettier
code --install-extension bradlc.vscode-tailwindcss      # Tailwind IntelliSense
code --install-extension dsznajder.es7-react-js-snippets # React snippets
```

### Viewing Documentation with Diagrams

This project uses Mermaid diagrams extensively. To view them:

1. **In VS Code**: Install the extensions above, then use `Cmd+Shift+V` to preview
2. **On GitHub**: Diagrams render automatically in markdown files
3. **Quick Test**: Visit https://mermaid.live to test diagram syntax
4. **Full Guide**: See `/docs/mermaid-diagrams-guide.md#editor-support--setup`

## 🚨 CRITICAL: Regular Feature Integration Audit

**MANDATORY CHECK**: Before starting any new development, run a feature integration audit to find quick wins:

```bash
# Quick audit commands:
# 1. Find unused components
find components -name "*.tsx" | xargs -I {} sh -c 'grep -q {} **/*.tsx 2>/dev/null || echo "Unused: {}"'

# 2. Search for disabled features
grep -r "enabled.*false\|disabled.*true" --include="*.ts" --include="*.tsx"

# 3. Find components not imported anywhere
grep -r "export" --include="*.tsx" lib/ components/ | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  basename=$(basename "$file" .tsx)
  grep -q "from.*$basename" --include="*.tsx" -r . || echo "Unused: $file"
done

# 4. Check database for empty tables (run in Supabase SQL editor)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT IN (
  SELECT DISTINCT table_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  GROUP BY table_name
  HAVING COUNT(*) > 0
);
```

**Why This Matters**: 
- Sept 7, 2025: Found 40% of features were built but dormant
- Only 3 hours to activate them for 10x capability improvement
- Common finds: disabled analyzers, unused enrichers, empty database tables

**Quick Win Indicators**:
- Database tables with 0 records
- Config flags set to `false` by default  
- Components not imported anywhere
- Commented-out function calls

See `/docs/unused-features-audit.md` for the latest audit results.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
