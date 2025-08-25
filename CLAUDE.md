# Claude Assistant Configuration

## Global Documentation Reference

Claude documentation is available globally at: `~/.claude-docs/docs/`
Environment variable: `$CLAUDE_DOCS_PATH`

### Quick Access Commands:
```bash
claude-docs-update  # Update docs from anywhere
claude-docs        # Navigate to docs directory
claude-docs-read   # Read specific doc
```

## Tech Stack Preferences

### Core Stack
- **Framework**: Next.js (App Router preferred)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Database/Auth**: Supabase
- **Language**: TypeScript (strict mode)
- **AI/LLM**: OpenAI via Vercel AI Gateway (for GPT-5 models)

### Available CLIs (Pre-installed)
You can use these commands without asking:
- `gh` - GitHub CLI
- `vercel` - Vercel CLI
- `supabase` - Supabase CLI (CRITICAL - see Supabase CLI Guidelines below)
- `stripe` - Stripe CLI (installed and configured - see Stripe Integration section)
- `brew` - Homebrew package manager
- `npm` / `npx` - Node package managers
- `git` - Version control

## 🚨 CRITICAL: Supabase CLI Guidelines (ALWAYS FOLLOW)

### MANDATORY: CLI-First Development
**NEVER suggest manual database changes in Supabase Dashboard. ALWAYS use CLI commands.**

### Core Workflow (MUST FOLLOW IN ORDER)
1. **Create migration** → 2. **Test locally** → 3. **Generate types** → 4. **Deploy**

### Essential Supabase CLI Commands

#### Initial Setup
```bash
supabase init                              # Initialize Supabase project
supabase link --project-ref <project-ref>  # Link to existing project  
supabase db pull                          # Pull remote schema to local
```

#### Migration Workflow (ALWAYS USE THIS)
```bash
# 1. Create a new migration with descriptive name
supabase migration new fix_rls_infinite_recursion  # GOOD ✅
# NOT: supabase migration new update               # BAD ❌

# 2. Edit the migration file in supabase/migrations/
# 3. Test locally
supabase db reset        # Reset local database and apply all migrations
supabase test db        # Run database tests

# 4. Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts

# 5. Deploy to production
supabase db push
```

#### Database Operations
```bash
supabase db diff                          # Show differences between local and remote
supabase db lint                          # Check for issues
supabase db dump -f supabase/seed.sql     # Create seed file
supabase db reset --debug                 # Reset with debug info
```

#### Local Development
```bash
supabase start                             # Start local Supabase
supabase stop                              # Stop local Supabase
supabase status                            # Check service status
supabase db remote commit                 # Commit remote changes to migration
```

### Clean Code Conventions

#### Table Naming
```sql
-- GOOD ✅: Singular, lowercase, underscores
CREATE TABLE project (...);
CREATE TABLE project_member (...);

-- BAD ❌: Plural, camelCase, unclear
CREATE TABLE Projects (...);
CREATE TABLE projectMembers (...);
```

#### Migration Template for RLS Fix
```sql
-- Migration: fix_rls_infinite_recursion
-- Description: Fixes infinite recursion in RLS policies
-- Author: Claude
-- Date: 2024

-- 1. Disable RLS temporarily
ALTER TABLE project DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_member DISABLE ROW LEVEL SECURITY;

-- 2. Drop problematic policies
DROP POLICY IF EXISTS "circular_policy" ON project;

-- 3. Create simple, non-recursive policies
CREATE POLICY "owner_access" ON project
    FOR ALL USING (owner_id = auth.uid());

-- 4. Re-enable RLS
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_member ENABLE ROW LEVEL SECURITY;

-- 5. Add comments
COMMENT ON POLICY "owner_access" ON project IS 'Simple owner-only access, no recursion';
```

### Anti-Patterns to AVOID ❌
1. **Manual SQL in Dashboard**: Never fix schema issues via Dashboard
2. **Circular RLS policies**: Policies that reference each other
3. **Generic migration names**: `update.sql`, `fix.sql`
4. **Skipping local testing**: Always test with `supabase db reset`
5. **Not generating types**: Always run `supabase gen types` after changes

