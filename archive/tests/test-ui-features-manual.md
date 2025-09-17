# Manual UI Testing Guide for New Features

## Test Date: September 7, 2025

### Prerequisites
- App running at http://localhost:3001
- Logged in as test@bigfluffy.ai or stusandboxacc@gmail.com

## Features to Test Manually

### 1. SSE Streaming for Incremental Updates
**Steps:**
1. Open Company Intelligence page
2. Enter domain: bigfluffy.ai
3. Press Enter to start discovery
4. Open Browser DevTools → Network tab
5. Look for fetch-sitemap request

**Expected Results:**
- ✅ Request header should include: `Accept: text/event-stream`
- ✅ TreeView should update incrementally as pages are discovered
- ✅ Should see phases: checking-sitemap → homepage-crawl → pattern-discovery → blog-crawl → validation

### 2. Validation Phase Visual Feedback
**Steps:**
1. Start sitemap discovery
2. Watch for "Validation" phase

**Expected Results:**
- ✅ Should see spinner with animate-spin class
- ✅ Should display "Validating X discovered pages..." message
- ✅ Should show "Validation complete!" notification when done

### 3. Filter Button Functionality
**Steps:**
1. Wait for TreeView to populate
2. Click "Blog" filter chip
3. Click "Services" filter chip
4. Click "About" filter chip

**Expected Results:**
- ✅ Blog chip should select all blog posts
- ✅ Services chip should select all service pages
- ✅ About chip should select all about/team pages
- ✅ Each click should show toast notification with count

### 4. PersistentToast Notifications
**Steps:**
1. Start discovery process
2. Watch for notifications during each phase

**Expected Results:**
- ✅ "Looking for sitemap.xml and robots.txt..." (info)
- ✅ "Found X pages in sitemap.xml" (success)
- ✅ "Discovered X new pages from homepage" (success)
- ✅ "Found X pages via pattern matching" (success)
- ✅ "Found X blog articles" (success)
- ✅ "Validation complete! X unique pages ready" (success)

### 5. Tooltip Presence
**Steps:**
1. Hover over various UI elements
2. Check for tooltips

**Expected Results:**
- ✅ All buttons should have descriptive tooltips
- ✅ Filter chips should have tooltips explaining their function
- ✅ TreeView controls (Select All, Deselect All) should have tooltips
- ✅ Confirm Selection button should have tooltip

## Current Status

Based on the server logs:
- ✅ App is running successfully at http://localhost:3001
- ✅ fetch-sitemap API is compiled and responding (200 status)
- ✅ Multiple successful fetches completed (25-31 seconds each)
- ✅ Site analysis API is working
- ✅ Authentication is working (test@bigfluffy.ai logged in)

## Known Issues
- Email notifications failing (API key invalid) - not critical for UI testing
- Tests looking for data-testid attributes that may not exist
- Need to verify if SSE streaming is actually being used (check Accept header)

## Next Steps
1. Manually verify each feature in the browser
2. Check browser console for any errors
3. Verify network tab shows SSE streaming
4. Confirm all tooltips are present
5. Test filter buttons actually select pages

## Test Commands Available
```bash
# Run comprehensive UI test
npm run test:ui

# Run manual test mode
npm run test:ui:manual

# Run Playwright E2E tests
npm run test:e2e

# Open Playwright UI
npm run test:e2e:ui
```