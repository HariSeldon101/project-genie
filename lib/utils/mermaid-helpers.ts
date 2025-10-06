/**
 * Centralized Mermaid diagram helpers
 * Provides DRY/SOLID implementation for all Mermaid diagram types
 */

import { permanentLogger } from '@/lib/utils/permanent-logger'
import type {
  MermaidConfig,
  FlowchartData,
  SequenceData,
  ClassData,
  StateData,
  ERData,
  GitGraphData,
  PieData,
  TimelineData,
  GanttData,
  KanbanData,
  UserJourneyData,
  ArchitectureData,
  BlockData,
  PacketData,
  MindMapData,
  QuadrantData,
  TreeMapData,
  SankeyData,
  XYChartData,
  RequirementData,
  MermaidRenderOptions,
  MermaidDiagramResult,
  MermaidValidationResult,
  MermaidRenderResult
} from './mermaid-types'

// Import enums as values, not types
import {
  FlowchartDirection,
  NodeShape,
  ConnectionType,
  GanttTaskStatus,
  Priority,
  JourneyRating,
  MermaidTheme
} from './mermaid-types'

// ============================================
// Core Utilities
// ============================================

/**
 * Initialize Mermaid with configuration
 */
export async function initializeMermaid(config?: MermaidConfig): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Mermaid can only be initialized in browser environment')
  }

  const mermaid = (await import('mermaid')).default

  const defaultConfig: MermaidConfig = {
    theme: MermaidTheme.DEFAULT,
    startOnLoad: false,
    securityLevel: config?.securityLevel || 'loose',
    logLevel: config?.logLevel || 'fatal', // Suppress Mermaid's internal logging
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      ...config?.flowchart
    },
    gantt: {
      numberSectionStyles: 4,
      fontSize: 11,
      ...config?.gantt
    },
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#fff',
      primaryBorderColor: '#4f46e5',
      lineColor: '#e5e7eb',
      secondaryColor: '#f3f4f6',
      tertiaryColor: '#fef3c7',
      ...config?.themeVariables
    }
  }

  mermaid.initialize({ ...defaultConfig, ...config })
}

/**
 * Validate Mermaid syntax with less strict validation
 * Based on best practices: only check for critical errors, be permissive
 */
export async function validateMermaidSyntax(
  definition: string,
  options: { suppressErrors?: boolean } = {}
): Promise<MermaidValidationResult> {
  const result: MermaidValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // Empty check is still critical
  if (!definition || definition.trim().length === 0) {
    if (!options.suppressErrors) {
      result.isValid = false
      result.errors.push('Definition is empty')
    }
    return result
  }

  // Get first line to determine diagram type
  const lines = definition.trim().split('\n')
  const firstLine = lines[0].trim().split(' ')[0]

  // Updated valid diagram types list (removed 'xychart', it's 'xychart-beta')
  const validTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
    'stateDiagram-v2', 'stateDiagram', 'erDiagram', 'gitGraph', 'pie',
    'timeline', 'gantt', 'kanban', 'journey', 'architecture-beta',
    'block-beta', 'packet-beta', 'mindmap', 'quadrantChart',
    'requirementDiagram', 'sankey-beta', 'xychart-beta', 'C4Context',
    'C4Container', 'C4Component', 'C4Dynamic', 'C4Deployment'
  ]

  // Only add warning, don't fail validation
  if (!validTypes.includes(firstLine)) {
    result.warnings.push(`Diagram type '${firstLine}' may not be recognized`)
    // Don't set isValid to false - let Mermaid handle unknown types
  }

  // Remove overly strict indentation checks
  // Mermaid.js will handle the actual syntax validation
  // We only want to catch obvious issues that would definitely fail

  // Check for obviously malformed syntax (but be very permissive)
  if (definition.includes('```mermaid') || definition.includes('```')) {
    result.warnings.push('Definition contains markdown code fence markers')
  }

  // If suppressErrors is true, always return valid
  if (options.suppressErrors) {
    result.isValid = true
  }

  return result
}

