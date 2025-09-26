#!/usr/bin/env npx tsx

/**
 * Comprehensive Mermaid Diagram Testing
 * Tests all diagram types and document formatters
 */

import { createFlowchart, createSequenceDiagram, createGanttChart, createTimelineDiagram, createPieChart, createEntityRelationship, createStateDiagram, createClassDiagram, createGitGraph, createUserJourney, createQuadrantChart, createMindMap, createKanbanBoard, createArchitectureDiagram, createBlockDiagram, createPacketDiagram, createTreeMap, createSankeyDiagram, createXYChart, createRequirementDiagram } from './lib/utils/mermaid-helpers'
import { FlowchartDirection, NodeShape, GanttTaskStatus, Priority, JourneyRating } from './lib/utils/mermaid-types'
import { validateMermaidSyntax } from './lib/utils/mermaid-helpers'
import chalk from 'chalk'

console.log(chalk.blue.bold('\n🧪 Comprehensive Mermaid Diagram Testing\n'))

let totalTests = 0
let passedTests = 0
let failedTests = 0

function testDiagram(name: string, result: any): boolean {
  totalTests++

  if (result.isValid) {
    passedTests++
    console.log(chalk.green(`✅ ${name}: PASS`))
    return true
  } else {
    failedTests++
    console.log(chalk.red(`❌ ${name}: FAIL`))
    if (result.error) {
      console.log(chalk.yellow(`   Error: ${result.error}`))
    }
    if (result.definition) {
      console.log(chalk.gray(`   Diagram:\n${result.definition.split('\n').slice(0, 5).map((l: string) => '   ' + l).join('\n')}`))
    }
    return false
  }
}

// Test 1: Flowchart
console.log(chalk.cyan('\n📊 Testing Flowcharts...'))
const flowchart = createFlowchart({
  direction: FlowchartDirection.TOP_BOTTOM,
  nodes: [
    { id: 'A', label: 'Start', shape: NodeShape.ROUND },
    { id: 'B', label: 'Process', shape: NodeShape.RECTANGLE },
    { id: 'C', label: 'Decision', shape: NodeShape.DIAMOND },
    { id: 'D', label: 'End', shape: NodeShape.CIRCLE }
  ],
  connections: [
    { from: 'A', to: 'B', label: 'Begin' },
    { from: 'B', to: 'C' },
    { from: 'C', to: 'D', label: 'Complete' }
  ]
})
testDiagram('Flowchart', flowchart)

// Test 2: Timeline
console.log(chalk.cyan('\n📅 Testing Timeline...'))
const timeline = createTimelineDiagram({
  title: 'Project Milestones',
  entries: [
    { period: '2024 Q1', events: ['Project Start', 'Initial Planning'] },
    { period: '2024 Q2', events: ['Development Phase 1', 'First Review'] },
    { period: '2024 Q3', events: ['Mid-year Review', 'Phase 2 Start'] },
    { period: '2024 Q4', events: ['Final Testing', 'Project Complete'] }
  ]
})
testDiagram('Timeline', timeline)

// Test 3: Gantt Chart
console.log(chalk.cyan('\n📊 Testing Gantt Chart...'))
const gantt = createGanttChart({
  title: 'Project Schedule',
  dateFormat: 'YYYY-MM-DD',
  tasks: [
    { id: 'task1', name: 'Planning', start: '2024-01-01', duration: 30, status: GanttTaskStatus.DONE },
    { id: 'task2', name: 'Development', start: '2024-02-01', duration: 60, status: GanttTaskStatus.ACTIVE },
    { id: 'task3', name: 'Testing', start: '2024-04-01', duration: 30, status: GanttTaskStatus.FUTURE, dependencies: ['task2'] }
  ]
})
testDiagram('Gantt Chart', gantt)

// Test 4: Sequence Diagram
console.log(chalk.cyan('\n🔄 Testing Sequence Diagram...'))
const sequence = createSequenceDiagram({
  participants: [
    { id: 'User', label: 'User' },
    { id: 'API', label: 'API Server' },
    { id: 'DB', label: 'Database' }
  ],
  interactions: [
    { from: 'User', to: 'API', message: 'Request Data' },
    { from: 'API', to: 'DB', message: 'Query' },
    { from: 'DB', to: 'API', message: 'Results' },
    { from: 'API', to: 'User', message: 'Response' }
  ]
})
testDiagram('Sequence Diagram', sequence)

// Test 5: Pie Chart
console.log(chalk.cyan('\n🥧 Testing Pie Chart...'))
const pie = createPieChart({
  title: 'Budget Distribution',
  data: [
    { label: 'Development', value: 45 },
    { label: 'Testing', value: 20 },
    { label: 'Infrastructure', value: 25 },
    { label: 'Management', value: 10 }
  ]
})
testDiagram('Pie Chart', pie)

// Test 6: State Diagram
console.log(chalk.cyan('\n🔄 Testing State Diagram...'))
const state = createStateDiagram({
  states: [
    { id: 'idle', label: 'Idle' },
    { id: 'running', label: 'Running' },
    { id: 'stopped', label: 'Stopped' }
  ],
  transitions: [
    { from: 'idle', to: 'running', trigger: 'start' },
    { from: 'running', to: 'stopped', trigger: 'stop' },
    { from: 'stopped', to: 'idle', trigger: 'reset' }
  ],
  initialState: 'idle'
})
testDiagram('State Diagram', state)

