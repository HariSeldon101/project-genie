#!/bin/bash

# Script to update all SSEEventFactory imports to use the new unified EventFactory

echo "Updating EventFactory imports..."

# Files to update
files=(
  "lib/company-intelligence/services/scraping-stream-service.ts"
  "lib/company-intelligence/utils/sse-stream-manager.ts"
  "lib/company-intelligence/scrapers/executors/base-executor.ts"
  "lib/company-intelligence/scrapers/executors/static-executor.ts"
  "lib/company-intelligence/scrapers/executors/dynamic-executor.ts"
  "lib/company-intelligence/core/unified-scraper-executor.ts"
  "app/api/logs/stream/route.ts"
  "app/api/company-intelligence/scraping/execute/route.ts"
)

for file in "${files[@]}"; do
  echo "Updating: $file"

  # Replace SSEEventFactory imports with EventFactory
  sed -i '' "s/import { SSEEventFactory.*/import { EventFactory } from '@\/lib\/realtime-events'/g" "$file"
  sed -i '' "s/import { SSEEventFactory, EventType, EventSource }.*/import { EventFactory, EventType, EventSource } from '@\/lib\/realtime-events'/g" "$file"
  sed -i '' "s/import { SSEEventFactory, EventSource }.*/import { EventFactory } from '@\/lib\/realtime-events'/g" "$file"

  # Replace SSEEventFactory usage with EventFactory
  sed -i '' "s/SSEEventFactory\./EventFactory\./g" "$file"
done

echo "Import updates complete!"