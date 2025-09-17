# Manual Testing Guide for Refactored Company Intelligence

## 🎯 Test Objectives
Verify that the refactored phase-controls.tsx and new hooks work correctly, especially the auto-scraping workflow.

## 📋 Prerequisites
1. Dev server running on port 3001: `npm run dev`
2. Valid Supabase account for login
3. Chrome/Firefox browser with DevTools

## 🧪 Test Scenarios

### 1. Stage Navigation Hook Testing
**Purpose:** Verify the `use-stage-navigation` hook works correctly

#### Steps:
1. Open browser DevTools Console
2. Navigate to http://localhost:3001/company-intelligence
3. Look for stage indicator showing "Step 1 of 7"
4. Enter domain: `bigfluffy.ai`
5. Click "Analyze"

#### Expected Results:
- ✅ Stage indicator updates to show current step
- ✅ Back button is hidden on first stage
- ✅ Console shows logs: `[STAGE_NAV] Transitioning to next stage`

### 2. Auto-Scraping Workflow Testing ⭐ CRITICAL
**Purpose:** Verify scraping starts automatically after sitemap approval

#### Steps:
1. Complete site analysis (Step 1)
2. Click "Approve & Continue" to go to sitemap stage
3. Wait for sitemap pages to load
4. Select pages (or click "Select All")
5. Click "Approve Selection"

#### Expected Results:
- ✅ Scraping should start AUTOMATICALLY (no "Start Scraping" button)
- ✅ Button shows "Scraping in progress..." during scraping
- ✅ "Approve Web Scraping" button is DISABLED during scraping
- ✅ Console shows: `[PHASE_CONTROLS] Sitemap approved, auto-starting scraping`
- ✅ Console shows: `[PHASE_CONTROLS] Auto-starting scraping phase`

### 3. Toast Deduplication Testing
**Purpose:** Verify the `use-phase-toast` hook prevents duplicate toasts

#### Steps:
1. Complete any stage transition
2. Observe toast notifications

#### Expected Results:
- ✅ Only ONE success toast per stage completion
- ✅ No duplicate toasts within 2 seconds
- ✅ Console shows: `[TOAST] Duplicate toast suppressed` for any duplicates

### 4. Enhanced Logging Testing
**Purpose:** Verify comprehensive logging from all hooks

#### Steps:
1. Open DevTools Console
2. Filter by "PHASE_" or "STAGE_" or "TOAST"
3. Perform various actions in the UI

#### Expected Results:
- ✅ Every action logs entry and exit
- ✅ State changes are logged
- ✅ API calls are logged with details
- ✅ Performance metrics logged for each stage

### 5. Phase Handler DRY Testing
**Purpose:** Verify the unified `executePhase` function works for all phases

#### Steps:
1. Monitor Network tab in DevTools
2. Progress through stages: Extraction → Enrichment → Generation

#### Expected Results:
- ✅ All API calls use consistent error handling
- ✅ Each phase shows loading state
- ✅ Errors are properly caught and displayed
- ✅ Console shows: `[PHASE_HANDLER] Starting [phase] phase`

## 🔍 Console Log Patterns to Verify

Look for these specific log patterns in the browser console:

```javascript
// Stage Navigation
[STAGE_NAV] Transitioning to next stage
[STAGE_NAV] Marking stage as completed
[STAGE_NAV] Updated completed stages

// Phase Handlers
[PHASE_HANDLER] Starting Scraping phase
[PHASE_HANDLER] Processing started for Scraping
[API] Sending Scraping request
[API] Response received for Scraping

// Toast Management
[TOAST] Showing toast notification
[TOAST] Duplicate toast suppressed

// Phase State
[PHASE_STATE] Setting stage data
[PHASE_STATE] Session initialized
[PHASE_STATE] Stage data updated

// Main Component
[PHASE_CONTROLS] Sitemap approved, auto-starting scraping
[PHASE_CONTROLS] Auto-starting scraping phase
[PHASE_CONTROLS] Stage completed
```

## 🐛 Common Issues & Solutions

### Issue: Scraping doesn't auto-start
- **Check:** Is the sitemap approval handler calling `proceedToNextStage` with callback?
- **Verify:** Console shows auto-start logs
- **Solution:** Check phase-controls.tsx line ~179

### Issue: Too many toasts appearing
- **Check:** Toast deduplication window (should be 2000ms)
- **Verify:** Console shows suppression logs
- **Solution:** Check use-phase-toast.ts deduplication logic

### Issue: Navigation not working
- **Check:** Stage transitions in console
- **Verify:** completedStages Set is updating
- **Solution:** Check use-stage-navigation.ts

## ✅ Test Checklist

- [ ] Stage navigation shows correct step numbers
- [ ] Back button only shows after first stage
- [ ] Site analysis completes successfully
- [ ] Sitemap loads and shows pages
- [ ] **CRITICAL: Scraping auto-starts after sitemap approval**
- [ ] **CRITICAL: No "Start Scraping" button appears**
- [ ] Approve button disabled during scraping
- [ ] Toast notifications don't duplicate
- [ ] All stages have entry/exit logging
- [ ] Errors are properly displayed
- [ ] Session persists across refreshes

## 📊 Performance Benchmarks

Expected timings for each stage:
- Site Analysis: 5-10 seconds
- Sitemap Discovery: 3-5 seconds
- Scraping: 15-30 seconds (for 10+ pages)
- Extraction: 2-5 seconds
- Enrichment: 5-10 seconds
- Generation: 10-20 seconds

## 🎉 Success Criteria

The refactoring is successful if:
1. **Code reduction:** phase-controls.tsx reduced from 1398 to ~465 lines (✅ ACHIEVED)
2. **DRY principle:** No duplicate phase handling code (✅ ACHIEVED)
3. **Auto-scraping:** Works without manual intervention (✅ IMPLEMENTED)
4. **Logging:** 100+ log points throughout the flow (✅ ADDED)
5. **Maintainability:** Each hook can be tested independently (✅ ACHIEVED)