import { z } from 'zod'

export const AgileCharterSchema = z.object({
  executiveSummary: z.string(),
  
  visionAndObjectives: z.object({
    vision: z.string(),
    objectives: z.array(z.object({
      id: z.string(),
      description: z.string(),
      measurable: z.boolean(),
      targetDate: z.string().optional()
    }))
  }),
  
  successCriteria: z.array(z.object({
    criterion: z.string(),
    metric: z.string(),
    target: z.string(),
    baseline: z.string().optional()
  })),
  
  scope: z.object({
    inScope: z.array(z.string()),
    outOfScope: z.array(z.string()),
    assumptions: z.array(z.string()),
    constraints: z.array(z.string())
  }),
  
  deliverables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    acceptanceCriteria: z.array(z.string()),
    targetSprint: z.string().optional()
  })),
  
  stakeholderAnalysis: z.array(z.object({
    role: z.string(),
    interest: z.enum(['high', 'medium', 'low']),
    influence: z.enum(['high', 'medium', 'low']),
    communicationNeeds: z.string()
  })),
  
  teamStructure: z.object({
    productOwner: z.string(),
    scrumMaster: z.string(),
    developmentTeam: z.array(z.object({
      role: z.string(),
      responsibilities: z.array(z.string())
    }))
  }),
  
  timeline: z.object({
    startDate: z.string(),
    endDate: z.string(),
    sprints: z.number(),
    sprintDuration: z.number(),
    keyMilestones: z.array(z.object({
      name: z.string(),
      date: z.string(),
      deliverables: z.array(z.string())
    }))
  }),
  
  risks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    probability: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    impact: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    mitigation: z.string()
  })),
  
  dependencies: z.array(z.object({
    type: z.enum(['internal', 'external']),
    description: z.string(),
    owner: z.string(),
    dueDate: z.string().optional()
  })),
  
  communicationPlan: z.object({
    ceremonies: z.array(z.object({
      name: z.string(),
      frequency: z.string(),
      duration: z.string(),
      participants: z.array(z.string())
    })),
    reports: z.array(z.object({
      name: z.string(),
      frequency: z.string(),
      audience: z.array(z.string()),
      format: z.string()
    }))
  }),
  
  definitionOfDone: z.array(z.string())
})

export type AgileCharter = z.infer<typeof AgileCharterSchema>

export const ProductBacklogSchema = z.object({
  stories: z.array(z.object({
    id: z.string(),
    epic: z.string(),
    userStory: z.string(),
    acceptanceCriteria: z.array(z.string()),
    storyPoints: z.number(),
    priority: z.enum(['must_have', 'should_have', 'could_have', 'wont_have']),
    dependencies: z.array(z.string()).optional(),
    notes: z.string().optional()
  })),
  
  epics: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    businessValue: z.string()
  }))
})

export type ProductBacklog = z.infer<typeof ProductBacklogSchema>