# Syncfusion React UI Components Reference

## Overview
Syncfusion provides 145+ React components for building modern, feature-rich applications. This document serves as a quick reference for components relevant to the Company Intelligence redesign.

## Installation

```bash
# Core package
npm install @syncfusion/ej2-react-base

# Individual component packages (install as needed)
npm install @syncfusion/ej2-react-navigations  # TreeView, Sidebar, Accordion
npm install @syncfusion/ej2-react-grids        # DataGrid
npm install @syncfusion/ej2-react-kanban       # Kanban Board
npm install @syncfusion/ej2-react-progressbar  # Progress indicators
npm install @syncfusion/ej2-react-dropdowns    # Dropdowns, MultiSelect
npm install @syncfusion/ej2-react-inputs       # Form inputs
npm install @syncfusion/ej2-react-buttons      # Buttons, switches
npm install @syncfusion/ej2-react-popups       # Tooltips, dialogs
```

## Key Components for Company Intelligence

### 1. TreeView Component
**Package**: `@syncfusion/ej2-react-navigations`
**Use Case**: Interactive sitemap with checkboxes for page selection

```typescript
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';

// Features:
- Checkbox support for multi-selection
- Drag and drop capability
- Lazy loading for large trees
- Custom node templates
- Expand/collapse animations
- Search/filter functionality
```

**Key Properties**:
- `showCheckBox`: Enable checkboxes
- `autoCheck`: Auto-check child nodes
- `fields`: Data source mapping
- `nodeChecked`: Check event handler
- `expandOn`: Click/DblClick/None

### 2. DataGrid Component
**Package**: `@syncfusion/ej2-react-grids`
**Use Case**: Display structured scraped data, research results

```typescript
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids';

// Features:
- Sorting, filtering, grouping
- Virtual scrolling for performance
- Excel/PDF export
- Row selection
- Responsive columns
- Custom cell templates
```

**Key Properties**:
- `dataSource`: Data array
- `allowPaging`: Enable pagination
- `allowSorting`: Enable sorting
- `allowFiltering`: Enable filtering
- `pageSettings`: Pagination config

### 3. Sidebar Component
**Package**: `@syncfusion/ej2-react-navigations`
**Use Case**: Stage-specific navigation panel

```typescript
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';

// Features:
- Slide/push/overlay modes
- Auto-close on document click
- Responsive behavior
- Custom width
- Dock support
```

**Key Properties**:
- `type`: Push/Slide/Over
- `width`: Sidebar width
- `dockSize`: Docked state width
- `enableDock`: Allow docking
- `target`: Container element

### 4. Kanban Board
**Package**: `@syncfusion/ej2-react-kanban`
**Use Case**: Visual stage progression display

```typescript
import { KanbanComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-kanban';

// Features:
- Drag and drop between columns
- Swimlanes
- WIP limits
- Card templates
- Stacked headers
```

### 5. ProgressBar Component
**Package**: `@syncfusion/ej2-react-progressbar`
**Use Case**: Real-time scraping progress, stage completion

```typescript
import { ProgressBarComponent } from '@syncfusion/ej2-react-progressbar';

// Types available:
- Linear progress
- Circular progress
- Semi-circular
- Custom ranges with colors
- Animated progress
```

**Key Properties**:
- `type`: Linear/Circular
- `value`: Current progress
- `showProgressValue`: Display percentage
- `animation`: Enable animations
- `progressColor`: Custom colors

### 6. Dropdown List
**Package**: `@syncfusion/ej2-react-dropdowns`
**Use Case**: Session selector, model selection

```typescript
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';

// Features:
- Filtering
- Grouping
- Templates
- Multi-select
- Virtualization
```

### 7. Accordion Component
**Package**: `@syncfusion/ej2-react-navigations`
**Use Case**: Collapsible configuration sections

```typescript
import { AccordionComponent, AccordionItemDirective } from '@syncfusion/ej2-react-navigations';

// Features:
- Multiple/single expand
- Nested accordions
- Icons
- Custom headers
```

### 8. Tab Component
**Package**: `@syncfusion/ej2-react-navigations`
**Use Case**: Content organization within stages

```typescript
import { TabComponent, TabItemDirective } from '@syncfusion/ej2-react-navigations';

// Features:
- Scrollable tabs
- Close buttons
- Icons
- Vertical orientation
```

## Styling & Themes

Syncfusion components support multiple themes:
- Material
- Bootstrap
- Tailwind CSS
- Fluent
- High Contrast

```typescript
// Import theme CSS
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-react-navigations/styles/material.css';
```

## Integration with Next.js

For Next.js App Router, use client components:

```typescript
'use client'

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const TreeViewComponent = dynamic(
  () => import('@syncfusion/ej2-react-navigations').then(mod => mod.TreeViewComponent),
  { ssr: false }
);
```

## Licensing

- **Community License**: Free for companies with <$1M revenue and <5 developers
- **Commercial License**: Required for larger organizations
- **Trial**: Full features, no credit card required

## Example Implementation for Company Intelligence

### Interactive Sitemap Tree
```typescript
const SitemapTree = ({ pages, onSelectionChange }) => {
  const fields = {
    dataSource: pages,
    id: 'url',
    parentID: 'parentUrl',
    text: 'title',
    hasChildren: 'hasChildren'
  };

  const handleNodeCheck = (args) => {
    const checkedNodes = args.checkedNodes;
    onSelectionChange(checkedNodes);
  };

  return (
    <TreeViewComponent
      fields={fields}
      showCheckBox={true}
      autoCheck={true}
      nodeChecked={handleNodeCheck}
      expandOn="Click"
      cssClass="sitemap-tree"
    />
  );
};
```

### Progress Tracker
```typescript
const ScrapingProgress = ({ current, total, stage }) => {
  const percentage = (current / total) * 100;
  
  return (
    <ProgressBarComponent
      type="Linear"
      value={percentage}
      showProgressValue={true}
      labelStyle={{ color: '#FFFFFF' }}
      animation={{ enable: true, duration: 1000 }}
      progressColor="#10b981"
      trackColor="#e5e7eb"
    />
  );
};
```

## Performance Considerations

1. **Virtual Scrolling**: Use for large datasets in Grid/TreeView
2. **Lazy Loading**: Load tree nodes on demand
3. **Debouncing**: For search/filter operations
4. **Code Splitting**: Import only needed components
5. **CSS Optimization**: Import only required theme files

## Documentation & Resources

- **Official Docs**: https://ej2.syncfusion.com/react/documentation/
- **API Reference**: https://ej2.syncfusion.com/react/documentation/api/
- **Live Demos**: https://ej2.syncfusion.com/react/demos/
- **GitHub**: https://github.com/syncfusion/ej2-react-ui-components

## Component Selection Rationale

| Component | Why Selected | Alternative (shadcn) |
|-----------|-------------|---------------------|
| TreeView | Checkbox support, lazy loading | No equivalent |
| DataGrid | Virtual scrolling, export features | Table (basic) |
| Kanban | Drag-drop stages | No equivalent |
| Sidebar | Dock support, animations | Sheet (simpler) |
| ProgressBar | Multiple types, animations | Progress (basic) |

## Migration Strategy

1. **Phase 1**: Replace sitemap display with TreeView
2. **Phase 2**: Add Sidebar for stage navigation  
3. **Phase 3**: Implement DataGrid for results
4. **Phase 4**: Add progress indicators
5. **Phase 5**: Enhance with Kanban view

This incremental approach ensures stability while improving UX.