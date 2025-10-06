/**
 * Server-side Mermaid diagram rendering for PDF generation
 * Converts Mermaid syntax to SVG images
 */

import puppeteer from 'puppeteer'

/**
 * Render Mermaid diagram to SVG
 */
export async function renderMermaidToSVG(mermaidCode: string): Promise<string> {
  let browser
  
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Create HTML with Mermaid
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; background: white; }
            #diagram { display: inline-block; }
          </style>
        </head>
        <body>
          <div id="diagram" class="mermaid">
            ${mermaidCode}
          </div>
          <script>
            mermaid.initialize({ 
              startOnLoad: true,
              theme: 'default',
              themeVariables: {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px'
              }
            });
          </script>
        </body>
      </html>
    `
    
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    // Wait for Mermaid to render
    await page.waitForSelector('svg', { timeout: 5000 })
    
    // Get SVG content
    const svg = await page.evaluate(() => {
      const svgElement = document.querySelector('svg')
      if (svgElement) {
        // Add white background
        svgElement.style.backgroundColor = 'white'
        return svgElement.outerHTML
      }
      return null
    })
    
    await browser.close()
    
    if (!svg) {
      throw new Error('Failed to generate Mermaid diagram')
    }
    
    return svg
    
  } catch (error) {
    console.error('Mermaid rendering error:', error)
    if (browser) await browser.close()
    
    // Return placeholder on error
    return generatePlaceholderDiagram()
  }
}

/**
 * Generate placeholder diagram when rendering fails
 */
function generatePlaceholderDiagram(): string {
  return `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-size="16">
        Diagram Placeholder
      </text>
    </svg>
  `
}

/**
 * Common Mermaid diagram templates
 */
export const MermaidTemplates = {
  /**
   * Create a flowchart
   */
  flowchart: (nodes: Array<{ id: string; label: string; shape?: 'box' | 'round' | 'diamond' | 'circle' }>, 
              connections: Array<{ from: string; to: string; label?: string }>) => {
    const shapes = {
      box: ['[', ']'],
      round: ['(', ')'],
      diamond: ['{', '}'],
      circle: ['((', '))']
    }
    
    let diagram = 'flowchart TD\n'
    
    // Add nodes
    nodes.forEach(node => {
      const [start, end] = shapes[node.shape || 'box']
      diagram += `    ${node.id}${start}${node.label}${end}\n`
    })
    
    // Add connections
    connections.forEach(conn => {
      const arrow = conn.label ? `-->|${conn.label}|` : '-->'
      diagram += `    ${conn.from} ${arrow} ${conn.to}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a sequence diagram
   */
  sequenceDiagram: (participants: string[], interactions: Array<{ from: string; to: string; message: string; type?: 'solid' | 'dashed' }>) => {
    let diagram = 'sequenceDiagram\n'
    
    // Add participants
    participants.forEach(p => {
      diagram += `    participant ${p}\n`
    })
    
    // Add interactions
    interactions.forEach(int => {
      const arrow = int.type === 'dashed' ? '-->>': '->>'
      diagram += `    ${int.from}${arrow}${int.to}: ${int.message}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a Gantt chart
   */
  ganttChart: (title: string, tasks: Array<{ name: string; id: string; start: string; duration: string; after?: string }>) => {
    let diagram = `gantt\n    title ${title}\n    dateFormat YYYY-MM-DD\n`
    
    tasks.forEach(task => {
      const afterClause = task.after ? `, after ${task.after}` : ''
      diagram += `    ${task.name} :${task.id}, ${task.start}, ${task.duration}${afterClause}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a pie chart
   */
  pieChart: (title: string, data: Array<{ label: string; value: number }>) => {
    let diagram = `pie title ${title}\n`
    
    data.forEach(item => {
      diagram += `    "${item.label}" : ${item.value}\n`
    })
    
    return diagram
  },
  
  /**
   * Create an ER diagram
   */
  erDiagram: (entities: Array<{ name: string; attributes: Array<{ name: string; type: string }> }>, 
              relationships: Array<{ from: string; to: string; type: string; label: string }>) => {
    let diagram = 'erDiagram\n'
    
    // Add entities
    entities.forEach(entity => {
      diagram += `    ${entity.name} {\n`
      entity.attributes.forEach(attr => {
        diagram += `        ${attr.type} ${attr.name}\n`
      })
      diagram += `    }\n`
    })
    
    // Add relationships
    relationships.forEach(rel => {
      diagram += `    ${rel.from} ${rel.type} ${rel.to} : "${rel.label}"\n`
    })
    
    return diagram
  },
  
  /**
   * Create a mind map
   */
  mindMap: (root: string, branches: Array<{ level: number; text: string }>) => {
    let diagram = `mindmap\n  root((${root}))\n`
    
    branches.forEach(branch => {
      const indent = '  '.repeat(branch.level + 1)
      diagram += `${indent}${branch.text}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a timeline
   */
  timeline: (title: string, events: Array<{ date: string; event: string }>) => {
    let diagram = `timeline\n    title ${title}\n\n`
    
    events.forEach(e => {
      diagram += `    ${e.date} : ${e.event}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a state diagram
   */
  stateDiagram: (states: Array<{ id: string; label: string; type?: 'start' | 'end' | 'choice' }>, 
                 transitions: Array<{ from: string; to: string; event: string }>) => {
    let diagram = 'stateDiagram-v2\n'
    
    // Add states
    states.forEach(state => {
      if (state.type === 'start') {
        diagram += `    [*] --> ${state.id}\n`
      } else if (state.type === 'end') {
        diagram += `    ${state.id} --> [*]\n`
      } else if (state.type === 'choice') {
        diagram += `    state ${state.id} <<choice>>\n`
      }
      if (state.label && state.id !== state.label) {
        diagram += `    ${state.id} : ${state.label}\n`
      }
    })
    
    // Add transitions
    transitions.forEach(trans => {
      diagram += `    ${trans.from} --> ${trans.to} : ${trans.event}\n`
    })
    
    return diagram
  },
  
  /**
   * Create a user journey
   */
  userJourney: (title: string, persona: string, steps: Array<{ action: string; score: number }>) => {
    let diagram = `journey\n    title ${title}\n    section ${persona}\n`
    
    steps.forEach(step => {
      diagram += `      ${step.action}: ${step.score}\n`
    })
    
    return diagram
  }
}

/**
 * Render multiple Mermaid diagrams for a document
 */
export async function renderMultipleMermaidDiagrams(diagrams: string[]): Promise<string[]> {
  const results: string[] = []
  
  for (const diagram of diagrams) {
    const svg = await renderMermaidToSVG(diagram)
    results.push(svg)
  }
  
  return results
}