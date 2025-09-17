# Archive Restoration Guide

## Overview
This archive contains legacy test files, unused components, and old documentation that have been moved from the main codebase to reduce clutter while maintaining the ability to restore them if needed.

## Archive Structure
```
/archive/
├── components/      # Unused UI components
├── tests/          # Old test files
├── docs/           # Legacy documentation
├── scripts/        # Old utility scripts
└── ARCHIVE_MANIFEST.json  # Restoration metadata
```

## How to Restore Files

### Method 1: Using the Restore Script
```bash
# Restore a single file
npm run archive:restore <filename>

# Restore multiple files
npm run archive:restore test-*.ts

# Restore an entire category
npm run archive:restore --category tests
```

### Method 2: Manual Restoration
1. Check `ARCHIVE_MANIFEST.json` for the original path
2. Copy the file from archive to its original location:
   ```bash
   cp archive/tests/test-file.ts ./test-file.ts
   ```

### Method 3: Restore All Files
```bash
# Restore everything (use with caution)
npm run archive:restore --all
```

## Archive Manifest Structure
Each archived file is tracked in `ARCHIVE_MANIFEST.json` with:
- `originalPath`: Where the file was originally located
- `archivePath`: Current location in archive
- `archivedDate`: When it was archived
- `reason`: Why it was archived
- `category`: Type of file (test, component, doc, script)

## Categories

### Tests (`/archive/tests/`)
- Old test files that are no longer actively used
- Superseded test implementations
- Test utilities that have been replaced

### Components (`/archive/components/`)
- Unused UI components
- Legacy implementations
- Duplicate components that were consolidated

### Documentation (`/archive/docs/`)
- Old documentation files
- Outdated implementation guides
- Legacy TODO files

### Scripts (`/archive/scripts/`)
- Old utility scripts
- Deprecated automation tools
- Legacy setup files

## When to Restore Files

Consider restoring files when:
1. You need to reference old implementations
2. A "deleted" feature needs to be re-implemented
3. You need to understand historical context
4. Testing legacy compatibility

## Best Practices

1. **Before Restoring**: Check if the functionality exists elsewhere
2. **After Restoring**: Update the file to current standards
3. **Document**: Note why the file was restored in git commit
4. **Clean Up**: Re-archive if only needed temporarily

## Quick Reference

### Find a File
```bash
# Search archive by name
find archive -name "*pattern*"

# Search archive manifest
grep "filename" archive/ARCHIVE_MANIFEST.json
```

### View Archive Statistics
```bash
# Count archived files by category
npm run archive:stats
```

### Archive New Files
```bash
# Archive a file (updates manifest automatically)
npm run archive:add <file-path> --reason "explanation"
```

## Important Notes

- Files are archived, not deleted - they can always be restored
- The archive is included in git history
- Consider removing from archive after 6 months of non-use
- Keep archive organized - don't use as a dumping ground

---

*Archive created: January 2025*
*Last updated: Check ARCHIVE_MANIFEST.json for latest activity*