#!/bin/bash

#################################################
# Legacy Code Archival Script
# Date: September 21, 2025
# Purpose: Archive deprecated code with git history
#
# This script archives legacy code that has been marked
# for deletion as part of the Progressive Scraping Architecture
# migration. All files are moved with git history preserved.
#################################################

echo "======================================"
echo "Legacy Code Archival Script"
echo "Date: $(date)"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for tracking
MOVED_COUNT=0
FAILED_COUNT=0

# Create archive directories if they don't exist
echo -e "${YELLOW}Creating archive directories...${NC}"
mkdir -p archive/lib/company-intelligence/utils
mkdir -p archive/lib/company-intelligence/scrapers/executors
mkdir -p archive/lib/company-intelligence/services
mkdir -p archive/lib/company-intelligence/storage
mkdir -p archive/lib/notifications/utils
mkdir -p archive/components/company-intelligence
mkdir -p archive/api/company-intelligence

echo -e "${GREEN}✓ Archive directories created${NC}"
echo ""

# Function to move file with git history
move_file_with_history() {
  local source=$1
  local destination=$2

  if [ -f "$source" ]; then
    echo -e "${YELLOW}Moving: $source${NC}"
    echo -e "    To: $destination"

    # Use git mv to preserve history
    if git mv "$source" "$destination" 2>/dev/null; then
      echo -e "${GREEN}    ✓ Moved successfully${NC}"
      ((MOVED_COUNT++))
    else
      # If git mv fails, try regular mv
      if mv "$source" "$destination" 2>/dev/null; then
        git add "$destination"
        git rm "$source" 2>/dev/null
        echo -e "${GREEN}    ✓ Moved (without git history)${NC}"
        ((MOVED_COUNT++))
      else
        echo -e "${RED}    ✗ Failed to move${NC}"
        ((FAILED_COUNT++))
      fi
    fi
  else
    echo -e "${YELLOW}Skipping (not found): $source${NC}"
  fi
  echo ""
}

echo "======================================"
echo "PHASE 1: Archive Event System Files"
echo "======================================"
echo ""

# SSE Event Factory - Primary deprecated file
move_file_with_history \
  "lib/company-intelligence/utils/sse-event-factory.ts" \
  "archive/lib/company-intelligence/utils/sse-event-factory.ts"

# Old notification event factory
move_file_with_history \
  "lib/notifications/utils/event-factory.ts" \
  "archive/lib/notifications/utils/event-factory.ts"

echo "======================================"
echo "PHASE 2: Archive Service Files"
echo "======================================"
echo ""

# Scraping stream service (uses old SSE)
move_file_with_history \
  "lib/company-intelligence/services/scraping-stream-service.ts" \
  "archive/lib/company-intelligence/services/scraping-stream-service.ts"

# Scraping state service (deprecated pattern)
move_file_with_history \
  "lib/company-intelligence/services/scraping-state-service.ts" \
  "archive/lib/company-intelligence/services/scraping-state-service.ts"

echo "======================================"
echo "PHASE 3: Archive Storage Files"
echo "======================================"
echo ""

# Pack store (legacy storage pattern)
move_file_with_history \
  "lib/company-intelligence/storage/pack-store.ts" \
  "archive/lib/company-intelligence/storage/pack-store.ts"

# Client pack store
move_file_with_history \
  "lib/company-intelligence/storage/client-pack-store.ts" \
  "archive/lib/company-intelligence/storage/client-pack-store.ts"

echo "======================================"
echo "PHASE 4: Archive Utility Files"
echo "======================================"
echo ""

# State synchronizer (no longer needed with repository)
move_file_with_history \
  "lib/company-intelligence/utils/state-synchronizer.ts" \
  "archive/lib/company-intelligence/utils/state-synchronizer.ts"

echo "======================================"
echo "PHASE 5: Archive UI Components"
echo "======================================"
echo ""

# Sitemap selector simple (if exists)
move_file_with_history \
  "components/company-intelligence/sitemap-selector-simple.tsx" \
  "archive/components/company-intelligence/sitemap-selector-simple.tsx"

# Sitemap tree (if exists)
move_file_with_history \
  "components/company-intelligence/sitemap-tree.tsx" \
  "archive/components/company-intelligence/sitemap-tree.tsx"

echo "======================================"
echo "PHASE 6: Archive Executor Files"
echo "======================================"
echo ""

# Legacy scraper executors
for file in lib/company-intelligence/scrapers/executors/*.ts; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    move_file_with_history "$file" "archive/lib/company-intelligence/scrapers/executors/$filename"
  fi
done

echo "======================================"
echo "SUMMARY"
echo "======================================"
echo -e "${GREEN}✓ Files moved successfully: $MOVED_COUNT${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
  echo -e "${RED}✗ Files failed to move: $FAILED_COUNT${NC}"
fi
echo ""

# Check for any remaining references to archived files
echo "======================================"
echo "VERIFICATION: Checking for references"
echo "======================================"
echo ""

echo "Checking for imports of SSEEventFactory..."
REFS=$(grep -r "from.*sse-event-factory" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "archive/" | grep -v "node_modules/" | wc -l)
if [ $REFS -gt 0 ]; then
  echo -e "${RED}⚠ WARNING: Found $REFS references to sse-event-factory${NC}"
  echo "  Run: grep -r 'from.*sse-event-factory' --include='*.ts' --include='*.tsx' . | grep -v 'archive/'"
else
  echo -e "${GREEN}✓ No references to sse-event-factory found${NC}"
fi

echo ""
echo "Checking for createSession usage..."
REFS=$(grep -r "\.createSession(" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "archive/" | grep -v "node_modules/" | grep -v "getOrCreate" | wc -l)
if [ $REFS -gt 0 ]; then
  echo -e "${RED}⚠ WARNING: Found $REFS uses of createSession()${NC}"
  echo "  These should be updated to getOrCreateUserSession()"
else
  echo -e "${GREEN}✓ No createSession() usage found${NC}"
fi

echo ""
echo "======================================"
echo "NEXT STEPS"
echo "======================================"
echo ""
echo "1. Review the moved files:"
echo "   git status"
echo ""
echo "2. Update any remaining imports to use new patterns:"
echo "   - EventFactory from @/lib/realtime-events"
echo "   - CompanyIntelligenceRepository for DB access"
echo ""
echo "3. Commit the archival:"
echo "   git add ."
echo "   git commit -m 'Archive legacy code marked for deletion'"
echo ""
echo "4. Update PROJECT_MANIFEST.json to reflect changes"
echo ""
echo "Script completed at: $(date)"