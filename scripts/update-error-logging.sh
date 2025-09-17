#!/bin/bash

# Update all error logging to use captureError instead of error
# This ensures error details are captured in breadcrumbs for debugging

echo "🔧 Updating error logging to use captureError..."

# Find all TypeScript/TSX files with permanentLogger.error or logger.error
files=$(grep -r "permanentLogger\.error\|logger\.error" --include="*.ts" --include="*.tsx" . 2>/dev/null | cut -d: -f1 | sort -u)

count=0
for file in $files; do
  # Skip test files and archive files
  if [[ $file == *"/archive/"* ]] || [[ $file == *"/test-"* ]] || [[ $file == *".test."* ]]; then
    continue
  fi
  
  # Check if file contains permanentLogger.error or logger.error
  if grep -q "permanentLogger\.error\|logger\.error" "$file" 2>/dev/null; then
    echo "📝 Updating: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Replace permanentLogger.error with permanentLogger.captureError
    # Format: permanentLogger.error('CATEGORY', 'message', data)
    # Becomes: permanentLogger.captureError('CATEGORY', new Error('message'), data)
    sed -i '' -E "s/permanentLogger\.error\('([^']+)',\s*'([^']+)',\s*\{/permanentLogger.captureError('\1', new Error('\2'), {context: '\2', /g" "$file"
    sed -i '' -E "s/permanentLogger\.error\('([^']+)',\s*'([^']+)'\)/permanentLogger.captureError('\1', new Error('\2'), {context: '\2'})/g" "$file"
    
    # Same for logger.error
    sed -i '' -E "s/logger\.error\('([^']+)',\s*'([^']+)',\s*\{/logger.captureError('\1', new Error('\2'), {context: '\2', /g" "$file"
    sed -i '' -E "s/logger\.error\('([^']+)',\s*'([^']+)'\)/logger.captureError('\1', new Error('\2'), {context: '\2'})/g" "$file"
    
    # Handle cases where error object is already passed
    sed -i '' -E "s/permanentLogger\.error\('([^']+)',\s*'([^']+)',\s*\{\s*error/permanentLogger.captureError('\1', error, {context: '\2', error/g" "$file"
    sed -i '' -E "s/logger\.error\('([^']+)',\s*'([^']+)',\s*\{\s*error/logger.captureError('\1', error, {context: '\2', error/g" "$file"
    
    # Clean up any duplicates or issues
    sed -i '' "s/{context: '\([^']*\)', context: '\([^']*\)'/{context: '\1'/g" "$file"
    
    # Remove backup if successful
    if [ $? -eq 0 ]; then
      rm "$file.bak"
      ((count++))
    else
      echo "❌ Error updating $file, restoring backup"
      mv "$file.bak" "$file"
    fi
  fi
done

echo "✅ Updated $count files to use captureError"
echo ""
echo "📋 Summary of changes:"
echo "- permanentLogger.error() → permanentLogger.captureError()"
echo "- logger.error() → logger.captureError()"
echo "- Error details now captured in breadcrumb trail"
echo "- Full error context preserved for debugging"