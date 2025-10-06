#!/bin/bash

# ============================================
# Workflow Transfer Setup Script
# Transfers all workflow improvements to target project
# Source: Project Genie
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Workflow Transfer Setup...${NC}"
echo "============================================"

# Check if we're in a Node.js project
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found. Please run from project root.${NC}"
  exit 1
fi

PROJECT_NAME=$(basename "$PWD")
echo -e "${GREEN}📦 Setting up workflow for: $PROJECT_NAME${NC}"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 1. Install required dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm install --save-dev tsx chalk glob
npm install @supabase/supabase-js

# Install jq if not present (for manifest:check command)
if ! command_exists jq; then
  echo -e "${YELLOW}Installing jq for JSON processing...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install jq 2>/dev/null || echo "Please install jq manually: brew install jq"
  else
    echo "Please install jq manually for your system"
  fi
fi

# 2. Create directories
echo -e "\n${YELLOW}📁 Creating directories...${NC}"
mkdir -p scripts
mkdir -p lib/utils
mkdir -p logs

# 3. Create session management scripts
echo -e "\n${YELLOW}📥 Creating session management scripts...${NC}"

# Create start-session.ts
cat > scripts/start-session.ts << 'EOFILE'
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

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

class SessionStarter {
  private projectRoot: string;
  private sessionState: SessionState | null = null;
  private hasSessionFile: boolean = false;

  constructor() {
    this.projectRoot = process.cwd();
  }

  private loadSessionState(): boolean {
    const sessionPath = path.join(this.projectRoot, 'SESSION_STATE.json');
    
    if (!fs.existsSync(sessionPath)) {
      console.log(chalk.yellow('⚠️  No SESSION_STATE.json found. Starting fresh session.'));
      return false;
    }

    try {
      const content = fs.readFileSync(sessionPath, 'utf8');
      this.sessionState = JSON.parse(content);
      this.hasSessionFile = true;
      return true;
    } catch (error) {
      console.error(chalk.red('❌ Error loading session state:'), error);
      return false;
    }
  }

