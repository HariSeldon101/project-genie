# UI Standards and Requirements

**Last Updated**: January 7, 2025  
**Status**: MANDATORY for all UI development

## 🎯 Core Principle: Every Interaction Needs Explanation

Users should never have to guess what a UI element does. Every interactive element must provide clear, contextual guidance through tooltips.

## 📋 Mandatory Tooltip Coverage (Implemented January 2025)

### Why Tooltips Are Required:
- **Reduces Confusion**: Users instantly understand functionality
- **Decreases Support Burden**: Fewer "how do I..." questions
- **Improves Accessibility**: Helps users with varying technical expertise
- **Provides Context**: Explains values, states, and expected outcomes
- **Enhances Discoverability**: Users learn about features they might miss

### Implementation Standards

#### 1. Buttons
**Requirement**: Describe the specific action and outcome

```tsx
// ✅ GOOD - Specific and actionable
<TooltipWrapper content="Save changes and return to dashboard">
  <Button>Save</Button>
</TooltipWrapper>

<TooltipWrapper content="Delete this item permanently (cannot be undone)">
  <Button variant="destructive">Delete</Button>
</TooltipWrapper>

// ❌ BAD - Vague or redundant
<TooltipWrapper content="Click to save">
  <Button>Save</Button>
</TooltipWrapper>
```

#### 2. Icons
**Requirement**: Explain what the icon represents and its current state

```tsx
// ✅ GOOD - Clear meaning and context
<TooltipWrapper content="Website validation successful - all checks passed">
  <CheckCircle className="text-green-500" />
</TooltipWrapper>

<TooltipWrapper content="Processing web scraping - Phase 2 of 3">
  <Loader2 className="animate-spin" />
</TooltipWrapper>

// ❌ BAD - No context
<TooltipWrapper content="Check">
  <CheckCircle />
</TooltipWrapper>
```

#### 3. Badges
**Requirement**: Provide additional context about the displayed value

```tsx
// ✅ GOOD - Explains the number
<TooltipWrapper content="18 unique pages: 12 from sitemap, 6 from crawling">
  <Badge>18 pages</Badge>
</TooltipWrapper>

<TooltipWrapper content="High confidence score based on 5 validation checks">
  <Badge variant="success">95%</Badge>
</TooltipWrapper>

// ❌ BAD - No context for the value
<Badge>18</Badge>  // What is 18?
```

#### 4. Input Fields
**Requirement**: Provide format guidance and validation rules

```tsx
// ✅ GOOD - Clear instructions
<TooltipWrapper content="Enter domain without protocol (e.g., example.com, not https://example.com)">
  <Input placeholder="company.com" />
</TooltipWrapper>

<TooltipWrapper content="Use format: +1-555-555-5555 or (555) 555-5555">
  <Input type="tel" placeholder="Phone number" />
</TooltipWrapper>

// ❌ BAD - No format guidance
<Input placeholder="Enter domain" />
```

#### 5. Complex UI Elements
**Requirement**: Explain how to interact and what to expect

```tsx
// ✅ GOOD - Full usage instructions
<TooltipWrapper content="Select pages for scraping. Use checkboxes for individual selection, or use Select All/None buttons for bulk actions. Selected pages will be analyzed for content.">
  <TreeView items={pages} />
</TooltipWrapper>

<TooltipWrapper content="Drag to reorder. Higher priority items will be processed first. Changes save automatically.">
  <DraggableList items={tasks} />
</TooltipWrapper>
```

### Component-Specific Requirements

#### Navigation Elements
- Main nav items: Describe the section/page
- Sub-nav items: Explain the specific feature
- Breadcrumbs: Show full path on hover

#### Form Controls
- Checkboxes: Explain what enabling/disabling does
- Radio buttons: Describe each option's effect
- Toggles: Clearly state on/off consequences
- Selects: Explain what the selection controls

#### Data Display
- Tables: Column headers explain data
- Charts: Axes and data points have context
- Progress bars: Show exact progress and ETA
- Status indicators: Explain current state and next steps

#### Action Elements
- Confirm buttons: State what will happen
- Cancel buttons: Explain what will be discarded
- Download buttons: Specify format and content
- Upload areas: List accepted formats and limits

### Testing Checklist

Before marking any UI component as complete:

