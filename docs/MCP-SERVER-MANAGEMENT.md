# MCP Server Management Guide

## 🚨 Current Status: DISABLED (as of 2025-01-12)

### Why MCP Servers Were Disabled
- **Context Usage**: 104k tokens (52% of total context limit)
- **Impact**: Severely limiting space for actual code and conversations
- **Solution**: Disabled by renaming `.mcp.json` → `.mcp.json.disabled`

## Quick Commands

### Check Status
```bash
npm run mcp:status
```

### Enable MCP Servers
```bash
npm run mcp:enable
# Then restart Claude Desktop completely
```

### Disable MCP Servers
```bash
npm run mcp:disable
# Then restart Claude Desktop completely
```

### Interactive Toggle
```bash
npm run mcp:toggle
# Or directly: ./scripts/mcp-toggle.sh
```

## MCP Servers Available

When enabled, the following servers are configured:

| Server | Purpose | Token Usage |
|--------|---------|-------------|
| **GitHub** | Repository operations, PRs, issues | ~25k tokens |
| **Notion** | Documentation, database operations | ~25k tokens |
| **Vercel** | Deployment, environment variables | ~40k tokens |
| **Supabase** | Database migrations, Edge Functions | ~14k tokens |

## When to Enable MCP Servers

Only enable when you specifically need:

### GitHub MCP
- Creating/updating repositories
- Managing pull requests
- Working with issues
- Code search across repos

### Notion MCP
- Creating documentation pages
- Managing databases
- Updating project docs

### Vercel MCP
- Deploying applications
- Managing environment variables
- Domain configuration
- Edge function deployment

### Supabase MCP
- Database migrations
- Edge function management
- Database queries
- Schema updates

## Best Practices

1. **Default State**: Keep MCP servers DISABLED for maximum context
2. **Enable Temporarily**: Only enable when needed for specific tasks
3. **Disable After Use**: Return to disabled state after completing MCP tasks
4. **Restart Required**: Always restart Claude Desktop after toggling

## Configuration Files

- **Active Config**: `.mcp.json` (when enabled)
- **Disabled Config**: `.mcp.json.disabled` (when disabled)
- **Location**: Project root directory

## Session Management Integration

The session scripts automatically check MCP status:
- `START_OF_SESSION.md` - Documents current state
- `END_OF_SESSION.md` - Records state for next session
- `scripts/start-session.sh` - Shows status on startup

## Troubleshooting

### MCP Servers Still Showing After Disable
1. Ensure `.mcp.json` is renamed to `.mcp.json.disabled`
2. **Completely quit Claude Desktop** (not just close window)
3. Restart Claude Desktop
4. Check with `/context` command

### Need Specific MCP Server Only
Currently all-or-nothing. Consider:
1. Temporarily edit `.mcp.json` to include only needed server
2. Re-enable with reduced configuration
3. Remember to restore full config when done

---

*This guide helps manage context usage by controlling MCP server availability*