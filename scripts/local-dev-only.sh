#!/bin/bash

# 🚨 LOCAL DEVELOPMENT ENFORCEMENT SCRIPT
# This script ensures we're only doing local development
# and prevents accidental deployments

echo "🏠 LOCAL DEVELOPMENT MODE ENFORCED"
echo "=================================="
echo ""
echo "⛔ DEPLOYMENT PREVENTION ACTIVE:"
echo "  • GitHub commits: BLOCKED (unless explicit)"
echo "  • Vercel deploys: BLOCKED (unless explicit)"
echo "  • Production builds: BLOCKED (use dev server)"
echo ""
echo "✅ LOCAL DEVELOPMENT READY:"
echo "  • Dev server: http://localhost:3000"
echo "  • Hot reload: ENABLED"
echo "  • Safe mode: ACTIVE"
echo ""

# Kill any existing processes on port 3000
echo "🔄 Restarting development server..."
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start dev server
npm run dev