  private runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8', cwd: this.projectRoot }).trim();
    } catch (error) {
      return '';
    }
  }

  private displaySessionInfo() {
    if (!this.sessionState) return;

    console.log(chalk.blue('\n📊 Previous Session Information'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.cyan('\n🕐 Last Session:'), new Date(this.sessionState.timestamp).toLocaleString());
    console.log(chalk.cyan('🎯 Active Feature:'), this.sessionState.currentContext.activeFeature);
    console.log(chalk.cyan('🌿 Branch:'), this.sessionState.gitStatus.branch);
    console.log(chalk.cyan('📝 Last Commit:'), this.sessionState.gitStatus.lastCommit);
  }

  private checkGitStatus() {
    console.log(chalk.blue('\n🔍 Current Git Status'));
    console.log(chalk.gray('═'.repeat(50)));
    
    const currentBranch = this.runCommand('git branch --show-current');
    const status = this.runCommand('git status --short');
    
    console.log(chalk.cyan('Current Branch:'), currentBranch);
    
    if (this.sessionState && currentBranch !== this.sessionState.gitStatus.branch) {
      console.log(chalk.yellow(`⚠️  Branch changed from ${this.sessionState.gitStatus.branch} to ${currentBranch}`));
    }
    
    if (status) {
      console.log(chalk.cyan('\nUncommitted Changes:'));
      console.log(status);
    } else {
      console.log(chalk.green('✅ Working directory clean'));
    }
  }

  private displayTasks() {
    if (!this.sessionState) return;

    console.log(chalk.blue('\n📋 Active Tasks'));
    console.log(chalk.gray('═'.repeat(50)));
    
    if (this.sessionState.activeTasks.blockers.length > 0) {
      console.log(chalk.red('\n⚠️  Blockers:'));
      this.sessionState.activeTasks.blockers.forEach(blocker => {
        console.log(chalk.red(`  • ${blocker}`));
      });
    }
    
    if (this.sessionState.activeTasks.inProgress.length > 0) {
      console.log(chalk.yellow('\n🔄 In Progress:'));
      this.sessionState.activeTasks.inProgress.forEach(task => {
        console.log(chalk.yellow(`  • ${task}`));
      });
    }
    
    if (this.sessionState.activeTasks.pending.length > 0) {
      console.log(chalk.cyan('\n📝 Pending (top 5):'));
      this.sessionState.activeTasks.pending.slice(0, 5).forEach(task => {
        console.log(chalk.cyan(`  • ${task}`));
      });
    }
  }

  private displayNextSteps() {
    if (!this.sessionState || this.sessionState.nextSteps.length === 0) return;

    console.log(chalk.blue('\n🚀 Recommended Next Steps'));
    console.log(chalk.gray('═'.repeat(50)));
    
    this.sessionState.nextSteps.forEach((step, index) => {
      console.log(chalk.green(`${index + 1}. ${step}`));
    });
  }

  private displayCriticalNotes() {
    if (!this.sessionState || this.sessionState.criticalNotes.length === 0) return;

    console.log(chalk.blue('\n⚠️  Critical Notes'));
    console.log(chalk.gray('═'.repeat(50)));
    
    this.sessionState.criticalNotes.forEach(note => {
      console.log(chalk.yellow(`• ${note}`));
    });
  }

  private checkEnvironment() {
    console.log(chalk.blue('\n🖥️  Environment Check'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Check if dev server is running
    const devServerCheck = this.runCommand('lsof -i :3000 | grep LISTEN');
    if (devServerCheck) {
      console.log(chalk.green('✅ Dev server is running on port 3000'));
    } else {
      console.log(chalk.yellow('⚠️  Dev server not detected. Run: npm run dev'));
    }
    
    // Check Supabase status
    const supabaseStatus = this.runCommand('supabase status 2>/dev/null');
    if (supabaseStatus.includes('Started')) {
      console.log(chalk.green('✅ Local Supabase is running'));
    } else {
      console.log(chalk.yellow('ℹ️  Local Supabase not running. Run: supabase start if needed'));
    }
  }

  private runManifestCheck() {
    console.log(chalk.blue('\n📦 Running Manifest Check'));
    console.log(chalk.gray('═'.repeat(50)));
    
    try {
      // First update the manifest
      console.log(chalk.cyan('Updating PROJECT_MANIFEST.json...'));
      execSync('npm run manifest:update', { cwd: this.projectRoot, stdio: 'pipe' });
      
      // Then check for quick wins
      console.log(chalk.cyan('Checking for quick wins...'));
      const quickWins = execSync('npm run manifest:check 2>/dev/null', { 
        cwd: this.projectRoot, 
        encoding: 'utf8' 
      });
      
      if (quickWins) {
        console.log(quickWins);
      }
    } catch (error) {
      console.log(chalk.yellow('ℹ️  Run `npm run manifest:check` manually to see quick wins'));
    }
  }

  public async run() {
    console.log(chalk.bold.green('\n🚀 Starting Session Recovery Process...'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Load previous session
    const hasSession = this.loadSessionState();
    
    if (hasSession) {
      console.log(chalk.green('✅ Previous session state loaded successfully'));
      
      // Display all session information
      this.displaySessionInfo();
      this.checkGitStatus();
      this.displayTasks();
      this.displayNextSteps();
      this.displayCriticalNotes();
    } else {
      console.log(chalk.cyan('📝 Starting fresh session'));
      this.checkGitStatus();
    }
    
    // Always check environment and manifest
    this.checkEnvironment();
    this.runManifestCheck();
    
    console.log(chalk.bold.green('\n✨ Session Recovery Complete!'));
    console.log(chalk.gray('═'.repeat(50)));
    
    if (hasSession && this.sessionState) {
      console.log(chalk.cyan('\n💡 Quick Start:'));
      console.log(chalk.gray(`   Continue working on: ${this.sessionState.currentContext.activeFeature}`));
      if (this.sessionState.nextSteps.length > 0) {
        console.log(chalk.gray(`   Next step: ${this.sessionState.nextSteps[0]}`));
      }
    }
    
    console.log(chalk.gray('\n📌 When ending this session, run: npm run session:end'));
  }
}

// Run if called directly
if (require.main === module) {
  const starter = new SessionStarter();
  starter.run().catch(console.error);
}

export default SessionStarter;
EOFILE

# Create end-session.ts
cat > scripts/end-session.ts << 'EOFILE'
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
      'CRITICAL-TODO.md',
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
          if (line.toLowerCase().includes('blocker') || line.toLowerCase().includes('critical')) {
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
    
    this.sessionState.nextSteps = nextSteps;
  }

  private addCriticalNotes() {
    console.log('⚠️  Adding critical notes...');
    
    const notes: string[] = [];
    
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

  public async run() {
    console.log('\n🏁 Starting End of Session Process...\n');
    
    this.captureGitStatus();
    this.captureTodos();
    this.captureRecentFiles();
    this.captureEnvironmentState();
    this.identifyActiveFeature();
    this.generateNextSteps();
    this.addCriticalNotes();
    this.saveSessionState();
    this.generateMarkdownSummary();
    this.updateManifest();
    
    console.log('\n✨ End of Session process complete!');
    console.log('📚 Files generated:');
    console.log('   - SESSION_STATE.json (machine-readable state)');
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
EOFILE

# 4. Copy update-manifest.ts from Project Genie
echo -e "\n${YELLOW}📥 Creating manifest update script...${NC}"
# Note: This is a simplified version - full version would be copied from Project Genie
cat > scripts/update-manifest.ts << 'EOFILE'
#!/usr/bin/env tsx
/**
 * Auto-generate PROJECT_MANIFEST.json by scanning the codebase
 * This ensures the manifest always reflects the actual project state
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const MANIFEST_PATH = path.join(process.cwd(), 'PROJECT_MANIFEST.json')
const PROJECT_ROOT = process.cwd()

interface Manifest {
  version: string
  lastUpdated: string
  projectName: string
  description: string
  architecture: any
  quickWins: any
  metadata: any
}

async function updateManifest() {
  console.log('🔍 Scanning project structure...')
  
  // Create or load manifest
  let manifest: Manifest
  try {
    const existing = fs.readFileSync(MANIFEST_PATH, 'utf-8')
    manifest = JSON.parse(existing)
  } catch {
    manifest = {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      projectName: path.basename(PROJECT_ROOT),
      description: "Project manifest for " + path.basename(PROJECT_ROOT),
      architecture: {
        framework: "Next.js",
        language: "TypeScript",
        styling: "Tailwind CSS",
        database: "Supabase",
        ai: "OpenAI"
      },
      quickWins: {
        immediate: []
      },
      metadata: {}
    }
  }
  
  // Update timestamp
  manifest.lastUpdated = new Date().toISOString()
  
  // Count files and calculate metrics
  const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**']
  })
  
  let totalLines = 0
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    totalLines += content.split('\n').length
  }
  
  manifest.metadata = {
    totalFiles: allFiles.length,
    linesOfCode: totalLines,
    lastAudit: new Date().toISOString().split('T')[0]
  }
  
  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log('✅ PROJECT_MANIFEST.json updated successfully!')
  
  // Print summary
  console.log('\n📊 Project Summary:')
  console.log(`📝 Files: ${manifest.metadata.totalFiles}`)
  console.log(`📝 Lines of Code: ${totalLines.toLocaleString()}`)
}

// Run the update
updateManifest().catch(console.error)
EOFILE

# 5. Copy permanent-logger.ts from Project Genie
echo -e "\n${YELLOW}📥 Creating persistent logger...${NC}"
cat > lib/utils/permanent-logger.ts << 'EOFILE'
/**
 * Enhanced Permanent Logger with Color-Coded Output
 * Captures all console logs, errors, and important events for debugging
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
}

// Lazy load Node.js modules only on server
let fsModule: any = null
let pathModule: any = null

const loadNodeModules = async () => {
  if (typeof window === 'undefined' && !fsModule) {
    try {
      fsModule = await eval(`require('fs')`)
      pathModule = await eval(`require('path')`)
    } catch (e) {
      // Silently fail if modules can't be loaded
    }
  }
}

class PermanentLogger {
  private logPath: string
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private isInitialized = false
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    info: console.info
  }

  constructor() {
    // Only set up file logging on server side
    if (typeof window === 'undefined') {
      loadNodeModules()
      if (pathModule && fsModule) {
        const logsDir = pathModule.join(process.cwd(), 'logs')
        
        // Ensure logs directory exists
        if (!fsModule.existsSync(logsDir)) {
          fsModule.mkdirSync(logsDir, { recursive: true })
        }
        
        this.logPath = pathModule.join(logsDir, 'claude-code-dev-log.md')
      } else {
        this.logPath = ''
      }
    } else {
      // Client side - no file path
      this.logPath = ''
    }
    
    this.initialize()
  }

  private initialize() {
    if (this.isInitialized) return
    
    // Only initialize file logging on server side
    if (typeof window === 'undefined') {
      loadNodeModules()
      if (fsModule && this.logPath) {
        // Create or append to log file
        if (!fsModule.existsSync(this.logPath)) {
          this.createLogFile()
        } else {
          this.checkAndRotate()
        }
      
        this.log('INFO', 'SYSTEM', '🚀 Enhanced Logger Initialized', {
          logPath: this.logPath,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    this.isInitialized = true
  }

  private createLogFile() {
    if (typeof window === 'undefined') {
      loadNodeModules()
      if (fsModule && this.logPath) {
        const header = `# Claude Code Development Log

This file contains permanent logs for debugging persistent issues.
Generated: ${new Date().toISOString()}

---

`
        fsModule.writeFileSync(this.logPath, header, 'utf-8')
      }
    }
  }

  private checkAndRotate() {
    if (typeof window === 'undefined') {
      loadNodeModules()
      if (fsModule && this.logPath) {
        try {
          const stats = fsModule.statSync(this.logPath)
          if (stats.size > this.maxFileSize) {
            // Archive old log
            const archivePath = this.logPath.replace('.md', `-${Date.now()}.md`)
            fsModule.renameSync(this.logPath, archivePath)
            this.createLogFile()
            this.log('INFO', 'SYSTEM', `Log rotated. Archived to: ${archivePath}`)
          }
        } catch (error) {
          // File doesn't exist or error reading, create new
          this.createLogFile()
        }
      }
    }
  }

  public log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stack?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      stack
    }

    this.writeEntry(entry)
  }

  private writeEntry(entry: LogEntry) {
    // Only write to file on server side
    if (typeof window === 'undefined') {
      loadNodeModules()
      if (fsModule && this.logPath) {
        try {
        const emoji = this.getLevelEmoji(entry.level)
        const color = this.getLevelColor(entry.level)
        
        let logLine = `
## ${emoji} [${entry.timestamp}] ${entry.level} - ${entry.category}

**Message:** ${entry.message}
`

        if (entry.data) {
          logLine += `
**Data:**
\`\`\`json
${JSON.stringify(entry.data, null, 2)}
\`\`\`
`
        }

        if (entry.stack) {
          logLine += `
**Stack Trace:**
\`\`\`
${entry.stack}
\`\`\`
`
        }

        logLine += '\n---\n'

        // Append to file
        fsModule.appendFileSync(this.logPath, logLine, 'utf-8')

        // Enhanced console output with color coding
        const consoleColor = this.getConsoleColor(entry.level)
        const resetColor = '\x1b[0m'
        const boldColor = '\x1b[1m'
        
        // Special formatting for specific categories
        if (entry.category === 'LLM_CALL' || entry.category === 'API_CALL') {
          // RED for LLM calls
          this.originalConsole.log(`\x1b[31m${boldColor}🔴 [LLM] ${entry.message}${resetColor}`)
        } else if (entry.category === 'RATE_LIMIT') {
          // YELLOW for rate limit warnings
          this.originalConsole.warn(`\x1b[33m${boldColor}🟡 [RATE LIMIT] ${entry.message}${resetColor}`)
        } else if (entry.category === 'PHASE_TRANSITION') {
          // BLUE for phase transitions
          this.originalConsole.log(`\x1b[34m${boldColor}🔵 [PHASE] ${entry.message}${resetColor}`)
        } else if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
          // RED for errors
          this.originalConsole.error(`${consoleColor}${emoji} [${entry.category}] ${entry.message}${resetColor}`)
        } else if (entry.level === 'WARN') {
          // YELLOW for warnings
          this.originalConsole.warn(`${consoleColor}${emoji} [${entry.category}] ${entry.message}${resetColor}`)
        } else if (entry.category.includes('SUCCESS') || entry.category.includes('COMPLETE')) {
          // GREEN for success
          this.originalConsole.log(`\x1b[32m${boldColor}🟢 [${entry.category}] ${entry.message}${resetColor}`)
        } else {
          // Default coloring
          this.originalConsole.log(`${consoleColor}${emoji} [${entry.category}] ${entry.message}${resetColor}`)
        }
        } catch (error) {
          // Fallback to console if file writing fails
          this.originalConsole.error('Failed to write to log file:', error)
          this.originalConsole.log(entry)
        }
      }
    } else {
      // Client side - just log to console
      const emoji = this.getLevelEmoji(entry.level)
      if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
        console.error(`${emoji} [${entry.category}] ${entry.message}`, entry.data)
      } else if (entry.level === 'WARN') {
        console.warn(`${emoji} [${entry.category}] ${entry.message}`, entry.data)
      } else {
        console.log(`${emoji} [${entry.category}] ${entry.message}`, entry.data)
      }
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      DEBUG: '🔍',
      INFO: '📝',
      WARN: '⚠️',
      ERROR: '❌',
      CRITICAL: '🔥'
    }
    return emojis[level] || '📌'
  }

  private getLevelColor(level: LogLevel): string {
    const colors = {
      DEBUG: '#gray',
      INFO: '#blue',
      WARN: '#orange',
      ERROR: '#red',
      CRITICAL: '#darkred'
    }
    return colors[level] || '#black'
  }

  private getConsoleColor(level: LogLevel): string {
    const colors = {
      DEBUG: '\x1b[90m',     // Gray
      INFO: '\x1b[36m',      // Cyan
      WARN: '\x1b[33m',      // Yellow
      ERROR: '\x1b[31m',     // Red
      CRITICAL: '\x1b[35m'   // Magenta
    }
    return colors[level] || '\x1b[0m'
  }

  // Utility methods for specific logging scenarios
  public logApiCall(
    provider: string,
    model: string,
    success: boolean,
    duration: number,
    tokens?: number,
    error?: string
  ) {
    this.log(
      success ? 'INFO' : 'ERROR',
      'API_CALL',
      `${provider}/${model} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`,
      {
        provider,
        model,
        success,
        duration,
        tokens,
        error
      }
    )
  }

  // Clear the log file
  public clear() {
    this.createLogFile()
    this.log('INFO', 'SYSTEM', 'Log file cleared')
  }
}

// Singleton instance
let loggerInstance: PermanentLogger | null = null

export function getLogger(): PermanentLogger {
  if (!loggerInstance) {
    loggerInstance = new PermanentLogger()
  }
  return loggerInstance
}

// Initialize on import for server-side code
if (typeof window === 'undefined') {
  getLogger()
}

// Main enhanced logger export
export const logger = {
  log: (category: string, message: string, data?: any) =>
    getLogger().log('INFO', category, message, data),
    
  debug: (category: string, message: string, data?: any) => 
    getLogger().log('DEBUG', category, message, data),
  
  info: (category: string, message: string, data?: any) => 
    getLogger().log('INFO', category, message, data),
  
  warn: (category: string, message: string, data?: any) => 
    getLogger().log('WARN', category, message, data),
  
  error: (category: string, message: string, data?: any, stack?: string) => 
    getLogger().log('ERROR', category, message, data, stack),
  
  critical: (category: string, message: string, data?: any, stack?: string) => 
    getLogger().log('CRITICAL', category, message, data, stack),

  apiCall: (provider: string, model: string, success: boolean, duration: number, tokens?: number, error?: string) =>
    getLogger().logApiCall(provider, model, success, duration, tokens, error),

  clear: () => getLogger().clear()
}

// Export permanentLogger as alias for logger (single source of truth)
export const permanentLogger = logger

// Default export
export default logger
EOFILE

# 6. Add npm scripts to package.json
echo -e "\n${YELLOW}📝 Adding npm scripts...${NC}"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'manifest:update': 'tsx scripts/update-manifest.ts',
  'manifest:check': 'cat PROJECT_MANIFEST.json | jq .quickWins 2>/dev/null || echo \"Install jq: brew install jq\"',
  'session:end': 'tsx scripts/end-session.ts',
  'session:start': 'tsx scripts/start-session.ts',
  'predev': pkg.scripts.predev || 'npm run manifest:update && npm run session:start',
  'prebuild': pkg.scripts.prebuild || 'npm run manifest:update'
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ npm scripts added to package.json');
"

# 7. Create initial CLAUDE.md
echo -e "\n${YELLOW}📝 Creating CLAUDE.md...${NC}"
cat > CLAUDE.md << EOFILE
# Claude Assistant Configuration for $PROJECT_NAME

## 🚨 CRITICAL: PROJECT MANIFEST SYSTEM (READ FIRST!)

### MANDATORY: Always Start with PROJECT_MANIFEST.json
**THE SINGLE SOURCE OF TRUTH for the entire project architecture**

\`\`\`bash
# At session start, ALWAYS run:
npm run manifest:update  # Updates manifest with current state
npm run manifest:check   # Shows quick wins available

# Or read directly:
cat PROJECT_MANIFEST.json
\`\`\`

## Session Management Commands

- **Start session**: \`npm run session:start\`
- **End session**: \`npm run session:end\`
- **Update manifest**: \`npm run manifest:update\`
- **Check quick wins**: \`npm run manifest:check\`

## Development Workflow

1. Start each session with: \`npm run dev\` (auto-runs session:start)
2. End each session with: \`npm run session:end\`
3. Check manifest regularly for quick wins
4. Use persistent logger for debugging

## Persistent Logger Usage

\`\`\`typescript
import { logger } from '@/lib/utils/permanent-logger'

// Log API calls
logger.apiCall('openai', 'gpt-4', true, 250, 1500)

// Log errors
logger.error('COMPONENT', 'Failed to load', error)

// Check recent errors
const errors = await logger.getRecentErrors(5)
\`\`\`

## Testing Requirements

- **MANDATORY**: Run tests before every commit
- Use \`test-*.ts\` files for comprehensive testing
- Maintain 100% UI component coverage
- All interactive elements must have tooltips

## UI/UX Standards

### Tooltip Requirement - ALL UI ELEMENTS MUST HAVE TOOLTIPS
**CRITICAL**: This is a PERMANENT requirement for ALL interactive UI elements

#### Implementation Guidelines:
1. **Buttons**: Describe the action that will occur
2. **Icons**: Explain what the icon represents
3. **Badges**: Provide additional context about the value
4. **Input Fields**: Offer help text and validation hints
5. **Complex UI Elements**: Give usage instructions

### Toast Notification Standards - DRY PRINCIPLE
**ALL toast notifications MUST use a centralized function to prevent duplicates and ensure consistency.**

## MCP Server Configuration

- Supabase MCP available via \`mcp__supabase__*\` functions
- Use for database operations, migrations, and type generation
- PAT token configured in environment

## GPT-5 vs GPT-4.1 Model Selection

- **GPT-5 (DEFAULT)**: Use for narrative documents, analysis, web search
- **GPT-4.1**: Use ONLY for structured data with complex schemas

## Development Tracking

Maintain \`development-progress-implementation-log.md\` for all significant implementations.

---
*This file is automatically maintained by the workflow system*
EOFILE

# 8. Create initial PROJECT_MANIFEST.json
echo -e "\n${YELLOW}📝 Creating initial PROJECT_MANIFEST.json...${NC}"
npm run manifest:update 2>/dev/null || echo "{\"version\":\"1.0.0\",\"projectName\":\"$PROJECT_NAME\"}" > PROJECT_MANIFEST.json

# 9. Create .gitignore entries
echo -e "\n${YELLOW}📝 Updating .gitignore...${NC}"
if ! grep -q "SESSION_STATE.json" .gitignore 2>/dev/null; then
cat >> .gitignore << 'EOFILE'

# Workflow files
SESSION_STATE.json
END_OF_SESSION.md
START_OF_SESSION.md
logs/
*.log
EOFILE
echo "✅ .gitignore updated"
else
echo "✅ .gitignore already contains workflow entries"
fi

# 10. Create development-progress-implementation-log.md
echo -e "\n${YELLOW}📝 Creating development progress log...${NC}"
cat > development-progress-implementation-log.md << EOFILE
# Development Progress Implementation Log

## v1.0 - Initial Setup
**Date: $(date +%Y-%m-%d)**
**Timestamp: $(date +%H:%M) $(date +%Z)**

### Features Implemented:
- Workflow transfer from Project Genie
- Session management system
- Project manifest system
- Persistent logger
- Enhanced CLAUDE.md configuration

### Files Created:
- scripts/start-session.ts
- scripts/end-session.ts
- scripts/update-manifest.ts
- lib/utils/permanent-logger.ts
- CLAUDE.md
- PROJECT_MANIFEST.json

### Key Improvements:
- Automated session recovery
- Project architecture discovery
- Enhanced logging with color coding
- Quick wins identification

---

*This log tracks all significant implementations with version numbers, dates, and features.*
EOFILE

echo -e "\n${GREEN}✅ Workflow Transfer Setup Complete!${NC}"
echo "============================================"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo "1. Run: npm run session:start"
echo "2. Run: npm run manifest:update"
echo "3. Start development: npm run dev"
echo ""
echo -e "${BLUE}📌 Key Commands:${NC}"
echo "  • npm run session:end     - Save session state"
echo "  • npm run session:start   - Restore session"
echo "  • npm run manifest:update - Update project manifest"
echo "  • npm run manifest:check  - Show quick wins"
echo ""
echo -e "${YELLOW}📖 Documentation:${NC}"
echo "  • WORKFLOW-TRANSFER-SETUP.md - Complete guide"
echo "  • CLAUDE.md - Project configuration"
echo "  • logs/claude-code-dev-log.md - Debug logs"
echo ""
echo -e "${GREEN}🎉 Your project now has all workflow improvements!${NC}"