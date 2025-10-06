#!/bin/bash

echo "========================================="
echo "Git Push Helper Script"
echo "========================================="
echo ""
echo "This script will help you push the dev branch to GitHub."
echo ""

# Check if Xcode license is accepted
if ! git --version &>/dev/null; then
    echo "❌ Git is blocked by Xcode license"
    echo ""
    echo "Please run this command in Terminal:"
    echo "  sudo xcodebuild -license accept"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Git is working!"
echo ""

# Show current branch
echo "Current branch: $(cat .git/HEAD | sed 's/ref: refs\/heads\///')"
echo ""

# Add all changes
echo "Adding all changes..."
git add -A

# Create commit
echo "Creating commit..."
git commit -m "dev: logging fixes and RLS policy updates

- Created dev/logging-fixes branch isolated from production
- Updated RLS policies to allow anon, authenticated, and service_role inserts
- Fixed permanent_logs table to accept logs from all contexts
- Both client and server logs now visible in unified /logs page
- Production main branch remains unchanged since August 23, 2025"

# Push to origin
echo ""
echo "Pushing to GitHub..."
git push -u origin dev/logging-fixes

echo ""
echo "========================================="
echo "✅ Done! Your branch is pushed to GitHub"
echo "========================================="
echo ""
echo "Vercel will automatically create a preview deployment."
echo "Check https://vercel.com/dashboard for your preview URL"
echo ""