# PDF Architecture and Styling Documentation

## Overview
This document outlines the comprehensive PDF generation and viewing architecture for Project Genie, supporting all PRINCE2 and Agile document types with professional formatting and visualizations.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Dependencies](#dependencies)
3. [File Structure](#file-structure)
4. [Component Library](#component-library)
5. [Chart Components](#chart-components)
6. [Styling System](#styling-system)
7. [Document Templates](#document-templates)
8. [Implementation Guidelines](#implementation-guidelines)

## Architecture Overview

The PDF viewing and generation system is built on **Syncfusion PDF components** with a modular, component-based architecture that ensures:
- Professional PDF viewing with full browser-based rendering
- Support for all PRINCE2 and Agile methodologies
- Enterprise-grade formatting and annotations
- Advanced features like search, navigation, and printing
- Extensibility for future document types

## Dependencies

```json
{
  "@syncfusion/ej2-react-pdfviewer": "^30.2.7",
  "@syncfusion/ej2-react-charts": "^30.2.7",
  "@syncfusion/ej2-react-grids": "^30.2.6",
  "@syncfusion/ej2-react-treemap": "^30.2.4",
  "@syncfusion/ej2-base": "^30.2.0",
  "html-to-image": "^1.11.11",
  "date-fns": "^3.3.1"
}
```

### Note on PDF Generation
- **Viewing**: Syncfusion PdfViewerComponent for displaying PDFs
- **Generation**: HTML-based generation with unified formatters that create print-ready HTML
- **Export**: HTML to PDF conversion via browser print or server-side generation

## File Structure

```
lib/pdf/
├── core/                          # Core functionality
│   ├── pdf-document.tsx          # Base document class with page layouts
│   ├── pdf-styles.ts             # Centralized professional style system
│   ├── pdf-types.ts              # TypeScript interfaces for all components
│   └── pdf-fonts.ts              # Font registration and management
├── components/                    # Reusable components
│   ├── layout/                   # Page layout components
│   │   ├── pdf-cover.tsx         # Professional cover page
│   │   ├── pdf-header.tsx        # Header with branding & page numbers
│   │   ├── pdf-footer.tsx        # Footer with document info
│   │   ├── pdf-toc.tsx           # Table of contents with links
│   │   └── pdf-approval-page.tsx # Signature/approval section
│   ├── content/                  # Content components
│   │   ├── pdf-section.tsx       # Section with numbering (1.1, 1.2)
│   │   ├── pdf-table.tsx         # Styled tables with borders
│   │   ├── pdf-list.tsx          # Bullet/numbered lists
│   │   ├── pdf-callout.tsx       # Highlight boxes for key info
│   │   └── pdf-code-block.tsx    # Code/technical content blocks
│   ├── visual/                   # Visual elements
│   │   ├── pdf-icons.tsx         # Status indicators and symbols
│   │   ├── pdf-badge.tsx         # Priority/status badges
│   │   ├── pdf-progress-bar.tsx  # Progress indicators
│   │   └── pdf-divider.tsx       # Section dividers
│   └── charts/                   # Chart components
│       ├── pdf-org-chart.tsx     # Organization hierarchy chart
│       ├── pdf-gantt.tsx         # Gantt timeline chart
│       ├── pdf-risk-matrix.tsx   # Risk heat map (5x5 grid)
│       ├── pdf-stakeholder-matrix.tsx # Power/Interest quadrant
│       ├── pdf-pie-chart.tsx     # Distribution charts
│       ├── pdf-bar-chart.tsx     # Comparison charts
│       ├── pdf-timeline.tsx      # Project timeline visualization
│       ├── pdf-burndown.tsx      # Agile burndown chart
│       ├── pdf-kanban.tsx        # Kanban board visualization
│       └── pdf-sprint-board.tsx  # Sprint planning board
├── templates/                    # Document-specific templates
│   ├── prince2/                  # PRINCE2 documents
│   │   ├── pid-template.tsx      # Project Initiation Document
│   │   ├── business-case-template.tsx
│   │   ├── risk-register-template.tsx
│   │   ├── project-plan-template.tsx
│   │   ├── quality-management-template.tsx
│   │   └── communication-plan-template.tsx
│   ├── agile/                    # Agile documents
│   │   ├── charter-template.tsx  # Agile Charter
│   │   ├── backlog-template.tsx  # Product Backlog with stories
│   │   └── sprint-plan-template.tsx
│   └── analysis/                 # Analysis documents
│       ├── technical-landscape-template.tsx
│       └── comparable-projects-template.tsx
├── utils/                        # Utility functions
│   ├── mermaid-converter.ts      # Convert Mermaid to SVG/Image
│   ├── content-parser.ts         # Parse markdown to PDF elements
│   ├── chart-data-processor.ts   # Process data for charts
│   └── color-utils.ts            # Color schemes and gradients
└── index.ts                      # Main export file
```

## Component Library

### Layout Components

#### PDFCover
Professional cover page with:
- Document title and type
- Project name and organization
- Version and date information
- Classification level
- Company branding

#### PDFHeader
Consistent header across all pages:
- Document title
- Section name
- Page numbers
- Company logo placeholder

#### PDFFooter
Standard footer with:
- Copyright information
- Confidentiality notice
- Document reference
- Page information

#### PDFTableOfContents
Automated TOC generation:
- Section numbering
- Page references
- Clickable links (where supported)
- Hierarchical structure

#### PDFApprovalPage
Signature and approval section:
- Approval table
- Signature lines
- Date fields
- Document control information

### Content Components

#### PDFSection
Structured sections with:
- Hierarchical numbering (1, 1.1, 1.1.1)
- Consistent spacing
- Section breaks
- Optional icons

#### PDFTable
Professional tables featuring:
- Header row styling
- Alternating row colors
- Cell padding and borders
- Column alignment options
- Merged cells support
- Nested tables capability

#### PDFList
Lists with:
- Bullet points (•, ◦, ▪)
- Numbered lists (1., a., i.)
- Nested lists
- Custom markers
- Proper indentation

#### PDFCallout
Highlight boxes for:
- Executive summaries
- Key findings
- Warnings/alerts
- Important notes
- Tips and recommendations

### Visual Components

#### PDFIcons
Comprehensive icon system:
```typescript
const iconSet = {
  // Status indicators
  success: '✓',      // Green checkmark
  error: '✗',        // Red cross
  warning: '⚠',      // Yellow warning
  info: 'ℹ',        // Blue info
  
  // Priority levels
  critical: '🔴',    // Red circle
  high: '🟠',       // Orange circle
  medium: '🟡',      // Yellow circle
  low: '🟢',        // Green circle
  
  // Categories
  strategic: '🎯',   // Target
  operational: '⚙️', // Gear
  financial: '💰',   // Money bag
  technical: '💻',   // Computer
  compliance: '📋',  // Clipboard
  external: '🌍',   // Globe
  
  // Document types
  document: '📄',    // Document
  folder: '📁',      // Folder
  chart: '📊',       // Chart
  calendar: '📅'     // Calendar
}
```

#### PDFBadge
Status badges with:
- Background colors
- Text labels
- Icons
- Rounded corners

#### PDFProgressBar
Visual progress indicators:
- Percentage complete
- Color coding
- Labels
- Animated appearance (static)

## Chart Components

### Organization Chart (pdf-org-chart.tsx)
PRINCE2 organization structure visualization:
- Hierarchical layout
- Role boxes with titles
- Reporting lines
- Color coding by level
- Support for:
  - Project Board
  - Executive, Senior User, Senior Supplier
  - Project Manager
  - Team Managers
  - Project Assurance
  - Project Support

### Gantt Chart (pdf-gantt.tsx)
Project timeline visualization:
- Time axis (days/weeks/months)
- Task bars with durations
- Milestone markers (diamonds)
- Dependencies (arrows)
- Progress indicators
- Color coding by phase/status
- Today line marker

### Risk Matrix (pdf-risk-matrix.tsx)
5x5 risk assessment grid:
- Probability axis (Very Low to Very High)
- Impact axis (Very Low to Very High)
- Color gradient:
  - Green (1-4): Very Low/Low
  - Yellow (5-9): Medium
  - Orange (10-14): High
  - Red (15-25): Critical
- Risk positioning dots
- Risk IDs on dots
- Legend and scales

### Stakeholder Matrix (pdf-stakeholder-matrix.tsx)
Power/Interest grid:
- 2x2 quadrant layout
- Quadrant labels:
  - Manage Closely (High Power, High Interest)
  - Keep Satisfied (High Power, Low Interest)
  - Keep Informed (Low Power, High Interest)
  - Monitor (Low Power, Low Interest)
- Stakeholder bubbles
- Size indicates importance
- Color coding by type

### Pie Chart (pdf-pie-chart.tsx)
Distribution visualizations:
- Segments with percentages
- Color coding
- Labels
- Legend
- Use cases:
  - Risk distribution by category
  - Risk distribution by status
  - Budget allocation
  - Story points by priority

### Bar Chart (pdf-bar-chart.tsx)
Comparison visualizations:
- Vertical/horizontal orientation
- Value labels
- Grid lines
- Color coding
- Use cases:
  - Sprint velocity
  - Resource allocation
  - Cost comparisons

### Timeline (pdf-timeline.tsx)
Linear timeline visualization:
- Chronological events
- Milestones
- Phases
- Date markers
- Color coding

### Burndown Chart (pdf-burndown.tsx)
Agile progress tracking:
- Ideal line (diagonal)
- Actual progress line
- Remaining work axis
- Time axis (sprint days)
- Velocity indicator
- Scope changes

### Kanban Board (pdf-kanban.tsx)
Work status visualization:
- Columns (To Do, In Progress, Done)
- Work item cards
- WIP limits
- Swimlanes (optional)
- Priority indicators

### Sprint Board (pdf-sprint-board.tsx)
Sprint planning visualization:
- User stories
- Tasks
- Story points
- Assignees
- Status indicators

## Styling System

### Color Palette
```typescript
export const colors = {
  // Primary colors
  primary: {
    dark: '#1a237e',     // Navy blue
    main: '#283593',     // Medium blue
    light: '#5c6bc0',    // Light blue
    lighter: '#9fa8da',  // Very light blue
  },
  
  // Status colors
  status: {
    success: '#4caf50',  // Green
    warning: '#ff9800',  // Orange
    danger: '#f44336',   // Red
    info: '#2196f3',     // Blue
  },
  
  // Neutral colors
  neutral: {
    black: '#000000',
    dark: '#212121',
    main: '#666666',
    light: '#9e9e9e',
    lighter: '#e0e0e0',
    lightest: '#f5f5f5',
    white: '#ffffff',
  },
  
  // Chart colors
  chart: [
    '#6366f1',  // Indigo
    '#8b5cf6',  // Purple
    '#ec4899',  // Pink
    '#f59e0b',  // Amber
    '#10b981',  // Emerald
    '#ef4444',  // Red
    '#3b82f6',  // Blue
    '#f97316',  // Orange
  ],
  
  // Risk colors
  risk: {
    veryLow: '#4caf50',
    low: '#8bc34a',
    medium: '#ffeb3b',
    high: '#ff9800',
    veryHigh: '#f44336',
    critical: '#b71c1c',
  }
}
```

### Typography
```typescript
export const typography = {
  fonts: {
    heading: 'Helvetica-Bold',
    body: 'Helvetica',
    mono: 'Courier',
  },
  
  sizes: {
    // Headings
    h1: 24,
    h2: 20,
    h3: 16,
    h4: 14,
    h5: 12,
    h6: 11,
    
    // Body
    large: 12,
    regular: 11,
    small: 10,
    tiny: 9,
    
    // Special
    coverTitle: 28,
    coverSubtitle: 18,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
  
  weight: {
    normal: 'normal',
    bold: 'bold',
  }
}
```

### Spacing System
```typescript
export const spacing = {
  // Base unit: 4px
  xs: 4,   // 4px
  sm: 8,   // 8px
  md: 12,  // 12px
  lg: 16,  // 16px
  xl: 20,  // 20px
  xxl: 24, // 24px
  xxxl: 32, // 32px
  
  // Page margins
  page: {
    top: 35,
    bottom: 65,
    left: 35,
    right: 35,
  },
  
  // Section spacing
  section: {
    before: 20,
    after: 15,
  },
  
  // Paragraph spacing
  paragraph: 8,
}
```

### Common Styles
```typescript
export const commonStyles = StyleSheet.create({
  page: {
    paddingTop: spacing.page.top,
    paddingBottom: spacing.page.bottom,
    paddingHorizontal: spacing.page.left,
    backgroundColor: colors.neutral.white,
    fontFamily: typography.fonts.body,
    fontSize: typography.sizes.regular,
  },
  
  heading1: {
    fontSize: typography.sizes.h1,
    fontFamily: typography.fonts.heading,
    color: colors.primary.dark,
    marginTop: spacing.section.before,
    marginBottom: spacing.section.after,
    borderBottom: `2px solid ${colors.neutral.lighter}`,
    paddingBottom: spacing.xs,
  },
  
  heading2: {
    fontSize: typography.sizes.h2,
    fontFamily: typography.fonts.heading,
    color: colors.primary.main,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  
  heading3: {
    fontSize: typography.sizes.h3,
    fontFamily: typography.fonts.heading,
    color: colors.primary.main,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  
  paragraph: {
    fontSize: typography.sizes.regular,
    lineHeight: typography.lineHeight.normal,
    marginBottom: spacing.paragraph,
    textAlign: 'justify',
    color: colors.neutral.dark,
  },
  
  table: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.neutral.lighter,
    marginVertical: spacing.md,
  },
  
  tableHeader: {
    backgroundColor: colors.primary.dark,
    color: colors.neutral.white,
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.small,
    padding: spacing.sm,
  },
  
  tableCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: colors.neutral.lighter,
    padding: spacing.sm,
    fontSize: typography.sizes.small,
  },
  
  calloutBox: {
    backgroundColor: colors.neutral.lightest,
    border: `2px solid ${colors.primary.light}`,
    borderRadius: 4,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
})
```

## Document Templates

### PRINCE2 Templates

#### PID Template (pid-template.tsx)
Structure:
1. Cover Page
   - Project name and details
   - Document version
   - Classification
2. Table of Contents
3. Executive Summary (callout box)
4. Project Definition
   - Scope (in/out with icons)
   - Objectives
   - Deliverables
5. Business Case
   - Options table
   - Benefits/costs
6. Organization Structure
   - Org chart visualization
7. Project Plan
   - Gantt chart
   - Milestones table
8. Risk Management
   - Risk matrix
   - Top risks table
9. Communication Management
   - Stakeholder matrix
   - Communication plan table
10. Approval Page

#### Business Case Template
Structure:
1. Cover Page
2. Executive Summary
3. Strategic Context
4. Business Options (comparison table)
5. Economic Case
   - Cost/benefit analysis
   - ROI calculations
6. Financial Case
   - Budget breakdown (pie chart)
   - Cash flow projection
7. Commercial Case
8. Management Case
9. Approval Section

#### Risk Register Template
Structure:
1. Cover Page
2. Executive Summary with metrics
3. Risk Management Approach
4. Risk Matrix (5x5 heat map)
5. Risk Register (detailed table)
6. Risk Distribution (pie charts)
7. Mitigation Strategies
8. Approval Section

### Agile Templates

#### Product Backlog Template
Structure:
1. Cover Page
2. Backlog Summary
   - Total stories
   - Story points
   - Priority distribution
3. User Stories
   - Story cards with acceptance criteria
   - Priority badges
   - Story points
4. Sprint Planning
   - Sprint allocation
   - Velocity chart
5. Burndown Chart

#### Sprint Plan Template
Structure:
1. Cover Page
2. Sprint Goal
3. Sprint Backlog (kanban board)
4. Team Capacity
5. Sprint Timeline
6. Daily Standup Schedule
7. Sprint Burndown
8. Retrospective Section

#### Agile Charter Template
Structure:
1. Cover Page
2. Vision Statement
3. Team Structure (org chart)
4. Success Criteria
5. Constraints & Assumptions
6. Release Plan (timeline)
7. Communication Plan
8. Approval Section

## Implementation Guidelines

### 1. Base Document Setup
```typescript
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { commonStyles, colors, typography, spacing } from './pdf-styles'

export const PDFDocument = ({ data, template }) => {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Page content */}
      </Page>
    </Document>
  )
}
```

### 2. Creating Reusable Components
```typescript
export const PDFSection = ({ title, children, level = 1 }) => {
  const styles = {
    1: commonStyles.heading1,
    2: commonStyles.heading2,
    3: commonStyles.heading3,
  }
  
  return (
    <View style={commonStyles.section}>
      <Text style={styles[level]}>{title}</Text>
      {children}
    </View>
  )
}
```

### 3. Implementing Charts
```typescript
export const PDFOrgChart = ({ data }) => {
  return (
    <Svg viewBox="0 0 400 300">
      {/* Draw boxes for roles */}
      {data.roles.map((role, i) => (
        <G key={i}>
          <Rect
            x={role.x}
            y={role.y}
            width={100}
            height={40}
            fill={colors.primary.light}
            stroke={colors.primary.dark}
          />
          <Text
            x={role.x + 50}
            y={role.y + 20}
            textAnchor="middle"
            fill={colors.neutral.white}
          >
            {role.name}
          </Text>
        </G>
      ))}
      
      {/* Draw connections */}
      {data.connections.map((conn, i) => (
        <Line
          key={i}
          x1={conn.from.x}
          y1={conn.from.y}
          x2={conn.to.x}
          y2={conn.to.y}
          stroke={colors.neutral.dark}
        />
      ))}
    </Svg>
  )
}
```

### 4. Mermaid Diagram Conversion
```typescript
import mermaid from 'mermaid'
import { toPng } from 'html-to-image'

export const convertMermaidToImage = async (mermaidCode: string) => {
  // Initialize mermaid
  mermaid.initialize({
    theme: 'default',
    themeVariables: {
      primaryColor: colors.primary.main,
      primaryBorderColor: colors.primary.dark,
    }
  })
  
  // Render to SVG
  const { svg } = await mermaid.render('diagram', mermaidCode)
  
  // Convert SVG to image
  const container = document.createElement('div')
  container.innerHTML = svg
  const dataUrl = await toPng(container)
  
  return dataUrl
}
```

### 5. Table Implementation
```typescript
import { Table, TR, TH, TD } from '@enescang/react-pdf-table'

export const PDFTable = ({ headers, rows }) => {
  return (
    <Table style={commonStyles.table}>
      <TR>
        {headers.map((header, i) => (
          <TH key={i} style={commonStyles.tableHeader}>
            {header}
          </TH>
        ))}
      </TR>
      {rows.map((row, i) => (
        <TR key={i}>
          {row.map((cell, j) => (
            <TD key={j} style={commonStyles.tableCell}>
              {cell}
            </TD>
          ))}
        </TR>
      ))}
    </Table>
  )
}
```

### 6. Document Generation Pipeline
```typescript
export const generatePDF = async (document) => {
  // 1. Parse document content
  const parsedContent = parseContent(document.content)
  
  // 2. Convert Mermaid diagrams
  const diagrams = await convertMermaidDiagrams(parsedContent)
  
  // 3. Select template
  const template = selectTemplate(document.type)
  
  // 4. Generate PDF
  const pdfDoc = (
    <PDFDocument
      data={parsedContent}
      diagrams={diagrams}
      template={template}
    />
  )
  
  // 5. Render to blob
  const blob = await pdf(pdfDoc).toBlob()
  
  return blob
}
```

## Performance Optimization

### Caching Strategy
- Cache rendered Mermaid diagrams
- Cache generated PDF templates
- Reuse common components
- Lazy load chart components

### Memory Management
- Stream large documents
- Dispose of temporary DOM elements
- Clear diagram cache periodically
- Use efficient data structures

## Testing Guidelines

### Component Testing
- Test each component in isolation
- Verify styling consistency
- Check responsive behavior
- Validate data handling

### Integration Testing
- Test complete document generation
- Verify all chart types render
- Check page breaks and flow
- Validate export functionality

### Visual Testing
- Compare PDF output with web viewer
- Check print quality
- Verify color accuracy
- Test different content lengths

## Troubleshooting

### Common Issues

#### Charts not rendering
- Check SVG viewBox dimensions
- Verify data format
- Ensure colors are defined
- Check for missing dependencies

#### Mermaid conversion fails
- Validate Mermaid syntax
- Check for special characters
- Ensure container is attached to DOM
- Try fallback to text representation

#### Tables breaking across pages
- Use page break controls
- Split large tables
- Adjust row heights
- Consider landscape orientation

#### Memory issues with large documents
- Implement pagination
- Stream content
- Reduce image quality
- Clear caches

## Future Enhancements

### Planned Features
- Interactive TOC with clickable links
- Watermark support
- Digital signatures
- Custom fonts upload
- Template builder UI
- Real-time preview
- Batch export
- Accessibility features (PDF/UA)

### Extensibility Points
- Custom chart types
- Plugin architecture
- Theme system
- Localization support
- Custom page sizes
- Advanced layouts
- Form fields
- Annotations

## References

### Documentation
- [@react-pdf/renderer docs](https://react-pdf.org/)
- [React PDF Table](https://github.com/enescang/react-pdf-table)
- [html-to-image](https://github.com/bubkoo/html-to-image)
- [Mermaid.js](https://mermaid-js.github.io/)

### Standards
- PDF/A for archiving
- PDF/UA for accessibility
- ISO 32000 PDF specification
- WCAG 2.1 guidelines

---

*Last Updated: 2025-08-29*
*Version: 1.0.0*