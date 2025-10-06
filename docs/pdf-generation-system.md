# PDF Generation System Documentation

## Overview

The Project Genie PDF Generation System is a comprehensive solution for converting project documents into professional PDFs with advanced features including charts, diagrams, clickable navigation, and custom formatting.

## Architecture

### Core Components

1. **PDF Service** (`/lib/pdf-generation/pdf-service.ts`)
   - Central orchestration service
   - Document type routing
   - Formatter registration
   - Metadata management

2. **HTML Formatters** (`/lib/pdf-generation/formatters/`)
   - Specialized formatters for each document type
   - Convert JSON content to styled HTML
   - Support for charts, tables, and visualizations

3. **Puppeteer Generator** (`/lib/pdf-generation/generators/puppeteer-generator.ts`)
   - Headless Chrome PDF generation
   - Tagged PDFs with outline support
   - Clickable TOC and bookmarks
   - Custom headers/footers

4. **Chart Renderer** (`/lib/pdf-generation/chart-renderer.ts`)
   - Server-side Chart.js rendering
   - Canvas-based image generation
   - Support for multiple chart types

5. **Mermaid Renderer** (`/lib/pdf-generation/mermaid-renderer.ts`)
   - Diagram generation from Mermaid syntax
   - Puppeteer-based SVG rendering
   - Template library for common diagrams

6. **PDF Cache Service** (`/lib/pdf-generation/cache-service.ts`)
   - Supabase Storage integration
   - Automatic caching and retrieval
   - TTL-based cache invalidation

## Supported Document Types

### 1. Project Initiation Document (PID)
**Formatter:** `PIDFormatter`
**Features:**
- Executive summary with key highlights
- Project definition with objectives and scope
- Comprehensive project plan with phases
- Risk management matrices
- Stakeholder analysis tables
- Benefits realization framework
- Governance structure diagrams

### 2. Business Case
**Formatter:** `BusinessCaseFormatter`
**Features:**
- Strategic alignment section
- Cost-benefit analysis tables
- ROI calculations
- Financial projections charts
- Investment appraisal
- Sensitivity analysis
- Options appraisal matrix

### 3. Risk Register
**Formatter:** `RiskRegisterFormatter`
**Features:**
- Risk assessment matrix (5x5 grid)
- Risk heat maps
- Mitigation strategies
- Risk ownership tables
- Trend analysis charts
- Risk categories breakdown
- Response planning sections

### 4. Project Plan
**Formatter:** `ProjectPlanFormatter`
**Features:**
- Gantt charts for timeline visualization
- Milestone tracking
- Work breakdown structure (WBS)
- Resource allocation tables
- Critical path highlighting
- Dependency mapping
- Progress tracking indicators

### 5. Communication Plan
**Formatter:** `CommunicationPlanFormatter`
**Features:**
- Stakeholder influence/interest grid
- RACI matrices
- Communication schedule tables
- Channel strategy diagrams
- Feedback mechanisms
- Escalation paths
- Meeting cadence calendars

### 6. Quality Management Plan
**Formatter:** `QualityManagementFormatter`
**Features:**
- Quality metrics dashboard
- PDCA cycle diagrams
- Process flow charts
- Compliance checklists
- Quality gates visualization
- Standards mapping
- Audit schedule tables

### 7. Technical Landscape
**Formatter:** `TechnicalLandscapeFormatter`
**Features:**
- Architecture diagrams
- Technology stack visualization
- Integration mapping
- System dependencies
- API documentation tables
- Security architecture
- Infrastructure topology

### 8. Comparable Projects Analysis
**Formatter:** `ComparableProjectsFormatter`
**Features:**
- Project comparison matrices
- Success factors analysis
- Lessons learned sections
- Benchmark charts
- Case study presentations
- Risk heat maps
- Best practices extraction

### 9. Product Backlog
**Formatter:** `BacklogFormatter`
**Features:**
- User story cards
- Sprint planning boards
- Velocity charts
- Burndown charts
- Priority quadrants
- Epic breakdown
- Release planning timeline

