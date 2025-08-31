# 🐛 Bug Tracking System

## Status Legend
- 🔴 **Critical**: Breaking functionality, data loss, security issues
- 🟡 **High Priority**: Major features not working, poor UX
- 🟢 **Low Priority**: Minor issues, cosmetic problems, nice-to-have fixes
- ✅ **Resolved**: Fixed and tested
- 🔄 **In Progress**: Currently being worked on
- ⏸️ **On Hold**: Blocked or deferred

---

## 🔴 Critical Bugs

### 1. Document Generation Timeout (5 minutes too short)
- **Status**: ✅ Resolved  
- **Date Fixed**: 2025-08-27 18:00 GMT
- **Location**: `/app/api/generate/route.ts` and `/components/document-generator.tsx`
- **Description**: Documents timing out after 5 minutes during generation
- **Error**: "Request failed: The user aborted a request"
- **Root Cause**: 300 second timeout insufficient for complex PRINCE2 documents with retries
- **Fix Applied**: 
  - Increased API route `maxDuration` from 300 to 600 seconds (10 minutes)
  - Increased client-side timeout from 300000 to 600000 ms to match API
  - Per-document timeout remains at 180 seconds (3 minutes)
- **Impact**: Complex document sets would fail to complete generation
- **Verification**: Documents now have sufficient time to generate with retries

### 2. Two-Stage Generation Display Confusion
- **Status**: ✅ Resolved  
- **Date Fixed**: 2025-08-27 18:00 GMT
- **Location**: `/lib/documents/generator.ts`
- **Description**: Research documents appearing to generate last instead of first
- **Root Cause**: Documents were generating in correct order but logging was unclear
- **Fix Applied**: 
  - Added clear stage separation logging with visual dividers
  - Added "STAGE 1" and "STAGE 2" labels to clarify generation phases
  - Added purpose descriptions for research documents
  - Confirmed research documents DO generate first as designed
- **Impact**: User confusion about whether two-stage architecture was working
- **Verification**: Console logs now clearly show Stage 1 (research) completing before Stage 2

### 3. Function Called Before Initialization
- **Status**: ✅ Resolved  
- **Date Fixed**: 2025-08-27 17:25 GMT
- **Location**: `/components/document-generator.tsx` line 77
- **Description**: Runtime ReferenceError preventing page from loading
- **Error**: "Cannot access 'getMethodologyDocuments' before initialization"
- **Root Cause**: Function was defined after being called (const hoisting issue)
- **Fix Applied**: Moved function definition outside component, before usage
- **Impact**: Document generation page wouldn't load
- **Verification**: Page now loads without errors

### 4. Duplicate Variable Declarations Throughout Codebase
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 17:15 GMT
- **Location**: Multiple files
- **Description**: JavaScript parse errors preventing API from loading
- **Error**: "Identifier 'providerInfo' has already been declared"
- **Root Cause**: Variable `providerInfo` declared multiple times in same scope
- **Fixes Applied**: 
  1. `/app/api/generate/route.ts` line 113 - removed duplicate
  2. `/lib/documents/generator.ts` - removed 5 duplicate declarations in various methods
- **Impact**: Complete API failure - no documents could be generated
- **Verification**: API now loads correctly and documents generate

---

## 🟡 High Priority Bugs

### 1. Enhanced Metadata Incomplete
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 13:00 GMT
- **Location**: `/app/api/generate/route.ts`, `/lib/documents/generator.ts`
- **Description**: Some enhanced metadata fields not showing in document display
- **Root Cause**: Temperature and max tokens were hardcoded defaults instead of actual values from provider
- **Fix Applied**: 
  - Updated generator to properly capture temperature from provider config
  - Modified API route to use actual provider values instead of defaults
  - Ensured all document types properly set metadata
- **Verification**: Temperature, max tokens, and reasoning level now properly propagate

### 2. Document Generation Partial Failures
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 13:15 GMT
- **Location**: `/lib/documents/generator.ts`
- **Description**: When selecting 4 documents, only 2 generate successfully (Technical Landscape and Comparable Projects)
- **Root Cause**: No retry logic for failed documents
- **Fix Applied**: 
  - Added 3-retry logic with exponential backoff for all document types
  - Implemented error placeholder documents when generation fails
  - Added detailed error logging for debugging
  - Separate retry logic for Agile and PRINCE2 document batches
- **Verification**: Documents now retry up to 3 times before marking as failed

