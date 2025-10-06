# Localhost Test Checklist for Unified Formatters

## Test Environment
- **URL**: http://localhost:3000
- **Date**: September 1, 2025
- **Project**: Digital Banking Transformation Initiative
- **Expected Data**:
  - Start Date: July 1, 2025
  - End Date: January 31, 2027
  - Budget: $12,000,000
  - Timeline: 18 months
  - Company: Should extract from company_info

## Pre-Test Setup
- [ ] Ensure dev server is running on port 3000
- [ ] Login to the application
- [ ] Navigate to Projects page
- [ ] Open "Digital Banking Transformation Initiative" project

## Document-by-Document Test Checklist

### 1. Business Case Document
**Navigate to**: Projects > [Project] > Documents > Business Case

#### Check Timeline Section:
- [ ] Benefits Realization Timeline starts AFTER January 31, 2027
- [ ] Project Timeline shows Q3 2025 - Q1 2027
- [ ] NO instances of "2024" in timeline
- [ ] NO instances of "Q1 2024", "Q2 2024", etc.

#### Check Financial Sections:
- [ ] Budget shows $12,000,000 or related calculations
- [ ] Cost breakdown percentages calculated correctly
- [ ] Investment appraisal uses actual budget

#### Check Company Data:
- [ ] Company name NOT showing as "Your Company"
- [ ] Should show actual company from project data

#### Mermaid Charts:
- [ ] Gantt chart dates start from July 2025
- [ ] Timeline visualization shows 2025-2027
- [ ] Pie charts render correctly

### 2. Product Backlog Document
**Navigate to**: Projects > [Project] > Documents > Product Backlog

#### Check Sprint Planning:
- [ ] Sprint 1 starts July 1, 2025
- [ ] Sprint 2 starts July 15, 2025
- [ ] Sprint 3 starts July 29, 2025
- [ ] NO "2024-01-01" dates

#### Check Product Roadmap:
- [ ] Q3 2025 as first quarter
- [ ] Q4 2025, Q1 2026, Q2 2026 follow
- [ ] Title shows "Product Roadmap 2025-2026"
- [ ] NO "Q1 2024" or similar

### 3. Project Charter Document
**Navigate to**: Projects > [Project] > Documents > Project Charter

#### Check Timeline:
- [ ] Project Duration: July 2025 to January 2027
- [ ] Initiation phase: July 2025
- [ ] Planning phase: ~August 2025
- [ ] Execution phase: ~September 2025 - November 2026
- [ ] Closure phase: ~December 2026 - January 2027

#### Check Gantt Chart:
- [ ] Phases align with project timeline
- [ ] NO hardcoded "2024-01-01" start date
- [ ] All dates within July 2025 - January 2027 range

### 4. Project Plan Document
**Navigate to**: Projects > [Project] > Documents > Project Plan

#### Check Timeline Gantt:
- [ ] Requirements phase starts July 1, 2025
- [ ] NOT starting from "2024-01-01"
- [ ] All subsequent phases follow project timeline
- [ ] Milestones calculated from actual dates

### 5. Technical Landscape Document
**Navigate to**: Projects > [Project] > Documents > Technical Landscape

#### Check Migration Timeline:
- [ ] Infrastructure Setup starts July 1, 2025
- [ ] NOT starting from "2024-01-01"
- [ ] Migration phases follow project timeline
- [ ] Go-Live milestone within project duration

### 6. Risk Register Document
**Navigate to**: Projects > [Project] > Documents > Risk Register

#### Check Content:
- [ ] Risk timeline references project dates
- [ ] Mitigation schedules align with 2025-2027
- [ ] NO hardcoded historical dates

### 7. PID (Project Initiation Document)
**Navigate to**: Projects > [Project] > Documents > PID

#### Check All Sections:
- [ ] Project dates shown correctly
- [ ] Company name displayed (not "Your Company")
- [ ] Budget information present
- [ ] Timeline matches 18 months

### 8. Communication Plan Document
**Navigate to**: Projects > [Project] > Documents > Communication Plan

#### Check Content:
- [ ] Communication schedule aligns with project timeline
- [ ] Stakeholder engagement phases match 2025-2027
- [ ] Review cycles calculated from project dates

### 9. Quality Management Document
**Navigate to**: Projects > [Project] > Documents > Quality Management

#### Check Content:
- [ ] Quality review schedule matches project phases
- [ ] Audit timeline aligns with 2025-2027
- [ ] Milestone reviews at correct project intervals

### 10. Comparable Projects Document
**Navigate to**: Projects > [Project] > Documents > Comparable Projects

#### Check Content:
- [ ] Comparison timeline references current project dates
- [ ] Lessons learned applied to 2025-2027 timeline
- [ ] NO outdated year references

## Global Validation Checks

### Search Tests (Use Ctrl+F in browser):
For EACH document, search for:
- [ ] "2024" - Should return 0 results
- [ ] "2023" - Should return 0 results
- [ ] "Your Company" - Should return 0 results
- [ ] "July 2025" - Should appear in timeline starts
- [ ] "January 2027" - Should appear in timeline ends

### Visual Checks:
- [ ] All Mermaid diagrams render correctly
- [ ] Gantt charts show proper date ranges
- [ ] Timeline visualizations display 2025-2027
- [ ] Pie charts and graphs render with data

### Data Consistency:
- [ ] Budget consistent across all financial sections
- [ ] Timeline duration consistent (18 months)
- [ ] Company name consistent throughout
- [ ] Date ranges align across all documents

## Test Execution Log

| Document | Date Check | Company Check | Budget Check | Charts Render | Overall |
|----------|------------|---------------|--------------|---------------|---------|
| Business Case | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Product Backlog | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Project Charter | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Project Plan | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Technical Landscape | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Risk Register | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| PID | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Communication Plan | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Quality Management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Comparable Projects | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

Legend: ✅ Pass | ❌ Fail | ⏳ Not Tested | N/A Not Applicable

## Issues Found
Document any issues discovered during testing:

1. **Issue**: [Description]
   - **Document**: [Which document]
   - **Location**: [Section/line]
   - **Expected**: [What should appear]
   - **Actual**: [What actually appears]

## Test Summary
- **Test Date**: 
- **Tester**: 
- **Total Documents Tested**: /10
- **Passed**: 
- **Failed**: 
- **Overall Result**: 

## Next Steps
- [ ] Fix any identified issues
- [ ] Re-test failed documents
- [ ] Delete legacy formatters once all tests pass
- [ ] Document any edge cases discovered