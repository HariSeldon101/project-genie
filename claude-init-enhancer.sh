#!/bin/bash

# ============================================
# Claude-Init Enhancer Script
# Adds workflow improvements to claude-init for all future projects
# Source: Project Genie
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Claude-Init Enhancer Setup${NC}"
echo "============================================"
echo "This script will add workflow improvements to your global Claude configuration"
echo ""

# Get the directory of this script (Project Genie location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLAUDE_DIR="$HOME/.claude"
TEMPLATES_DIR="$CLAUDE_DIR/templates/workflow-improvements"

# 1. Create Claude directories
echo -e "${YELLOW}📁 Creating Claude directories...${NC}"
mkdir -p "$TEMPLATES_DIR"
mkdir -p "$TEMPLATES_DIR/scripts"
mkdir -p "$TEMPLATES_DIR/lib/utils"

# 2. Copy workflow files to global templates
echo -e "${YELLOW}📥 Copying workflow files to global templates...${NC}"

# Copy scripts
cp "$SCRIPT_DIR/scripts/start-session.ts" "$TEMPLATES_DIR/scripts/" 2>/dev/null || echo "⚠️  start-session.ts not found"
cp "$SCRIPT_DIR/scripts/end-session.ts" "$TEMPLATES_DIR/scripts/" 2>/dev/null || echo "⚠️  end-session.ts not found"
cp "$SCRIPT_DIR/scripts/update-manifest.ts" "$TEMPLATES_DIR/scripts/" 2>/dev/null || echo "⚠️  update-manifest.ts not found"

# Copy logger
cp "$SCRIPT_DIR/lib/utils/permanent-logger.ts" "$TEMPLATES_DIR/lib/utils/" 2>/dev/null || echo "⚠️  permanent-logger.ts not found"

# Copy setup scripts
cp "$SCRIPT_DIR/workflow-setup.sh" "$TEMPLATES_DIR/" 2>/dev/null || echo "⚠️  workflow-setup.sh not found"
cp "$SCRIPT_DIR/CLAUDE.md" "$TEMPLATES_DIR/CLAUDE-template.md" 2>/dev/null || echo "⚠️  CLAUDE.md not found"

# Copy documentation
cp "$SCRIPT_DIR/WORKFLOW-TRANSFER-SETUP.md" "$TEMPLATES_DIR/" 2>/dev/null || echo "⚠️  Documentation not found"
cp "$SCRIPT_DIR/MCP-TOOLS-AND-AGENTS-GUIDE.md" "$TEMPLATES_DIR/" 2>/dev/null || echo "⚠️  MCP Guide not found"
cp "$SCRIPT_DIR/MCP-SUPABASE-DOCUMENTATION.md" "$TEMPLATES_DIR/" 2>/dev/null || echo "⚠️  MCP Supabase Doc not found"

# 3. Create the enhancer script in Claude directory
echo -e "${YELLOW}📝 Creating enhancer script...${NC}"
cat > "$CLAUDE_DIR/enhance-project.sh" << 'EOFILE'
#!/bin/bash

# Claude Project Enhancer
# Adds workflow improvements to any project

TEMPLATE_DIR="$HOME/.claude/templates/workflow-improvements"
TARGET_DIR="${1:-.}"

echo "🚀 Enhancing project with workflow improvements..."

# Check if target is a Node.js project
if [ ! -f "$TARGET_DIR/package.json" ]; then
  echo "❌ Error: package.json not found in $TARGET_DIR"
  echo "This enhancer is for Node.js/Next.js projects only."
  exit 1
fi

cd "$TARGET_DIR"

# Copy workflow files
echo "📁 Setting up workflow files..."
cp -r "$TEMPLATE_DIR/scripts" .
mkdir -p lib/utils
cp "$TEMPLATE_DIR/lib/utils/permanent-logger.ts" lib/utils/

# Copy CLAUDE.md if it doesn't exist
if [ ! -f "CLAUDE.md" ]; then
  cp "$TEMPLATE_DIR/CLAUDE-template.md" CLAUDE.md
  echo "✅ Created CLAUDE.md"
else
  echo "ℹ️  CLAUDE.md already exists, skipping"
