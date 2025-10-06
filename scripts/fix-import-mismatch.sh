#!/bin/bash

# Fix import mismatch in all API routes
# Changes createServerClient to createClient

echo "🔧 Fixing import mismatches in API routes..."
echo "========================================"
echo ""

# List of files to fix (excluding the already fixed profile/route.ts)
FILES=(
  "app/api/analytics/route.ts"
  "app/api/artifacts/route.ts"
  "app/api/auth/user/route.ts"
  "app/api/bugs/route.ts"
  "app/api/bugs/[id]/route.ts"
  "app/api/company-intelligence/stage-review/route.ts"
  "app/api/export/[format]/route.ts"
  "app/api/fix-profile/route.ts"
  "app/api/profile/avatar/route.ts"
  "app/api/projects/[id]/full/route.ts"
  "app/api/stripe/checkout/route.ts"
  "app/api/team/route.ts"
  "app/api/team/[id]/route.ts"
)

# Counter for tracking
FIXED=0
ERRORS=0

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "📝 Fixing: $FILE"

    # Replace the import statement
    sed -i '' "s/import { createServerClient } from '@\/lib\/supabase\/server'/import { createClient } from '@\/lib\/supabase\/server'/g" "$FILE"

    # Replace all function calls
    sed -i '' "s/await createServerClient()/await createClient()/g" "$FILE"
    sed -i '' "s/= createServerClient()/= createClient()/g" "$FILE"

    if [ $? -eq 0 ]; then
      echo "   ✅ Fixed successfully"
      ((FIXED++))
    else
      echo "   ❌ Error fixing file"
      ((ERRORS++))
    fi
  else
    echo "⚠️  File not found: $FILE"
    ((ERRORS++))
  fi
  echo ""
done

echo "========================================"
echo "📊 Summary:"
echo "   ✅ Fixed: $FIXED files"
if [ $ERRORS -gt 0 ]; then
  echo "   ❌ Errors: $ERRORS files"
fi
echo "========================================"
echo ""
echo "🎯 Next step: Test the API endpoints to verify they work"