/**
 * Render Mermaid diagram safely with error handling
 */
export async function renderMermaidSafely(
  definition: string,
  containerId?: string,
  options: { suppressErrors?: boolean } = {}
): Promise<MermaidRenderResult> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Mermaid rendering requires browser environment')
    }

    const mermaid = (await import('mermaid')).default

    // Validate syntax with suppressErrors option for more permissive validation
    const validation = await validateMermaidSyntax(definition, { suppressErrors: true })

    // Only log warnings, don't fail on validation
    if (validation.warnings.length > 0) {
      console.warn('Mermaid validation warnings:', validation.warnings)
    }

    // Generate truly unique ID - include random component to avoid conflicts
    const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`
    const id = containerId || uniqueId

    // Clear any existing elements with this ID (cleanup from previous renders)
    const existingElement = document.getElementById(id)
    if (existingElement) {
      existingElement.remove()
    }

    try {
      // Render the diagram - let Mermaid handle the actual validation
      const { svg } = await mermaid.render(id, definition)

      // Clean up the temporary element that Mermaid might have created
      const tempElement = document.getElementById(id)
      if (tempElement) {
        tempElement.remove()
      }

      return {
        success: true,
        svg,
        error: undefined,
        fallback: undefined
      }
    } catch (renderError: any) {
      // Clean up any partial render artifacts
      const partialElement = document.getElementById(id)
      if (partialElement) {
        partialElement.remove()
      }

      // If render fails with duplicate ID error, try with a new ID
      if (renderError?.message?.includes('Duplicate id') || renderError?.message?.includes('already been rendered')) {
        const retryId = `mermaid-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(retryId, definition)

        // Clean up the retry element
        const retryElement = document.getElementById(retryId)
        if (retryElement) {
          retryElement.remove()
        }

        return {
          success: true,
          svg,
          error: undefined,
          fallback: undefined
        }
      }

      throw renderError
    }
  } catch (error) {
    // Even if render fails, return a result with fallback
    // Only log the error message to avoid circular structure issues
    const err = error as Error
    console.warn('Mermaid render error (will show fallback):', err?.message || 'Unknown error')
    return {
      success: false,
      svg: undefined,
      error: err,
      fallback: getMermaidErrorFallback(err, definition)
    }
  }
}

/**
 * Generate error fallback content
 */
export function getMermaidErrorFallback(error: Error, definition: string): string {
  return `
    <div class="mermaid-error" style="
      padding: 1rem;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 0.375rem;
      font-family: monospace;
    ">
      <strong>Mermaid Rendering Error:</strong><br/>
      ${error.message}<br/><br/>
      <details>
        <summary>View Definition</summary>
        <pre style="
          padding: 0.5rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 0.25rem;
          overflow-x: auto;
        ">${escapeHtml(definition)}</pre>
      </details>
    </div>
  `
}

/**
 * Escape HTML for safe rendering
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================
// Core Diagram Generators
// ============================================

/**
 * Create a Flowchart/Graph diagram
 */
