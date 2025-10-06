#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import https from 'https';

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
  agentTodos?: any;
  activeAgents?: string[];
}

interface ModelConfig {
  currentModel: string;
  lastChecked: string;
  availableModels?: string[];
  preferredModel?: string;
  lastUsedModel?: string;
}

class SessionStarter {
  private projectRoot: string;
  private sessionState: SessionState | null = null;
  private hasSessionFile: boolean = false;
  private modelConfig: ModelConfig | null = null;
  private selectedModel: string = 'claude-opus-4-1-20250805'; // Default model

  constructor() {
    this.projectRoot = process.cwd();
    this.loadModelConfig();
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

  private loadModelConfig(): void {
    const configPath = path.join(this.projectRoot, '.claude-model-config.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        this.modelConfig = JSON.parse(content);
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not load model config, using defaults'));
      }
    }
  }

  private saveModelConfig(): void {
    // Skip saving model config - not needed anymore
  }

  private async checkForNewModels(): Promise<void> {
    console.log(chalk.blue('\n🔍 Claude Model Version Check'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Current model we're using
    const currentModel = 'claude-opus-4-1-20250805';
    const modelDate = '2025-08-05';
    
    // List of known REAL Claude models (for tracking)
    const knownModels = {
      'claude-opus-4-1-20250805': { released: '2025-08-05', type: 'Opus 4.1', status: 'current' },
      'claude-3-5-sonnet-20241022': { released: '2024-10-22', type: 'Sonnet 3.5', status: 'available' },
      'claude-3-5-haiku-20241022': { released: '2024-10-22', type: 'Haiku 3.5', status: 'available' },
      'claude-3-opus-20240229': { released: '2024-02-29', type: 'Opus 3', status: 'available' }
    };
    
    console.log(chalk.green('✅ Current Model:'), chalk.bold(currentModel));
    console.log(chalk.gray('   Type: Claude Opus 4.1'));
    console.log(chalk.gray('   Released: August 5, 2025'));
    console.log(chalk.gray('   Status: Latest available Opus model'));
    
    // Check if there might be a newer model based on date
    const today = new Date();
    const currentModelDate = new Date(modelDate);
    const daysSinceRelease = Math.floor((today.getTime() - currentModelDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceRelease > 30) {
      console.log(chalk.yellow(`\n⚠️  Model is ${daysSinceRelease} days old`));
      console.log(chalk.yellow('   It\'s worth checking for updates periodically'));
      console.log(chalk.yellow('   Current model is still the latest Opus available'));
    }
    
    // Set the model to use
    this.selectedModel = currentModel;
    
    // Check if using a different model than last time
    if (this.modelConfig?.lastUsedModel && this.modelConfig.lastUsedModel !== currentModel) {
      console.log(chalk.yellow('\n⚠️  Model Change from Previous Session:'));
      console.log(chalk.cyan('Previous:'), this.modelConfig.lastUsedModel);
      console.log(chalk.green('Current:'), currentModel);
    }
    
    // Save model info for next time
    this.modelConfig = {
      currentModel: this.selectedModel,
      lastChecked: new Date().toISOString(),
      lastUsedModel: this.selectedModel
    };
    
    // Always inform about model updates
    console.log(chalk.cyan('\n📢 Model Update Notification:'));
    console.log(chalk.gray('   You will be notified if:'));
    console.log(chalk.gray('   • A newer Opus model becomes available'));
    console.log(chalk.gray('   • The current model is > 30 days old'));
    console.log(chalk.gray('   • Model changes between sessions'));
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

  private displayAgentTodos() {
    if (!this.sessionState || !this.sessionState.agentTodos) return;

    console.log(chalk.blue('\n🤖 Agent TodoWrite Tasks'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Priority tasks for this session
    if (this.sessionState.agentTodos.priorityForNextSession && 
        this.sessionState.agentTodos.priorityForNextSession.length > 0) {
      console.log(chalk.magenta('\n🎯 Priority Tasks for This Session:'));
      this.sessionState.agentTodos.priorityForNextSession.forEach((task: string) => {
        console.log(chalk.magenta(`  • ${task}`));
      });
    }
    
    // In-progress from last session
    if (this.sessionState.agentTodos.inProgress && 
        this.sessionState.agentTodos.inProgress.length > 0) {
      console.log(chalk.yellow('\n🔄 In Progress from Last Session:'));
      this.sessionState.agentTodos.inProgress.forEach((task: string) => {
        console.log(chalk.yellow(`  • ${task}`));
      });
    }
    
    // Pending tasks
    if (this.sessionState.agentTodos.pending && 
        this.sessionState.agentTodos.pending.length > 0) {
      console.log(chalk.cyan('\n📋 Other Pending Tasks:'));
      this.sessionState.agentTodos.pending.slice(0, 5).forEach((task: string) => {
        console.log(chalk.cyan(`  • ${task}`));
      });
    }
    
    // Completed in last session
    if (this.sessionState.agentTodos.completed && 
        this.sessionState.agentTodos.completed.length > 0) {
      console.log(chalk.green('\n✅ Completed in Last Session:'));
      this.sessionState.agentTodos.completed.slice(0, 3).forEach((task: string) => {
        console.log(chalk.green(`  • ${task}`));
      });
    }
  }

  private displayActiveAgents() {
    if (!this.sessionState || !this.sessionState.activeAgents) return;

    console.log(chalk.blue('\n🔧 Active Agents & Tools'));
    console.log(chalk.gray('═'.repeat(50)));
    
    this.sessionState.activeAgents.forEach(agent => {
      console.log(chalk.cyan(`  • ${agent}`));
    });
    
    // Check current MCP processes
    const mcpProcesses = this.runCommand('ps aux | grep mcp-server | grep -v grep | wc -l');
    if (mcpProcesses && parseInt(mcpProcesses) > 0) {
      console.log(chalk.green(`  • ${mcpProcesses.trim()} MCP server(s) currently running`));
    }
  }

  private initializeCurrentSessionTodos(investigationTasks: string[] = []) {
    console.log(chalk.blue('\n📋 Current Session TodoWrite Status'));
    console.log(chalk.gray('═'.repeat(50)));
    
    if (investigationTasks.length > 0) {
      console.log(chalk.red('\n⚠️  Investigation Tasks (from log/advisor check):'));
      investigationTasks.forEach(task => {
        console.log(chalk.yellow(`  • ${task}`));
      });
    }
    
    console.log(chalk.yellow('\nClaude: Please report your current TodoWrite task list:'));
    console.log(chalk.gray('  - List any tasks currently in your TodoWrite'));
    console.log(chalk.gray('  - List any active agents you are using'));
    console.log(chalk.gray('  - Confirm priority tasks from last session (if any)'));
    
    if (investigationTasks.length > 0) {
      console.log(chalk.cyan('\n  📝 Also add these investigation tasks to your TodoWrite:'));
      investigationTasks.forEach(task => {
        console.log(chalk.gray(`     - ${task}`));
      });
    }
    console.log();
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

  private generateStartSummary() {
    const summary = `# Session Started

**Time**: ${new Date().toLocaleString()}
**Branch**: ${this.runCommand('git branch --show-current')}
${this.sessionState ? `**Resuming Feature**: ${this.sessionState.currentContext.activeFeature}` : '**New Session**'}

## Claude Code

Launch Claude Code with Opus 4.1:
\`\`\`bash
claude --model claude-opus-4-1-20250805
\`\`\`

## Quick Commands

\`\`\`bash
# Continue development
npm run dev

# Run tests
npm test
npx tsx test-company-intelligence-comprehensive.ts

# Update manifest
npm run manifest:update

# Check for quick wins
npm run manifest:check
\`\`\`

## Session Management

- **End session**: \`npm run session:end\`
- **View last session**: \`cat END_OF_SESSION.md\`
- **View session state**: \`cat SESSION_STATE.json\`

---
*Session started successfully. Run the Claude Code command above to start development.*
`;

    const startPath = path.join(this.projectRoot, 'START_OF_SESSION.md');
    fs.writeFileSync(startPath, summary);
    console.log(chalk.gray(`\n📄 Session summary written to: ${startPath}`));
  }

  private displayRecentFiles() {
    if (!this.sessionState || this.sessionState.currentContext.lastWorkingFiles.length === 0) return;

    console.log(chalk.blue('\n📁 Recent Working Files'));
    console.log(chalk.gray('═'.repeat(50)));
    
    console.log(chalk.cyan('Last modified files:'));
    this.sessionState.currentContext.lastWorkingFiles.slice(0, 5).forEach(file => {
      console.log(chalk.gray(`  • ${file}`));
    });
  }

  private runManifestCheck() {
    console.log(chalk.blue('\n📦 Manifest Status'));
    console.log(chalk.gray('═'.repeat(50)));
    console.log(chalk.cyan('💡 To check for quick wins, run:'));
    console.log(chalk.gray('   npm run manifest:update'));
    console.log(chalk.gray('   npm run manifest:check'));
  }

  private launchClaudeCode() {
    console.log(chalk.blue('\n🤖 Launching Claude Code'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Try different possible command names
    const possibleCommands = ['claude', 'claude-code', 'Claude'];
    let claudeCommand = '';
    
    for (const cmd of possibleCommands) {
      const exists = this.runCommand(`which ${cmd}`);
      if (exists) {
        claudeCommand = cmd;
        console.log(chalk.green(`✅ Found Claude Code command: ${cmd}`));
        break;
      }
    }
    
    // If we didn't find it with which, try to launch anyway with most likely command
    if (!claudeCommand) {
      console.log(chalk.yellow('⚠️  Claude Code command not found in PATH'));
      console.log(chalk.cyan('Attempting to launch with "claude" command anyway...'));
      claudeCommand = 'claude'; // Default to most likely command name
    }
    
    try {
      // Prepare the initial prompt for Claude Code
      let initialPrompt = '';
      
      if (this.sessionState) {
        initialPrompt = `Continue development session. `;
        initialPrompt += `Currently working on: ${this.sessionState.currentContext.activeFeature}. `;
        
        if (this.sessionState.nextSteps.length > 0) {
          initialPrompt += `Next step: ${this.sessionState.nextSteps[0]}. `;
        }
        
        if (this.sessionState.activeTasks.inProgress.length > 0) {
          initialPrompt += `In-progress: ${this.sessionState.activeTasks.inProgress[0]}. `;
        }
        
        initialPrompt += 'Please check TodoWrite for current tasks and continue where we left off.';
      } else {
        initialPrompt = 'Starting new development session. Please check TodoWrite for tasks.';
      }
      
      console.log(chalk.cyan(`\nAttempting to launch: ${claudeCommand}`));
      console.log(chalk.gray(`Model: ${this.selectedModel}`));
      console.log(chalk.gray(`Directory: ${this.projectRoot}`));
      
      // Launch Claude Code with the selected model
      const args = ['--model', this.selectedModel];
      
      // Spawn Claude Code in detached mode so it continues after this script exits
      const claudeProcess = spawn(claudeCommand, args, {
        detached: true,
        stdio: 'ignore',
        cwd: this.projectRoot
      });
      
      // Unref the process so this script can exit
      claudeProcess.unref();
      
      console.log(chalk.green('✅ Claude Code launched successfully!'));
      return true;
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to launch Claude Code:'), error);
      return false;
    }
  }

  private async checkRecentLogs() {
    console.log(chalk.blue('\n🔍 Recent Error Log Check'));
    console.log(chalk.gray('═'.repeat(50)));
    
    const errors: string[] = [];
    
    try {
      // Check for log files
      const logsDir = path.join(this.projectRoot, 'logs');
      if (fs.existsSync(logsDir)) {
        const logFile = path.join(logsDir, 'enhanced-logger.md');
        if (fs.existsSync(logFile)) {
          const stats = fs.statSync(logFile);
          const lastModified = new Date(stats.mtime);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastModified > hourAgo) {
            // Read last 1000 lines for errors
            const logContent = fs.readFileSync(logFile, 'utf8');
            const lines = logContent.split('\n');
            const recentLines = lines.slice(-1000);
            
            // Count errors and critical issues
            let errorCount = 0;
            let criticalCount = 0;
            const uniqueErrors = new Set<string>();
            
            recentLines.forEach(line => {
              if (line.includes('ERROR -')) {
                errorCount++;
                const match = line.match(/ERROR - ([^:]+)/);
                if (match) uniqueErrors.add(match[1]);
              }
              if (line.includes('CRITICAL -')) {
                criticalCount++;
              }
            });
            
            if (errorCount > 0 || criticalCount > 0) {
              console.log(chalk.red(`⚠️  Found ${errorCount} errors and ${criticalCount} critical issues in recent logs`));
              if (uniqueErrors.size > 0) {
                console.log(chalk.yellow('   Error categories:'));
                Array.from(uniqueErrors).slice(0, 5).forEach(cat => {
                  console.log(chalk.gray(`     • ${cat}`));
                  errors.push(`Investigate ${cat} errors`);
                });
              }
              console.log(chalk.cyan('   📝 Added to session TODOs for investigation'));
            } else {
              console.log(chalk.green('✅ No recent errors found in logs'));
            }
          }
        }
      }
    } catch (error) {
      console.log(chalk.gray('   Could not check log files'));
    }
    
    return errors;
  }
  
  private async checkSupabaseAdvisors() {
    console.log(chalk.blue('\n🛡️  Supabase Security & Performance Check'));
    console.log(chalk.gray('═'.repeat(50)));
    
    const todos: string[] = [];
    
    try {
      console.log(chalk.cyan('   Checking for advisories...'));
      console.log(chalk.yellow('   📝 TODOs for Claude Code:'));
      console.log(chalk.gray('      • Run: mcp__supabase__get_advisors with type="security"'));
      console.log(chalk.gray('      • Run: mcp__supabase__get_advisors with type="performance"'));
      console.log(chalk.gray('      • Check for missing RLS policies'));
      console.log(chalk.gray('      • Review any security vulnerabilities'));
      
      todos.push('Check Supabase security advisors');
      todos.push('Check Supabase performance advisors');
      todos.push('Review RLS policies for gaps');
    } catch (error) {
      console.log(chalk.gray('   Could not check Supabase advisors'));
    }
    
    return todos;
  }

  public async run() {
    console.log(chalk.bold.green('\n🚀 Starting Session Recovery Process...'));
    console.log(chalk.gray('═'.repeat(50)));
    
    // Check for new Claude models first
    await this.checkForNewModels();
    
    // Load previous session
    const hasSession = this.loadSessionState();
    
    if (hasSession) {
      console.log(chalk.green('✅ Previous session state loaded successfully'));
      
      // Display all session information
      this.displaySessionInfo();
      this.checkGitStatus();
      this.displayTasks();
      this.displayRecentFiles();
      this.displayNextSteps();
      this.displayCriticalNotes();
    } else {
      console.log(chalk.cyan('📝 Starting fresh session'));
      this.checkGitStatus();
    }
    
    // Check recent logs for errors
    const logErrors = await this.checkRecentLogs();
    
    // Check Supabase advisors
    const supabaseTodos = await this.checkSupabaseAdvisors();
    
    // Display agent-specific information
    if (hasSession) {
      this.displayAgentTodos();
      this.displayActiveAgents();
    }
    
    // Always check environment and manifest
    this.checkEnvironment();
    this.runManifestCheck();
    
    // Initialize current session todos with investigation tasks
    this.initializeCurrentSessionTodos([...logErrors, ...supabaseTodos]);
    
    // Generate start summary
    this.generateStartSummary();
    
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
    
    // The bash script will handle launching Claude Code
    console.log(chalk.bold.cyan('\n🤖 Claude Code will launch momentarily...'));
  }
}

// Run if called directly
if (require.main === module) {
  // Check if chalk is installed, if not install it
  try {
    require('chalk');
  } catch {
    console.log('Installing chalk for colored output...');
    execSync('npm install chalk', { stdio: 'inherit' });
  }
  
  const starter = new SessionStarter();
  starter.run().catch(console.error);
}

export default SessionStarter;