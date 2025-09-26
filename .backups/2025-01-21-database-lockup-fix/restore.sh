#!/bin/bash

echo "🔄 Restoring permanent-logger files from backup..."
echo "---------------------------------------------------"

# Navigate to project root
cd "$(dirname "$0")/../.."

# Restore the files
echo "📋 Restoring permanent-logger.ts..."
cp .backups/2025-01-21-database-lockup-fix/permanent-logger.ts.backup lib/utils/permanent-logger.ts

echo "📋 Restoring permanent-logger-db.ts..."
cp .backups/2025-01-21-database-lockup-fix/permanent-logger-db.ts.backup lib/utils/permanent-logger-db.ts

echo ""
echo "✅ Files restored successfully!"
echo ""
echo "⚠️  Note: If /app/api/health/logger/route.ts was created, remove it manually:"
echo "    rm app/api/health/logger/route.ts"
echo ""
echo "🔄 Restart your dev server to apply changes:"
echo "    lsof -ti:3000 | xargs kill -9 && npm run dev"