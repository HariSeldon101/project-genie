#!/bin/bash

# Script to update all API routes to use server-logger instead of client-safe-logger

API_DIR="/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie/app/api"

# Files to update
FILES=(
  "$API_DIR/company-intelligence/stage-review/route.ts"
  "$API_DIR/company-intelligence/pack/[id]/route.ts"
  "$API_DIR/company-intelligence/progress/route.ts"
  "$API_DIR/company-intelligence/research-stream/route.ts"
  "$API_DIR/generate/route.ts"
  "$API_DIR/generate-retry/route.ts"
  "$API_DIR/generate-stream/route.ts"
)

# Update each file
for FILE in "${FILES[@]}"; do
  if [[ -f "$FILE" ]]; then
    echo "Updating $FILE..."
    
    # Replace import statement
    sed -i '' "s|from '@/lib/utils/client-safe-logger'|from '@/lib/utils/server-logger'|g" "$FILE"
    sed -i '' "s|import { logger }|import { serverLogger }|g" "$FILE"
    
    # Replace logger calls with serverLogger
    sed -i '' "s|logger\\.info|serverLogger.info|g" "$FILE"
    sed -i '' "s|logger\\.error|serverLogger.error|g" "$FILE"
    sed -i '' "s|logger\\.warn|serverLogger.warn|g" "$FILE"
    sed -i '' "s|logger\\.debug|serverLogger.debug|g" "$FILE"
    
    echo "✓ Updated $FILE"
  else
    echo "⚠ File not found: $FILE"
  fi
done

echo "✅ All API routes updated to use server-logger!"