#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const manifestPath = path.join(process.cwd(), 'PROJECT_MANIFEST.json');

// Read existing manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Add sessionManagement section
manifest.sessionManagement = {
  enabled: true,
  description: "Automated session state management for context preservation",
  scripts: {
    end: "npm run session:end",
    start: "npm run session:start"
  },
  files: {
    state: "SESSION_STATE.json",
    endSummary: "END_OF_SESSION.md",
    startSummary: "START_OF_SESSION.md"
  },
  autoTriggers: {
    onDevStart: true,
    description: "Automatically loads context when starting dev server"
  },
  features: [
    "Git status capture and comparison",
    "Todo and task tracking",
    "Active feature identification",
    "Environment state monitoring",
    "Next steps generation",
    "Critical notes preservation",
    "Automatic manifest update on session end"
  ],
  benefits: [
    "Zero context loss between sessions",
    "Instant session recovery",
    "Automated progress tracking",
    "Clear handoff between work sessions"
  ],
  usage: {
    endSession: "Type 'end of session' or run 'npm run session:end'",
    startSession: "Automatically runs with 'npm run dev' or manually with 'npm run session:start'",
    viewState: "cat SESSION_STATE.json for machine-readable state",
    viewSummary: "cat END_OF_SESSION.md for human-readable summary"
  }
};

// Update lastUpdated
manifest.lastUpdated = new Date().toISOString();

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ Added sessionManagement section to PROJECT_MANIFEST.json');