## Vercel AI Gateway & GPT-5 Models

### Important: GPT-5 Models via Vercel AI Gateway
GPT-5 models (gpt-5, gpt-5-mini, gpt-5-nano) are available **exclusively through Vercel AI Gateway**, not directly via OpenAI API.

#### Key Points:
- **DO NOT change models without permission** - Always ask before switching models
- GPT-5 nano is the most cost-efficient option ($0.025 input, $0.20 output per 1M tokens)
- GPT-5 models work locally with OpenAI SDK but require Vercel AI Gateway for Vercel deployments
- Reference: https://vercel.com/changelog/gpt-5-gpt-5-mini-and-gpt-5-nano-are-now-available-in-vercel-ai-gateway

#### Using GPT-5 Models with Vercel AI SDK (Required for Vercel deployments):
```javascript
// Via Vercel AI SDK v5
import { streamText } from 'ai'

const result = streamText({
  model: "openai/gpt-5-nano", // or openai/gpt-5-mini, openai/gpt-5
  prompt: "Your prompt here"
})
```

### Email Service - Resend

We use **Resend.com** for transactional emails.

#### Installation
```bash
npm install resend
npm install react-email @react-email/components  # For email templates
```

#### Configuration
Add to `.env.local`:
```env
RESEND_API_KEY=your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_REPLY_TO=support@yourdomain.com
```

#### Usage Example
```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  text?: string;
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    react,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

#### Email Templates with React Email
```typescript
// emails/welcome.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={paragraph}>Hi {name},</Text>
          <Text style={paragraph}>
            Welcome to our platform! We're excited to have you on board.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href="https://yourdomain.com">
              Get Started
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = { backgroundColor: '#ffffff' };
const container = { margin: '0 auto', padding: '20px 0 48px' };
const paragraph = { fontSize: '16px', lineHeight: '26px' };
const btnContainer = { textAlign: 'center' as const };
const button = {
  backgroundColor: '#5F51E8',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
};
```

#### Common Email Types
- Welcome emails
- Password reset
- Email verification
- Order confirmations
- Notifications
- Weekly digests

## Testing Setup

### Unit Testing Libraries to Install
```bash
# Core testing
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/user-event @testing-library/react-hooks

# API Mocking
npm install -D msw

# Testing utilities
npm install -D @testing-library/jest-dom
npm install -D eslint-plugin-testing-library
```

### Testing Commands
```bash
npm run test        # Run tests
npm run test:ui     # Open Vitest UI
npm run test:coverage # Generate coverage report
```

## Default Styling & UI Components

### Design System (from linkedin-profile-enhancer.vercel.app)

#### Color Scheme
Use HSL-based CSS variables for light/dark mode support:
```css
/* globals.css - Default color scheme */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --muted: 210 40% 96.1%;
    --accent: 210 40% 96.1%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... dark mode colors */
  }
}
```

#### Custom Animations
```css
/* Blob animations for backgrounds */
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}

.animate-blob { animation: blob 10s infinite; }
.animate-blob-slow { animation: blob-slow 15s infinite; }
.animate-pulse-slow { animation: pulse-slow 8s infinite; }
```

#### Background Components
Two animated canvas-based backgrounds (no external libraries):
1. **AnimatedBackground** - Vibrant waves for hero sections
   - Purple, blue, pink gradients
   - High opacity (0.75-0.95)
   - Dynamic wave animations
   
2. **AnimatedBackgroundSubtle** - Subtle version for content pages
   - Same colors, lower opacity (0.06-0.15)
   - Gentler animations

#### Utility Classes Setup
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

#### Tailwind Configuration
```typescript
// tailwind.config.ts
const config = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for theming
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... etc
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
}
```

#### UI Component Patterns
- Use shadcn/ui components as base
- Apply glass morphism effects where appropriate
- Consistent spacing: 4, 6, 8, 12, 16, 20, 24 units
- Border radius: sm (4px), md (6px), lg (8px)
- Shadows: subtle for light mode, glow effects for dark mode

## SEO Setup

### Essential SEO Libraries to Install
```bash
# Core SEO
npm install next-seo
npm install next-sitemap