// Test 7: ER Diagram
console.log(chalk.cyan('\n🗃️ Testing ER Diagram...'))
const er = createEntityRelationship({
  entities: [
    {
      name: 'User',
      attributes: [
        { name: 'id', type: 'int', constraints: ['PK'] },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string', constraints: ['UK'] }
      ]
    },
    {
      name: 'Project',
      attributes: [
        { name: 'id', type: 'int', constraints: ['PK'] },
        { name: 'title', type: 'string' },
        { name: 'user_id', type: 'int', constraints: ['FK'] }
      ]
    }
  ],
  relationships: [
    { from: 'User', to: 'Project', type: 'one-to-many', label: 'owns' }
  ]
})
testDiagram('ER Diagram', er)

// Test 8: Mind Map
console.log(chalk.cyan('\n🧠 Testing Mind Map...'))
const mindmap = createMindMap({
  root: 'Project',
  branches: [
    {
      id: 'planning',
      label: 'Planning',
      children: [
        { id: 'requirements', label: 'Requirements' },
        { id: 'timeline', label: 'Timeline' }
      ]
    },
    {
      id: 'execution',
      label: 'Execution',
      children: [
        { id: 'development', label: 'Development' },
        { id: 'testing', label: 'Testing' }
      ]
    }
  ]
})
testDiagram('Mind Map', mindmap)

// Test 9: Quadrant Chart
console.log(chalk.cyan('\n📈 Testing Quadrant Chart...'))
const quadrant = createQuadrantChart({
  title: 'Priority Matrix',
  xAxisLabel: 'Effort',
  yAxisLabel: 'Impact',
  quadrants: [
    'Quick Wins',
    'Major Projects',
    'Fill Ins',
    'Time Sinks'
  ],
  points: [
    { x: 0.3, y: 0.8, label: 'Feature A' },
    { x: 0.7, y: 0.9, label: 'Feature B' },
    { x: 0.2, y: 0.3, label: 'Feature C' },
    { x: 0.8, y: 0.2, label: 'Feature D' }
  ]
})
testDiagram('Quadrant Chart', quadrant)

// Test 10: User Journey
console.log(chalk.cyan('\n🚶 Testing User Journey...'))
const journey = createUserJourney({
  title: 'User Onboarding',
  persona: 'New User',
  steps: [
    { task: 'Visit website', rating: JourneyRating.POSITIVE, participants: ['User', 'Website'] },
    { task: 'Sign up', rating: JourneyRating.NEUTRAL, participants: ['User', 'Auth'] },
    { task: 'Verify email', rating: JourneyRating.NEGATIVE, participants: ['User', 'Email'] },
    { task: 'Complete profile', rating: JourneyRating.POSITIVE, participants: ['User', 'Profile'] }
  ]
})
testDiagram('User Journey', journey)

// Summary
console.log(chalk.blue.bold('\n📊 Test Summary:'))
console.log(chalk.white(`Total Tests: ${totalTests}`))
console.log(chalk.green(`Passed: ${passedTests}`))
console.log(chalk.red(`Failed: ${failedTests}`))

const successRate = (passedTests / totalTests * 100).toFixed(1)
if (failedTests === 0) {
  console.log(chalk.green.bold(`\n✨ All tests passed! Success rate: ${successRate}%`))
} else {
  console.log(chalk.yellow.bold(`\n⚠️ Some tests failed. Success rate: ${successRate}%`))
}

// Test document formatters
console.log(chalk.blue.bold('\n📄 Testing Document Formatters:'))

import { UnifiedPIDFormatter } from './lib/documents/formatters/unified-pid-formatter'
import { UnifiedBusinessCaseFormatter } from './lib/documents/formatters/unified-business-case-formatter'

// Test PID Formatter
try {
  const pidFormatter = new UnifiedPIDFormatter({
    projectDefinition: {
      projectName: 'Test Project',
      background: 'Test background',
      projectObjectives: ['Objective 1', 'Objective 2'],
      scope: { included: ['In scope'], excluded: ['Out of scope'] },
      deliverables: ['Deliverable 1'],
      constraints: ['Constraint 1'],
      assumptions: ['Assumption 1']
    }
  } as any)

  const pidHtml = pidFormatter.format()
  const hasMermaidDivs = pidHtml.includes('class="mermaid-chart"')

  if (hasMermaidDivs) {
    console.log(chalk.green('✅ PID Formatter: Mermaid charts included'))
  } else {
    console.log(chalk.red('❌ PID Formatter: No Mermaid charts found'))
  }
} catch (error) {
  console.log(chalk.red('❌ PID Formatter: Error during formatting'))
  console.error(error)
}

// Test Business Case Formatter
try {
  const bcFormatter = new UnifiedBusinessCaseFormatter({
    executiveSummary: 'Test summary',
    problemStatement: 'Test problem',
    proposedSolution: 'Test solution',
    benefits: { financial: [], nonFinancial: [], strategic: [] },
    costs: { development: 1000, implementation: 500, operational: 200, total: 1700 },
    risks: [],
    timeline: { phases: [], milestones: [] },
    financialAnalysis: { roi: 150, paybackPeriod: 12, npv: 5000, irr: 25 },
    implementation: { approach: 'Test approach', resources: [], governance: 'Test governance' },
    recommendation: 'Test recommendation'
  } as any)

  const bcHtml = bcFormatter.format()
  const hasMermaidDivs = bcHtml.includes('class="mermaid-chart"')

  if (hasMermaidDivs) {
    console.log(chalk.green('✅ Business Case Formatter: Mermaid charts included'))
  } else {
    console.log(chalk.red('❌ Business Case Formatter: No Mermaid charts found'))
  }
} catch (error) {
  console.log(chalk.red('❌ Business Case Formatter: Error during formatting'))
  console.error(error)
}

console.log(chalk.green.bold('\n✅ Mermaid testing complete!\n'))
process.exit(failedTests > 0 ? 1 : 0)