fi

# Copy MCP documentation
if [ ! -f "MCP-TOOLS-AND-AGENTS-GUIDE.md" ]; then
  cp "$TEMPLATE_DIR/MCP-TOOLS-AND-AGENTS-GUIDE.md" . 2>/dev/null || echo "ℹ️  MCP guide not in templates"
fi

# Run the setup script
echo "🔧 Running setup..."
bash "$TEMPLATE_DIR/workflow-setup.sh"

echo "✅ Project enhanced with workflow improvements!"
echo ""
echo "📌 Next steps:"
echo "  1. Run: npm run session:start"
echo "  2. Run: npm run manifest:update"
echo "  3. Start development: npm run dev"
EOFILE

chmod +x "$CLAUDE_DIR/enhance-project.sh"

# 4. Update global CLAUDE.md
echo -e "${YELLOW}📝 Updating global CLAUDE.md...${NC}"

# Check if global CLAUDE.md exists
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  echo -e "${YELLOW}Creating new global CLAUDE.md...${NC}"
  cat > "$CLAUDE_DIR/CLAUDE.md" << 'EOFILE'
# Global Claude Configuration

## 🚀 WORKFLOW IMPROVEMENTS AVAILABLE

All projects now include advanced workflow improvements from Project Genie:

### Features Available:
- **Session Management**: Capture and restore development context
- **Project Manifest**: Auto-discover architecture and features
- **Persistent Logger**: Enhanced debugging with color-coded output
- **Development Tracking**: Progress logs and implementation history

### To Add to Existing Project:
```bash
~/.claude/enhance-project.sh /path/to/project
# Or from project directory:
~/.claude/enhance-project.sh
```

### Automatically Included Features:

#### Session Management
- `npm run session:start` - Recover previous session
- `npm run session:end` - Save current session
- Automatic git status tracking
- Todo and task management

#### Project Manifest
- `npm run manifest:update` - Scan project architecture
- `npm run manifest:check` - Show quick wins
- Automatic feature discovery
- Database table tracking

#### Persistent Logger
```typescript
import { logger } from '@/lib/utils/permanent-logger'
logger.info('FEATURE', 'Message', data)
logger.error('COMPONENT', 'Error message', error)
```

### MCP Servers Available:
- **GitHub MCP** (`mcp__github__*` functions) - Full repository management
- **Notion MCP** (`mcp__notion__*` functions) - Database and page operations
- **Supabase MCP** (`mcp__supabase__*` functions) - Database and Edge Functions
- **Vercel MCP** (`mcp__vercel__*` functions) - Deployment and project management
- **General-purpose agent** - Complex multi-step tasks
- **TodoWrite** - Task tracking and management

### MCP Documentation:
- `MCP-TOOLS-AND-AGENTS-GUIDE.md` - Complete MCP reference
- `MCP-SUPABASE-DOCUMENTATION.md` - Supabase MCP details

---
*Enhanced with Project Genie workflow improvements*
EOFILE
else
  # Append to existing CLAUDE.md
  echo -e "${YELLOW}Appending to existing global CLAUDE.md...${NC}"
  
  # Check if workflow section already exists
  if ! grep -q "WORKFLOW IMPROVEMENTS AVAILABLE" "$CLAUDE_DIR/CLAUDE.md"; then
    cat >> "$CLAUDE_DIR/CLAUDE.md" << 'EOFILE'

## 🚀 WORKFLOW IMPROVEMENTS AVAILABLE

All projects now include advanced workflow improvements from Project Genie:

### To Add to Existing Project:
```bash
~/.claude/enhance-project.sh /path/to/project
```

### Features:
- Session management (`npm run session:start/end`)
- Project manifest (`npm run manifest:update/check`)
- Persistent logger (`lib/utils/permanent-logger.ts`)
- Development tracking

Automatically included in new projects via claude-init.
EOFILE
  else
    echo "✅ Global CLAUDE.md already contains workflow section"
  fi
fi

# 5. Create or update claude-init wrapper
echo -e "${YELLOW}📝 Creating claude-init wrapper...${NC}"