# Schema & Structured Data
npm install schema-dts

# Analytics & Monitoring
npm install @vercel/analytics @vercel/speed-insights
npm install @next/third-parties  # For Google Analytics

# SEO Testing
npm install -D lighthouse
```

### SEO Configuration Files Needed
1. `next-seo.config.js` - Global SEO settings
2. `next-sitemap.config.js` - Sitemap generation
3. `robots.txt` - Search engine directives

## Project Structure

```
project/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group routes
│   ├── (marketing)/       # Public pages
│   ├── (dashboard)/       # Protected pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   └── layouts/           # Layout components
├── lib/
│   ├── supabase/          # Supabase client & types
│   ├── utils/             # Utility functions
│   └── hooks/             # Custom React hooks
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── public/                # Static assets
├── styles/
│   └── globals.css        # Global styles with Tailwind
└── development-progress-implementation-log.md  # Implementation tracking
```

## Development Progress Tracking

### IMPORTANT: Implementation Log
**ALL projects MUST maintain a `development-progress-implementation-log.md` file in the project root.**

This file tracks all significant implementations with:
- Version numbers (v1.0, v2.0, etc.)
- Date and timestamp
- Features implemented
- Files created/modified
- Key improvements and metrics

#### Format Example:
```markdown
### v1.0 - Initial Setup
**Date: 2025-01-25**
**Timestamp: 10:00 GMT**

#### Features Implemented:
- Project initialization
- Core functionality
- Database schema

### v2.0 - Feature Enhancement
**Date: 2025-01-25**
**Timestamp: 15:30 GMT**

#### Features Implemented:
- New feature description
- Files modified
- Performance improvements
```

**When to Update:**
- After completing any significant feature
- When creating new architectural components
- After major refactoring
- When implementing integrations
- At the end of each development session

**Auto-create this file** when starting work on any project that doesn't have one.

## Coding Standards

### Best Practices
1. **Always use TypeScript** with strict mode enabled
2. **Prefer server components** in Next.js App Router (default)
3. **Use 'use client' directive** only when necessary
4. **Implement proper error boundaries** for robust error handling
5. **Use environment variables** for all sensitive data
6. **Follow atomic design principles** for components
7. **Implement proper loading and error states**
8. **Use React.Suspense** for async components

### Security Best Practices
1. **Never expose API keys** in client-side code
2. **Always validate and sanitize** user input
3. **Use Supabase RLS** (Row Level Security) policies
4. **Implement rate limiting** on API routes
5. **Use HTTPS everywhere** in production
6. **Enable CSP headers** for XSS protection
7. **Keep dependencies updated** regularly
8. **Use secrets management** for sensitive data

### Code Style
- Use functional components with hooks
- Implement proper TypeScript types (avoid `any`)
- Follow ESLint and Prettier configurations
- Use semantic HTML elements
- Implement accessible components (ARIA labels)
- Write self-documenting code (clear naming)
- Keep components small and focused
- Use custom hooks for reusable logic

## Essential Configuration Files

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "analyze": "ANALYZE=true next build",
    "lighthouse": "lighthouse http://localhost:3000 --view"
  }
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Documentation Resources

### Official Documentation
- Next.js: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion
- Supabase: https://supabase.com/docs
- Vitest: https://vitest.dev
- Testing Library: https://testing-library.com

### Local Claude Docs
Available at `~/.claude-docs/docs/`:
- quickstart.md - Getting started
- memory.md - Using CLAUDE.md files
- common-workflows.md - Typical development patterns
- settings.md - Configuration options

## Common Commands Reference

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

### Database (Supabase) - ALWAYS USE CLI
```bash
# Development workflow
supabase start                                    # Start local Supabase
supabase migration new descriptive_change_name    # Create migration
supabase db reset                                # Test migration locally
supabase gen types typescript --local > lib/database.types.ts  # Generate types
supabase db push                                 # Deploy to production

