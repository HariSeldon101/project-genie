# Project File Structure - Project Genie
*Generated: January 25, 2025*

## Table of Contents
- [Summary](#summary)
- [Root Directory Structure](#root-directory-structure)
- [Application Structure](#application-structure)
- [Frontend Components](#frontend-components)
- [API Routes](#api-routes)
- [Library & Utilities](#library--utilities)
- [Database & Migrations](#database--migrations)
- [Configuration Files](#configuration-files)
- [Documentation](#documentation)
- [Scripts](#scripts)
- [Tests](#tests)
- [Archive & Legacy](#archive--legacy)
- [Company Intelligence v4](#company-intelligence-v4)

## Summary
- **Total Files**: 1,296 (excluding node_modules, .git, .next, etc.)
- **Total Directories**: 362
- **TypeScript Files**: 591
- **React Components**: 126
- **API Routes**: 57
- **Key Technologies**: Next.js, TypeScript, Supabase, Tailwind CSS, shadcn/ui

## Root Directory Structure

### Configuration Files
```
.
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment overrides (gitignored)
├── .env.local.example            # Local environment template
├── .env.test                     # Test environment configuration
├── .env.v3-scrapers.example      # Scraper configuration template
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore patterns
├── .vercelignore                 # Vercel deployment ignores
├── .claudeignore                 # Claude AI ignore patterns
├── .claude-model-config.json     # Claude AI model configuration
├── CLAUDE.md                     # CLAUDE.md compliance guidelines
├── PROJECT_MANIFEST.json         # Project manifest (auto-generated)
├── README.md                     # Project documentation
├── START_OF_SESSION.md          # Session initialization docs
├── END_OF_SESSION.md            # Session termination docs
├── SESSION_STATE.json           # Current session state
├── TODOWRITE_STATE.json         # Todo list state
├── components.json              # shadcn/ui configuration
├── eslint.config.mjs            # ESLint module configuration
├── middleware.ts                # Next.js middleware
├── next.config.ts               # Next.js configuration
├── next-env.d.ts               # Next.js TypeScript definitions
├── next-sitemap.config.js      # Sitemap generation config
├── package.json                # NPM dependencies
├── package-lock.json           # NPM lock file
├── playwright.config.ts        # Playwright test configuration
├── postcss.config.mjs         # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.tsbuildinfo       # TypeScript build info
├── vercel.json                # Vercel deployment configuration
├── vitest.config.api.ts       # Vitest API test configuration
└── workflow-setup.sh          # Workflow initialization script
```

### Hidden Directories
```
.
├── .backups/                  # Backup files
├── .claude/                   # Claude configuration
├── .git/                      # Git repository (excluded from listing)
├── .husky/                    # Git hooks
│   └── pre-commit            # Pre-commit hook
├── .logger-fix-backups/      # Logger fix backup files
├── .next/                    # Next.js build output (excluded)
├── .vercel/                  # Vercel deployment cache
└── .vscode/                  # VS Code workspace settings
```

## Application Structure

### App Router (Next.js 14+)
```
app/
├── (auth)/                    # Authentication pages group
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── signup/
│       └── page.tsx
├── (dashboard)/              # Dashboard pages group
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── analytics/
│   │   └── page.tsx
│   ├── bugs/
│   │   └── page.tsx
│   ├── company-intelligence/
│   │   ├── page.tsx
│   │   └── page-original.tsx.bak
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── documents/
│   │   └── page.tsx
│   ├── help/
│   │   └── page.tsx
│   ├── logs/
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── projects/
│   │   ├── [id]/
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── generate/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── team/
│   │   └── page.tsx
│   ├── test-pdf/
│   │   ├── comprehensive-test-data.ts
│   │   ├── kanban-test-data.ts
│   │   └── page.tsx
│   ├── error.tsx
│   └── layout.tsx
├── api/                      # API routes
│   └── [see API Routes section]
├── auth/
│   ├── callback/
│   │   └── route.ts
│   └── test/
│       └── route.ts
├── contact/
│   └── page.tsx
├── how-it-works/
│   └── page.tsx
├── pricing/
│   └── page.tsx
├── test-auth/
│   └── page.tsx
├── test-branding/
│   └── page.tsx
├── test-mermaid/
│   └── page.tsx
├── test-mermaid-simple/
│   └── page.tsx
├── error.tsx                # Error boundary
├── favicon.ico.bak         # Backup favicon
├── global-error-handler.tsx # Global error handler
├── global-error.tsx        # Global error boundary
├── globals.css            # Global styles
├── layout.tsx            # Root layout
├── notification-init.tsx  # Notification initialization
├── notification-init.tsx.backup-* # Notification backup
└── page.tsx              # Home page
```

## API Routes

### Authentication & User Management
```
app/api/
├── auth/
│   ├── callback/route.ts      # OAuth callback
│   └── user/route.ts          # User operations
├── profile/
│   ├── route.ts              # Profile management
│   └── avatar/route.ts       # Avatar upload
├── profiles/
│   └── current/route.ts      # Current profile
├── team/
│   ├── route.ts              # Team operations
│   └── [id]/route.ts         # Team member operations
└── fix-profile/route.ts      # Profile repair utility
```

### Company Intelligence API v4
```
app/api/company-intelligence/
├── v4/
│   └── scrape/
│       └── route.ts          # V4 scraper endpoint
├── analyze-site/route.ts     # Site analysis
├── credits/route.ts          # Credit management
├── fetch-sitemap/route.ts    # Sitemap fetching
├── validate-domain/route.ts  # Domain validation
└── sessions/
    ├── route.ts              # Session management
    ├── init/route.ts         # Session initialization
    ├── abort/route.ts        # Session abortion
    ├── recover/route.ts      # Session recovery
    └── [id]/
        ├── route.ts          # Session operations
        ├── logs/route.ts     # Session logs
        └── phase-data/route.ts # Phase data
```

### Project Management
```
app/api/projects/
├── route.ts                  # Project CRUD
└── [id]/
    ├── route.ts              # Single project
    └── full/route.ts         # Full project data
```

### Generation & Export
```
app/api/
├── generate/route.ts         # Document generation
├── generate-retry/route.ts   # Generation retry
├── generate-stream/route.ts  # Streaming generation
├── pdf/
│   ├── route.ts             # PDF operations
│   └── generate/route.ts    # PDF generation
└── export/
    └── [format]/route.ts    # Multi-format export
```

### Monitoring & Health
```
app/api/
├── health/
│   ├── route.ts            # Health check
│   └── logger/route.ts     # Logger health
├── monitoring/
│   └── db-status/route.ts  # Database status
├── logs/
│   ├── route.ts           # Log operations
│   ├── client-error/route.ts # Client error logging
│   ├── rotate/route.ts    # Log rotation
│   ├── stats/route.ts     # Log statistics
│   ├── stream/route.ts    # Log streaming
│   └── test-service-role/route.ts # Service role test
└── analytics/route.ts      # Analytics tracking
```

### Admin & Testing
```
app/api/
├── admin/
│   ├── stats/route.ts      # Admin statistics
│   ├── test-llm/route.ts   # LLM testing
│   └── ollama/
│       └── models/route.ts # Ollama models
├── test-basic/route.ts     # Basic tests
├── test-error/route.ts     # Error testing
├── test-generation/route.ts # Generation testing
├── test-log/route.ts       # Logging tests
├── test-sse/route.ts       # SSE testing
└── debug/
    ├── route.ts           # Debug endpoint
    └── debug-full/route.ts # Full debug info
```

### Other APIs
```
app/api/
├── artifacts/route.ts      # Artifact management
├── bugs/
│   ├── route.ts           # Bug tracking
│   └── [id]/route.ts      # Single bug
├── ping/route.ts          # Ping endpoint
├── settings/route.ts      # Settings management
├── stakeholders/route.ts  # Stakeholder management
└── stripe/
    ├── checkout/route.ts  # Stripe checkout
    └── webhook/route.ts   # Stripe webhooks
```

## Frontend Components

### Company Intelligence Components
```
components/company-intelligence/
├── additive/
│   ├── scraping-control.tsx
│   ├── scraping-history-panel.tsx
│   ├── scraping-stats-card.tsx
│   └── scraping-suggestions.tsx
├── hooks/
│   ├── use-phase-handlers.ts
│   ├── use-phase-state.ts
│   ├── use-phase-toast.ts
│   └── use-stage-navigation.ts
├── scraper-config/              # Scraper configuration UI
├── scraping-dashboard/          # Scraping dashboard components
├── sitemap-selector/
│   ├── index.tsx
│   ├── types.ts
│   └── hooks/
│       └── use-discovery-stream.ts
├── cost-accumulator.tsx
├── debug-data-viewer.tsx
├── phase-controls.tsx
├── results-viewer.tsx
├── session-selector.tsx
├── site-analyzer.tsx
└── tooltip-wrapper.tsx
```

### UI Components
```
components/ui/                  # shadcn/ui components
├── accordion.tsx
├── alert.tsx
├── aspect-ratio.tsx
├── avatar.tsx
├── badge.tsx
├── breadcrumb.tsx
├── button.tsx
├── calendar.tsx
├── card.tsx
├── chart.tsx
├── checkbox.tsx
├── collapsible.tsx
├── command.tsx
├── context-menu.tsx
├── dialog.tsx
├── drawer.tsx
├── dropdown-menu.tsx
├── form.tsx
├── hover-card.tsx
├── input.tsx
├── label.tsx
├── menubar.tsx
├── navigation-menu.tsx
├── popover.tsx
├── progress.tsx
├── radio-group.tsx
├── resizable.tsx
├── resizable-modal.tsx
├── scroll-area.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx
├── skeleton.tsx
├── slider.tsx
├── sonner.tsx
├── switch.tsx
├── table.tsx
├── tabs.tsx
├── textarea.tsx
├── toast.tsx
├── toaster.tsx
├── toggle.tsx
├── toggle-group.tsx
├── tooltip.tsx
└── use-toast.ts
```

### Other Components
```
components/
├── dashboard/
│   ├── dashboard-header.tsx
│   ├── dashboard-shell.tsx
│   ├── dashboard-sidebar.tsx
│   ├── dashboard-tabs.tsx
│   ├── mobile-nav.tsx
│   ├── stats-cards.tsx
│   └── user-menu.tsx
├── documents/
│   ├── document-viewer.tsx
│   ├── pdf-download-button.tsx
│   └── pdf-viewer.tsx
├── logs/
│   ├── log-entry.tsx
│   ├── log-level-badge.tsx
│   ├── log-viewer.tsx
│   └── real-time-logs.tsx
├── monitoring/                 # Monitoring components
├── auth-provider.tsx
├── document-generator.tsx
├── error-boundary.tsx
├── icon.tsx
├── loading-spinner.tsx
├── markdown-renderer.tsx
├── mermaid-diagram.tsx
├── monaco-editor.tsx
├── page-header.tsx
├── pdf-viewer.tsx
├── pre-formatted.tsx
├── project-form.tsx
├── real-time-indicators.tsx
├── sidebar.tsx
├── site-header.tsx
├── stats-overview.tsx
├── theme-provider.tsx
└── theme-toggle.tsx
```

## Library & Utilities

### Core Libraries
```
lib/
├── auth/
│   ├── client.ts              # Auth client
│   ├── server.ts              # Auth server utilities
│   └── supabase-browser-client.ts # Browser client
├── config/
│   ├── ai.ts                  # AI configuration
│   ├── firecrawl.ts          # Firecrawl config
│   └── validator.ts          # Config validation
├── database.types.ts         # Supabase types (generated)
├── database.types.backup.ts  # Types backup
├── database.types.full.ts    # Full types
├── database.types.tmp        # Temporary types
└── supabase/
    ├── admin.ts              # Admin client
    ├── browser.js            # Browser utilities
    ├── client.ts             # Supabase client
    ├── client-typed.ts       # Typed client
    ├── connection-pool.ts    # Connection pooling
    ├── middleware.ts         # Supabase middleware
    └── server.ts            # Server client
```

### Company Intelligence v4
```
lib/company-intelligence/
├── scrapers-v4/              # V4 scraper implementation
├── types/
│   ├── base-data.ts         # Base data types
│   ├── discovery.ts         # Discovery types
│   ├── index.ts            # Type exports
│   ├── scraping-enums.ts   # Scraping enums
│   └── scraping-interfaces.ts # Scraping interfaces
├── enrichers/
│   ├── financial-enricher.ts
│   ├── google-business-enricher.ts
│   ├── linkedin-company-enricher.ts
│   ├── news-regulatory-enricher.ts
│   └── social-media-enricher.ts
├── intelligence/
│   ├── content-pattern-matcher.ts
│   ├── page-intelligence-analyzer.ts
│   └── structured-data-extractor.ts
├── utils/
│   ├── event-deduplicator.ts
│   ├── sse-stream-manager.ts
│   └── state-synchronizer.ts
└── hooks/
    └── use-session-data.ts
```

### Repositories (Repository Pattern)
```
lib/repositories/
├── artifacts-repository.ts
├── base-repository.ts         # Base repository class
├── bugs-repository.ts
├── company-intelligence-repository.ts
├── documents-repository.ts
├── logs-repository.ts
├── profiles-repository.ts
├── projects-repository.ts
├── team-repository.ts
└── type-safe-query.ts         # Type-safe query builder
```

### Services
```
lib/services/
├── credits-service.ts         # Credits management
├── document-service.ts        # Document operations
├── error-service.ts          # Error handling
├── ollama-service.ts         # Ollama integration
├── payment-service.ts        # Payment processing
└── scraper-service.ts        # Scraping service
```

### Utilities
```
lib/utils/
├── cn.ts                     # Class name utility
├── cost-estimates.ts         # Cost calculations
├── date-utils.ts            # Date utilities
├── debounce.ts              # Debounce utility
├── format.ts                # Formatting utilities
├── llm-logger.ts            # LLM logging
├── log-ui-helpers.ts        # Log UI utilities
├── mermaid-helpers.ts       # Mermaid utilities
├── mermaid-types.ts         # Mermaid types
├── openai.ts                # OpenAI utilities
├── permanent-logger.ts      # Permanent logger
├── permanent-logger.types.ts # Logger types
├── permanent-logger-db.ts   # Logger database
├── rate-limiter.ts          # Rate limiting
├── sanitize.ts              # Input sanitization
├── server-action-wrapper.ts # Server action wrapper
├── supabase-error-helper.ts # Supabase error handling
├── theme.ts                 # Theme utilities
├── throttle.ts              # Throttle utility
├── upload.ts                # Upload utilities
└── validation.ts            # Validation utilities
```

### PDF Generation
```
lib/pdf-generation/
├── generators/
│   └── playwright-generator.ts # Playwright PDF generator
├── browser-pool.old.ts        # Old browser pool
├── mermaid-renderer.ts       # Mermaid rendering
└── pdf-service.ts            # PDF service
```

### Document Processing
```
lib/documents/
├── formatters/
│   ├── base-unified-formatter.ts
│   └── unified-pid-formatter.ts
├── parsers/
│   └── markdown-parser.ts
├── processors/
│   └── document-processor.ts
└── storage.ts                # Document storage
```

### Real-time Events
```
lib/realtime-events/
├── factories/
│   └── event-factory.ts     # Event factory
├── server/
│   └── stream-writer.ts     # SSE stream writer
└── types/
    └── event-types.ts       # Event type definitions
```

### Notifications
```
lib/notifications/
├── index.ts                 # Notification exports
├── migration-hooks.tsx      # Migration hooks
└── types.ts                # Notification types
```

### Admin & Logs
```
lib/admin/
└── auth.ts                  # Admin authentication

lib/logs/
├── services/
│   └── logs-service.ts     # Logs service
└── types/
    └── api-dto.types.ts    # API data transfer objects
```

### Hooks
```
lib/hooks/
├── use-auth.ts             # Authentication hook
├── use-copy-to-clipboard.ts # Clipboard hook
├── use-debounce.ts         # Debounce hook
├── use-event-listener.ts   # Event listener hook
├── use-local-storage.ts    # Local storage hook
├── use-media-query.ts      # Media query hook
├── use-mounted.ts          # Mounted state hook
├── use-session-data.ts     # Session data hook
├── use-supabase.ts         # Supabase hook
├── use-theme.ts            # Theme hook
├── use-toast.ts            # Toast hook
└── use-user.ts             # User hook
```

## Database & Migrations

### Supabase Migrations
```
supabase/
├── config.toml              # Supabase configuration
├── seed.sql                # Database seed data
└── migrations/
    ├── 20240801000000_initial_schema.sql
    ├── 20240815000000_add_profiles.sql
    ├── 20240901000000_add_projects.sql
    ├── 20241001000000_add_documents.sql
    ├── 20241101000000_add_teams.sql
    ├── 20250117_add_anon_logs_select_policy.sql
    ├── 20250117_auto_capture_auth_in_logs.sql
    ├── 20250117_create_system_logs_table.sql
    ├── 20250118_create_session_status_enum.sql
    ├── 20250121_progressive_scraping_architecture.sql
    ├── 20250123_create_db_metrics_function.sql
    ├── 20250123_enhance_db_metrics_with_real_stats.sql
    └── 20250922_optimize_logs_indexes.sql
```

### Legacy Migrations
```
migrations/
└── add-generation-columns.sql
```

## Scripts

### Development Scripts
```
scripts/
├── apply-anon-policy.sh      # Apply anonymous policies
├── backup-before-optimization.sh # Backup script
├── check-logger-usage.ts     # Logger usage check
├── check-rls-policies.sh     # RLS policy check
├── fix-all-logger-signatures.ts # Fix logger signatures
├── fix-import-mismatch.sh    # Fix import mismatches
├── fix-logger-parameter-order.ts # Fix logger parameters
├── fix-logger-pattern-issues.ts # Fix logger patterns
├── fix-logger-signatures.ts  # Fix logger signatures
├── fix-permanent-logger-errors.ts # Fix permanent logger
├── fix-remaining-error-calls.ts # Fix error calls
├── fix-rls-properly.sh      # Fix RLS policies
├── local-dev-only.sh        # Local development setup
├── test-build-local.sh      # Local build test
├── test-logger-fix.ts       # Test logger fixes
├── validate-build.ts        # Build validation
└── validate-logger-usage.ts # Logger validation
```

### Workflow Scripts
```
./
├── archive-legacy-code.sh   # Archive legacy code
├── claude-init-enhancer.sh  # Claude initialization
├── claude-session-aliases.sh # Claude session aliases
├── push-to-github.sh        # GitHub push script
├── run-ui-tests-10x.sh     # Run UI tests 10 times
└── workflow-setup.sh        # Workflow setup
```

## Tests

### Test Files
```
tests/
├── api/                     # API tests
├── components/             # Component tests
├── e2e/                   # End-to-end tests
├── integration/           # Integration tests
└── unit/                  # Unit tests

test-results/              # Test results directory

Root test files:
├── aaa-test-company-intelligence-comprehensive.ts
├── aaa-test-company-intelligence-comprehensive copy.ts
├── check-locks.ts
├── test-discovery.js
├── test-discovery-direct.js
├── test-error-handling.ts
├── test-fetch-sitemap.js
├── test-mermaid-comprehensive.ts
├── test-mermaid-simple.ts
├── test-project-document-flow.ts
├── test-scraper-api-endpoint.ts
├── test-scrapers-after-fix.ts
└── test-sse-fixes.ts
```

## Documentation

### Main Documentation
```
docs/
├── V4 Scraper implementation docs/  # V4 scraper documentation
├── BUNDLE-OPTIMIZATION-ANALYSIS.md
├── api-integration-guide.md
├── authentication-issues.md
├── development-patterns.md
├── error-logging-best-practices.md
├── mermaid-diagrams-guide.md
├── nextjs-performance-optimization-guide.md
├── pdf-architecture-and-styling.md
├── pdf-generation-system.md
├── repository-architecture-pattern.md
├── repository-pattern-architecture.md
├── semantic-html-guidelines-for-llms.md
├── supabase-nextjs-best-practices.md
├── testing-guidelines.md
└── troubleshooting-guide.md
```

### Root Level Documentation
```
./
├── CI-Audit-Detailed-Sept-16.md
├── CI-Audit-Full-Sept-16.md
├── CI-files-by-code-lines.md
├── CLAUDE-MD-COMPLIANCE-AUDIT-2025-01-16.md
├── CLAUDE.md
├── FINAL-CLAUDE-MD-COMPLIANCE-REPORT-2025-01-16.md
├── README.md
├── auth-review-23rd-sept.md
├── background-document-generation-implementation-analysis.md
├── company-intelligence-auth-migration-plan.md
├── current-logger-issues.md
├── discovered_urls-code-to-remove.md
├── docs-api-integration-guide.md
├── docs-authentication-issues.md
├── docs-development-patterns.md
├── docs-error-logging-best-practices.md
├── docs-repository-pattern-architecture.md
├── docs-testing-guidelines.md
├── docs-troubleshooting-guide.md
├── firecrawl-guide-and-costs-stu-21st-sept.md
├── fix-for-fragile-auth-use-supabase-NOT-react-state.md
├── logger-fixes-summary.md
├── logs-fix-audit-2025-09-22.md
├── mermaid-implementation-summary-2025-01-20.md
├── module-optimization-plan-2025-01-20.md
├── multiple-logger-fix-options-22nd-sept.md
├── new-scraper-architecture-sept-21st.md
├── pdf-architecture-clarification-2025-01-20.md
├── scraper-architecture-v3-native-first.md
├── scraping-ui-v3.md
├── stu-claude-github-vercel-CI-CD-sept-25.md
├── stu-type-safety-supabase-typescript-guide.md
├── supabase-client-optimization-2025-01-21.md
├── type-issues.md
├── ui-v3-fixes-round1.md
├── unified-scraper-executor-refactor-2025-01-16-1330.md
├── v4-data-flow-report.md
└── v4-non-compliance-report.md
```

## Archive & Legacy

### Archived Company Intelligence Code
```
archive/
├── 2025-09-23-v4-cleanup/    # V4 cleanup archive
│   └── lib/
│       ├── error-handler.ts
│       ├── processors-v2/
│       ├── schemas-v2/
│       └── scrapers-v2/
├── company-intelligence/
│   └── orchestrators/        # Old orchestrators
├── lib/
│   ├── company-intelligence/
│   │   └── services/
│   │       ├── scraping-state-service.ts
│   │       └── scraping-stream-service.ts
│   ├── notifications/
│   │   └── utils/
│   │       └── event-factory.ts
│   ├── pdf-generation/      # Legacy PDF generation
│   ├── syncfusion-license.ts
│   └── utils/
│       └── html-decoder.ts
├── phase-controls-original-*.tsx.backup-*
├── puppeteer-generator.old.ts
├── scrapers-v2-deprecated/
├── scraping-legacy-2025-01-09/
│   ├── scraping-progress.tsx
│   └── scraping-report.tsx
├── services-deprecated/
│   ├── page-crawler.ts
│   ├── sitemap-discovery.ts
│   └── url-normalization.ts
└── syncfusion-init.tsx
```

## Public Assets
```
public/
├── favicon.ico              # Site favicon
├── images/                  # Image assets
├── sitemap.xml             # Sitemap
└── robots.txt              # Robots configuration
```

## Logs & Output
```
logs/                       # Application logs directory
dev.log                    # Development log
test-run.log              # Test run log
vercel-deploy.log         # Vercel deployment log
```

## Build Artifacts (Excluded)
```
.next/                     # Next.js build output
.turbo/                   # Turbo cache
.vercel/                  # Vercel build cache
node_modules/             # NPM dependencies
out/                      # Static export
dist/                     # Distribution build
build/                    # Build output
coverage/                 # Test coverage reports
```

## Key File Categories

### Critical Configuration
- `CLAUDE.md` - CLAUDE.md compliance guidelines
- `PROJECT_MANIFEST.json` - Auto-generated project manifest
- `lib/database.types.ts` - Generated Supabase types
- `components.json` - shadcn/ui configuration
- `next.config.ts` - Next.js configuration

### Company Intelligence v4
- `app/api/company-intelligence/v4/scrape/route.ts` - V4 scraper endpoint
- `lib/company-intelligence/scrapers-v4/` - V4 implementation
- `components/company-intelligence/` - UI components

### Authentication & Security
- `middleware.ts` - Auth middleware
- `lib/auth/` - Authentication utilities
- `lib/supabase/` - Supabase clients

### Monitoring & Logging
- `lib/utils/permanent-logger.ts` - CLAUDE.md compliant logger
- `lib/logs/services/logs-service.ts` - Logging service
- `app/api/logs/` - Logging endpoints

### Testing Infrastructure
- `playwright.config.ts` - E2E test configuration
- `vitest.config.api.ts` - API test configuration
- `tests/` - Test suites

## Notes

### Active Development Areas
- Company Intelligence v4 scraper implementation
- Repository pattern enforcement
- CLAUDE.md compliance
- Type safety improvements
- SSE unified event system

### Deprecated/Archive
- Company Intelligence v2/v3 scrapers (archived)
- Old PDF generation (using Playwright now)
- Syncfusion components (removed)
- Legacy notification system (unified events now)

### Compliance Requirements
- All database access through repositories
- PermanentLogger for all logging
- PostgreSQL gen_random_uuid() for UUIDs
- No mock data or fallbacks
- Credits only (no dollar signs)
- EventFactory for SSE events

---
*This document provides a comprehensive overview of the Project Genie codebase structure as of January 25, 2025.*