# Create a wrapper script that enhances claude-init
cat > "$CLAUDE_DIR/claude-init-enhanced" << 'EOFILE'
#!/bin/bash

# Enhanced claude-init with workflow improvements

# First run the original claude-init if it exists
if command -v claude-init >/dev/null 2>&1; then
  claude-init "$@"
else
  echo "⚠️  claude-init not found, creating basic Next.js project..."
  npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"
fi

# Then add workflow improvements
echo ""
echo "🚀 Adding workflow improvements..."
~/.claude/enhance-project.sh .

echo ""
echo "✨ Project initialized with workflow improvements!"
echo ""
echo "📌 Key commands:"
echo "  • npm run dev         - Start development (auto-loads session)"
echo "  • npm run session:end - Save your work session"
echo "  • npm run manifest:update - Update project manifest"
echo "  • npm run manifest:check  - Show quick wins"
echo "  • npm run test:mcp    - Test MCP connections"
EOFILE

chmod +x "$CLAUDE_DIR/claude-init-enhanced"

# 6. Create quick reference card
echo -e "${YELLOW}📝 Creating quick reference...${NC}"
cat > "$TEMPLATES_DIR/QUICK-REFERENCE.md" << 'EOFILE'
# Workflow Improvements Quick Reference

## 🚀 Quick Setup for Any Project

```bash
# Navigate to your project
cd /path/to/your/project

# Run the enhancer
~/.claude/enhance-project.sh

# Start using
npm run dev
```

## 📌 Essential Commands

| Command | Description |
|---------|-------------|
| `npm run session:start` | Recover previous session |
| `npm run session:end` | Save current session |
| `npm run manifest:update` | Scan project |
| `npm run manifest:check` | Show improvements |
| `npm run dev` | Auto-starts session |

## 🔍 Logger Usage

```typescript
import { logger } from '@/lib/utils/permanent-logger'

// Log events
logger.info('COMPONENT', 'Message')
logger.error('API', 'Error', errorData)
logger.apiCall('openai', 'gpt-4', true, 250)

// Check logs
cat logs/claude-code-dev-log.md
```

## 📁 Files Created

- `SESSION_STATE.json` - Current session data
- `END_OF_SESSION.md` - Session summary
- `PROJECT_MANIFEST.json` - Project architecture
- `logs/claude-code-dev-log.md` - Debug logs
- `CLAUDE.md` - Project configuration
- `MCP-TOOLS-AND-AGENTS-GUIDE.md` - MCP reference
- `.mcp.json` - MCP configuration

## 🎯 For bigfluffy.ai

Since it uses the same stack as Project Genie:
1. Run: `~/.claude/enhance-project.sh ~/path/to/bigfluffy.ai`
2. Everything should work immediately
3. Test with: `npm run session:start`

---
*From Project Genie Workflow Improvements*
EOFILE

# 7. Summary
echo ""
echo -e "${GREEN}✅ Claude-Init Enhancer Setup Complete!${NC}"
echo "============================================"
echo ""
echo -e "${BLUE}📁 Files Created:${NC}"
echo "  • ~/.claude/templates/workflow-improvements/ (all templates)"
echo "  • ~/.claude/enhance-project.sh (enhancer script)"
echo "  • ~/.claude/claude-init-enhanced (enhanced init)"
echo "  • ~/.claude/CLAUDE.md (updated global config)"
echo ""
echo -e "${BLUE}🎯 To Use on bigfluffy.ai:${NC}"
echo "  cd ~/path/to/bigfluffy.ai"
echo "  ~/.claude/enhance-project.sh"
echo ""
echo -e "${BLUE}🚀 For New Projects:${NC}"
echo "  Use: ~/.claude/claude-init-enhanced"
echo "  Instead of: claude-init"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  • ~/.claude/templates/workflow-improvements/QUICK-REFERENCE.md"
echo "  • ~/.claude/templates/workflow-improvements/WORKFLOW-TRANSFER-SETUP.md"
echo ""
echo -e "${GREEN}🎉 Workflow improvements are now globally available!${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Add this alias to your shell:${NC}"
echo "  alias claude-init='~/.claude/claude-init-enhanced'"