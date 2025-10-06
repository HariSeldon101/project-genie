# Project Genie - Data Storage and Retrieval Audit

**Date:** 2025-01-06
**Purpose:** Document what data is stored in database vs. what's used by document generator
**Issue:** Production error "Cannot read properties of undefined (reading 'info')"

---

## Data Flow Overview

```
User Wizard → SessionStorage → Database → Reconstruct → API → Generator
```

---

## 1. WIZARD INPUT (What user provides)

### Interface: `ProjectData` (in `app/(dashboard)/projects/new/page.tsx`)

```typescript
interface ProjectData {
  // Basic Info
  name: string
  description: string
  vision: string
  businessCase: string

  // Methodology
  methodology: 'agile' | 'prince2' | 'hybrid'

  // Company Info
  companyWebsite: string
  sector: string

  // Financial & Timeline
  budget: string
  timeline: string
  startDate: string
  endDate: string

  // People
  stakeholders: Stakeholder[]
  prince2Stakeholders?: {
    seniorUser: Stakeholder
    seniorSupplier: Stakeholder
    executive: Stakeholder
  }

  // Hybrid Settings
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}
```

---

## 2. DATABASE STORAGE (What gets saved)

### Table: `projects`

**Top-level columns:**
```sql
- id (uuid)
- name (text)
- description (text)
- vision (text)
- business_case (text)
- methodology_type (text)
- owner_id (uuid)
- rag_status (text)
- status (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**JSON column: `company_info`**
```json
{
  "website": "string",
  "sector": "string",
  "budget": "string",
  "budgetNumeric": number,
  "timeline": "string",
  "startDate": "string",
  "endDate": "string"
}
```

### Table: `stakeholders`

```sql
- id (uuid)
- project_id (uuid)
- name (text)
- email (text)
- role (text)
```

---

## 3. DATA LOSS ANALYSIS

### ⚠️ DATA LOST IN DATABASE (Not Stored):

1. **`agilometer` settings** (Hybrid methodology)
   - flexibility
   - teamExperience
   - riskTolerance
   - documentation
   - governance
   - **Impact:** Hybrid projects cannot be fully reconstructed
   - **Status:** ❌ LOST

2. **`prince2Stakeholders` distinction**
   - All stakeholders stored in same table with `role` field
   - No way to distinguish seniorUser/seniorSupplier/executive
   - **Impact:** PRINCE2 role hierarchy lost
   - **Status:** ⚠️ PARTIALLY LOST (stored as generic stakeholders)

### ✅ DATA PRESERVED IN DATABASE:

1. Basic project info (name, description, vision, business case)
2. Methodology type
3. Company website and sector
4. Budget (both string and numeric)
5. Timeline and dates
6. Stakeholder names, emails, and roles

---

## 4. CURRENT RECONSTRUCTION (What's broken)

### File: `app/(dashboard)/projects/[id]/generate/page.tsx` (lines 51-77)

**What it does:**
```typescript
const reconstructedData = {
  name: projectRecord.name,
  description: projectRecord.description,
  vision: projectRecord.vision,
  businessCase: projectRecord.business_case,
  methodology: projectRecord.methodology_type,
  companyWebsite: companyInfo.website || '',
  sector: companyInfo.sector || '',
  budget: companyInfo.budget || '',
  timeline: companyInfo.timeline || '',
  startDate: companyInfo.startDate || '',
  endDate: companyInfo.endDate || '',
  stakeholders: stakeholders?.map(s => ({
    name: s.name,
    email: s.email || '',
    title: s.role || ''
  })) || []
}
```

**What's missing:**
- ❌ No `agilometer` data
- ❌ No `prince2Stakeholders` structure

---

## 5. WHAT DOCUMENT GENERATOR EXPECTS

### From API logs (lines 104-114 in `app/api/generate/route.ts`):

```typescript
// API expects these fields:
projectData.name
projectData.methodology
projectData.budget
projectData.timeline
projectData.startDate
projectData.endDate
projectData.stakeholders.length
```

### From Generator (lib/documents/generator.ts):

The generator uses `SanitizedProjectData` which expects:
- All basic fields
- `stakeholders` array
- `agilometer` for hybrid methodology
- `sector` for industry context
- `companyWebsite` for research

---

## 6. THE BUG

**Suspected Location:** Somewhere in the code is accessing:
```typescript
projectData.info.website  // ❌ FAILS
// Should be:
projectData.companyWebsite  // ✅ CORRECT
```

**Why it works locally:**
- SessionStorage has fresh wizard data with correct structure
- Database reconstruction doesn't run

**Why it fails in production:**
- SessionStorage cleared/unavailable
- Database reconstruction runs with different structure
- Something expects `.info` property

---

## 7. RECOMMENDED FIXES

### Priority 1: Fix Data Contract ✅
Create unified `ProjectDataSchema` interface and mapper function

### Priority 2: Fix Database Schema (Future) ⚠️
Add columns to `projects` table:
```sql
ALTER TABLE projects ADD COLUMN agilometer JSONB;
ALTER TABLE projects ADD COLUMN prince2_roles JSONB;
```

### Priority 3: Add Validation 📋
TypeScript strict typing to prevent property access errors

---

## 8. IMPACT ASSESSMENT

### Current State:
- ✅ Agile projects: Work fine (no special data needed)
- ⚠️ PRINCE2 projects: Work but lose role hierarchy
- ❌ Hybrid projects: BROKEN (missing agilometer data)

### After Fix:
- ✅ All methodologies work
- ⚠️ Historical projects still missing agilometer/prince2 data
- ✅ New projects preserve all data

---

## Conclusion

**Data Currently Lost:**
1. Agilometer settings (Hybrid methodology)
2. PRINCE2 stakeholder role hierarchy

**Root Cause of Bug:**
Mismatch between wizard data structure and database reconstruction

**Solution:**
Implement proper data mapper with fallbacks for missing fields
