#!/bin/bash

# =========================================================================
# 🏗️ LOCAL BUILD TEST SCRIPT - Replicates Vercel Build Process
# =========================================================================
# This script exactly mirrors what Vercel does during deployment
# to catch build errors locally BEFORE they happen on Vercel
# =========================================================================

set -e  # Exit on any error (like Vercel does)

echo "🏗️  LOCAL BUILD TEST - Vercel Simulation"
echo "========================================"
echo "This will test if your code will build on Vercel"
echo "WITHOUT actually deploying anything!"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track start time
START_TIME=$(date +%s)

# Step 1: Environment Setup (like Vercel)
echo "📦 Step 1: Setting up production environment..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Step 2: Clean previous build artifacts
echo "🧹 Step 2: Cleaning previous build artifacts..."
rm -rf .next
rm -rf out
rm -rf .vercel

# Step 3: Install dependencies (Vercel does this fresh)
echo "📥 Step 3: Checking dependencies..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "Installing dependencies (like Vercel does)..."
    npm ci --prefer-offline --no-audit
fi

# Step 4: Run pre-build checks (from package.json prebuild)
echo "🔍 Step 4: Running pre-build checks..."
echo "  → Updating manifest..."
npm run manifest:update

echo "  → Generating database types..."
npm run db:types

echo "  → Checking logger usage..."
npm run check:logger || {
    echo -e "${YELLOW}⚠️  Logger check had warnings (non-critical)${NC}"
}

# Step 5: Type checking (Vercel runs this)
echo "📝 Step 5: Running TypeScript type checking..."
npx tsc --noEmit || {
    echo -e "${RED}❌ TypeScript errors found! Fix these before deploying.${NC}"
    exit 1
}

# Step 6: Linting (optional but recommended)
echo "🔍 Step 6: Running ESLint..."
npm run lint || {
    echo -e "${YELLOW}⚠️  Linting warnings found (non-critical)${NC}"
}

# Step 7: The actual build (exactly like Vercel)
echo "🔨 Step 7: Running Next.js production build..."
echo "  This is exactly what Vercel will run..."
echo ""

# Capture build output
BUILD_OUTPUT=$(npm run build 2>&1) || {
    echo -e "${RED}❌ BUILD FAILED!${NC}"
    echo "$BUILD_OUTPUT"
    echo ""
    echo -e "${RED}This build would fail on Vercel. Fix the errors above.${NC}"
    exit 1
}

# Check for build warnings
if echo "$BUILD_OUTPUT" | grep -q "Compiled with warnings"; then
    echo -e "${YELLOW}⚠️  Build completed with warnings:${NC}"
    echo "$BUILD_OUTPUT" | grep -A 10 "Compiled with warnings"
    echo ""
    echo -e "${YELLOW}Consider fixing these warnings before deploying.${NC}"
else
    echo -e "${GREEN}✅ Build completed successfully with no warnings!${NC}"
fi

# Step 8: Post-build tasks (like sitemap generation)
echo "📋 Step 8: Running post-build tasks..."
if [ -f "next-sitemap.config.js" ]; then
    echo "  → Generating sitemap..."
    npx next-sitemap
fi

# Step 9: Build analysis
echo ""
echo "📊 Step 9: Build Analysis"
echo "------------------------"

# Check build size
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "  📦 Build size: $BUILD_SIZE"
fi

# Count pages
if [ -f ".next/BUILD_ID" ]; then
    BUILD_ID=$(cat .next/BUILD_ID)
    echo "  🔖 Build ID: $BUILD_ID"
fi

# Check for API routes
API_COUNT=$(find .next/server/app/api -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
echo "  🌐 API routes compiled: $API_COUNT"

# Calculate build time
END_TIME=$(date +%s)
BUILD_TIME=$((END_TIME - START_TIME))
echo "  ⏱️  Build time: ${BUILD_TIME}s"

# Step 10: Cleanup (optional - comment out to inspect build)
echo ""
echo "🧹 Step 10: Cleanup..."
read -p "Clean up build artifacts? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf .next
    rm -rf out
    echo "  → Build artifacts cleaned"
else
    echo "  → Build artifacts kept for inspection in .next/"
fi

# Final summary
echo ""
echo "========================================"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ LOCAL BUILD TEST PASSED!${NC}"
    echo ""
    echo "Your code will build successfully on Vercel."
    echo "You can now safely deploy when ready."
else
    echo -e "${RED}❌ LOCAL BUILD TEST FAILED${NC}"
    echo ""
    echo "Fix the errors above before attempting to deploy."
fi
echo "========================================"
echo ""
echo "📝 Next steps:"
echo "  • Development: npm run dev"
echo "  • Deploy to Vercel: npm run deploy:preview (when ready)"
echo "  • Production: npm run deploy:production (from main branch only)"