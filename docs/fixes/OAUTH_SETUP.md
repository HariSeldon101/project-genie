# OAuth Setup Instructions for Project Genie

## Prerequisites
- Supabase project created and configured
- Access to Supabase Dashboard
- Google Cloud Console account
- LinkedIn Developer account

## 1. Google OAuth Setup

### Step 1: Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
5. If prompted, configure OAuth consent screen first:
   - Choose "External" user type
   - Fill in app information:
     - App name: "Project Genie"
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Save and continue

### Step 2: Create OAuth 2.0 Client ID
1. Application type: **Web application**
2. Name: "Project Genie"
3. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://vnuieavheezjxbkyfxea.supabase.co
   ```
4. Authorized redirect URIs:
   ```
   https://vnuieavheezjxbkyfxea.supabase.co/auth/v1/callback
   ```
5. Click **CREATE**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Configure in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Google provider**
6. Enter:
   - Client ID: (paste from Google)
   - Client Secret: (paste from Google)
7. Click **Save**

## 2. LinkedIn OAuth Setup

### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **Create app**
3. Fill in app details:
   - App name: "Project Genie"
   - LinkedIn Page: (select or create one)
   - App logo: (upload a logo)
   - Legal agreement: check the box
4. Click **Create app**

### Step 2: Configure OAuth Settings
1. In your app dashboard, go to **Auth** tab
2. Add Authorized redirect URLs:
   ```
   https://vnuieavheezjxbkyfxea.supabase.co/auth/v1/callback
   ```
3. Go to **Products** tab
4. Request access to **Sign In with LinkedIn using OpenID Connect**
5. Once approved, go back to **Auth** tab
6. Copy:
   - Client ID
   - Client Secret

### Step 3: Configure in Supabase
1. In Supabase Dashboard > **Authentication** > **Providers**
2. Find **LinkedIn** and click to expand
3. Toggle **Enable LinkedIn provider**
4. Enter:
   - Client ID: (paste from LinkedIn)
   - Client Secret: (paste from LinkedIn)
5. Click **Save**

## 3. Update Redirect URLs in Your App

### For Development
Your app is already configured to handle OAuth callbacks at:
- `/auth/callback`

### For Production
When deploying to production, update the redirect URLs in both Google and LinkedIn to:
```
https://your-domain.com/auth/callback
```

And update Supabase authorized redirect URLs:
1. Go to **Authentication** > **URL Configuration**
2. Add your production domain to **Redirect URLs**:
   ```
   https://your-domain.com/**
   ```

## 4. Test OAuth Login

### Test Google Login
1. Start your dev server: `npm run dev`
2. Navigate to http://localhost:3000/login
3. Click "Google" button
4. Should redirect to Google login
5. After authorization, should redirect back to dashboard

### Test LinkedIn Login
1. Navigate to http://localhost:3000/login
2. Click "LinkedIn" button
3. Should redirect to LinkedIn login
4. After authorization, should redirect back to dashboard

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch" error**
   - Ensure the redirect URI in your OAuth provider matches exactly:
   - `https://vnuieavheezjxbkyfxea.supabase.co/auth/v1/callback`

2. **"Invalid client" error**
   - Double-check Client ID and Secret are correctly copied
   - Ensure the OAuth provider is enabled in Supabase

3. **User not created after OAuth login**
   - Check Supabase logs: Dashboard > **Logs** > **Auth**
   - Ensure email is verified in OAuth provider

4. **LinkedIn OAuth not working**
   - LinkedIn requires app review for production use
   - For development, add test users in LinkedIn app settings

## Environment Variables

No additional environment variables needed! OAuth settings are stored in Supabase.

## Security Notes

- Never commit OAuth secrets to git
- Use different OAuth apps for development and production
- Regularly rotate client secrets
- Monitor OAuth usage in provider dashboards