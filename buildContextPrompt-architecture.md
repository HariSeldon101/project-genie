# BuildContextPrompt Architecture Report
## Complete Data Flow from Wizard to LLM API

### Executive Summary
This report documents the complete data flow architecture from user input in the project wizard through database storage to LLM prompt generation. A critical issue has been identified where **budget, timeline, startDate, and endDate fields are being lost** during the sanitization process, affecting ALL document generation.

---

## 1. Data Collection Phase (Wizard)

### 1.1 User Input Fields Collected
Location: `/app/(dashboard)/projects/new/page.tsx`

The wizard collects the following data in the `ProjectData` interface:

```typescript
interface ProjectData {
  // Core Project Information
  name: string                    // ✅ Makes it to LLM
  description: string              // ✅ Makes it to LLM
  vision: string                   // ✅ Makes it to LLM
  businessCase: string             // ✅ Makes it to LLM
  methodology: 'agile' | 'prince2' | 'hybrid'  // ✅ Makes it to LLM
  
  // Company Information
  companyWebsite: string           // ✅ Makes it to LLM
  sector: string                   // ✅ Makes it to LLM
  
  // Project Timeline & Budget
  budget: string                   // ❌ LOST during sanitization
  timeline: string                 // ❌ LOST during sanitization
  startDate: string                // ❌ LOST during sanitization
  endDate: string                  // ❌ LOST during sanitization
  
  // Stakeholders
  stakeholders: Stakeholder[]      // ✅ Makes it to LLM (as placeholders)
  prince2Stakeholders?: {          // ✅ Makes it to LLM (as placeholders)
    seniorUser: Stakeholder
    seniorSupplier: Stakeholder
    executive: Stakeholder
  }
  
  // Hybrid Methodology
  agilometer?: {                   // ✅ Makes it to LLM
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}
```

### 1.2 Wizard Steps
The wizard collects data through these steps:
1. **Methodology Selection** - Also collects company website and sector
2. **Project Details** - Name, vision, business case, description
3. **Project Timeline** - Budget, timeline, start date, end date
4. **Stakeholders** - General and PRINCE2-specific stakeholders
5. **Agilometer** (Hybrid only) - Balance between Agile and PRINCE2
6. **Review** - Document selection with required documents enforced

---

## 2. Database Storage Phase

### 2.1 Database Schema
Location: `/app/(dashboard)/projects/new/page.tsx` (lines 268-286)

Data is stored in the `projects` table with this structure:

```javascript
{
  name: projectData.name,
  description: projectData.description,
  vision: projectData.vision,
  business_case: projectData.businessCase,
  methodology_type: projectData.methodology,
  owner_id: user.id,
  rag_status: 'green',
  status: 'planning',
  company_info: {  // JSONB field
    website: projectData.companyWebsite,
    sector: projectData.sector,
    budget: projectData.budget,              // ✅ Stored
    budgetNumeric: parseBudgetString(...),   // ✅ Stored
    timeline: projectData.timeline,          // ✅ Stored
    startDate: projectData.startDate,        // ✅ Stored
    endDate: projectData.endDate            // ✅ Stored
  }
}
```

Stakeholders are stored separately in the `stakeholders` table.

### 2.2 Session Storage
Location: `/app/(dashboard)/projects/new/page.tsx` (line 366)

Project data is also temporarily stored in sessionStorage:
```javascript
sessionStorage.setItem(`project_data_${project.id}`, JSON.stringify(projectData))
```

---

## 3. Data Retrieval Phase

### 3.1 Document Generation Page
Location: `/app/(dashboard)/projects/[id]/generate/page.tsx`

Data is retrieved in two ways:

1. **From SessionStorage** (if available):
```javascript
const storedData = sessionStorage.getItem(`project_data_${projectId}`)
if (storedData) {
  setProjectData(JSON.parse(storedData))
}
```

2. **From Database** (if session storage unavailable):
```javascript
const companyInfo = projectRecord.company_info || {}
const reconstructedData = {
  name: projectRecord.name,
  description: projectRecord.description,
  vision: projectRecord.vision,
  businessCase: projectRecord.business_case,
  methodology: projectRecord.methodology_type,
  companyWebsite: companyInfo.website || '',
  sector: companyInfo.sector || '',
  budget: companyInfo.budget || '',        // ✅ Retrieved
  timeline: companyInfo.timeline || '',    // ✅ Retrieved
  startDate: companyInfo.startDate || '',  // ✅ Retrieved
  endDate: companyInfo.endDate || ''      // ✅ Retrieved
  // ... stakeholders
}
```

---

## 4. API Transmission Phase

### 4.1 Document Generator Component
Location: `/components/document-generator.tsx` (lines 217-224)

The data is sent to the API endpoint:
```javascript
body: JSON.stringify({
  projectId,
  projectData: {
    ...projectData  // ✅ Includes budget, timeline, startDate, endDate
  },
  selectedDocuments: Array.from(selectedDocuments)
})
```

