interface UserStory {
  id?: string
  story?: string
  title?: string
  asA?: string
  iWant?: string
  soThat?: string
  acceptance_criteria?: string[]
  acceptanceCriteria?: string[]
  story_points?: number
  priority?: string
  sprint?: number
  dependencies?: string[]
}

interface BacklogData {
  backlog?: {
    stories?: UserStory[]
  }
  stories?: UserStory[]
  projectName?: string
  companyName?: string
  lastUpdated?: string
  version?: string
  [key: string]: any
}

export function formatBacklog(data: BacklogData): string {
  // Extract stories from various possible locations
  const stories = data.backlog?.stories || data.stories || []
  
  let markdown = `# 📋 Product Backlog\n\n`
  
  // Project header
  if (data.projectName) {
    markdown += `**Project:** ${data.projectName}\n\n`
  }
  
  markdown += `**Document Version:** ${data.version || '1'}\n`
  markdown += `**Last Updated:** ${data.lastUpdated || new Date().toLocaleDateString()}\n`
  markdown += `**Total Stories:** ${stories.length}\n\n`
  
  if (data.companyName) {
    markdown += `**Organization:** ${data.companyName}\n\n`
  }
  
  markdown += `---\n\n`
  
  // Summary Statistics
  markdown += `## 📊 Backlog Summary\n\n`
  
  const totalPoints = stories.reduce((sum, story) => sum + (story.story_points || 0), 0)
  const priorities = {
    High: stories.filter(s => s.priority === 'High').length,
    Medium: stories.filter(s => s.priority === 'Medium').length,
    Low: stories.filter(s => s.priority === 'Low').length
  }
  
  markdown += `- **Total Story Points:** ${totalPoints}\n`
  markdown += `- **High Priority:** ${priorities.High} stories\n`
  markdown += `- **Medium Priority:** ${priorities.Medium} stories\n`
  markdown += `- **Low Priority:** ${priorities.Low} stories\n\n`
  
  // Table of Contents
  markdown += `## 📑 Table of Contents\n\n`
  stories.forEach((story, index) => {
    const title = story.title || story.story || `Story ${story.id || index + 1}`
    markdown += `${index + 1}. [${title}](#story-${index + 1})\n`
  })
  markdown += `\n---\n\n`
  
  // User Stories
  markdown += `## 📝 User Stories\n\n`
  
  if (stories.length > 0) {
    stories.forEach((story, index) => {
      markdown += `### Story ${index + 1}\n`
      markdown += `<a id="story-${index + 1}"></a>\n\n`
      
      // Story ID and Priority badge
      if (story.id) {
        markdown += `**ID:** \`${story.id}\`  `
      }
      if (story.priority) {
        const priorityEmoji = story.priority === 'High' ? '🔴' : story.priority === 'Medium' ? '🟡' : '🟢'
        markdown += `**Priority:** ${priorityEmoji} ${story.priority}  `
      }
      if (story.story_points) {
        markdown += `**Points:** ${story.story_points}  `
      }
      if (story.sprint) {
        markdown += `**Sprint:** ${story.sprint}  `
      }
      markdown += `\n\n`
      
      // User Story Format
      if (story.story) {
        markdown += `**User Story:**\n> ${story.story}\n\n`
      } else if (story.asA || story.iWant || story.soThat) {
        markdown += `**User Story:**\n`
        markdown += `> As a **${story.asA || '[user]'}**,\n`
        markdown += `> I want **${story.iWant || '[feature]'}**,\n`
        markdown += `> So that **${story.soThat || '[benefit]'}**.\n\n`
      }
      
      // Acceptance Criteria
      const criteria = story.acceptance_criteria || story.acceptanceCriteria
      if (criteria && criteria.length > 0) {
        markdown += `**Acceptance Criteria:**\n`
        criteria.forEach((criterion, i) => {
          markdown += `${i + 1}. ${criterion}\n`
        })
        markdown += `\n`
      }
      
      // Dependencies
      if (story.dependencies && story.dependencies.length > 0) {
        markdown += `**Dependencies:**\n`
        story.dependencies.forEach(dep => {
          markdown += `- ${dep}\n`
        })
        markdown += `\n`
      }
      
      markdown += `---\n\n`
    })
  } else {
    markdown += `*No user stories defined yet*\n\n`
  }
  
  // Backlog Prioritization Matrix
  markdown += `## 🎯 Prioritization Matrix\n\n`
  markdown += `| Priority | Count | Story Points | Percentage |\n`
  markdown += `|----------|-------|--------------|------------|\n`
  
  ['High', 'Medium', 'Low'].forEach(priority => {
    const priorityStories = stories.filter(s => s.priority === priority)
    const points = priorityStories.reduce((sum, s) => sum + (s.story_points || 0), 0)
    const percentage = totalPoints > 0 ? ((points / totalPoints) * 100).toFixed(1) : '0'
    markdown += `| ${priority} | ${priorityStories.length} | ${points} | ${percentage}% |\n`
  })
  
  markdown += `\n`
  
  // Sprint Planning Overview
  const sprints = [...new Set(stories.filter(s => s.sprint).map(s => s.sprint))].sort()
  if (sprints.length > 0) {
    markdown += `## 🏃 Sprint Planning\n\n`
    sprints.forEach(sprint => {
      const sprintStories = stories.filter(s => s.sprint === sprint)
      const sprintPoints = sprintStories.reduce((sum, s) => sum + (s.story_points || 0), 0)
      markdown += `### Sprint ${sprint}\n`
      markdown += `- **Stories:** ${sprintStories.length}\n`
      markdown += `- **Total Points:** ${sprintPoints}\n`
      markdown += `- **Stories:** ${sprintStories.map(s => s.id || s.title || 'Unnamed').join(', ')}\n\n`
    })
  }
  
  return markdown
}