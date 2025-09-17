# 🚨 URGENT: OAuth Still Redirecting to Localhost

## The Problem
Despite our code using `window.location.origin` correctly, Supabase is overriding the redirect URL with localhost because the **Site URL** in Supabase Dashboard is still set to `http://localhost:3000`.

## Root Cause
When you initiate OAuth with Supabase, it uses the **Site URL** configured in the dashboard as the base URL for redirects, regardless of what you pass in the `redirectTo` parameter.

## THE FIX - You MUST Update Supabase Dashboard

### Step 1: Open Supabase Auth Configuration
Click this link or copy to browser:
https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/url-configuration

### Step 2: Change Site URL (CRITICAL!)
**Current (WRONG):**
```
http://localhost:3000
```

**Change to (CORRECT):**
```
https://project-genie-one.vercel.app
```

### Step 3: Update Redirect URLs
Make sure these URLs are in the **Redirect URLs** list:
```
https://project-genie-one.vercel.app/auth/callback
https://project-genie-one.vercel.app
https://project-genie-hariseldon101s-projects.vercel.app/auth/callback
https://project-genie-hariseldon101s-projects.vercel.app
http://localhost:3000/auth/callback
http://localhost:3000
```

### Step 4: SAVE
Click the **Save** button at the bottom of the page.

## Why This Happens
Supabase uses the Site URL as the default redirect destination for OAuth flows. Even though our code specifies `window.location.origin`, Supabase's backend configuration takes precedence for security reasons.

## Verification
After saving in Supabase:
1. Go to https://project-genie-one.vercel.app/login
2. Click "Sign in with Google" or another OAuth provider
3. You should now be redirected back to the production URL, not localhost

## Alternative Solution
If you need to keep switching between local and production, you can:
1. Create separate Supabase projects for development and production
2. Use environment-specific Supabase credentials

## Current Status
- ✅ Code is correct (uses window.location.origin)
- ✅ Vercel environment variables are correct
- ❌ Supabase Dashboard Site URL needs to be updated (by you)
- ❌ OAuth redirects won't work until Supabase is updated