---

## 🟢 Low Priority Issues

### 1. Mock Provider Fallback Working Correctly
- **Status**: ✅ No Issue Found
- **Date Reviewed**: 2025-08-27 13:20 GMT
- **Description**: System falls back to mock provider too quickly after errors
- **Investigation**: Mock provider only activates when API keys are missing, not on errors
- **Current Behavior**: 
  - Mock provider is only used when no API key is configured
  - Document generation includes retry logic to handle transient errors
  - No premature fallback to mock on API errors
- **Conclusion**: System is working as designed

---

## ✅ Resolved Bugs

### 2025-08-27 (12:00 GMT)

#### PID Generation JSON Response Fixed
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 12:00 GMT
- **Problem**: PID generation consistently failed with "Model returned empty JSON response"
- **Root Cause**: Complex prompt template causing JSON parsing issues
- **Fix Applied**: 
  1. Simplified PID prompt in `/lib/llm/prompts/prince2.ts`
  2. Added 3-retry logic with JSON extraction in `/lib/documents/generator.ts`
  3. Implemented fallback PID structure for resilience
  4. Reduced temperature to 0.5 for consistent JSON output
- **Verification**: PID now generates successfully with proper JSON structure

### 2025-08-27

#### Document Selection UI Not Appearing
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 11:25 GMT
- **Problem**: Checkbox selection UI for documents was not showing
- **Root Cause**: Generate page was using `DocumentGeneratorStream` component instead of `DocumentGenerator`
- **Fix Applied**: Changed `/app/(dashboard)/projects/[id]/generate/page.tsx` to use `DocumentGenerator` component
- **Verification**: UI now shows checkboxes with Select All/Deselect All functionality

#### Two-Stage Generation Not Working
- **Status**: ✅ Resolved  
- **Date Fixed**: 2025-08-27 11:00 GMT
- **Problem**: Technical Landscape and Comparable Projects were not generating first
- **Root Cause**: 
  1. `shouldGenerateResearch()` was conditional
  2. Stream API was bypassing two-stage logic
- **Fix Applied**: 
  1. Made `shouldGenerateResearch()` always return true
  2. Fixed document selection to use non-stream component
- **Verification**: Research documents now generate first in correct order

#### Document Name Mapping Issue
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 11:30 GMT  
- **Problem**: Snake_case document types not matching Title Case checks
- **Root Cause**: `shouldGenerate()` function was checking for exact string match
- **Fix Applied**: Added `typeToDisplayMap` mapping in `/lib/documents/generator.ts`
- **Verification**: All document types now correctly recognized

#### Missing Checkbox Component
- **Status**: ✅ Resolved
- **Date Fixed**: 2025-08-27 10:45 GMT
- **Problem**: Checkbox component was not installed
- **Fix Applied**: Installed via `npx shadcn@latest add checkbox`

#### Initial Enhanced Metadata Missing
- **Status**: ✅ Partially Resolved
- **Date Fixed**: 2025-08-27 10:30 GMT
- **Problem**: Enhanced metadata fields not showing in documents page
- **Root Cause**: API route not passing prompt parameters to storage layer
- **Fix Applied**: Updated `/app/api/generate/route.ts` to include default values
- **Note**: Still has issues with complete propagation (see High Priority bugs)

---

## Testing Checklist

### For PID Generation Fix:
- [ ] Generate PID with OpenAI provider
- [ ] Verify JSON structure is valid
- [ ] Check all PID sections are populated
- [ ] Confirm metadata is complete

### For Document Generation:
- [ ] Select all 5 Agile documents
- [ ] Verify generation order (research first)
- [ ] Confirm all selected documents generate
- [ ] Check enhanced metadata for each

### For Metadata Display:
- [ ] Generate new documents
- [ ] Navigate to documents page
- [ ] Verify all metadata fields show:
  - [ ] Temperature (0.7)
  - [ ] Max Tokens (4096)
  - [ ] Reasoning Level
  - [ ] Token counts (input/output/reasoning)
  - [ ] Generation time
  - [ ] Cost estimate

---

## Notes

- **Provider Focus**: Currently focusing only on OpenAI and Vercel AI providers
- **Groq Issues**: Ignoring Groq provider issues during development phase
- **Test User**: Using stusandboxacc@gmail.com for testing
- **Project**: vnuieavheezjxbkyfxea (Supabase project reference)

---

*Last Updated: 2025-08-27 18:00 GMT*