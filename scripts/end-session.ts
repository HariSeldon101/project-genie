#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SessionState {
  timestamp: string;
  lastUpdated: string;
  gitStatus: {
    branch: string;
    uncommittedFiles: string[];
    modifiedFiles: string[];
    untrackedFiles: string[];
    lastCommit: string;
  };
  activeTasks: {
    inProgress: string[];
    pending: string[];
    blockers: string[];
  };
  agentTodos: {
    completed: string[];
    inProgress: string[];
    pending: string[];
    priorityForNextSession: string[];
  };
  activeAgents: string[];
  currentContext: {
    activeFeature: string;
    lastWorkingFiles: string[];
    openIssues: string[];
    testResults?: {
      passing: number;
      failing: number;
      lastRun: string;
    };
  };
  environmentState: {
    runningServers: string[];
    openPorts: number[];
    backgroundProcesses: string[];
  };
  nextSteps: string[];
  criticalNotes: string[];
}

class SessionManager {
  private projectRoot: string;
  private sessionState: SessionState;

  constructor() {
    this.projectRoot = process.cwd();
    this.sessionState = this.initializeSessionState();
  }

  private initializeSessionState(): SessionState {
    return {
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      gitStatus: {
        branch: '',
        uncommittedFiles: [],
        modifiedFiles: [],
        untrackedFiles: [],
        lastCommit: ''
      },
      activeTasks: {
        inProgress: [],
        pending: [],
        blockers: []
      },
      agentTodos: {
        completed: [],
        inProgress: [],
        pending: [],
        priorityForNextSession: []
      },
      activeAgents: [],
      currentContext: {
        activeFeature: '',
        lastWorkingFiles: [],
        openIssues: []
      },
      environmentState: {
        runningServers: [],
        openPorts: [],
        backgroundProcesses: []
      },
      nextSteps: [],
      criticalNotes: []
    };
  }