### 4.2 API Route Handler
Location: `/app/api/generate/route.ts`

The API receives and logs the data:
```javascript
const { projectId, projectData, selectedDocuments } = await request.json()
console.log('[API] Received project data:', {
  budget: projectData.budget,      // ✅ Confirmed received
  timeline: projectData.timeline,  // ✅ Confirmed received
  startDate: projectData.startDate,// ✅ Confirmed received
  endDate: projectData.endDate,    // ✅ Confirmed received
})
```

---

## 5. Data Sanitization Phase ⚠️ **CRITICAL FAILURE POINT**

### 5.1 DataSanitizer Class
Location: `/lib/llm/sanitizer.ts`

**THIS IS WHERE DATA IS LOST!**

The sanitizer strips out critical fields:

```typescript
// Input interface MISSING fields
interface ProjectData {
  name: string
  vision: string
  businessCase: string
  description: string
  methodology: 'agile' | 'prince2' | 'hybrid'
  companyWebsite: string
  sector: string
  stakeholders: Array<{...}>
  prince2Stakeholders?: {...}
  agilometer?: {...}
  // ❌ MISSING: budget, timeline, startDate, endDate
}

// Output interface ALSO MISSING fields
export interface SanitizedProjectData {
  projectName: string
  vision: string
  businessCase: string
  description: string
  methodology: 'agile' | 'prince2' | 'hybrid'
  companyWebsite: string
  sector: string
  stakeholders: Array<{...}>
  prince2Stakeholders?: {...}
  agilometer?: {...}
  // ❌ MISSING: budget, timeline, startDate, endDate
}
```

The `sanitizeProjectData` function doesn't preserve these fields:
```typescript
return {
  projectName: this.removePII(projectData.name),
  vision: this.removePII(projectData.vision),
  businessCase: this.removePII(projectData.businessCase),
  description: this.removePII(projectData.description),
  methodology: projectData.methodology,
  companyWebsite: projectData.companyWebsite,
  sector: projectData.sector,
  stakeholders: [...],
  prince2Stakeholders: {...},
  agilometer: data.agilometer
  // ❌ NOT INCLUDING: budget, timeline, startDate, endDate
}
```

---

## 6. Document Generation Phase

### 6.1 Two-Stage Generation Process
Location: `/lib/documents/generator.ts`

The system uses a two-stage generation process for better context:

#### Stage 1: Research Documents (Always Generated First)
These documents are generated first to provide context for other documents:

1. **Technical Landscape Analysis**
   - Generated by: `generateTechnicalLandscape()`
   - Purpose: Industry technology context
   - Used by: All other documents for technical context

2. **Comparable Projects Analysis**
   - Generated by: `generateComparableProjects()`
   - Purpose: Learn from similar projects
   - Used by: All other documents for best practices

#### Stage 2: Methodology-Specific Documents
These documents are enhanced with research context from Stage 1:

**For Agile:**
- Project Charter
- Product Backlog
- Sprint Plan

**For PRINCE2:**
- Project Initiation Document (PID)
- Business Case
- Risk Register
- Project Plan

**For Hybrid:**
- Hybrid Charter
- Risk Register
- Product Backlog

### 6.2 Research Context Extraction
Location: `/lib/documents/two-stage-generator.ts`

```typescript
static extractResearchContext(
  techLandscape?: GeneratedDocument,
  comparableProjects?: GeneratedDocument
): ResearchContext {
  return {
    technicalConsiderations: [...],
    industryInsights: [...],
    bestPractices: [...],
    riskFactors: [...],
    successFactors: [...],
    recommendations: [...]
  }
}
```

---

## 7. Prompt Building Phase

### 7.1 buildContextPrompt Function
Location: `/lib/llm/gateway.ts` (lines 376-399)

This function replaces template placeholders with actual data:

```typescript
buildContextPrompt(
  templateSystem: string,
  templateUser: string,
  data: SanitizedProjectData
): LLMPrompt {
  const user = templateUser
    .replace('{{projectName}}', data.projectName)
    .replace('{{vision}}', data.vision)
    .replace('{{businessCase}}', data.businessCase)
    .replace('{{description}}', data.description)
    .replace('{{companyWebsite}}', data.companyWebsite)
    .replace('{{stakeholders}}', stakeholderList)
    // ❌ NOT REPLACING: {{budget}}, {{timeline}}, {{startDate}}, {{endDate}}
    // Because these fields don't exist in SanitizedProjectData
}
```

### 7.2 Document-Specific Prompt Building

#### Technical Landscape & Comparable Projects
These use their own prompt builders that COULD use the fields:

