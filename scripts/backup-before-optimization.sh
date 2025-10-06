#!/bin/bash
# Backup script for Supabase optimization
# Run before making any changes
# Date: January 21, 2025

TIMESTAMP=$(date +%Y-%m-%d-%H%M)
BACKUP_DIR=".backups/supabase-optimization-$TIMESTAMP"

echo "🔵 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up files..."

# Backup files to be modified
cp lib/utils/permanent-logger.ts "$BACKUP_DIR/permanent-logger.ts"
echo "  ✓ Backed up permanent-logger.ts"

cp lib/utils/permanent-logger-db.ts "$BACKUP_DIR/permanent-logger-db.ts"
echo "  ✓ Backed up permanent-logger-db.ts (reference)"

cp "app/(dashboard)/layout.tsx" "$BACKUP_DIR/layout.tsx"
echo "  ✓ Backed up dashboard layout.tsx"

echo "📋 Creating restore script..."
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
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
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Create a summary file
cat > "$BACKUP_DIR/backup-summary.txt" << EOF
Backup created: $(date)
Purpose: Supabase client optimization - removing duplicate clients
Files backed up:
  - lib/utils/permanent-logger.ts (to be modified)
  - lib/utils/permanent-logger-db.ts (reference only)
  - app/(dashboard)/layout.tsx (to be modified)

To restore: ./$BACKUP_DIR/restore.sh
EOF

echo "✅ Backup complete!"
echo "📍 Location: $BACKUP_DIR"
echo "🔄 To restore: ./$BACKUP_DIR/restore.sh"
echo ""
echo "📋 Backup contains:"
ls -la "$BACKUP_DIR"