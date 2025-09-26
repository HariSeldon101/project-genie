#!/bin/bash
# Rollback script created: Monday, 22nd September 2025, 17:57 Paris Time
# Purpose: Instantly restore original files if issues arise

echo "🔄 Starting rollback of logs fix changes..."

# Restore original files
cp .backups/2025-09-22-1757-logs-fix/logs-repository.ts.backup lib/repositories/logs-repository.ts
echo "✅ Restored logs-repository.ts"

cp .backups/2025-09-22-1757-logs-fix/extraction-route.ts.backup app/api/company-intelligence/phases/extraction/route.ts
echo "✅ Restored extraction/route.ts"

echo "🎯 Rollback completed successfully!"
echo "⚠️  Note: If database migration was applied, run: supabase migration revert 20250922_optimize_logs_indexes"