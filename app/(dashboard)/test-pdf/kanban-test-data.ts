/**
 * Kanban board test data
 */

export const kanbanTestData = {
  overview: {
    boardName: 'Sprint 23 - Q4 Development',
    sprint: 'Sprint 23',
    startDate: '2025-01-15',
    endDate: '2025-01-29',
    team: 'Platform Engineering Team',
    sprintGoal: 'Complete authentication system refactor and deploy new API gateway with monitoring'
  },
  
  columns: [
    {
      name: 'Backlog',
      cards: [
        {
          id: 'PLAT-1234',
          title: 'Implement OAuth 2.0 refresh token rotation',
          priority: 'High',
          assignee: 'Sarah Chen',
          estimate: 5,
          labels: ['security', 'backend'],
          description: 'Add automatic refresh token rotation for enhanced security'
        },
        {
          id: 'PLAT-1235',
          title: 'Add rate limiting to public API endpoints',
          priority: 'Medium',
          assignee: 'Mike Johnson',
          estimate: 3,
          labels: ['api', 'performance']
        }
      ]
    },
    {
      name: 'To Do',
      wipLimit: 8,
      cards: [
        {
          id: 'PLAT-1229',
          title: 'Migrate user service to Kubernetes',
          priority: 'High',
          assignee: 'Alex Kumar',
          estimate: 8,
          labels: ['infrastructure', 'migration'],
          daysInColumn: 1
        },
        {
          id: 'PLAT-1230',
          title: 'Setup distributed tracing with OpenTelemetry',
          priority: 'Medium',
          assignee: 'Emma Wilson',
          estimate: 5,
          labels: ['monitoring', 'observability'],
          daysInColumn: 2
        },
        {
          id: 'PLAT-1231',
          title: 'Create API documentation with OpenAPI 3.0',
          priority: 'Low',
          assignee: 'David Park',
          estimate: 3,
          labels: ['documentation'],
          daysInColumn: 1
        }
      ]
    },
    {
      name: 'In Progress',
      wipLimit: 4,
      cards: [
        {
          id: 'PLAT-1225',
          title: 'Refactor authentication middleware for JWT',
          priority: 'Critical',
          assignee: 'Sarah Chen',
          estimate: 8,
          labels: ['security', 'refactor'],
          daysInColumn: 3
        },
        {
          id: 'PLAT-1226',
          title: 'Implement circuit breaker pattern for external APIs',
          priority: 'High',
          assignee: 'Mike Johnson',
          estimate: 5,
          labels: ['resilience', 'backend'],
          daysInColumn: 2
        },
        {
          id: 'PLAT-1227',
          title: 'Add comprehensive error handling to payment service',
          priority: 'High',
          assignee: 'Lisa Zhang',
          estimate: 5,
          labels: ['payment', 'error-handling'],
          daysInColumn: 4,
          blocked: true,
          blockedReason: 'Waiting for payment provider API update'
        }
      ]
    },
    {
      name: 'Code Review',
      wipLimit: 3,
      cards: [
        {
          id: 'PLAT-1223',
          title: 'Database connection pooling optimization',
          priority: 'Medium',
          assignee: 'Alex Kumar',
          estimate: 3,
          labels: ['database', 'performance'],
          daysInColumn: 1
        },
        {
          id: 'PLAT-1224',
          title: 'Add unit tests for order processing module',
          priority: 'Medium',
          assignee: 'Emma Wilson',
          estimate: 3,
          labels: ['testing'],
          daysInColumn: 1
        }
      ]
    },
    {
      name: 'Testing',
      wipLimit: 3,
      cards: [
        {
          id: 'PLAT-1221',
          title: 'Load testing for new API gateway',
          priority: 'High',
          assignee: 'QA Team',
          estimate: 5,
          labels: ['testing', 'performance'],
          daysInColumn: 2
        }
      ]
    },
    {
      name: 'Done',
      cards: [
        {
          id: 'PLAT-1218',
          title: 'Upgrade Node.js to v20 LTS',
          priority: 'Medium',
          assignee: 'David Park',
          estimate: 3,
          labels: ['maintenance'],
          completedDate: '2025-01-22'
        },
        {
          id: 'PLAT-1219',
          title: 'Implement health check endpoints',
          priority: 'Medium',
          assignee: 'Sarah Chen',
          estimate: 2,
          labels: ['monitoring'],
          completedDate: '2025-01-23'
        },
        {
          id: 'PLAT-1220',
          title: 'Configure CI/CD pipeline for staging',
          priority: 'High',
          assignee: 'Mike Johnson',
          estimate: 5,
          labels: ['devops'],
          completedDate: '2025-01-24'
        }
      ]
    }
  ],
  
  workInProgress: {
    totalWIP: 11,
    wipChange: -2,
    blockedItems: 1,
    avgAge: 2.3,
    oldestItem: 4
  },
  
  metrics: {
    velocity: 45,
    throughput: 12,
    leadTime: 8,
    cycleTime: 5
  },
  
  cycleTime: {
    todoToProgress: '2d',
    todoToProgressMin: '0.5d',
    todoToProgressMax: '5d',
    todoToProgress85: '3d',
    progressToReview: '3d',
    progressToReviewMin: '1d',
    progressToReviewMax: '7d',
    progressToReview85: '4d',
    reviewToDone: '1d',
    reviewToDoneMin: '0.5d',
    reviewToDoneMax: '3d',
    reviewToDone85: '2d',
    total: '6d',
    totalMin: '2d',
    totalMax: '15d',
    total85: '9d',
    trend: 'decreased',
    trendValue: '15%'
  },
  
  throughput: {
    average: 12,
    peak: 18,
    peakWeek: 'Week 3',
    predictability: '85%',
    weekly: [
      { week: 'Week 1', started: 15, completed: 12, netFlow: -3 },
      { week: 'Week 2', started: 14, completed: 15, netFlow: 1 },
      { week: 'Week 3', started: 18, completed: 18, netFlow: 0 },
      { week: 'Week 4', started: 10, completed: 14, netFlow: 4 }
    ]
  },
  
  blockedItems: [
    {
      id: 'PLAT-1227',
      title: 'Add comprehensive error handling to payment service',
      blockedSince: '2025-01-20',
      daysBlocked: 4,
      reason: 'Waiting for payment provider API update',
      owner: 'Lisa Zhang'
    }
  ],
  
  teamCapacity: {
    totalCapacity: 87,
    availableHours: 160,
    allocatedHours: 140,
    members: [
      { name: 'Sarah Chen', wip: 2, capacity: 40, utilization: 90 },
      { name: 'Mike Johnson', wip: 2, capacity: 40, utilization: 85 },
      { name: 'Alex Kumar', wip: 2, capacity: 40, utilization: 80 },
      { name: 'Emma Wilson', wip: 2, capacity: 40, utilization: 75 },
      { name: 'David Park', wip: 1, capacity: 40, utilization: 70 },
      { name: 'Lisa Zhang', wip: 1, capacity: 40, utilization: 95 }
    ]
  },
  
  upcomingWork: [
    {
      id: 'PLAT-1236',
      title: 'Implement GraphQL subscriptions',
      estimate: 8,
      dependencies: 'PLAT-1225',
      targetSprint: 'Sprint 24'
    },
    {
      id: 'PLAT-1237',
      title: 'Add multi-factor authentication',
      estimate: 13,
      dependencies: 'PLAT-1225',
      targetSprint: 'Sprint 24'
    },
    {
      id: 'PLAT-1238',
      title: 'Database sharding implementation',
      estimate: 21,
      dependencies: 'None',
      targetSprint: 'Sprint 25'
    },
    {
      id: 'PLAT-1239',
      title: 'Migrate to microservices architecture',
      estimate: 34,
      dependencies: 'PLAT-1238',
      targetSprint: 'Sprint 26'
    }
  ],
  
  backlogHealth: {
    readyItems: 15,
    refinedItems: 25,
    coverage: '3 sprints'
  }
}