```typescript
// Technical Landscape (lib/documents/generator.ts:1806)
const promptData = {
  projectName: data.projectName,
  description: data.description,
  sector: data.sector,
  companyWebsite: data.companyWebsite,
  vision: data.vision
  // ❌ MISSING: budget, timeline, startDate, endDate
}

// The prompt template DOES support these fields:
// lib/llm/prompts/technical-landscape.ts:33-34
${params.budget ? `- Budget: ${params.budget}` : ''}
${params.timeline ? `- Timeline: ${params.timeline}` : ''}
```

#### Structured Documents (PID & Business Case)
Location: `/lib/documents/structured-generator.ts`

These build their own prompts but reference non-existent fields:
```typescript
// Line 585 - References field that doesn't exist!
`- Expected Timeline: ${data.expectedTimeline || '6-12 months'}`
```

---

## 8. LLM API Call Phase

### 8.1 API Call Flow

1. **Document Generator** calls appropriate generation method
2. **Generation method** builds prompt (missing key data)
3. **LLM Gateway** sends prompt to provider
4. **Provider** generates content with incomplete context
5. **Response** contains generic/hardcoded dates instead of user input

### 8.2 Hardcoded Values in Prompts
Due to missing data, documents contain hardcoded values:

- `/lib/llm/prompts/prince2.ts`: "Q1 2024", "Q4 2025"
- `/lib/documents/structured-generator.ts`: "Month 1", "Month 2"
- `/lib/llm/providers/mock.ts`: "2024-01-01", "2024-12-31"
- `/lib/llm/providers/groq.ts`: "2025-01-01", "2025-06-30"

---

## 9. Critical Issues Summary

### 9.1 Data Loss Points
1. **DataSanitizer** - Strips out budget, timeline, startDate, endDate
2. **buildContextPrompt** - Doesn't replace these placeholders
3. **promptData objects** - Don't include these fields
4. **Prompt templates** - Most don't have placeholders for these fields

### 9.2 Affected Documents
**ALL documents are affected:**
- ❌ Project Charter - No dates/budget in prompt
- ❌ Product Backlog - No timeline context
- ❌ Sprint Plan - Can't calculate sprint dates
- ❌ PID - Uses generic "Month 1", "Month 2"
- ❌ Business Case - No actual budget figures
- ❌ Risk Register - No timeline for risk planning
- ❌ Project Plan - Can't create accurate timeline
- ❌ Technical Landscape - Fields exist in template but data not passed
- ❌ Comparable Projects - Missing budget for comparison
- ❌ Communication Plan - No timeline for comms schedule
- ❌ Quality Management - No budget for quality measures

### 9.3 User Experience Impact
1. Documents show 2023-2024 dates instead of actual project dates
2. Budget information is missing from financial sections
3. Project stages use generic "Month 1" instead of actual dates
4. Timeline-dependent content is inaccurate
5. Users must manually edit all generated documents

---

## 10. Required Fixes

### 10.1 Immediate Fixes
1. Add missing fields to `SanitizedProjectData` interface
2. Update `DataSanitizer.sanitizeProjectData()` to preserve fields
3. Update `buildContextPrompt()` to replace these placeholders
4. Add placeholders to all prompt templates

### 10.2 Systematic Updates
1. Update all `promptData` objects in document generators
2. Remove all hardcoded dates from prompts and fallbacks
3. Calculate dates dynamically based on user input
4. Update formatters to use actual project dates

### 10.3 Validation Required
- Test with project dated 2026-2027
- Verify no 2023-2024 dates appear
- Confirm budget appears in financial sections
- Check timeline calculations are accurate

---

## Appendix A: File Modification List

Critical files requiring updates:
1. `/lib/llm/types.ts` - Add fields to interface
2. `/lib/llm/sanitizer.ts` - Preserve fields during sanitization
3. `/lib/llm/gateway.ts` - Replace placeholders in buildContextPrompt
4. `/lib/llm/prompts/*.ts` - Add placeholders to all templates
5. `/lib/documents/generator.ts` - Include fields in promptData
6. `/lib/documents/structured-generator.ts` - Use actual dates
7. `/lib/documents/formatters/*.ts` - Format with real dates
8. All provider mock data - Remove hardcoded dates

---

## Appendix B: Data Flow Diagram

```
User Input (Wizard)
    ↓ [ALL fields collected]
Database Storage
    ↓ [ALL fields stored in company_info]
Data Retrieval
    ↓ [ALL fields retrieved]
API Transmission
    ↓ [ALL fields sent]
Data Sanitization ← ⚠️ FAILURE POINT
    ↓ [budget, timeline, dates LOST]
Document Generation
    ↓ [Missing context]
Prompt Building
    ↓ [No placeholders replaced]
LLM API Call
    ↓ [Incomplete prompt]
Generated Documents
    [Generic/hardcoded values]
```

---

*Report Generated: 2025-09-01*
*Critical Issue: User input data loss affecting all document generation*