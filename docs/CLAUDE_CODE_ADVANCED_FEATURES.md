# Claude Code Advanced Features Guide

## 🚀 Overview
This guide covers advanced Claude Code features, tools, and best practices for maximizing productivity with AI-assisted development. Learn how to leverage agents, MCP servers, and automation to streamline your workflow.

## 📚 Table of Contents
1. [Task Tool & Agents](#task-tool--agents)
2. [MCP Servers](#mcp-servers)
3. [Session Management](#session-management)
4. [Workflow Automation](#workflow-automation)
5. [Best Practices](#best-practices)

---

## 🤖 Task Tool & Agents

### Available Agent Types

#### 1. `general-purpose` Agent
**Purpose**: Handle complex, multi-step tasks autonomously
**Best for**: 
- Searching and fixing patterns across entire codebases
- Analyzing dormant features
- Running comprehensive test suites
- Refactoring code systematically

**Example Usage**:
```
Task: Find and remove all console.log statements in production code
Task: Analyze all unused exports and create a cleanup plan
Task: Search for security vulnerabilities across the codebase
```

**Capabilities**:
- File system operations (read, write, edit)
- Pattern matching and search
- Code analysis and refactoring
- Test execution and validation
- Documentation generation

#### 2. `statusline-setup` Agent
**Purpose**: Configure Claude Code status line settings
**Best for**: Setting up your development environment status indicators

**Example**: Configure status to show git branch, test status, and current task

#### 3. `output-style-setup` Agent
**Purpose**: Create custom output formatting styles
**Best for**: Customizing how Claude formats responses, test results, and reports

### How to Use Agents Effectively

#### Delegation Strategy
```typescript
// Good: Delegate complex, multi-step tasks
"Use general-purpose agent to find all TODO comments, organize by priority, and create a task list"

// Better: Chain multiple specific tasks
"1. Find all unused database tables
 2. Create migration to drop them
 3. Update documentation
 4. Run tests to verify"
```

#### Performance Tips
- Delegate search operations when unsure of file locations
- Use agents for tasks requiring multiple file operations
- Let agents handle pattern-based refactoring
- Delegate comprehensive testing and validation

---

## 🔌 MCP Servers

### What are MCP Servers?
Model Context Protocol servers extend Claude's capabilities by providing direct access to external services and databases.

### Recommended MCP Servers for Project Genie

#### 1. PostgreSQL MCP (Database Operations)
```json
{
  "mcpServers": {
    "postgres": {
      "command": "mcp-server-postgres",
      "args": ["postgresql://localhost/your_database"],
      "env": {
        "DATABASE_URL": "your-connection-string"
      }
    }
  }
}
```

**Benefits**:
- Direct SQL queries without Supabase overhead
- Complex JOIN operations
- Database performance analysis
- Schema introspection

**Use Cases**:
- Data analysis and reporting
- Performance optimization
- Database maintenance
- Complex queries for intelligence gathering

#### 2. GitHub MCP (Repository Management)
```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "args": ["--repo", "username/project-name"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token"
      }
    }
  }
}
```

**Benefits**:
- Automated issue creation for bugs
- PR management and code review
- Milestone and project tracking
- Workflow automation

**Use Cases**:
- Creating issues for discovered bugs
- Managing feature branches
- Tracking project progress
- Automated release notes

#### 3. Sentry MCP (Error Monitoring)
```json
{
  "mcpServers": {
    "sentry": {
      "command": "mcp-server-sentry",
      "args": ["--project", "your-project"],
      "env": {
        "SENTRY_DSN": "your-sentry-dsn",
        "SENTRY_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

**Benefits**:
- Real-time error tracking
- Performance monitoring
- User session replay
- Error trend analysis

#### 4. Playwright MCP (Web Automation)
```json
{
  "mcpServers": {
    "playwright": {
      "command": "mcp-server-playwright",
      "args": ["--headless", "--trace"],
      "capabilities": ["screenshot", "pdf", "video"]
    }
  }
}
```

**Benefits**:
- Enhanced web scraping
- Visual regression testing
- Automated UI testing
- PDF generation from web pages

#### 5. OpenAI MCP (LLM Management)
```json
{
  "mcpServers": {
    "openai": {
      "command": "mcp-server-openai",
      "env": {
        "OPENAI_API_KEY": "sk-your-key"
      },
      "capabilities": ["gpt-5", "embeddings", "moderation"]
    }
  }
}
```

**Benefits**:
- Direct model access
- Token usage monitoring
- Prompt optimization
- Cost tracking

### Setting Up MCP Servers

1. **Install the MCP server package**:
   ```bash
   npm install -g @modelcontextprotocol/server-name
   ```

2. **Configure in Claude Code settings**:
   - Open Claude Code settings
   - Navigate to MCP Servers section
   - Add configuration JSON

3. **Test the connection**:
   ```bash
   claude-code mcp test server-name
   ```

---

## 📊 Session Management

### Enhanced Session System

#### Current Implementation
Your project has basic session management with:
- `npm run session:end` - Captures state at end of work
- `npm run session:start` - Restores context at start
- `SESSION_STATE.json` - Machine-readable state
- `END_OF_SESSION.md` - Human-readable summary

#### Recommended Enhancements

##### 1. Todo Persistence System
```typescript
// Enhanced end-session.ts
private async captureTodoWriteState() {
  const todos = await getCurrentTodos() // Get from TodoWrite tool
  const todoState = {
    todos,
    timestamp: new Date().toISOString(),
    completionRate: calculateCompletionRate(todos),
    blockers: todos.filter(t => t.priority === 'P0')
  }
  
  fs.writeFileSync(
    '.claude-context/session/todos.json',
    JSON.stringify(todoState, null, 2)
  )
}

// Enhanced start-session.ts
private async loadTodoWriteState() {
  const todoPath = '.claude-context/session/todos.json'
  if (fs.existsSync(todoPath)) {
    const todos = JSON.parse(fs.readFileSync(todoPath, 'utf8'))
    // Automatically load into TodoWrite tool
    await loadTodos(todos)
  }
}
```

##### 2. Context Folder Structure
```
.claude-context/
├── immediate/          # Files for immediate review
│   ├── critical-fixes.md
│   ├── current-todos.md
│   └── blockers.md
├── reference/          # Always-available docs
│   ├── guidelines.md
│   ├── architecture.md
│   └── api-docs.md
└── session/           # Session-specific state
    ├── todos.json
    ├── context.json
    └── metrics.json
```

##### 3. Auto-Context Loading
```typescript
// Add to start-session.ts
private async loadImmediateContext() {
  const immediateFiles = fs.readdirSync('.claude-context/immediate/')
  const context = []
  
  for (const file of immediateFiles) {
    const content = fs.readFileSync(`.claude-context/immediate/${file}`, 'utf8')
    context.push({
      file,
      content,
      priority: extractPriority(content)
    })
  }
  
  // Sort by priority and display
  return context.sort((a, b) => a.priority - b.priority)
}
```

---

## 🔄 Workflow Automation

### Automated Workflows with Agents

#### 1. Daily Standup Automation
```typescript
// Create daily standup report
const dailyStandup = async () => {
  // Use general-purpose agent
  await runAgent('general-purpose', {
    task: `
      1. Check git log for yesterday's commits
      2. Review completed todos from SESSION_STATE.json
      3. Identify current blockers
      4. List today's priorities
      5. Generate standup report in STANDUP.md
    `
  })
}
```

#### 2. Code Quality Audit
```typescript
// Weekly code quality check
const codeAudit = async () => {
  await runAgent('general-purpose', {
    task: `
      1. Find all TODO and FIXME comments
      2. Check for console.log statements
      3. Identify unused exports
      4. Find duplicate code patterns
      5. Generate AUDIT_REPORT.md with findings
    `
  })
}
```

#### 3. Feature Discovery Pipeline
```typescript
// Find and activate dormant features
const featureDiscovery = async () => {
  await runAgent('general-purpose', {
    task: `
      1. Analyze PROJECT_MANIFEST.json for dormant features
      2. Check database for empty tables
      3. Find disabled feature flags
      4. Create activation plan
      5. Generate scripts to enable features
    `
  })
}
```

### Hooks for Automation

#### Available Hook Points
- `PreToolUse` - Before any tool execution
- `PostToolUse` - After tool execution
- `SessionStart` - When session begins
- `SessionEnd` - When session ends
- `FileEdit` - Before/after file modifications
- `TestRun` - Before/after test execution

#### Example Hook Configuration
```json
{
  "hooks": {
    "preCommit": {
      "command": "npm run test && npm run lint",
      "blocking": true
    },
    "postFileEdit": {
      "command": "npm run format",
      "pattern": "*.{ts,tsx,js,jsx}"
    },
    "sessionEnd": {
      "command": "npm run session:end",
      "automatic": true
    }
  }
}
```

---

## 🎯 Best Practices

### 1. Agent Delegation Strategy

#### When to Use Agents
✅ **Good Candidates**:
- Tasks requiring search across multiple files
- Pattern-based refactoring
- Comprehensive testing
- Documentation generation
- Complex multi-step operations

❌ **Don't Use Agents For**:
- Simple file reads (use Read tool)
- Single file edits (use Edit tool)
- Known file locations (direct access)
- Quick checks (use Grep tool)

### 2. MCP Server Selection

#### Priority Order
1. **Essential**: Supabase (already configured)
2. **High Value**: PostgreSQL, GitHub
3. **Monitoring**: Sentry, Analytics
4. **Enhancement**: Playwright, OpenAI
5. **Optional**: Slack, Discord, Email

### 3. Session Management Best Practices

#### Start of Session
1. Run `npm run session:start`
2. Review immediate context folder
3. Check blockers and P0 tasks
4. Update PROJECT_MANIFEST.json
5. Run tests to verify state

#### During Session
1. Use TodoWrite tool continuously
2. Commit frequently with clear messages
3. Update documentation as you go
4. Run tests before major changes
5. Keep session notes in NOTES.md

#### End of Session
1. Complete current task or reach stable state
2. Run `npm run session:end`
3. Review generated summary
4. Move completed items to archive
5. Update immediate context for next session

### 4. Performance Optimization

#### Agent Performance
- Batch related tasks together
- Use specific search patterns
- Provide clear success criteria
- Set reasonable timeouts
- Monitor resource usage

#### MCP Server Performance
- Cache frequently accessed data
- Use connection pooling
- Implement rate limiting
- Monitor API quotas
- Log all operations

### 5. Error Handling

#### Agent Error Recovery
```typescript
try {
  await runAgent('general-purpose', { task })
} catch (error) {
  // Fallback to manual operation
  console.error('Agent failed, attempting manual approach')
  await manualApproach()
}
```

#### MCP Server Failover
```typescript
const queryDatabase = async (query) => {
  try {
    // Try MCP server first
    return await mcpPostgres.query(query)
  } catch {
    // Fallback to Supabase
    return await supabase.rpc('execute_query', { query })
  }
}
```

---

## 🚀 Quick Start Commands

### Session Management
```bash
npm run session:start    # Start work session
npm run session:end      # End work session
npm run session:status   # Check current session
```

### Manifest Management
```bash
npm run manifest:update  # Update PROJECT_MANIFEST.json
npm run manifest:check   # Find quick wins
npm run manifest:audit   # Full feature audit
```

### Archive Management
```bash
npm run archive:stats           # View archive statistics
npm run archive:restore <file>  # Restore archived file
npm run archive:add <file>      # Archive a file
```

### Testing
```bash
npm run test:all         # Run all tests
npm run test:ui          # UI tests only
npm run test:api         # API tests only
npm run test:coverage    # Generate coverage report
```

---

## 📈 Metrics & Monitoring

### Key Metrics to Track
1. **Session Metrics**
   - Tasks completed per session
   - Average task completion time
   - Blocker resolution rate
   - Code quality trends

2. **Agent Performance**
   - Success rate by task type
   - Average execution time
   - Resource consumption
   - Error frequency

3. **MCP Server Usage**
   - API calls per server
   - Response times
   - Error rates
   - Cost per operation

### Monitoring Setup
```javascript
// Example monitoring configuration
const monitoring = {
  agents: {
    logLevel: 'info',
    metrics: ['duration', 'success', 'errors'],
    alerts: {
      errorRate: 0.1,  // Alert if >10% errors
      duration: 30000   // Alert if >30s execution
    }
  },
  mcp: {
    servers: ['postgres', 'github', 'sentry'],
    metrics: ['latency', 'throughput', 'errors'],
    sampling: 0.1  // Sample 10% of requests
  }
}
```

---

## 🔮 Future Enhancements

### Coming Soon
1. **Auto-learning agents** - Agents that learn from your patterns
2. **Custom MCP servers** - Build your own service integrations
3. **Visual workflow builder** - Drag-and-drop automation
4. **Team collaboration** - Shared contexts and sessions
5. **AI pair programming** - Real-time code suggestions

### Experimental Features
- Voice commands for agents
- Automatic PR generation
- Intelligent test generation
- Performance optimization suggestions
- Security vulnerability scanning

---

## 📚 Additional Resources

### Documentation
- [Claude Code Official Docs](https://docs.anthropic.com/claude-code)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Agent Development Guide](https://docs.anthropic.com/agents)

### Community
- GitHub Issues: Report bugs and request features
- Discord: Join the Claude Code community
- Forums: Share tips and workflows

### Support
- Email: support@anthropic.com
- Documentation: /help command in Claude Code
- Feedback: https://github.com/anthropics/claude-code/issues

---

*Last Updated: January 2025*
*Version: 1.0.0*
*Author: Claude Code Assistant*