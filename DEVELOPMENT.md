# Project Genie Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account created
- Git configured

### Initial Setup
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd project-genie

# Install dependencies
npm install

# Run the setup script (macOS/Linux)
./scripts/setup-dev.sh

# Or manually:
npm run seed  # Create test accounts
```

## 📧 Test Accounts

Three test accounts have been created for development:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Project Manager | `test@projectgenie.dev` | `TestPass123!` | General testing |
| Senior PM | `pm@projectgenie.dev` | `PMPass123!` | Testing PM features |
| Stakeholder | `stakeholder@projectgenie.dev` | `StakePass123!` | Testing stakeholder views |

## 🔐 OAuth Configuration

### Required Setup
1. **Google OAuth**: Follow instructions in `OAUTH_SETUP.md` Section 1
2. **LinkedIn OAuth**: Follow instructions in `OAUTH_SETUP.md` Section 2

### Quick Links
- [Google Cloud Console](https://console.cloud.google.com/)
- [LinkedIn Developers](https://www.linkedin.com/developers/)
- [Supabase Dashboard](https://supabase.com/dashboard)

### OAuth Redirect URLs
```
Development: https://vnuieavheezjxbkyfxea.supabase.co/auth/v1/callback
Production: https://your-domain.com/auth/callback
```

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Database commands
npm run seed        # Create test data
npm run db:push     # Push schema to Supabase
npm run db:reset    # Reset database

# Testing (when configured)
npm run test        # Run tests
npm run test:ui     # Open Vitest UI
```

## 📁 Project Structure

```
project-genie/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Dashboard pages
│   │   ├── dashboard/     # Main dashboard
│   │   └── projects/      # Project management
│   ├── auth/              # Auth callbacks
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Dashboard components
│   └── animated-*.tsx     # Background animations
├── lib/
│   ├── auth/              # Auth helpers
│   └── supabase/          # Supabase clients
├── scripts/
│   └── seed-test-data.ts  # Test data seeder
└── supabase/
    └── schema.sql         # Database schema
```

## 🎨 UI Components

The app uses **shadcn/ui** components with glassmorphism effects:

- **Glass effects**: `.glass`, `.glass-card`, `.glass-subtle`
- **Gradients**: `.gradient-aurora`, `.gradient-sunset`, `.gradient-ocean`
- **RAG Status**: `.rag-green`, `.rag-amber`, `.rag-red`

## 🔄 Workflow

### Creating a New Feature
1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test with test accounts
4. Run linting: `npm run lint`
5. Commit and push

### Adding New Database Tables
1. Edit `supabase/schema.sql`
2. Run `npm run db:push`
3. Update TypeScript types if needed

### Testing Authentication Flow
1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click "Sign In"
4. Use test credentials or OAuth

## 🐛 Troubleshooting

### Common Issues

#### "Invalid API key" error
- Check `.env.local` has correct Supabase keys
- Ensure no spaces in environment variables

#### OAuth not working
- Verify redirect URLs match exactly
- Check OAuth is enabled in Supabase Dashboard
- Ensure Client ID/Secret are correct

#### Database errors
- Run `npm run db:push` to sync schema
- Check RLS policies in Supabase Dashboard

#### Test accounts not working
- Run `npm run seed` again
- Check Supabase Dashboard > Authentication > Users

### Debug Mode
Add to `.env.local`:
```
NEXT_PUBLIC_DEBUG=true
```

## 📚 Key Features Status

### ✅ Completed
- Database schema with RLS
- Authentication (email + OAuth setup)
- Project Genesis Wizard
- Dashboard layout
- Landing page
- Test data seeding

### 🚧 In Progress
- Document generation engine
- Kanban board
- Conversational AI interface

### 📋 TODO
- Email notifications (Resend)
- RAG dashboard
- Sprint planning
- Risk management
- Gantt charts

## 🔗 Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 💡 Tips

1. **Hot Reload**: The app auto-refreshes on file changes
2. **Type Safety**: TypeScript will catch most errors at compile time
3. **Database Changes**: Always update schema.sql for tracking
4. **Testing**: Use different test accounts to test permissions
5. **Console Logs**: Check browser console for client errors
6. **Network Tab**: Monitor API calls in browser DevTools

## 🚢 Deployment

### Vercel Deployment
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=<production-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
RESEND_API_KEY=<resend-key>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 📝 Notes

- The app uses server-side auth with cookies
- All database access goes through RLS policies
- Sensitive operations use service role key (server-side only)
- OAuth providers need manual configuration in Supabase Dashboard

---

For questions or issues, check the PRD document or create an issue in the repository.