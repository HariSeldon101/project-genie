# Comprehensive Test Plan for Unified Formatters

## Test Completion Date: September 1, 2025

## Objective
Verify that all unified formatters correctly use project data (dates, budget, company name) instead of hardcoded values.

## Test Environment
- Local development server: http://localhost:3000
- Node.js environment with Next.js dev server running

## Test Data Requirements

### Test Project 1: Current Year Project
- **Project Name**: "2025 Digital Transformation"
- **Company Name**: "TechCorp Solutions"
- **Start Date**: July 1, 2025
- **End Date**: January 31, 2027
- **Budget**: $2,500,000
- **Timeline**: 18 months

### Test Project 2: Future Project
- **Project Name**: "2026 Infrastructure Upgrade"
- **Company Name**: "Global Enterprises Inc"
- **Start Date**: March 1, 2026
- **End Date**: December 31, 2026
- **Budget**: $750,000
- **Timeline**: 10 months

## Test Cases

### TC-001: Business Case Formatter
**Document Type**: Business Case
**Test Steps**:
1. Generate Business Case document for Test Project 1
2. Verify Benefits Realization Timeline shows dates starting from Feb 2027 (after project end)
3. Verify Project Timeline shows Q3 2025 - Q1 2027
4. Verify company name is "TechCorp Solutions"
5. Verify budget appears as $2,500,000

**Expected Results**:
- NO hardcoded "2024" or "2025" dates in timelines
- All Gantt charts use project's actual dates
- Company name displays correctly
- Budget values match project data

### TC-002: Backlog Formatter
**Document Type**: Product Backlog
**Test Steps**:
1. Generate Backlog document for Test Project 1
2. Verify Sprint dates start from July 1, 2025
3. Verify Product Roadmap shows Q3 2025 - Q1 2027
4. Check that no "2024" appears in document

**Expected Results**:
- Sprint 1: July 1-14, 2025
- Sprint 2: July 15-28, 2025
- Sprint 3: July 29 - Aug 11, 2025
- Roadmap quarters correctly calculated from project start

### TC-003: Charter Formatter
**Document Type**: Project Charter
**Test Steps**:
1. Generate Charter for Test Project 2
2. Verify timeline phases span Mar 2026 - Dec 2026
3. Verify Gantt chart shows correct phase dates
4. Check company name is "Global Enterprises Inc"

**Expected Results**:
- Initiation: March 2026
- Planning: April 2026
- Execution: May-October 2026
- Closure: November-December 2026

### TC-004: Project Plan Formatter
**Document Type**: Project Plan
**Test Steps**:
1. Generate Project Plan for Test Project 1
2. Verify Gantt chart starts July 1, 2025
3. Check all milestone dates are relative to project start

**Expected Results**:
- Requirements phase: July 1, 2025 + 30 days
- No "2024-01-01" in timeline

### TC-005: Technical Landscape Formatter
**Document Type**: Technical Landscape
**Test Steps**:
1. Generate Technical Landscape for Test Project 2
2. Verify Migration Timeline starts March 1, 2026
3. Check Infrastructure Setup date

**Expected Results**:
- Infrastructure Setup: March 1, 2026 + 30 days
- No hardcoded "2024" dates

### TC-006: PID Formatter
**Document Type**: Project Initiation Document
**Test Steps**:
1. Generate PID for Test Project 1
2. Verify all date-based sections use project dates
3. Check company name in header/footer
4. Verify budget in financial sections

**Expected Results**:
- Project dates throughout document
- Company name: "TechCorp Solutions"
- Budget: $2,500,000

## Validation Checklist

For EACH generated document, verify:

### Date Validation
- [ ] Search for "2024" - should return 0 results
- [ ] Search for "2023" - should return 0 results
- [ ] Verify start date matches project start date
- [ ] Verify end date matches project end date
- [ ] Check all quarters (Q1, Q2, Q3, Q4) use correct year

### Company Data Validation
- [ ] Company name appears correctly (not "Your Company")
- [ ] Budget values match project budget
- [ ] Timeline duration matches project timeline

### Mermaid Chart Validation
- [ ] Gantt charts render with correct dates
- [ ] Timeline charts show proper quarters/years
- [ ] No chart contains hardcoded 2024/2025 dates

## Test Execution Script

```javascript
// Quick test to verify no hardcoded dates
async function testFormatter(documentType, projectId) {
  // Generate document
  const response = await fetch(`/api/generate`, {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      documentType
    })
  })
  
  const content = await response.text()
  
  // Check for hardcoded dates
  const has2024 = content.includes('2024')
  const has2023 = content.includes('2023')
  const hasYourCompany = content.includes('Your Company')
  
  return {
    documentType,
    passed: !has2024 && !has2023 && !hasYourCompany,
    issues: {
      has2024,
      has2023,
      hasYourCompany
    }
  }
}

// Run tests for all document types
const documentTypes = [
  'pid',
  'business_case',
  'risk_register',
  'project_plan',
  'charter',
  'backlog',
  'technical_landscape',
  'comparable_projects',
  'quality_management',
  'communication_plan'
]

for (const type of documentTypes) {
  const result = await testFormatter(type, testProjectId)
  console.log(`${type}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`, result.issues)
}
```

## Success Criteria
- All 10 unified formatters pass date validation
- No hardcoded dates found in any generated document
- Company name and budget correctly displayed
- All Mermaid charts render with dynamic dates

## Post-Test Actions
1. If all tests pass → Delete legacy formatters
2. If any test fails → Fix identified issues and re-test
3. Document any edge cases discovered during testing

## Test Results Log

### Test Run: September 1, 2025

| Document Type | Date Check | Company Check | Budget Check | Overall |
|--------------|------------|---------------|--------------|---------|
| PID | ⏳ | ⏳ | ⏳ | ⏳ |Risk 
| Business Case | ⏳ | ⏳ | ⏳ | ⏳ |
| Risk Register | ⏳ | ⏳ | ⏳ | ⏳ |
| Project Plan | ⏳ | ⏳ | ⏳ | ⏳ |
| Charter | ⏳ | ⏳ | ⏳ | ⏳ |
| Backlog | ⏳ | ⏳ | ⏳ | ⏳ |
| Technical Landscape | ⏳ | ⏳ | ⏳ | ⏳ |
| Comparable Projects | ⏳ | ⏳ | ⏳ | ⏳ |
| Quality Management | ⏳ | ⏳ | ⏳ | ⏳ |
| Communication Plan | ⏳ | ⏳ | ⏳ | ⏳ |

Legend: ✅ Pass | ❌ Fail | ⏳ Pending

## Notes
- Legacy formatters should only be deleted after ALL tests pass
- Consider creating automated tests for future regression testing
- Monitor for any console errors during document generation