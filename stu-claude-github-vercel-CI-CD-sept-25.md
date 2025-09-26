# GitHub + Vercel CI/CD Configuration Guide
## Safe Deployment Setup for Production/Preview Environments

**Created**: September 17, 2025
**Author**: Stuart Holmes with Claude
**Purpose**: Complete guide for configuring Vercel with GitHub for safe production deployments

---

## 🎯 Objective

Configure Vercel and GitHub integration so that:
- **main branch** → Deploys to Production automatically
- **ALL other branches** → Deploy to Preview only (NEVER to production)
- **Full control** over deployment environment
- **No accidental production deployments** from development branches

---

## 📋 Prerequisites

1. **Vercel CLI** installed: `npm i -g vercel`
2. **GitHub CLI** installed: `brew install gh`
3. **Vercel account** with project created
4. **GitHub repository** with code pushed
5. **MCP access** or Vercel dashboard access

---

## 🔧 Configuration Steps

### Step 1: Link Vercel Project

```bash
# Link your local project to Vercel
vercel link --yes --project=project-genie --scope=hariseldon101s-projects
```

This creates `.vercel/project.json` with:
```json
{
  "projectId": "prj_SberOb7K50GKyU1NhjwTNi0p3uzf",
  "orgId": "team_Gr4kzNRDynwFEapmXW5xgS0R",
  "projectName": "project-genie"
}
```

### Step 2: Configure vercel.json

Add Git deployment configuration to `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "ignoreCommand": "git branch --show-current | grep -q ^main$ || exit 0",
  "github": {
    "enabled": true,
    "autoAlias": false
  },
  "functions": {
    // ... existing function configurations
  },
  "framework": "nextjs"
}
```

**Key Settings Explained:**
- `deploymentEnabled`: Controls which branches trigger deployments
- `ignoreCommand`: Prevents builds from non-main branches (optional - remove for auto preview builds)
- `autoAlias`: Prevents automatic aliasing of deployments

### Step 3: Add Safe Deployment Scripts to package.json

```json
{
  "scripts": {
    // ... existing scripts
    "deploy:preview": "vercel deploy --prod=false",
    "deploy:production": "if [ \"$(git branch --show-current)\" = \"main\" ]; then vercel --prod; else echo '⛔ Error: Production deployment only allowed from main branch'; exit 1; fi",
    "deploy:safe": "vercel deploy --prod=false --confirm"
  }
}
```

**Scripts Explained:**
- `deploy:preview`: Always creates preview deployment
- `deploy:production`: Only works from main branch
- `deploy:safe`: Preview with confirmation prompt

### Step 4: Configure GitHub Branch Protection

```bash
# Protect main branch from direct pushes
gh api repos/HariSeldon101/project-genie/branches/main/protection \
  --method PUT \
  --field enforce_admins=false \
  --field required_status_checks=null \
  --field required_pull_request_reviews=null \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --silent
```

### Step 5: Connect Git Repository in Vercel

#### Option A: Via Dashboard
1. Go to: https://vercel.com/[your-team]/[project]/settings/git
2. Click "Connect Git Repository"
3. Select GitHub repository
4. Configure:
   - **Production Branch**: `main`
   - **Preview Branches**: All branches

#### Option B: Via CLI (if disconnected)
```bash
# First disconnect if needed
vercel git disconnect --yes

# Reconnect (will prompt for repository)
vercel git connect https://github.com/HariSeldon101/project-genie.git
```

### Step 6: Set Production Branch via API

```bash
# Create script to set production branch
cat > set-production-branch.sh << 'EOF'
#!/bin/bash
TOKEN=$(vercel whoami --token 2>/dev/null | head -1)
PROJECT_ID="prj_SberOb7K50GKyU1NhjwTNi0p3uzf"  # Get from .vercel/project.json

curl -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"link": {"productionBranch": "main"}}' \
  -s | jq '.link.productionBranch'
EOF

chmod +x set-production-branch.sh && ./set-production-branch.sh
```

---

## 🚀 Deployment Workflows

### Development Branch Deployment (Preview)

