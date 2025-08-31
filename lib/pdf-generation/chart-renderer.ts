/**
 * Server-side chart rendering for PDF generation
 * Generates charts as Base64 images using Chart.js in a canvas environment
 */

import { ChartConfiguration } from 'chart.js'

/**
 * Render a Chart.js chart to Base64 image
 * Uses node-canvas for server-side rendering
 */
export async function renderChartToBase64(
  config: ChartConfiguration,
  width: number = 800,
  height: number = 400
): Promise<string> {
  try {
    // Dynamic imports for server-side only
    const { createCanvas } = await import('canvas')
    const { Chart, registerables } = await import('chart.js')
    
    // Register all Chart.js components
    Chart.register(...registerables)
    
    // Create canvas
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Set white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    
    // Create chart with animation disabled for server rendering
    const chart = new Chart(ctx as any, {
      ...config,
      options: {
        ...config.options,
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
      }
    })
    
    // Render chart
    chart.render()
    
    // Convert to Base64
    const base64 = canvas.toDataURL('image/png')
    
    // Clean up
    chart.destroy()
    
    return base64
  } catch (error) {
    console.error('Chart rendering error:', error)
    // Return a placeholder image on error
    return generatePlaceholderChart(width, height)
  }
}

/**
 * Generate a placeholder chart image when rendering fails
 */
function generatePlaceholderChart(width: number, height: number): string {
  // SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-size="16">
        Chart Placeholder
      </text>
    </svg>
  `
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Create a Gantt chart configuration
 */
export function createGanttChartConfig(tasks: Array<{
  name: string
  start: Date
  end: Date
  progress?: number
}>): ChartConfiguration {
  // Convert tasks to chart data
  const labels = tasks.map(t => t.name)
  const data = tasks.map(t => {
    const start = t.start.getTime()
    const end = t.end.getTime()
    return [start, end]
  })
  
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Timeline',
        data: data as any,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        barPercentage: 0.5,
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM dd'
            }
          },
          title: {
            display: true,
            text: 'Timeline'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Tasks'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const task = tasks[context.dataIndex]
              const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))
              return `Duration: ${duration} days`
            }
          }
        }
      }
    }
  }
}

/**
 * Create a risk matrix chart configuration
 */
export function createRiskMatrixConfig(risks: Array<{
  name: string
  probability: number // 1-5
  impact: number // 1-5
}>): ChartConfiguration {
  // Group risks by quadrant
  const data = risks.map(r => ({
    x: r.probability,
    y: r.impact,
    label: r.name
  }))
  
  return {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Risks',
        data: data,
        backgroundColor: data.map(d => {
          const score = d.x * d.y
          if (score >= 15) return 'rgba(239, 68, 68, 0.8)' // High risk - red
          if (score >= 8) return 'rgba(251, 191, 36, 0.8)' // Medium risk - yellow
          return 'rgba(34, 197, 94, 0.8)' // Low risk - green
        }),
        pointRadius: 8,
        pointHoverRadius: 10,
      }]
    },
    options: {
      scales: {
        x: {
          min: 0,
          max: 6,
          title: {
            display: true,
            text: 'Probability →'
          },
          ticks: {
            stepSize: 1
          }
        },
        y: {
          min: 0,
          max: 6,
          title: {
            display: true,
            text: 'Impact →'
          },
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const point = context.raw as any
              return `${point.label}: P${point.x} × I${point.y} = ${point.x * point.y}`
            }
          }
        }
      }
    }
  }
}

/**
 * Create a burndown chart configuration
 */
export function createBurndownChartConfig(
  totalPoints: number,
  completedByDay: number[],
  sprintDays: number
): ChartConfiguration {
  const idealLine = Array.from({ length: sprintDays + 1 }, (_, i) => 
    totalPoints - (totalPoints / sprintDays) * i
  )
  
  const actualLine = [totalPoints]
  completedByDay.forEach((completed, i) => {
    actualLine.push(totalPoints - completed)
  })
  
  const labels = Array.from({ length: sprintDays + 1 }, (_, i) => `Day ${i}`)
  
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ideal',
          data: idealLine,
          borderColor: 'rgba(156, 163, 175, 1)',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0,
        },
        {
          label: 'Actual',
          data: actualLine,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.2,
        }
      ]
    },
    options: {
      scales: {
        y: {
          min: 0,
          title: {
            display: true,
            text: 'Story Points'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Sprint Days'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  }
}

/**
 * Create a velocity chart configuration
 */
export function createVelocityChartConfig(
  sprints: string[],
  planned: number[],
  completed: number[]
): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: sprints,
      datasets: [
        {
          label: 'Planned',
          data: planned,
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)',
          borderWidth: 1,
        },
        {
          label: 'Completed',
          data: completed,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Story Points'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Sprints'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  }
}

/**
 * Create a pie chart configuration
 */
export function createPieChartConfig(
  labels: string[],
  data: number[],
  title?: string
): ChartConfiguration {
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(251, 191, 36, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(236, 72, 153, 0.8)',
  ]
  
  return {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(c => c.replace('0.8', '1')),
        borderWidth: 1,
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'right'
        },
        title: title ? {
          display: true,
          text: title
        } : undefined
      }
    }
  }
}

/**
 * Create a timeline chart configuration
 */
export function createTimelineChartConfig(
  milestones: Array<{
    name: string
    date: Date
    status: 'completed' | 'upcoming' | 'at-risk'
  }>
): ChartConfiguration {
  const sortedMilestones = [...milestones].sort((a, b) => a.date.getTime() - b.date.getTime())
  
  const colors = {
    completed: 'rgba(34, 197, 94, 0.8)',
    upcoming: 'rgba(59, 130, 246, 0.8)',
    'at-risk': 'rgba(239, 68, 68, 0.8)'
  }
  
  return {
    type: 'line',
    data: {
      labels: sortedMilestones.map(m => m.name),
      datasets: [{
        label: 'Milestones',
        data: sortedMilestones.map((m, i) => ({
          x: i,
          y: 1,
          date: m.date,
          status: m.status
        })),
        backgroundColor: sortedMilestones.map(m => colors[m.status]),
        borderColor: sortedMilestones.map(m => colors[m.status].replace('0.8', '1')),
        pointRadius: 10,
        pointHoverRadius: 12,
        showLine: true,
        borderWidth: 2,
      }]
    },
    options: {
      scales: {
        y: {
          display: false,
          min: 0,
          max: 2
        },
        x: {
          title: {
            display: true,
            text: 'Timeline'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const data = context.raw as any
              return `${context.label}: ${data.date.toLocaleDateString()} (${data.status})`
            }
          }
        }
      }
    }
  }
}