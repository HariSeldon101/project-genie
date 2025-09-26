#!/bin/bash
# Restore script - run from project root
# Auto-generated restore script for Supabase optimization rollback

echo "🔄 Restoring files from backup..."

# Get the backup directory (this script's parent)
BACKUP_DIR="$(dirname "$0")"

echo "📂 Restoring from: $BACKUP_DIR"

cp "$BACKUP_DIR/permanent-logger.ts" lib/utils/permanent-logger.ts
echo "  ✓ Restored permanent-logger.ts"

cp "$BACKUP_DIR/layout.tsx" "app/(dashboard)/layout.tsx"
echo "  ✓ Restored layout.tsx"

echo "🧹 Removing new files..."
rm -f components/monitoring/supabase-db-monitor.tsx
rm -rf app/api/monitoring/db-status

echo "✅ Restore complete. Please restart your dev server with: npm run dev"