### 10. Project Charter
**Formatter:** `CharterFormatter`
**Features:**
- Project authorization
- High-level requirements
- Success criteria
- Constraints and assumptions
- Preliminary schedule
- Budget overview
- Approval signatures section

## Visualization Capabilities

### Chart Types (via Chart.js)

1. **Gantt Charts**
   - Task timelines
   - Dependencies
   - Progress indicators
   - Milestone markers

2. **Risk Matrices**
   - Probability vs Impact grid
   - Color-coded risk levels
   - Risk distribution

3. **Burndown Charts**
   - Sprint progress
   - Ideal vs Actual lines
   - Story points tracking

4. **Velocity Charts**
   - Sprint performance
   - Planned vs Completed
   - Trend analysis

5. **Pie Charts**
   - Resource allocation
   - Budget distribution
   - Category breakdowns

6. **Timeline Charts**
   - Milestone tracking
   - Status indicators
   - Sequential events

### Mermaid Diagram Types

1. **Flowcharts**
   ```mermaid
   flowchart TD
     A[Start] --> B{Decision}
     B -->|Yes| C[Process]
     B -->|No| D[End]
   ```

2. **Sequence Diagrams**
   - System interactions
   - API flows
   - User journeys

3. **Gantt Charts**
   - Project schedules
   - Task dependencies
   - Resource allocation

4. **Entity Relationship Diagrams**
   - Database schemas
   - Data models
   - System relationships

5. **Mind Maps**
   - Concept mapping
   - Idea organization
   - Hierarchical structures

6. **State Diagrams**
   - Process states
   - Workflow transitions
   - System behavior

7. **User Journey Maps**
   - Customer experience
   - Touchpoint mapping
   - Satisfaction scoring

## Kanban Board Support

### Current Status: ⚠️ Partial Support

**Available Features:**
- Product Backlog formatter includes kanban-style user story cards
- Sprint planning visualization in Backlog documents
- Status columns (To Do, In Progress, Done) in HTML output
- Card-based layout for user stories

**Implementation Details:**
The `BacklogFormatter` includes kanban board visualization:
```typescript
// User story cards with kanban columns
<div class="kanban-board">
  <div class="kanban-column" data-status="todo">
    <h3>To Do</h3>
    <!-- Story cards -->
  </div>
  <div class="kanban-column" data-status="in-progress">
    <h3>In Progress</h3>
    <!-- Story cards -->
  </div>
  <div class="kanban-column" data-status="done">
    <h3>Done</h3>
    <!-- Story cards -->
  </div>
</div>
```

**Planned Enhancements:**
- Dedicated Kanban Board document type
- Swimlanes for different work streams
- WIP limits visualization
- Cycle time metrics
- Cumulative flow diagrams
- Card aging indicators

## PDF Features

### Navigation
- **Clickable Table of Contents**: All TOC entries link to respective sections
- **PDF Bookmarks**: Automatic bookmark generation for headings
- **Internal Links**: Cross-references within the document
- **Tagged PDFs**: Accessibility support with proper document structure

### Formatting
- **Professional Typography**: Clean, readable fonts
- **Consistent Spacing**: Proper margins and padding
- **Page Breaks**: Intelligent break control for sections and tables
- **Headers/Footers**: Custom text with page numbers
- **Watermarks**: Optional watermark support

### Customization Options
```typescript
interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal'
  margin?: {
    top: string
    right: string
    bottom: string
    left: string
  }
  pageNumbers?: boolean
  headerText?: string
  footerText?: string
  watermarkText?: string
  whiteLabel?: boolean
  showDraft?: boolean
  useCache?: boolean
}
```

## API Endpoints

### Generate PDF
**Endpoint:** `POST /api/pdf/generate`

