#!/bin/bash

# Start Session Script - Launches Claude Code with Opus model
# This script runs the session recovery and then launches Claude Code

echo "🚀 Starting development session..."

# Navigate to project root
cd "$(dirname "$0")/.." || exit

# Check MCP server status
echo "📊 MCP Server Status Check..."
if [ -f ".mcp.json" ]; then
    echo "✅ MCP servers ENABLED (.mcp.json found)"
    echo "   Note: Using ~104k tokens for GitHub, Notion, Vercel, Supabase"
    echo "   To disable: mv .mcp.json .mcp.json.disabled"
elif [ -f ".mcp.json.disabled" ]; then
    echo "⚠️  MCP servers DISABLED (.mcp.json.disabled found)"
    echo "   Context saved: ~104k tokens available for code"
    echo "   To enable: mv .mcp.json.disabled .mcp.json"
else
    echo "ℹ️  No MCP configuration found"
fi
echo ""

# Run the TypeScript session starter (without launching Claude Code)
npx tsx scripts/start-session-updated.ts

# Now exec Claude Code to replace the shell process
# This keeps the terminal session alive
echo ""
echo "🤖 Launching Claude Code..."
echo "───────────────────────────────────────────────────"

# Launch Claude Code CLI
echo "📌 Launching Claude Code with model: claude-opus-4-1-20250805"

# Use the full path to claude to bypass the shell function
CLAUDE_PATH="/Users/stuartholmes/.nvm/versions/node/v22.17.1/bin/claude"

# Check if Claude Code CLI exists
if [ -x "$CLAUDE_PATH" ]; then
    echo "✅ Found Claude Code CLI"
    echo "📁 Working directory: $PWD"
    echo "🤖 Model: claude-opus-4-1-20250805"
    echo ""
    echo "🚀 Launching Claude Code..."
    echo "───────────────────────────────────────────────────"
    
    # Launch Claude Code in the current directory with the model parameter
    # This will start Claude Code in interactive mode
    "$CLAUDE_PATH" --model claude-opus-4-1-20250805
else
    echo "❌ Could not find Claude Code CLI at $CLAUDE_PATH"
    echo "Please ensure Claude Code is installed"
    echo ""
    echo "To install Claude Code:"
    echo "Run: npm install -g @anthropic/claude-code"
fi

# Don't exec - just exit normally so the terminal stays usable
exit 0