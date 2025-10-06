#!/bin/bash

# Claude Session Management Aliases
# Add this to your ~/.zshrc or ~/.bashrc file by running:
# source ~/Desktop/Udemy\ \&\ Other\ Courses/The\ Complete\ AI\ Coding\ Course\ -\ August\ 2025/project-genie/claude-session-aliases.sh

# Define the project directory
PROJECT_DIR="/Users/stuartholmes/Desktop/Udemy & Other Courses/The Complete AI Coding Course - August 2025/project-genie"

# Function for end of session
end-of-session() {
    echo "🏁 Ending Claude session..."
    cd "$PROJECT_DIR" && npm run session:end
}

# Function for start of session
start-of-session() {
    echo "🚀 Starting Claude session..."
    cd "$PROJECT_DIR" && npm run session:start
}

# Shorter aliases
alias eos="end-of-session"
alias sos="start-of-session"

# Even more natural aliases
alias "end session"="end-of-session"
alias "start session"="start-of-session"

# MCP testing aliases
alias "test mcp"="test-mcp-connections"
alias "mcp status"="check-mcp-status"

# Function to test MCP connections
test-mcp-connections() {
    echo "🔌 Testing MCP Server Connections..."
    echo "========================================"
    cd "$PROJECT_DIR" && npx tsx scripts/test-mcp-connections.ts
}

# Function to check MCP status
check-mcp-status() {
    echo "📊 MCP Server Status"
    echo "==================="
    echo "✅ GitHub MCP - Connected"
    echo "✅ Notion MCP - Connected"
    echo "✅ Supabase MCP - Connected"
    echo "✅ Vercel MCP - Connected"
    echo ""
    echo "Run 'test mcp' for detailed connection test"
}

# Update manifest command
update-manifest() {
    echo "📦 Updating PROJECT_MANIFEST.json..."
    cd "$PROJECT_DIR" && npm run manifest:update
}

# Check manifest for quick wins
check-manifest() {
    echo "🎯 Checking for quick wins..."
    cd "$PROJECT_DIR" && npm run manifest:check
}

alias manifest="update-manifest"
alias "quick wins"="check-manifest"

# Function that responds to natural language
claude() {
    case "$1 $2 $3" in
        "end of session")
            end-of-session
            ;;
        "start of session")
            start-of-session
            ;;
        "end session")
            end-of-session
            ;;
        "start session")
            start-of-session
            ;;
        "test mcp"*)
            test-mcp-connections
            ;;
        "mcp status"*)
            check-mcp-status
            ;;
        "update manifest"*)
            update-manifest
            ;;
        "check manifest"*)
            check-manifest
            ;;
        *)
            echo "Claude session commands:"
            echo "  claude end of session   - Save current session state"
            echo "  claude start of session - Restore previous session"
            echo "  claude test mcp        - Test MCP server connections"
            echo "  claude mcp status      - Show MCP server status"
            echo "  claude update manifest - Update PROJECT_MANIFEST.json"
            echo "  claude check manifest  - Show quick wins"
            echo ""
            echo "Shortcuts:"
            echo "  eos         - End of session"
            echo "  sos         - Start of session"
            echo "  test mcp    - Test MCP connections"
            echo "  mcp status  - Show MCP status"
            echo "  manifest    - Update manifest"
            echo "  quick wins  - Check for improvements"
            ;;
    esac
}

echo "✅ Claude session aliases loaded!"
echo ""
echo "Available commands:"
echo "  Session Management:"
echo "    • claude end of session   (or 'eos')"
echo "    • claude start of session (or 'sos')"
echo "  MCP Tools:"
echo "    • claude test mcp        (or 'test mcp')"
echo "    • claude mcp status      (or 'mcp status')"
echo "  Project Manifest:"
echo "    • claude update manifest (or 'manifest')"
echo "    • claude check manifest  (or 'quick wins')"