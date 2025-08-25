export const agileMethodology = {
  values: [
    {
      name: "Individuals and interactions",
      over: "processes and tools",
      explanation: "While processes and tools are important, the focus should be on empowering people and fostering collaboration"
    },
    {
      name: "Working software",
      over: "comprehensive documentation",
      explanation: "Documentation has its place, but working software is the primary measure of progress"
    },
    {
      name: "Customer collaboration",
      over: "contract negotiation",
      explanation: "Contracts are necessary but working closely with customers yields better results"
    },
    {
      name: "Responding to change",
      over: "following a plan",
      explanation: "Plans are important but adaptability to change is crucial for success"
    }
  ],
  
  principles: [
    "Customer satisfaction through early and continuous delivery",
    "Welcome changing requirements, even late in development",
    "Deliver working software frequently (weeks rather than months)",
    "Business people and developers work together daily",
    "Build projects around motivated individuals",
    "Face-to-face conversation is the most effective communication",
    "Working software is the primary measure of progress",
    "Sustainable development pace",
    "Continuous attention to technical excellence",
    "Simplicity—maximizing work not done",
    "Self-organizing teams",
    "Regular reflection and adjustment"
  ],
  
  scrumFramework: {
    values: ["Commitment", "Focus", "Openness", "Respect", "Courage"],
    
    roles: [
      {
        name: "Product Owner",
        responsibilities: [
          "Developing and communicating the Product Goal",
          "Creating and clearly communicating Product Backlog items",
          "Ordering Product Backlog items",
          "Ensuring the Product Backlog is transparent and understood"
        ],
        accountability: "Maximizing the value of the product"
      },
      {
        name: "Scrum Master",
        responsibilities: [
          "Coaching the team in self-management and cross-functionality",
          "Helping the Scrum Team focus on creating high-value Increments",
          "Removing impediments to progress",
          "Ensuring all Scrum events take place and are productive"
        ],
        accountability: "Establishing Scrum as defined in the Scrum Guide"
      },
      {
        name: "Development Team",
        responsibilities: [
          "Creating a plan for the Sprint (Sprint Backlog)",
          "Instilling quality by adhering to Definition of Done",
          "Adapting their plan each day toward the Sprint Goal",
          "Holding each other accountable as professionals"
        ],
        characteristics: ["Cross-functional", "Self-managing", "3-9 members"]
      }
    ],
    
    events: [
      {
        name: "Sprint",
        purpose: "Fixed-length iteration where ideas are turned into value",
        duration: "1-4 weeks (typically 2 weeks)",
        characteristics: [
          "No changes that endanger Sprint Goal",
          "Quality does not decrease",
          "Product Backlog refined as needed",
          "Scope may be clarified with Product Owner"
        ]
      },
      {
        name: "Sprint Planning",
        purpose: "Define what can be delivered and how to achieve it",
        duration: "Maximum 8 hours for 1-month Sprint",
        topics: [
          "Why is this Sprint valuable?",
          "What can be Done this Sprint?",
          "How will the chosen work get done?"
        ],
        outputs: ["Sprint Goal", "Sprint Backlog"]
      },
      {
        name: "Daily Scrum",
        purpose: "Inspect progress toward Sprint Goal and adapt Sprint Backlog",
        duration: "15 minutes",
        format: "Developers can select structure and techniques",
        focus: "Progress toward Sprint Goal and impediments"
      },
      {
        name: "Sprint Review",
        purpose: "Inspect the outcome of the Sprint and determine future adaptations",
        duration: "Maximum 4 hours for 1-month Sprint",
        participants: "Scrum Team and key stakeholders",
        activities: [
          "Present work accomplished",
          "Discuss Product Backlog",
          "Collaborate on what to do next",
          "Adjust Product Backlog if needed"
        ]
      },
      {
        name: "Sprint Retrospective",
        purpose: "Plan ways to increase quality and effectiveness",
        duration: "Maximum 3 hours for 1-month Sprint",
        focus: [
          "Individuals, interactions, processes, tools",
          "What went well",
          "What needs improvement",
          "Action items for next Sprint"
        ]
      }
    ],
    
    artifacts: [
      {
        name: "Product Backlog",
        description: "Emergent, ordered list of what is needed to improve the product",
        commitment: "Product Goal",
        characteristics: [
          "Single source of work",
          "Refined and decomposed",
          "Continuously evolving",
          "Never complete"
        ]
      },
      {
        name: "Sprint Backlog",
        description: "The Sprint Goal, Product Backlog items for Sprint, and delivery plan",
        commitment: "Sprint Goal",
        characteristics: [
          "By and for Developers",
          "Highly visible",
          "Real-time picture of work",
          "Updated throughout Sprint"
        ]
      },
      {
        name: "Increment",
        description: "Concrete stepping stone toward the Product Goal",
        commitment: "Definition of Done",
        characteristics: [
          "Additive to prior Increments",
          "Thoroughly verified",
          "Must be usable",
          "Multiple per Sprint possible"
        ]
      }
    ]
  },
  
  userStories: {
    format: "As a [type of user], I want [goal/desire] so that [benefit/value]",
    
    investCriteria: {
      "I": "Independent - Stories should be self-contained",
      "N": "Negotiable - Details can be negotiated",
      "V": "Valuable - Must deliver value to end users",
      "E": "Estimable - Must be able to estimate size",
      "S": "Small - Fit within single Sprint",
      "T": "Testable - Clear acceptance criteria"
    },
    
    acceptanceCriteria: {
      format: "Given [context], When [event], Then [outcome]",
      characteristics: [
        "Specific and measurable",
        "Clear pass/fail conditions",
        "Written from user perspective",
        "Testable and demonstrable"
      ]
    },
    
    storyPoints: {
      fibonacci: [1, 2, 3, 5, 8, 13, 21],
      meaning: "Relative size considering effort, complexity, and uncertainty",
      techniques: ["Planning Poker", "T-shirt sizing", "Dot voting"]
    }
  },
  
  prioritization: {
    moscow: {
      "Must Have": "Critical for current delivery timeframe",
      "Should Have": "Important but not vital",
      "Could Have": "Desirable but not necessary",
      "Won't Have": "Not a priority for this timeframe"
    },
    
    other: ["Value vs Effort matrix", "Kano model", "RICE scoring", "Cost of Delay"]
  },
  
  metrics: {
    velocity: {
      definition: "Average story points completed per Sprint",
      usage: "Forecasting and capacity planning",
      caution: "Not for comparing teams"
    },
    
    burndown: {
      definition: "Work remaining over time",
      types: ["Sprint Burndown", "Release Burndown"],
      purpose: "Track progress toward completion"
    },
    
    burnup: {
      definition: "Work completed over time",
      advantage: "Shows scope changes clearly",
      purpose: "Track progress and scope"
    },
    
    cycleTime: {
      definition: "Time from work started to completed",
      purpose: "Measure delivery speed"
    },
    
    leadTime: {
      definition: "Time from work requested to delivered",
      purpose: "Measure overall responsiveness"
    }
  },
  
  practices: {
    engineering: [
      {
        name: "Test-Driven Development (TDD)",
        cycle: ["Write failing test", "Write code to pass", "Refactor"],
        benefits: ["Better design", "Built-in regression testing", "Documentation"]
      },
      {
        name: "Pair Programming",
        description: "Two programmers work together at one workstation",
        benefits: ["Knowledge sharing", "Reduced defects", "Better design"]
      },
      {
        name: "Continuous Integration",
        description: "Frequently integrate code into shared repository",
        practices: ["Automated builds", "Automated testing", "Fast feedback"]
      },
      {
        name: "Refactoring",
        description: "Improving code structure without changing behavior",
        when: ["Code smells detected", "Before adding features", "After adding features"]
      }
    ],
    
    team: [
      {
        name: "Definition of Ready",
        purpose: "Ensure stories are ready for Sprint",
        criteria: [
          "User story defined",
          "Acceptance criteria clear",
          "Dependencies identified",
          "Sized by team",
          "Priority clear"
        ]
      },
      {
        name: "Definition of Done",
        purpose: "Shared understanding of work completion",
        examples: [
          "Code complete",
          "Tests written and passing",
          "Code reviewed",
          "Documentation updated",
          "Deployed to staging"
        ]
      },
      {
        name: "Working Agreements",
        purpose: "Team norms and expectations",
        areas: ["Communication", "Meetings", "Code standards", "Conflict resolution"]
      }
    ]
  },
  
  scaling: {
    frameworks: [
      {
        name: "SAFe (Scaled Agile Framework)",
        levels: ["Team", "Program", "Large Solution", "Portfolio"],
        keyConceptes: ["Agile Release Train", "PI Planning", "Value Streams"]
      },
      {
        name: "LeSS (Large-Scale Scrum)",
        principles: ["One Product Backlog", "One Product Owner", "Multiple teams"],
        focus: "Simplicity and descaling"
      },
      {
        name: "Nexus",
        description: "Framework for 3-9 Scrum teams",
        additions: ["Nexus Integration Team", "Nexus Sprint Planning", "Nexus Daily Scrum"]
      },
      {
        name: "Spotify Model",
        concepts: ["Squads", "Tribes", "Chapters", "Guilds"],
        focus: "Autonomous teams with alignment"
      }
    ]
  },
  
  documentation: {
    philosophy: "Just enough, just in time",
    
    types: [
      {
        name: "Product Documentation",
        examples: ["User stories", "Product roadmap", "Release notes"],
        audience: "Product team and stakeholders"
      },
      {
        name: "Technical Documentation",
        examples: ["Architecture diagrams", "API docs", "Setup guides"],
        audience: "Development team and future maintainers"
      },
      {
        name: "Process Documentation",
        examples: ["Team agreements", "Definition of Done", "Retrospective notes"],
        audience: "Team members"
      }
    ],
    
    bestPractices: [
      "Keep documentation close to code",
      "Automate where possible",
      "Focus on why over how",
      "Update as you go",
      "Review regularly"
    ]
  },
  
  terminology: {
    "Sprint": "Time-boxed iteration of work",
    "Product Backlog": "Prioritized list of features/requirements",
    "Sprint Backlog": "Items selected for the current Sprint",
    "Increment": "Sum of all completed items during a Sprint",
    "Velocity": "Amount of work team completes in a Sprint",
    "Epic": "Large user story that spans multiple Sprints",
    "Spike": "Time-boxed research or investigation",
    "Technical Debt": "Implied cost of rework from quick solutions",
    "Impediment": "Anything slowing or stopping progress",
    "Timebox": "Fixed time period for an activity",
    "Retrospective": "Team reflection on process and improvements",
    "Standup": "Daily synchronization meeting",
    "Backlog Refinement": "Ongoing activity to add details to backlog items",
    "Story Points": "Relative estimation of effort/complexity",
    "Burndown Chart": "Visual representation of work remaining"
  }
}