  private runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8', cwd: this.projectRoot }).trim();
    } catch (error) {
      return '';
    }
  }

  private captureGitStatus() {
    console.log('📊 Capturing Git status...');
    
    this.sessionState.gitStatus.branch = this.runCommand('git branch --show-current');
    
    const status = this.runCommand('git status --porcelain');
    const lines = status.split('\n').filter(Boolean);
    
    lines.forEach(line => {
      const [type, file] = line.split(/\s+/);
      if (type.includes('M')) {
        this.sessionState.gitStatus.modifiedFiles.push(file);
      }
      if (type.includes('??')) {
        this.sessionState.gitStatus.untrackedFiles.push(file);
      }
      this.sessionState.gitStatus.uncommittedFiles.push(file);
    });

    const lastCommit = this.runCommand('git log -1 --oneline');
    this.sessionState.gitStatus.lastCommit = lastCommit;
  }

  private captureTodos() {
    console.log('📝 Reading todo files...');
    
    const todoFiles = [
      'todo.md',
      'TODO.md',
      'claude-tasks-todo-sept-7.md',
      'CRITICAL-TODO-REMOVE-FALLBACKS.md',
      'CLEANUP-TODO.md'
    ];

    const todos: string[] = [];
    const blockers: string[] = [];

    todoFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          if (line.includes('[ ]') || line.includes('TODO:')) {
            todos.push(line.trim());
          }
          if (line.toLowerCase().includes('blocker') || line.toLowerCase().includes('fatal')) {
            blockers.push(line.trim());
          }
        });
      }
    });

    this.sessionState.activeTasks.pending = todos.slice(0, 10); // Top 10 todos
    this.sessionState.activeTasks.blockers = blockers;
  }

  private captureRecentFiles() {
    console.log('📁 Identifying recently modified files...');
    
    // Get files modified in last 24 hours
    const recentFiles = this.runCommand(
      "find . -type f -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' | head -20"
    ).split('\n').filter(Boolean);
    
    this.sessionState.currentContext.lastWorkingFiles = recentFiles;
  }

  private captureEnvironmentState() {
    console.log('🖥️  Capturing environment state...');
    
    // Check for running dev servers
    const ports = this.runCommand('lsof -i :3000,3001,3006 | grep LISTEN | head -5');
    if (ports) {
      this.sessionState.environmentState.runningServers.push('Next.js dev server detected');
      this.sessionState.environmentState.openPorts = [3000, 3001, 3006].filter(port => 
        ports.includes(`:${port}`)
      );
    }

    // Check for node processes
    const nodeProcesses = this.runCommand('ps aux | grep node | grep -v grep | head -3');
    if (nodeProcesses) {
      this.sessionState.environmentState.backgroundProcesses = nodeProcesses.split('\n');
    }
  }

  private identifyActiveFeature() {
    console.log('🎯 Identifying active feature...');
    
    // Based on recent file modifications
    const modifiedFiles = this.sessionState.gitStatus.modifiedFiles.join(' ');
    
    if (modifiedFiles.includes('company-intelligence')) {
      this.sessionState.currentContext.activeFeature = 'Company Intelligence Feature';
    } else if (modifiedFiles.includes('pdf')) {
      this.sessionState.currentContext.activeFeature = 'PDF Generation';
    } else if (modifiedFiles.includes('project')) {
      this.sessionState.currentContext.activeFeature = 'Project Management';
    } else {
      this.sessionState.currentContext.activeFeature = 'General Development';
    }
  }

  private generateNextSteps() {
    console.log('🚀 Generating next steps...');
    
    const nextSteps: string[] = [];
    
    // Based on uncommitted files
    if (this.sessionState.gitStatus.uncommittedFiles.length > 0) {
      nextSteps.push('Review and commit uncommitted changes');
    }
    
    // Based on blockers
    if (this.sessionState.activeTasks.blockers.length > 0) {
      nextSteps.push('Address critical blockers identified in todos');
    }
    
    // Based on test results
    const testResults = this.runCommand('npm test 2>&1 | head -10');
    if (testResults.includes('fail')) {
      nextSteps.push('Fix failing tests');
    }
    
    // Based on active feature
    if (this.sessionState.currentContext.activeFeature === 'Company Intelligence Feature') {
      nextSteps.push('Continue Company Intelligence implementation');
      nextSteps.push('Run comprehensive tests: npx tsx test-company-intelligence-comprehensive.ts');
    }
    
    this.sessionState.nextSteps = nextSteps;
  }

  private addCriticalNotes() {
    console.log('⚠️  Adding critical notes...');
    
    const notes: string[] = [];
    
    // CRITICAL: No mock data or fallbacks
    notes.push('🚨 CRITICAL: NO MOCK DATA, NO FALLBACKS, NO SILENT FAILURES - Errors must be visible!');
    
    // Check for sensitive files
    if (this.sessionState.gitStatus.modifiedFiles.some(f => f.includes('.env'))) {
      notes.push('WARNING: Environment files modified - verify no secrets committed');
    }
    
    // Check for migration files
    if (this.sessionState.gitStatus.modifiedFiles.some(f => f.includes('migration'))) {
      notes.push('Database migrations pending - remember to run: supabase db push');
    }
    
    // Check manifest
    notes.push('Remember to run: npm run manifest:update to update PROJECT_MANIFEST.json');
    
    this.sessionState.criticalNotes = notes;
  }

  private saveSessionState() {
    console.log('💾 Saving session state...');
    
    const sessionPath = path.join(this.projectRoot, 'SESSION_STATE.json');
    fs.writeFileSync(sessionPath, JSON.stringify(this.sessionState, null, 2));
    
    console.log(`✅ Session state saved to: ${sessionPath}`);
  }

  private generateMarkdownSummary() {
    console.log('📄 Generating markdown summary...');
    
    const summary = `# End of Session Summary

**Generated**: ${new Date().toLocaleString()}
**Branch**: ${this.sessionState.gitStatus.branch}
**Active Feature**: ${this.sessionState.currentContext.activeFeature}

## Git Status
- **Modified Files**: ${this.sessionState.gitStatus.modifiedFiles.length}
- **Untracked Files**: ${this.sessionState.gitStatus.untrackedFiles.length}
- **Last Commit**: ${this.sessionState.gitStatus.lastCommit}

## Active Tasks
### In Progress
${this.sessionState.activeTasks.inProgress.map(t => `- ${t}`).join('\n') || '- None identified'}

### Pending
${this.sessionState.activeTasks.pending.slice(0, 5).map(t => `- ${t}`).join('\n') || '- None identified'}

### Blockers
${this.sessionState.activeTasks.blockers.map(t => `- ⚠️ ${t}`).join('\n') || '- None identified'}

## Agent TodoWrite Tasks
### Completed This Session
${this.sessionState.agentTodos.completed.map(t => `- ✅ ${t}`).join('\n') || '- None'}

### Currently In Progress
${this.sessionState.agentTodos.inProgress.map(t => `- 🔄 ${t}`).join('\n') || '- None'}

### Pending Tasks
${this.sessionState.agentTodos.pending.map(t => `- 📋 ${t}`).join('\n') || '- None'}

### Priority Tasks for Next Session
${this.sessionState.agentTodos.priorityForNextSession.map(t => `- 🎯 ${t}`).join('\n') || '- To be selected'}

## Active Agents & Tools
${this.sessionState.activeAgents.map(a => `- ${a}`).join('\n') || '- None detected'}

## Recent Working Files
${this.sessionState.currentContext.lastWorkingFiles.slice(0, 10).map(f => `- ${f}`).join('\n')}

## Environment State
- **Running Servers**: ${this.sessionState.environmentState.runningServers.join(', ') || 'None detected'}
- **Open Ports**: ${this.sessionState.environmentState.openPorts.join(', ') || 'None detected'}

## Next Steps
${this.sessionState.nextSteps.map(s => `1. ${s}`).join('\n')}

## Critical Notes
${this.sessionState.criticalNotes.map(n => `- ⚠️ ${n}`).join('\n')}

---
*This summary was automatically generated by the session management system*
`;

    const summaryPath = path.join(this.projectRoot, 'END_OF_SESSION.md');
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`✅ Markdown summary saved to: ${summaryPath}`);
  }

  private updateManifest() {
    console.log('📦 Updating PROJECT_MANIFEST.json...');
    
    try {
      // Run manifest update
      execSync('npm run manifest:update', { cwd: this.projectRoot, stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Could not update manifest automatically');
    }
  }

  private captureAgentTodos() {
    console.log('🤖 Capturing Agent TodoWrite Tasks...');
    console.log('\n══════════════════════════════════════════════════');
    console.log('📋 CURRENT TODOWRITE AGENT TASK LIST');
    console.log('══════════════════════════════════════════════════\n');
    
    // Check if TODOWRITE_STATE.json exists and read it
    const todoStatePath = path.join(this.projectRoot, 'TODOWRITE_STATE.json');
    let todoState: any = { todos: [] };
    
    if (fs.existsSync(todoStatePath)) {
      try {
        const content = fs.readFileSync(todoStatePath, 'utf8');
        todoState = JSON.parse(content);
        console.log('✅ Found TodoWrite state file');
      } catch (error) {
        console.log('⚠️  Could not read TodoWrite state file');
      }
    } else {
      console.log('⚠️  No TodoWrite state file found - Claude should save one');
      console.log('   Run: Claude please save current TodoWrite state to TODOWRITE_STATE.json');
    }
    
    // Parse todos into categories
    const completed = todoState.todos?.filter((t: any) => t.status === 'completed').map((t: any) => t.content) || [];
    const inProgress = todoState.todos?.filter((t: any) => t.status === 'in_progress').map((t: any) => t.content) || [];
    const pending = todoState.todos?.filter((t: any) => t.status === 'pending').map((t: any) => t.content) || [];
    
    // Display current state
    console.log('\n📊 Current TodoWrite State:');
    console.log(`  ✅ Completed: ${completed.length} tasks`);
    console.log(`  🔄 In Progress: ${inProgress.length} tasks`);
    console.log(`  📋 Pending: ${pending.length} tasks`);
    
    if (inProgress.length > 0) {
      console.log('\n🔄 Tasks In Progress:');
      inProgress.forEach((task: string) => console.log(`  - ${task}`));
    }
    
    if (pending.length > 0 && pending.length <= 5) {
      console.log('\n📋 Pending Tasks:');
      pending.forEach((task: string) => console.log(`  - ${task}`));
    } else if (pending.length > 5) {
      console.log(`\n📋 Pending Tasks (showing first 5 of ${pending.length}):`);
      pending.slice(0, 5).forEach((task: string) => console.log(`  - ${task}`));
    }
    
    // Store in session state
    this.sessionState.agentTodos = {
      completed,
      inProgress,
      pending,
      priorityForNextSession: todoState.priorityForNextSession || []
    };
    
    // Prompt Claude to update if needed
    console.log('\n⚠️  Claude: Please save current TodoWrite state before ending session:');
    console.log('   Save todos to TODOWRITE_STATE.json for next session');
  }

  private selectPriorityTasks() {
    console.log('\n🎯 PRIORITY TASK SELECTION FOR NEXT SESSION');
    console.log('══════════════════════════════════════════════════');
    console.log('\nClaude: Please ask the user to select priority tasks from the pending list.');
    console.log('The selected tasks will be stored in priorityForNextSession.\n');
    
    // This will be filled based on user selection
    this.sessionState.agentTodos.priorityForNextSession = [
      '[User will select priority tasks for next session]'
    ];
  }

  private captureActiveAgents() {
    console.log('\n🔧 ACTIVE AGENTS & MCP SERVERS');
    console.log('══════════════════════════════════════════════════');
    console.log('\nClaude: Please list all active agents and MCP servers:');
    console.log('   - Task agents (general-purpose, statusline-setup, etc.)');
    console.log('   - MCP servers (supabase, etc.)');
    console.log('   - Any other active tools or agents\n');
    
    // Check for MCP processes
    const mcpProcesses = this.runCommand('ps aux | grep mcp-server | grep -v grep | head -5');
    if (mcpProcesses) {
      console.log('Detected MCP processes:');
      console.log(mcpProcesses);
      this.sessionState.activeAgents.push('MCP Servers detected');
    }
    
    // Placeholder for Claude to fill
    this.sessionState.activeAgents.push('[Claude will list active agents]');
  }

  public async run() {
    console.log('\n🏁 Starting End of Session Process...\n');
    
    this.captureGitStatus();
    this.captureTodos();
    this.captureRecentFiles();
    this.captureEnvironmentState();
    this.identifyActiveFeature();
    
    // New: Capture agent-specific information
    this.captureAgentTodos();
    this.captureActiveAgents();
    this.selectPriorityTasks();
    
    this.generateNextSteps();
    this.addCriticalNotes();
    this.saveSessionState();
    this.generateMarkdownSummary();
    this.updateManifest();
    
    console.log('\n✨ End of Session process complete!');
    console.log('📚 Files generated:');
    console.log('   - SESSION_STATE.json (machine-readable state with agent todos)');
    console.log('   - END_OF_SESSION.md (human-readable summary)');
    console.log('\n🚀 To restore this session, run: npm run session:start');
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new SessionManager();
  manager.run().catch(console.error);
}

export default SessionManager;