# Project Genie Deployment Workflow

## Overview
This project uses a two-branch deployment strategy with Vercel for continuous deployment.

## Branches

### `main` (Production)
- **URL**: https://project-genie-42smkomut-hariseldon101s-projects.vercel.app
- **Purpose**: Stable production environment for beta testing with users
- **Deploy**: Automatic on push to `main`
- **Protection**: Should only receive tested code from `develop`

### `develop` (Development)
- **URL**: Auto-generated preview URLs on each push
- **Purpose**: Testing new features and changes before production
- **Deploy**: Automatic preview deployments on push to `develop`
- **Testing**: All new features should be tested here first

## Development Workflow

1. **Start Development**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Make Changes**
   - Work on features/fixes
   - Test locally with `npm run dev`
   - Run tests with `npm test`

3. **Deploy to Development**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin develop
   ```
   - Vercel will automatically create a preview deployment
   - Check the preview URL in the GitHub PR or Vercel dashboard

4. **Test in Development Environment**
   - Test all functionality in the preview deployment
   - Share preview URL with stakeholders for feedback
   - Fix any issues found

5. **Deploy to Production**
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```
   - Vercel will automatically deploy to production
   - Production URL updates within 1-2 minutes

## Environment Variables
Both environments use the same environment variables configured in Vercel:
- Database connections (Supabase)
- API keys (OpenAI, Stripe, etc.)
- Configuration settings

To update environment variables:
1. Go to Vercel Dashboard
2. Select the project
3. Go to Settings > Environment Variables
4. Update as needed (changes apply to next deployment)

## Monitoring

### Development Deployments
- Check status at: https://vercel.com/hariseldon101s-projects/project-genie
- Each commit to `develop` creates a unique preview URL
- Preview URLs remain active for testing

### Production Deployments
- Main URL: https://project-genie-42smkomut-hariseldon101s-projects.vercel.app
- Monitor via Vercel Dashboard for:
  - Build logs
  - Function logs
  - Error tracking
  - Performance metrics

## Rollback Strategy
If issues are found in production:
1. **Quick Fix**: Make fix in `develop`, test, then merge to `main`
2. **Rollback**: 
   ```bash
   git checkout main
   git revert HEAD
   git push origin main
   ```
   Or use Vercel Dashboard to redeploy a previous production deployment

## Best Practices
1. Never push directly to `main` without testing in `develop` first
2. Keep `develop` branch stable - use feature branches for experimental work
3. Run build locally before pushing: `npm run build`
4. Check Vercel function logs for API errors
5. Monitor the 300-second timeout limit on API routes (Vercel hobby plan)

## Support
- Vercel Dashboard: https://vercel.com/hariseldon101s-projects/project-genie
- GitHub Repo: https://github.com/HariSeldon101/project-genie
- Production URL: https://project-genie-42smkomut-hariseldon101s-projects.vercel.app