- [ ] **Coverage**: Every interactive element has a tooltip
- [ ] **Clarity**: Tooltips are clear and jargon-free
- [ ] **Helpfulness**: Information is actually useful, not obvious
- [ ] **Consistency**: Similar elements have similar tooltip styles
- [ ] **Brevity**: Tooltips are concise (usually under 100 characters)
- [ ] **Accuracy**: Tooltips match actual functionality
- [ ] **Mobile**: Tooltips work on touch devices
- [ ] **Accessibility**: Screen readers can access tooltip content
- [ ] **Performance**: Tooltips don't cause layout shifts
- [ ] **Context**: Dynamic tooltips update with state changes

### Implementation Tools

#### Primary Component
```tsx
// Location: /components/company-intelligence/tooltip-wrapper.tsx
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
```

#### Usage Pattern
```tsx
// Basic usage
<TooltipWrapper content="Helpful explanation">
  <YourComponent />
</TooltipWrapper>

// With dynamic content
<TooltipWrapper content={`${count} items selected`}>
  <Badge>{count}</Badge>
</TooltipWrapper>

// With rich content
<TooltipWrapper 
  content={
    <div>
      <p className="font-semibold">Advanced Options</p>
      <p className="text-sm">Configure detailed settings</p>
    </div>
  }
>
  <Button variant="outline">Settings</Button>
</TooltipWrapper>
```

### Common Tooltip Templates

#### For Buttons
- "Save [what] and [what happens next]"
- "Delete [what] (this cannot be undone)"
- "Navigate to [destination]"
- "Start [process name]"
- "Download [what] as [format]"

#### For Status Indicators
- "[Current state]: [What this means]"
- "Processing: [Current step] of [total steps]"
- "Error: [What went wrong]. [How to fix]"
- "Success: [What completed]. [Next steps]"

#### For Data Values
- "[Value]: [What it represents] ([How calculated])"
- "[Count] [items]: [Breakdown or source]"
- "[Percentage]: [What it measures] ([Good/bad indicator])"

### Enforcement

1. **Code Review**: No PR merged without tooltip coverage
2. **Testing**: Automated tests check for tooltip presence
3. **Documentation**: Update when adding new UI patterns
4. **Monitoring**: Track tooltip helpfulness via user feedback

### Examples from Current Implementation

#### Company Intelligence - Sitemap Discovery
```tsx
// Page count badge
<TooltipWrapper content="22 unique pages discovered: 18 from sitemap.xml, 4 from homepage crawling">
  <Badge>22 pages found</Badge>
</TooltipWrapper>

// TreeView selection
<TooltipWrapper content="Select pages to include in web scraping. Use checkboxes for individual pages or bulk selection buttons below.">
  <RichTreeView items={pages} />
</TooltipWrapper>

// Approve button
<TooltipWrapper content="Confirm page selection and begin web scraping phase">
  <Button>Approve & Continue</Button>
</TooltipWrapper>
```

### Migration Strategy for Existing UI

1. **Priority 1**: Critical user paths (onboarding, core features)
2. **Priority 2**: Frequently used features
3. **Priority 3**: Admin and settings pages
4. **Priority 4**: Rarely used features

### Tooltip Content Guidelines

#### DO:
- ✅ Use active voice
- ✅ Be specific about outcomes
- ✅ Include units for numbers
- ✅ Mention keyboard shortcuts if available
- ✅ Warn about destructive actions
- ✅ Update dynamically with state

#### DON'T:
- ❌ Repeat the label text
- ❌ Use technical jargon
- ❌ Make tooltips longer than 2 sentences
- ❌ Include marketing language
- ❌ Use ALL CAPS (except for warnings)
- ❌ Leave placeholder text

### Accessibility Requirements

1. **Keyboard Access**: Tooltips must be triggerable via keyboard focus
2. **Screen Readers**: Content must be available to assistive technology
3. **Timing**: Tooltips should remain visible while hovered/focused
4. **Contrast**: Tooltip text must meet WCAG AA contrast requirements
5. **Position**: Tooltips must not obscure important content

### Performance Considerations

1. **Lazy Loading**: Load tooltip content only when needed
2. **Debouncing**: Delay tooltip show to prevent flashing
3. **Virtualization**: For lists with many tooltips, virtualize rendering
4. **Caching**: Cache tooltip content that doesn't change

### Monitoring and Improvement

Track:
- Which tooltips are viewed most frequently
- Which UI elements cause confusion (high tooltip views)
- User feedback on tooltip helpfulness
- Areas where users still get stuck despite tooltips

---

## 🚨 Remember: No UI Without Tooltips!

This is not optional. Every new UI element added to the codebase must have a descriptive tooltip. This standard applies to:
- All new features
- All bug fixes that touch UI
- All refactoring that involves UI components

**Last Audit**: January 7, 2025  
**Next Audit**: February 1, 2025  
**Compliance Target**: 100% tooltip coverage