export function createFlowchart(data: FlowchartData): MermaidDiagramResult {
  const direction = data.direction || FlowchartDirection.TOP_DOWN
  const lines: string[] = [`flowchart ${direction}`]

  // Add nodes
  data.nodes.forEach(node => {
    let nodeStr = node.id

    // Add shape
    switch (node.shape) {
      case NodeShape.ROUNDED:
        nodeStr += `(${node.label})`
        break
      case NodeShape.STADIUM:
        nodeStr += `([${node.label}])`
        break
      case NodeShape.SUBROUTINE:
        nodeStr += `[[${node.label}]]`
        break
      case NodeShape.CYLINDRICAL:
        nodeStr += `[(${node.label})]`
        break
      case NodeShape.CIRCLE:
        nodeStr += `((${node.label}))`
        break
      case NodeShape.RHOMBUS:
        nodeStr += `{${node.label}}`
        break
      case NodeShape.HEXAGON:
        nodeStr += `{{${node.label}}}`
        break
      case NodeShape.PARALLELOGRAM:
        nodeStr += `[/${node.label}/]`
        break
      case NodeShape.TRAPEZOID:
        nodeStr += `[\\${node.label}\\]`
        break
      default:
        nodeStr += `[${node.label}]`
    }

    if (node.class) {
      nodeStr += `:::${node.class}`
    }

    lines.push(`    ${nodeStr}`)
  })

  // Add connections
  data.connections.forEach(conn => {
    let arrow = '-->'

    switch (conn.type) {
      case ConnectionType.OPEN:
        arrow = '---'
        break
      case ConnectionType.DOTTED:
        arrow = '-.->'
        break
      case ConnectionType.THICK:
        arrow = '==>'
        break
    }

    const label = conn.label ? `|${conn.label}|` : ''
    lines.push(`    ${conn.from} ${arrow}${label} ${conn.to}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'flowchart',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Sequence diagram
 */
export function createSequenceDiagram(data: SequenceData): MermaidDiagramResult {
  const lines: string[] = ['sequenceDiagram']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add participants
  data.participants.forEach(p => {
    lines.push(`    ${p.type || 'participant'} ${p.id} as ${p.label}`)
  })

  // Add interactions
  data.interactions.forEach(interaction => {
    let arrow = '->>'
    if (interaction.type === 'dotted') arrow = '-->>'
    if (interaction.type === 'async') arrow = '-)>>'

    const activation = interaction.activation ? '+' : ''
    lines.push(`    ${interaction.from}${arrow}${activation}${interaction.to}: ${interaction.message}`)
  })

  // Add notes if any
  data.notes?.forEach(note => {
    lines.push(`    Note ${note.position} ${note.participant}: ${note.text}`)
  })

  // Add loops if any
  data.loops?.forEach(loop => {
    lines.push(`    loop ${loop.label}`)
    loop.interactions.forEach(i => {
      lines.push(`        ${i.from}->>${i.to}: ${i.message}`)
    })
    lines.push(`    end`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'sequenceDiagram',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Class diagram
 */
export function createClassDiagram(data: ClassData): MermaidDiagramResult {
  const lines: string[] = ['classDiagram']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add classes
  data.classes.forEach(cls => {
    lines.push(`    class ${cls.name} {`)

    // Add properties
    cls.properties.forEach(prop => {
      const visibility = prop.visibility || '+'
      const staticMod = prop.static ? '$' : ''
      lines.push(`        ${visibility}${prop.type} ${prop.name}${staticMod}`)
    })

    // Add methods
    cls.methods.forEach(method => {
      const visibility = method.visibility || '+'
      const params = method.parameters?.join(', ') || ''
      const returnType = method.returnType ? ` ${method.returnType}` : ''
      const abstractMod = method.abstract ? '*' : ''
      const staticMod = method.static ? '$' : ''
      lines.push(`        ${visibility}${method.name}(${params})${returnType}${abstractMod}${staticMod}`)
    })

    lines.push(`    }`)

    if (cls.abstract) {
      lines.push(`    <<abstract>> ${cls.name}`)
    }
    if (cls.interface) {
      lines.push(`    <<interface>> ${cls.name}`)
    }
  })

  // Add relationships
  data.relationships.forEach(rel => {
    let symbol = '--'

    switch (rel.type) {
      case 'inheritance':
        symbol = '<|--'
        break
      case 'composition':
        symbol = '*--'
        break
      case 'aggregation':
        symbol = 'o--'
        break
      case 'association':
        symbol = '-->'
        break
      case 'realization':
        symbol = '..|>'
        break
      case 'dependency':
        symbol = '..>'
        break
    }

    const label = rel.label ? ` : ${rel.label}` : ''
    const multiplicity = rel.multiplicity ? ` "${rel.multiplicity}"` : ''
    lines.push(`    ${rel.from} ${symbol} ${rel.to}${label}${multiplicity}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'classDiagram',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a State diagram
 */
export function createStateDiagram(data: StateData): MermaidDiagramResult {
  const lines: string[] = ['stateDiagram-v2']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add initial state
  if (data.initialState) {
    lines.push(`    [*] --> ${data.initialState}`)
  }

  // Add states
  data.states.forEach(state => {
    if (state.type === 'composite' && state.substates) {
      lines.push(`    state ${state.id} {`)
      state.substates.forEach(substate => {
        lines.push(`        ${substate.id} : ${substate.label}`)
      })
      lines.push(`    }`)
    } else if (state.type === 'choice') {
      lines.push(`    state ${state.id} <<choice>>`)
    } else if (state.type === 'fork') {
      lines.push(`    state ${state.id} <<fork>>`)
    } else if (state.type === 'join') {
      lines.push(`    state ${state.id} <<join>>`)
    } else {
      lines.push(`    ${state.id} : ${state.label}`)
    }
  })

  // Add transitions
  data.transitions.forEach(trans => {
    const guard = trans.guard ? ` [${trans.guard}]` : ''
    const action = trans.action ? ` / ${trans.action}` : ''
    lines.push(`    ${trans.from} --> ${trans.to} : ${trans.trigger}${guard}${action}`)
  })

  // Add final state
  if (data.finalState) {
    lines.push(`    ${data.finalState} --> [*]`)
  }

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'stateDiagram',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create an Entity Relationship diagram
 */
export function createEntityRelationship(data: ERData): MermaidDiagramResult {
  const lines: string[] = ['erDiagram']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add relationships first
  data.relationships.forEach(rel => {
    let symbol = '||--||'

    switch (rel.type) {
      case 'one-to-one':
        symbol = '||--||'
        break
      case 'one-to-many':
        symbol = '||--o{'
        break
      case 'many-to-one':
        symbol = '}o--||'
        break
      case 'many-to-many':
        symbol = '}o--o{'
        break
    }

    lines.push(`    ${rel.from} ${symbol} ${rel.to} : "${rel.label}"`)
  })

  // Add entities with attributes
  data.entities.forEach(entity => {
    lines.push('')
    lines.push(`    ${entity.name} {`)

    entity.attributes.forEach(attr => {
      const constraints = attr.constraints?.join(' ') || ''
      lines.push(`        ${attr.type} ${attr.name} ${constraints}`.trim())
    })

    lines.push(`    }`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'erDiagram',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Git Graph
 */
export function createGitGraph(data: GitGraphData): MermaidDiagramResult {
  const lines: string[] = ['gitGraph']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Process commits and branches
  data.commits.forEach(commit => {
    if (commit.type === 'highlight') {
      lines.push(`    commit id: "${commit.id}" type: HIGHLIGHT`)
    } else if (commit.type === 'reverse') {
      lines.push(`    commit id: "${commit.id}" type: REVERSE`)
    } else {
      lines.push(`    commit id: "${commit.id}"`)
    }

    if (commit.tag) {
      lines.push(`    tag: "${commit.tag}"`)
    }
  })

  // Add branches
  data.branches.forEach(branch => {
    lines.push(`    branch ${branch.name}`)
    if (branch.from) {
      lines.push(`    checkout ${branch.from}`)
    }
  })

  // Add merges
  data.merges.forEach(merge => {
    lines.push(`    checkout ${merge.to}`)
    lines.push(`    merge ${merge.from}`)
    if (merge.tag) {
      lines.push(`    tag: "${merge.tag}"`)
    }
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'gitGraph',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Pie Chart
 */
export function createPieChart(data: PieData): MermaidDiagramResult {
  const lines: string[] = [`pie title ${data.title}`]

  data.slices.forEach(slice => {
    lines.push(`    "${slice.label}" : ${slice.value}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'pie',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

// ============================================
// Project Management Diagrams
// ============================================

/**
 * Create a Timeline diagram
 */
export function createTimelineDiagram(data: TimelineData): MermaidDiagramResult {
  // Timeline syntax is very specific - no indentation allowed
  const lines: string[] = [
    'timeline',
    `title ${data.title}`,
    ''  // Empty line after title
  ]

  // Timeline entries must NOT be indented and follow specific format
  data.entries.forEach(entry => {
    // First event for the period
    lines.push(`${entry.period} : ${entry.events[0]}`)

    // Additional events for the same period (these ARE indented with exactly 8 spaces)
    entry.events.slice(1).forEach(event => {
      lines.push(`        : ${event}`)
    })

    // Add empty line between periods for better readability
    lines.push('')
  })

  const definition = lines.join('\n').trim()  // Trim trailing newline

  // Validate the generated syntax
  const validation = validateMermaidSyntax(definition)

  if (!validation.isValid) {
    permanentLogger.warn('MERMAID_VALIDATION', 'Timeline diagram validation failed', {
      errors: validation.errors,
      diagramType: 'timeline'
    })
  }

  return {
    definition,
    type: 'timeline',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Gantt Chart
 */
export function createGanttChart(data: GanttData): MermaidDiagramResult {
  // Gantt syntax requires no indentation for configuration lines
  const lines: string[] = [
    'gantt'
  ]

  // Title must be on its own line without indentation
  lines.push(`title ${data.title}`)

  // Add date format if specified (no indentation)
  if (data.dateFormat) {
    lines.push(`dateFormat ${data.dateFormat}`)
  } else {
    // Default to YYYY-MM-DD if not specified
    lines.push('dateFormat YYYY-MM-DD')
  }

  // Add excludes if specified (no indentation)
  if (data.excludes && data.excludes.length > 0) {
    lines.push(`excludes ${data.excludes.join(' ')}`)
  }

  // Add sections and tasks
  data.sections.forEach((section, sectionIndex) => {
    // Add empty line before each section for readability
    if (sectionIndex > 0) {
      lines.push('')
    }

    // Section header (no indentation)
    lines.push(`section ${section.name}`)

    section.tasks.forEach(task => {
      // Build task line with proper format
      let taskLine = task.name

      // Status comes after the task name with a colon
      if (task.status) {
        taskLine += ` :${task.status}`
      } else {
        taskLine += ' :'  // Empty status
      }

      // Add task ID if present
      if (task.id) {
        taskLine += ` ${task.id},`
      }

      // Add timing information
      if (task.after) {
        taskLine += ` after ${task.after}`
        if (task.duration) {
          taskLine += `, ${task.duration}`
        }
      } else if (task.startDate) {
        taskLine += ` ${task.startDate}`
        if (task.duration) {
          taskLine += `, ${task.duration}`
        } else if (task.endDate) {
          taskLine += `, ${task.endDate}`
        }
      } else if (task.duration) {
        // If only duration is specified, it starts from project start
        taskLine += ` ${task.duration}`
      }

      // Tasks are NOT indented
      lines.push(taskLine)
    })
  })

  const definition = lines.join('\n')

  // Validate the generated syntax
  const validation = validateMermaidSyntax(definition)

  if (!validation.isValid) {
    permanentLogger.warn('MERMAID_VALIDATION', 'Gantt chart validation failed', {
      errors: validation.errors,
      diagramType: 'gantt'
    })
  }

  return {
    definition,
    type: 'gantt',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Kanban Board
 */
export function createKanbanBoard(data: KanbanData): MermaidDiagramResult {
  const lines: string[] = [
    'kanban',
    `title ${data.title}`
  ]

  data.columns.forEach(column => {
    lines.push('')
    lines.push(column.name)

    column.cards.forEach(card => {
      let cardLine = `  ${card.title}`

      if (card.assignee) {
        cardLine += ` @${card.assignee}`
      }

      if (card.labels && card.labels.length > 0) {
        cardLine += ` [${card.labels.join(', ')}]`
      }

      if (card.priority) {
        const priorityIcon = {
          [Priority.LOW]: '↓',
          [Priority.MEDIUM]: '→',
          [Priority.HIGH]: '↑',
          [Priority.CRITICAL]: '⚠'
        }[card.priority]
        cardLine += ` ${priorityIcon}`
      }

      lines.push(cardLine)
    })
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'kanban',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a User Journey diagram
 */
export function createUserJourney(data: UserJourneyData): MermaidDiagramResult {
  const lines: string[] = [
    'journey',
    `title ${data.title}`
  ]

  data.stages.forEach(stage => {
    lines.push(`section ${stage.name}`)

    stage.steps.forEach(step => {
      lines.push(`  ${step.action}: ${step.rating}: ${step.actor}`)
    })
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'journey',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

// ============================================
// Technical Diagrams
// ============================================

/**
 * Create an Architecture diagram
 */
export function createArchitectureDiagram(data: ArchitectureData): MermaidDiagramResult {
  const lines: string[] = ['architecture-beta']

  // Add title if provided
  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add groups
  data.groups.forEach(group => {
    lines.push(`    group ${group.id}(${group.type})[${group.name}]`)
  })

  // Add services
  data.services.forEach(service => {
    lines.push(`    service ${service.id}(${service.type})[${service.name}] in ${service.group}`)
  })

  // Add connections
  data.connections.forEach(conn => {
    const direction = conn.direction ? `:${conn.direction}` : ''
    const opposite = {
      'L': 'R',
      'R': 'L',
      'T': 'B',
      'B': 'T'
    }[conn.direction || 'R'] || 'L'

    const label = conn.label ? `[${conn.label}]` : ''
    lines.push(`    ${conn.from}${direction} --> ${opposite}:${conn.to}${label}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'architecture',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Block diagram
 */
export function createBlockDiagram(data: BlockData): MermaidDiagramResult {
  const lines: string[] = ['block-beta']

  if (data.columns) {
    lines.push(`columns ${data.columns}`)
  }

  // Add blocks
  data.blocks.forEach(block => {
    let blockStr = block.id

    // Add shape
    switch (block.type) {
      case NodeShape.ROUNDED:
        blockStr = `${block.id}("${block.label}")`
        break
      case NodeShape.STADIUM:
        blockStr = `${block.id}(["${block.label}"])`
        break
      case NodeShape.CYLINDRICAL:
        blockStr = `${block.id}[("${block.label}")]`
        break
      case NodeShape.CIRCLE:
        blockStr = `${block.id}(("${block.label}"))`
        break
      case NodeShape.RHOMBUS:
        blockStr = `${block.id}{"${block.label}"}`
        break
      default:
        blockStr = `${block.id}["${block.label}"]`
    }

    lines.push(`  ${blockStr}`)
  })

  // Add connections
  data.connections.forEach(conn => {
    let arrow = '-->'

    if (conn.style === ConnectionType.DOTTED) {
      arrow = '-.->'
    } else if (conn.style === ConnectionType.THICK) {
      arrow = '==>'
    }

    const label = conn.label ? ` "${conn.label}"` : ''
    lines.push(`  ${conn.from} ${arrow} ${conn.to}${label}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'block',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Packet diagram
 */
export function createPacketDiagram(data: PacketData): MermaidDiagramResult {
  const lines: string[] = ['packet-beta']

  if (data.title) {
    lines.push(`  title ${data.title}`)
  }

  data.bits.forEach(bit => {
    lines.push(`${bit.range}: "${bit.label}"`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'packet',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

// ============================================
// Business Analysis Diagrams
// ============================================

/**
 * Create a Mind Map
 */
export function createMindMap(data: MindMapData): MermaidDiagramResult {
  const lines: string[] = ['mindmap']

  if (data.title) {
    lines.push(`  title ${data.title}`)
  }

  // Recursive function to add nodes
  const addNode = (node: typeof data.root, depth: number = 0) => {
    const indent = '  '.repeat(depth + 1)
    const shape = node.shape ? `${node.shape === 'circle' ? '((' : node.shape === 'square' ? '[' : '(('}${node.label}${node.shape === 'circle' ? '))' : node.shape === 'square' ? ']' : '))'}` : node.label
    lines.push(`${indent}${shape}`)

    if (node.children) {
      node.children.forEach(child => addNode(child, depth + 1))
    }
  }

  addNode(data.root)

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'mindmap',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Quadrant Chart
 */
export function createQuadrantChart(data: QuadrantData): MermaidDiagramResult {
  const lines: string[] = [
    'quadrantChart',
    `    title ${data.title}`,
    `    x-axis ${data.xAxis.left} --> ${data.xAxis.right}`,
    `    y-axis ${data.yAxis.left} --> ${data.yAxis.right}`
  ]

  // Add items
  data.items.forEach(item => {
    lines.push(`    "${item.label}": [${item.x}, ${item.y}]`)
  })

  // Add quadrant definitions if provided
  if (data.quadrants) {
    data.quadrants.forEach(quad => {
      lines.push(`    quadrant-${quad.number} ${quad.label}`)
    })
  }

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'quadrantChart',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Tree Map
 */
export function createTreeMap(data: TreeMapData): MermaidDiagramResult {
  const lines: string[] = [
    'treemap',
    `title ${data.title}`
  ]

  // Recursive function to add nodes
  const addNode = (node: typeof data.root, indent: string = '') => {
    if (node.value !== undefined) {
      lines.push(`${indent}${node.name}: ${node.value}`)
    } else {
      lines.push(`${indent}${node.name}`)
    }

    if (node.children) {
      node.children.forEach(child => addNode(child, indent + '  '))
    }
  }

  addNode(data.root)

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'treemap',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Sankey diagram
 */
export function createSankeyDiagram(data: SankeyData): MermaidDiagramResult {
  const lines: string[] = ['sankey-beta']

  if (data.title) {
    lines.push(`  title ${data.title}`)
  }

  data.flows.forEach(flow => {
    lines.push(`${flow.source},${flow.target},${flow.value}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'sankey',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create an XY Chart
 */
export function createXYChart(data: XYChartData): MermaidDiagramResult {
  const lines: string[] = [
    'xychart-beta',
    `    title "${data.title}"`
  ]

  // Add x-axis
  if (data.xAxis.values) {
    lines.push(`    x-axis [${data.xAxis.values.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`)
  } else if (data.xAxis.min !== undefined && data.xAxis.max !== undefined) {
    lines.push(`    x-axis ${data.xAxis.min} --> ${data.xAxis.max}`)
  }

  // Add y-axis
  if (data.yAxis.label) {
    lines.push(`    y-axis "${data.yAxis.label}" ${data.yAxis.min || 0} --> ${data.yAxis.max || 100}`)
  } else {
    lines.push(`    y-axis ${data.yAxis.min || 0} --> ${data.yAxis.max || 100}`)
  }

  // Add datasets
  data.datasets.forEach(dataset => {
    lines.push(`    ${dataset.type} [${dataset.data.join(', ')}]`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'xychart',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

/**
 * Create a Requirement diagram
 */
export function createRequirementDiagram(data: RequirementData): MermaidDiagramResult {
  const lines: string[] = ['requirementDiagram']

  if (data.title) {
    lines.push(`    title ${data.title}`)
  }

  // Add requirements
  data.requirements.forEach(req => {
    lines.push(`    requirement ${req.id} {`)
    lines.push(`        id: ${req.id}`)
    lines.push(`        text: ${req.text}`)
    if (req.risk) lines.push(`        risk: ${req.risk}`)
    if (req.verifyMethod) lines.push(`        verifymethod: ${req.verifyMethod}`)
    lines.push(`    }`)
  })

  // Add elements
  data.elements.forEach(elem => {
    lines.push(`    element ${elem.id} {`)
    lines.push(`        type: ${elem.type}`)
    if (elem.docref) lines.push(`        docref: ${elem.docref}`)
    lines.push(`    }`)
  })

  // Add relationships
  data.relationships.forEach(rel => {
    lines.push(`    ${rel.source} - ${rel.type} -> ${rel.target}`)
  })

  const definition = lines.join('\n')
  const validation = validateMermaidSyntax(definition)

  return {
    definition,
    type: 'requirementDiagram',
    isValid: validation.isValid,
    error: validation.errors?.join(', ') || 'Validation failed'
  }
}

// ============================================
// Utility Functions for Common Patterns
// ============================================

/**
 * Create a simple org chart using flowchart
 */
export function createOrgChart(
  title: string,
  ceo: string,
  departments: { name: string; head: string; members?: string[] }[]
): MermaidDiagramResult {
  const data: FlowchartData = {
    direction: FlowchartDirection.TOP_DOWN,
    nodes: [
      { id: 'CEO', label: ceo, shape: NodeShape.ROUNDED }
    ],
    connections: []
  }

  departments.forEach((dept, idx) => {
    const deptId = `dept${idx}`
    data.nodes.push({ id: deptId, label: dept.head, shape: NodeShape.RECTANGLE })
    data.connections.push({ from: 'CEO', to: deptId, label: dept.name })

    dept.members?.forEach((member, midx) => {
      const memberId = `${deptId}_m${midx}`
      data.nodes.push({ id: memberId, label: member, shape: NodeShape.STADIUM })
      data.connections.push({ from: deptId, to: memberId })
    })
  })

  return createFlowchart(data)
}

/**
 * Create a risk matrix using quadrant chart
 */
export function createRiskMatrix(
  risks: { name: string; impact: number; probability: number }[]
): MermaidDiagramResult {
  const data: QuadrantData = {
    title: 'Risk Assessment Matrix',
    xAxis: { label: 'Impact', left: 'Low Impact', right: 'High Impact' },
    yAxis: { label: 'Probability', left: 'Low Probability', right: 'High Probability' },
    items: risks.map(risk => ({
      label: risk.name,
      x: risk.impact,
      y: risk.probability
    })),
    quadrants: [
      { number: 1, label: 'Critical Risks' },
      { number: 2, label: 'Monitor Closely' },
      { number: 3, label: 'Low Priority' },
      { number: 4, label: 'Contingency Planning' }
    ]
  }

  return createQuadrantChart(data)
}

/**
 * Create a project roadmap using timeline
 */
export function createProjectRoadmap(
  phases: { name: string; quarter: string; milestones: string[] }[]
): MermaidDiagramResult {
  const data: TimelineData = {
    title: 'Project Roadmap',
    entries: phases.map(phase => ({
      period: `${phase.quarter} - ${phase.name}`,
      events: phase.milestones
    }))
  }

  return createTimelineDiagram(data)
}

// ============================================
// Export all diagram types for convenience
// ============================================

export const MermaidHelpers = {
  // Initialization and utilities
  initializeMermaid,
  validateMermaidSyntax,
  renderMermaidSafely,
  getMermaidErrorFallback,

  // Core diagrams
  createFlowchart,
  createSequenceDiagram,
  createClassDiagram,
  createStateDiagram,
  createEntityRelationship,
  createGitGraph,
  createPieChart,

  // Project management diagrams
  createTimelineDiagram,
  createGanttChart,
  createKanbanBoard,
  createUserJourney,

  // Technical diagrams
  createArchitectureDiagram,
  createBlockDiagram,
  createPacketDiagram,

  // Business analysis diagrams
  createMindMap,
  createQuadrantChart,
  createTreeMap,
  createSankeyDiagram,
  createXYChart,
  createRequirementDiagram,

  // Utility patterns
  createOrgChart,
  createRiskMatrix,
  createProjectRoadmap
}

export default MermaidHelpers

// Re-export enums from types for convenience
export {
  FlowchartDirection,
  NodeShape,
  ConnectionType,
  GanttTaskStatus,
  Priority,
  JourneyRating,
  MermaidTheme
} from './mermaid-types'