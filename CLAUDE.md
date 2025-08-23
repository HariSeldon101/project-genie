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

### Available CLIs (Pre-installed)
You can use these commands without asking:
- `gh` - GitHub CLI
- `vercel` - Vercel CLI
- `supabase` - Supabase CLI
- `brew` - Homebrew package manager
- `npm` / `npx` - Node package managers
- `git` - Version control

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
└── styles/
    └── globals.css        # Global styles with Tailwind
```

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

### Database (Supabase)
```bash
supabase start       # Start local Supabase
supabase db reset    # Reset database
supabase gen types   # Generate TypeScript types
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

## Notes

- Always prefer editing existing files over creating new ones
- Run linting and type checking before commits
- Use semantic commit messages
- Write tests for critical functionality
- Document complex logic with comments
- Keep bundle size optimized
- Monitor Core Web Vitals