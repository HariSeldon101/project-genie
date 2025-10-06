# Vercel Deployment Protection Fix

## Issue
The document generation feature returns "Failed to parse server response" errors in production due to Vercel's deployment protection intercepting API calls and returning HTML pages instead of JSON responses.

## Solution

### Option 1: Disable Deployment Protection (Recommended for Beta Testing)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `project-genie` project
3. Go to **Settings** → **Deployment Protection**
4. Set **Vercel Authentication** to **Disabled**
5. Save changes

### Option 2: Configure Protection for Specific Routes
1. Keep deployment protection enabled for the main app
2. In **Settings** → **Deployment Protection**
3. Add `/api/*` to the **Excluded Paths**
4. This allows API routes to work while protecting other pages

### Option 3: Use Password Protection (For Beta Users)
1. Go to **Settings** → **Deployment Protection**
2. Enable **Password Protection**
3. Share the password with beta testers
4. Users enter the password once to access the entire app

## Why This Happens
- Vercel's deployment protection is designed to prevent unauthorized access to preview and production deployments
- When enabled, it returns HTML authentication pages for all requests, including API calls
- Our API expects JSON responses, so HTML pages cause parsing errors

## Testing After Fix
1. Clear browser cache and cookies
2. Log in to the application
3. Try generating documents again
4. Check browser console for any remaining errors

## Additional Notes
- Deployment protection is useful for preventing public access during development
- Consider re-enabling it with proper configuration after beta testing is complete
- For production apps with user authentication, deployment protection can usually be disabled as the app handles its own auth