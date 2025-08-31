# 🚨 URGENT: Fix Supabase Redirect URLs

## The Problem
Your production app is redirecting to localhost after OAuth sign-in because Supabase's Auth configuration still has localhost URLs.

## The Solution - Update Supabase Dashboard

### Step 1: Go to Supabase Auth Configuration
Visit: https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/url-configuration

### Step 2: Update Site URL
Change the **Site URL** from:
```
http://localhost:3000
```

To your production URL (use the stable alias):
```
https://project-genie-one.vercel.app
```

### Step 3: Update Redirect URLs
In the **Redirect URLs** section, ADD these production URLs (keep localhost for development):

```
https://project-genie-one.vercel.app/auth/callback
https://project-genie-one.vercel.app
https://project-genie-hariseldon101s-projects.vercel.app/auth/callback
https://project-genie-hariseldon101s-projects.vercel.app
```

Keep these for local development:
```
http://localhost:3000/auth/callback
http://localhost:3000
```

### Step 4: Save Changes
Click **Save** at the bottom of the page.

## Alternative: Use Wildcard Domain

If your Vercel deployment URLs change frequently, you can use a wildcard pattern:
```
https://project-genie-*.vercel.app/auth/callback
https://project-genie-*.vercel.app
```

## Verification
After saving:
1. Try signing in on production: https://project-genie-bopb4nsd3-hariseldon101s-projects.vercel.app/login
2. You should be redirected back to the production URL, not localhost

## Note on Dynamic URLs
Each Vercel deployment gets a unique URL. To avoid updating Supabase every time:
1. Set up a custom domain (recommended)
2. Or use wildcard patterns as shown above
3. Or use the Vercel alias URL which stays consistent