**Request Body:**
```json
{
  "documentType": "pid|business_case|risk_register|...",
  "content": { /* document content */ },
  "projectName": "Project Name",
  "companyName": "Company Name",
  "options": { /* PDF options */ }
}
```

**Response:**
- Binary PDF (direct download)
- OR JSON with Supabase Storage URL

**Headers:**
- `X-PDF-Cached`: Indicates if PDF was served from cache
- `X-PDF-Generator`: Generator used (puppeteer)

## Testing

### Comprehensive Test Page
**URL:** `/test-pdf`

**Features:**
- Document type selector (all 10 types)
- Real-time generation logs
- PDF preview iframe
- Batch testing capability
- Feature verification checklist
- System status dashboard

### Test Data
Comprehensive test data available for all document types in:
`/app/(dashboard)/test-pdf/comprehensive-test-data.ts`

Each test dataset includes:
- Rich content structures
- Multiple sections
- Complex nested data
- Sample metrics and KPIs
- Realistic project information

## Performance Optimizations

### Caching Strategy
1. **Supabase Storage**: PDFs cached for 24 hours
2. **Cache Key**: Based on content hash + options
3. **Automatic Cleanup**: Old PDFs removed after TTL
4. **Cache Bypass**: Available via `useCache: false` option

### Resource Management
- Puppeteer browser instance pooling
- Lazy loading of formatters
- Efficient memory usage for large documents
- Stream-based PDF delivery

## Security Features

### Authentication
- Supabase Auth integration
- JWT token validation
- User-scoped PDF access

### Storage Security
- Row Level Security (RLS) policies
- User-specific PDF storage
- Secure URLs with expiration
- CORS configuration

### Content Security
- HTML sanitization
- XSS prevention
- Safe SVG rendering
- Input validation

## Installation Requirements

### NPM Packages
```json
{
  "dependencies": {
    "puppeteer": "^24.17.1",
    "chart.js": "^4.5.0",
    "canvas": "^3.2.0",
    "mermaid": "^11.10.1",
    "@supabase/supabase-js": "^2.56.0"
  }
}
```

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional
PDF_CACHE_TTL=86400  # 24 hours in seconds
PDF_STORAGE_BUCKET=pdfs
```

## Troubleshooting

### Common Issues

1. **Blank PDFs**
   - Check HTML formatter output
   - Verify Puppeteer installation
   - Review console errors

2. **Missing Charts**
   - Ensure canvas package installed
   - Check Chart.js configuration
   - Verify data format

3. **Mermaid Diagrams Not Rendering**
   - Check Puppeteer permissions
   - Verify Mermaid syntax
   - Review SVG generation logs

4. **Cache Issues**
   - Clear Supabase Storage bucket
   - Check RLS policies
   - Verify cache keys

## Future Enhancements

### Planned Features
1. **Full Kanban Board Support**
   - Dedicated kanban document type
   - Advanced board visualizations
   - Metrics and analytics

2. **Advanced Visualizations**
   - D3.js integration
   - Interactive charts (for digital PDFs)
   - Custom diagram types

3. **Template System**
   - Custom PDF templates
   - Branding presets
   - Industry-specific formats

4. **Batch Processing**
   - Multiple document generation
   - Zip file downloads
   - Scheduled generation

5. **Email Integration**
   - Direct PDF email delivery
   - Scheduled reports
   - Distribution lists

## Support and Maintenance

### Logging
- Comprehensive error logging
- Generation metrics tracking
- Performance monitoring

### Testing Strategy
- Unit tests for formatters
- Integration tests for PDF generation
- E2E tests for full workflow
- Visual regression testing

### Documentation Updates
- Keep formatters documented
- Update test data regularly
- Maintain API documentation
- Track breaking changes

## License and Credits

### Technologies Used
- Puppeteer (Google Chrome team)
- Chart.js (Open source)
- Mermaid (Open source)
- Supabase (Open source backend)

### Contributors
- Project Genie Development Team
- Open source community

---

*Last Updated: August 2025*
*Version: 2.0.0*