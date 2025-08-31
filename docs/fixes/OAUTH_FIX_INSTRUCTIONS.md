# OAuth Login Fix for Local Development

## Current Issue
When you try to login with Google on localhost, you're being redirected to the production URL (https://project-genie-one.vercel.app) because Supabase's **Site URL** is configured for production.

## Solution for Local Development

### Quick Fix (Immediate)
1. **Go to Supabase Dashboard**: 
   https://supabase.com/dashboard/project/vnuieavheezjxbkyfxea/auth/url-configuration

2. **Change Site URL to**:
   ```
   http://localhost:3000
   ```

3. **Ensure these are in Redirect URLs list**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000
   https://project-genie-one.vercel.app/auth/callback
   https://project-genie-one.vercel.app
   ```

4. **Save** the changes

5. **Test**: Try logging in with Google on localhost again

## Long-term Solution (Recommended)

### Option 1: Use Different Supabase Projects
- Create a separate Supabase project for development
- Use different environment variables for dev vs production

### Option 2: Manual Switch
- When developing locally: Set Site URL to `http://localhost:3000`
- Before deploying: Change Site URL back to `https://project-genie-one.vercel.app`

### Option 3: Use Supabase CLI for Local Development
```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Start local Supabase
supabase start

# This gives you a local Supabase instance that won't conflict with production
```

## Google Cloud Console Settings
Also ensure your Google OAuth app has both URLs:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback`
   - `https://vnuieavheezjxbkyfxea.supabase.co/auth/v1/callback`

## Current Status
- ✅ Your code is correct (uses `window.location.origin`)
- ✅ Auth callback route is properly configured
- ❌ Supabase Site URL needs to be changed to `http://localhost:3000` for local development
- ⚠️ Remember to change it back before pushing to production

## Testing After Fix
1. Clear your browser cookies/cache for localhost:3000
2. Go to http://localhost:3000/login
3. Click "Sign in with Google"
4. You should now stay on localhost after authentication