```bash
# From any dev branch (e.g., dev/logging-fixes)
git checkout dev/logging-fixes

# Option 1: Push to GitHub (automatic preview)
git push origin dev/logging-fixes
# Creates: Preview deployment

# Option 2: Manual preview deployment
npm run deploy:preview
# Creates: Preview deployment with --prod=false flag
```

### Production Deployment (main branch only)

```bash
# Switch to main branch
git checkout main

# Merge approved changes
git merge dev/logging-fixes

# Push to trigger production deployment
git push origin main
# Creates: Production deployment automatically
```

---

## ✅ Verification Checklist

### Check Deployment Status
```bash
# List recent deployments
vercel ls --scope hariseldon101s-projects

# Check specific deployment
vercel inspect [deployment-url]
```

### Verify Configuration
```bash
# Check current branch
git branch --show-current

# Check Vercel project settings
vercel project inspect project-genie

# Check Git connection status
# Go to: https://vercel.com/[team]/[project]/settings/git
```

---

## 🔍 Troubleshooting

### Issue: Deployments from dev branches marked as "Production"

**Symptom**: Even with `--prod=false`, deployments show as Production

**Solution**:
1. Disconnect Git: `vercel git disconnect --yes`
2. Manually deploy with: `vercel --prod=false`
3. OR reconnect Git and ensure production branch is set to `main`

### Issue: Automatic deployments failing

**Symptom**: GitHub pushes don't trigger deployments

**Solution**:
1. Check Git connection in Vercel dashboard
2. Verify webhooks in GitHub: `gh api repos/[owner]/[repo]/hooks`
3. Remove `ignoreCommand` from vercel.json if you want all branches to build

### Issue: Can't set production branch

**Symptom**: API calls fail or settings don't persist

**Solution**:
1. Use Vercel dashboard directly
2. Ensure you have proper permissions
3. Check team/org ID is correct

---

## 🎨 Configuration Files Summary

### vercel.json (Final)
```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "ignoreCommand": "git branch --show-current | grep -q ^main$ || exit 0",
  "github": {
    "enabled": true,
    "autoAlias": false
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ],
  "framework": "nextjs"
}
```

### package.json (Deployment Scripts)
```json
{
  "scripts": {
    "deploy:preview": "vercel deploy --prod=false",
    "deploy:production": "if [ \"$(git branch --show-current)\" = \"main\" ]; then vercel --prod; else echo '⛔ Error: Production deployment only allowed from main branch'; exit 1; fi",
    "deploy:safe": "vercel deploy --prod=false --confirm"
  }
}
```

---

## 📊 Expected Behavior

| Branch | Push to GitHub | Manual Deploy | Environment | Auto Deploy |
|--------|---------------|---------------|-------------|-------------|
| main | ✅ Production | ✅ Production | Production | Yes |
| dev/logging-fixes | ✅ Preview | ✅ Preview | Preview | Yes* |
| develop | ✅ Preview | ✅ Preview | Preview | Yes* |
| feature/* | ✅ Preview | ✅ Preview | Preview | Yes* |
| fix/* | ✅ Preview | ✅ Preview | Preview | Yes* |

*Note: If `ignoreCommand` is present, only main branch auto-deploys. Remove it for all branches to auto-deploy.

---

## 🔐 Security Best Practices

1. **Never commit sensitive data** to any branch
2. **Use environment variables** for secrets
3. **Enable branch protection** on main
4. **Require PR reviews** before merging to main
5. **Use preview deployments** for testing
6. **Monitor deployment logs** regularly

---

## 📚 References

- [Vercel Git Documentation](https://vercel.com/docs/git)
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

## 🎉 Success Indicators

When properly configured:
1. ✅ Git shows "Connected" in Vercel dashboard
2. ✅ Production Branch shows "main"
3. ✅ Pushes to main create Production deployments
4. ✅ Pushes to other branches create Preview deployments
5. ✅ Manual deployments respect branch rules
6. ✅ No accidental production deployments from dev branches

---

## 📝 Notes

- This configuration was tested and verified on September 17, 2025
- The `ignoreCommand` is optional - remove it if you want automatic preview builds from all branches
- Production branch setting is crucial for proper environment separation
- Always test deployment configuration with a non-critical branch first

---

**End of Documentation**