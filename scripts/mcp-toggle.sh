#!/bin/bash

# MCP Server Toggle Script
# Quick utility to enable/disable MCP servers to manage context usage

echo "🔧 MCP Server Management Tool"
echo "═══════════════════════════════════════════════"

# Check current status
if [ -f ".mcp.json" ]; then
    echo "📊 Current Status: ENABLED"
    echo "   - Using ~104k tokens (52% of context)"
    echo "   - Servers: GitHub, Notion, Vercel, Supabase"
    echo ""
    echo "Would you like to DISABLE MCP servers to free up context?"
    echo "Type 'disable' to confirm, or anything else to cancel:"
    read -r response
    
    if [ "$response" = "disable" ]; then
        mv .mcp.json .mcp.json.disabled
        echo "✅ MCP servers DISABLED"
        echo "   - Freed up ~104k tokens"
        echo "   - Remember to restart Claude Desktop!"
    else
        echo "❌ Cancelled - MCP servers remain enabled"
    fi
    
elif [ -f ".mcp.json.disabled" ]; then
    echo "📊 Current Status: DISABLED"
    echo "   - Saving ~104k tokens for code context"
    echo ""
    echo "Would you like to ENABLE MCP servers?"
    echo "Type 'enable' to confirm, or anything else to cancel:"
    read -r response
    
    if [ "$response" = "enable" ]; then
        mv .mcp.json.disabled .mcp.json
        echo "✅ MCP servers ENABLED"
        echo "   - GitHub, Notion, Vercel, Supabase now available"
        echo "   - Remember to restart Claude Desktop!"
    else
        echo "❌ Cancelled - MCP servers remain disabled"
    fi
    
else
    echo "⚠️  No MCP configuration found (.mcp.json or .mcp.json.disabled)"
    echo ""
    echo "To create MCP configuration, add a .mcp.json file with server definitions"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "Note: Always restart Claude Desktop after changes!"