# Debugging
supabase db diff                                 # Check local vs remote
supabase db lint                                # Check for issues
```

### Deployment
```bash
vercel              # Deploy to Vercel
vercel --prod       # Deploy to production
gh repo create      # Create GitHub repo
gh pr create        # Create pull request
```

### Testing
```bash
npm test            # Run tests
npm run test:coverage # With coverage
npm run lighthouse  # SEO/Performance audit
```

## Project Initialization Checklist

When starting a new project, run `claude-init` in an empty directory. It will:

1. [x] Initialize Next.js with TypeScript (automatic)
2. [x] Install and configure shadcn/ui (automatic with random color theme)
3. [x] Install all preferred libraries (automatic)
4. [x] Create animated background components (automatic)
5. [x] Set up ESLint (automatic, answers yes)
6. [x] Install testing framework (automatic)
7. [x] Install SEO libraries (automatic)
8. [x] Create CLAUDE.md in project root (automatic)
9. [ ] Set up Supabase project (manual - visit supabase.com)
10. [ ] Configure environment variables (manual - copy .env.local.example)
11. [ ] Set up GitHub repository (manual - use `gh repo create`)
12. [ ] Configure Vercel deployment (manual - use `vercel`)

### Quick Start for New Projects:
```bash
mkdir my-project && cd my-project
claude-init  # Creates entire project automatically
cp .env.local.example .env.local  # Then add your API keys
npm run dev
```

## Stripe Integration

### Configuration
Stripe is fully integrated with products and pricing configured via CLI.

#### Environment Variables (Already Set)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51RzYXh2dFhd680hG...
STRIPE_SECRET_KEY=sk_test_51RzYXh2dFhd680hG...
STRIPE_WEBHOOK_SECRET=whsec_dcf456ce20a7fd39c813b7ae4d4cfa436...

# Price IDs (Already Created)
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=price_1RzZ1t2dFhd680hGONR7esBs
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_ANNUAL=price_1RzZ232dFhd680hGZsmm1VJM
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_1RzZ2M2dFhd680hGSWQOd2cQ
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_1RzZ2V2dFhd680hGnSHYUZeu
```

#### Products & Pricing (Already Created)
- **Basic Plan**: $19/month or $190/year
- **Premium Plan**: $49/month or $490/year

### Stripe CLI Commands
```bash
# Authentication
stripe login                           # Authenticate with Stripe account

# Product Management
stripe products list                   # List all products
stripe prices list                     # List all prices
stripe customers list                  # List customers

# Webhook Testing
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Create checkout session (example)
stripe checkout sessions create \
  --success-url="http://localhost:3000/success" \
  --cancel-url="http://localhost:3000/cancel" \
  --line-items="price=price_1RzZ1t2dFhd680hGONR7esBs,quantity=1" \
  --mode=subscription

# View logs
stripe logs tail                      # Stream API logs
```

### Key Files
- `/lib/stripe/client.ts` - Stripe client initialization
- `/lib/hooks/use-stripe-checkout.ts` - Checkout session hook
- `/app/api/stripe/checkout/route.ts` - Checkout API endpoint
- `/app/api/stripe/webhook/route.ts` - Webhook handler
- `/STRIPE_QUICKSTART.md` - Quick setup guide
- `/docs/stripe-llm-docs.txt` - Complete Stripe LLM documentation (cached locally)

### Testing Cards
```
4242 4242 4242 4242  # Success
4000 0000 0000 0002  # Decline
4000 0025 0000 3155  # Requires authentication
```

### Common Operations
```typescript
// Create checkout session (already implemented)
const { createCheckoutSession } = useStripeCheckout()
await createCheckoutSession(priceId, 'monthly')

// Open customer portal (already implemented)
const { openCustomerPortal } = useStripeCheckout()
await openCustomerPortal()
```

### References
- Full Stripe documentation cached at: `/docs/stripe-llm-docs.txt`
- Quick setup guide: `/STRIPE_QUICKSTART.md`
- Stripe Dashboard: https://dashboard.stripe.com
- API Reference: https://stripe.com/docs/api

## Notes

- Always prefer editing existing files over creating new ones
- Run linting and type checking before commits
- Use semantic commit messages
- Write tests for critical functionality
- Document complex logic with comments
- Keep bundle size optimized
- Monitor Core Web Vitals
- #DO NOT switch LLM models without approval.