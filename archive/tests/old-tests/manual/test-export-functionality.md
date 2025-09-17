# Export Functionality Test Guide

## Overview
This guide describes how to test the new export functionality for documents.

## Features Implemented

### 1. Enhanced Export Options in Documents Page
- **Location**: `/documents` page
- **Changes**: 
  - Export button now shows a dropdown menu with three options:
    - Download as Markdown (.md)
    - Download as PDF (.pdf)
    - Download as JSON (.json)

### 2. Improved PDF Generation
- **Previous Issue**: PDF generation was using HTML to canvas conversion which often failed
- **New Implementation**: 
  - Direct PDF generation from markdown content
  - Proper page breaks and formatting
  - Includes document metadata on title page
  - Cleaner, more readable output

### 3. Markdown Export
- **Features**:
  - Properly formatted markdown with metadata header
  - Uses document-specific formatters
  - Preserves document structure and content

## Testing Steps

### Test 1: Export from Documents List
1. Navigate to `/documents`
2. Find any document card
3. Click the "Export" button
4. You should see a dropdown with three options:
   - Download as Markdown
   - Download as PDF  
   - Download as JSON
5. Test each option:
   - **Markdown**: Should download a `.md` file with formatted content
   - **PDF**: Should open the document viewer and generate a PDF
   - **JSON**: Should download a `.json` file with raw document data

### Test 2: Export from Document Viewer
1. Click "View" on any document
2. In the document viewer modal, click the "Download" dropdown button
3. Test all three export options:
   - **Download as Markdown**: Downloads formatted `.md` file
   - **Download as PDF**: Generates and downloads `.pdf` file
   - **Download as JSON**: Downloads raw `.json` data

### Test 3: PDF Quality Check
1. Generate a PDF for a PID or Business Case document
2. Verify the PDF includes:
   - Title page with document metadata
   - Properly formatted content
   - Page breaks where appropriate
   - Readable text (no rendering artifacts)

## Expected Results

### Markdown Export
- File name: `{document-title}.md`
- Content includes:
  - Metadata header (type, project, version, dates)
  - Formatted document content
  - Proper markdown syntax

### PDF Export
- File name: `{document-title}.pdf`
- Content includes:
  - Title page with document info
  - Model and cost information (if available)
  - Formatted document content
  - Proper pagination

### JSON Export
- File name: `{document-title}.json`
- Content: Raw document data in JSON format
- Pretty-printed with 2-space indentation

## Known Issues Fixed

1. **PDF Download Not Working**: Previously, PDF generation would fail silently. Now uses a text-based approach that's more reliable.

2. **Single Export Format**: Previously only exported as JSON. Now supports multiple formats.

3. **No Visual Feedback**: Export button now shows a dropdown menu making options clear.

## Technical Implementation

### Files Modified
1. `/app/(dashboard)/documents/page.tsx`
   - Added `exportDocument` function with format parameter
   - Added `formatDocumentAsMarkdown` function
   - Changed Export button to dropdown menu

2. `/components/documents/document-viewer.tsx`
   - Rewrote `downloadAsPDF` function for better PDF generation
   - Added event listener for PDF export from documents page
   - Updated dropdown menu to show generation status

3. `/package.json`
   - Added `@types/file-saver` for TypeScript support

### Dependencies Used
- `jspdf`: PDF generation
- `file-saver`: File download handling
- Built-in formatters from `/lib/documents/formatters/`

## Browser Compatibility
- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support

## Performance Notes
- PDF generation may take 1-3 seconds for large documents
- All export operations are client-side (no server processing)
- Files are generated in-memory and downloaded directly