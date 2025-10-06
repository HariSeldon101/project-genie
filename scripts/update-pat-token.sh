#!/bin/bash

# Update PAT Token Script
# Updates all occurrences of the old PAT token with the new one
# Date: 2025-02-04

OLD_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"
NEW_TOKEN="sbp_ce8146f94e3403eca0a088896812e9bbbf08929b"

echo "🔄 Updating PAT token across all files..."
echo "Old token: $OLD_TOKEN"
echo "New token: $NEW_TOKEN"
echo ""

# Find all files containing the old token and update them
FILES=$(grep -rl "$OLD_TOKEN" .)

if [ -z "$FILES" ]; then
    echo "✅ No files found with the old token"
    exit 0
fi

# Count files
FILE_COUNT=$(echo "$FILES" | wc -l)
echo "📁 Found $FILE_COUNT files to update:"
echo "$FILES"
echo ""

# Update each file
for file in $FILES; do
    echo "Updating: $file"
    # Use sed with backup for safety
    sed -i.bak "s/$OLD_TOKEN/$NEW_TOKEN/g" "$file"

    # Remove backup file if update was successful
    if [ $? -eq 0 ]; then
        rm "${file}.bak"
        echo "  ✅ Updated successfully"
    else
        echo "  ❌ Failed to update"
    fi
done

echo ""
echo "🎉 PAT token update complete!"

# Verify no old tokens remain
REMAINING=$(grep -rl "$OLD_TOKEN" .)
if [ -z "$REMAINING" ]; then
    echo "✅ Verified: No old tokens remaining"
else
    echo "⚠️  Warning: Old token still found in:"
    echo "$REMAINING"
fi