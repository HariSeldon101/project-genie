export const prince2Methodology = {
  principles: [
    {
      name: "Continued Business Justification",
      description: "A project must have continued business justification throughout its lifecycle",
      keyPoints: [
        "Valid reason for starting the project",
        "Justification remains valid throughout",
        "Documented and approved business case"
      ]
    },
    {
      name: "Learn from Experience",
      description: "Teams should learn from previous experiences and apply lessons",
      keyPoints: [
        "Seek and document lessons from previous projects",
        "Learn throughout the project lifecycle",
        "Pass on lessons to future projects"
      ]
    },
    {
      name: "Defined Roles and Responsibilities",
      description: "Clear organizational structure with defined roles",
      keyPoints: [
        "Defined project board with Executive, Senior User, Senior Supplier",
        "Clear accountability and responsibilities",
        "Appropriate delegation levels"
      ]
    },
    {
      name: "Manage by Stages",
      description: "Projects are planned, monitored and controlled stage by stage",
      keyPoints: [
        "Management stages provide control points",
        "Authorizations are stage-based",
        "Review and planning at stage boundaries"
      ]
    },
    {
      name: "Manage by Exception",
      description: "Define tolerances for time, cost, quality, scope, risk and benefits",
      keyPoints: [
        "Escalation only when tolerances are forecast to be exceeded",
        "Efficient use of senior management time",
        "Clear delegation of authority"
      ]
    },
    {
      name: "Focus on Products",
      description: "Focus on the definition and delivery of products",
      keyPoints: [
        "Product-based planning approach",
        "Clear quality criteria for products",
        "Agreement on product requirements"
      ]
    },
    {
      name: "Tailor to Suit",
      description: "PRINCE2 must be tailored to suit the project environment",
      keyPoints: [
        "Scale according to project size and complexity",
        "Adapt to organizational culture",
        "Integrate with existing processes"
      ]
    }
  ],
  
  practices: [
    {
      name: "Business Case",
      purpose: "Establish mechanisms to judge whether the project remains desirable, viable and achievable",
      keyDocuments: ["Business Case", "Benefits Management Approach"],
      questions: [
        "Why are we undertaking this project?",
        "What are the expected benefits?",
        "What are the risks and costs?",
        "How will we measure success?"
      ]
    },
    {
      name: "Organization",
      purpose: "Define and establish the project's structure of accountability and responsibilities",
      keyDocuments: ["Project Management Team Structure", "Role Descriptions"],
      roles: {
        board: ["Executive", "Senior User", "Senior Supplier"],
        management: ["Project Manager", "Team Manager"],
        support: ["Project Support", "Project Assurance"]
      }
    },
    {
      name: "Quality",
      purpose: "Define and implement the means by which the project will verify products are fit for purpose",
      keyDocuments: ["Quality Management Approach", "Product Descriptions", "Quality Register"],
      activities: ["Quality Planning", "Quality Control", "Quality Assurance"]
    },
    {
      name: "Plans",
      purpose: "Facilitate communication and control by defining the means of delivering the products",
      keyDocuments: ["Project Plan", "Stage Plan", "Team Plan"],
      levels: ["Project", "Stage", "Team"],
      techniques: ["Product-based planning", "Gantt charts", "Network diagrams"]
    },
    {
      name: "Risk",
      purpose: "Identify, assess and control uncertainty to improve the ability to succeed",
      keyDocuments: ["Risk Management Approach", "Risk Register"],
      process: ["Identify", "Assess", "Plan", "Implement", "Communicate"]
    },
    {
      name: "Issues",
      purpose: "Identify and manage issues that may impact project objectives",
      keyDocuments: ["Issue Register", "Issue Report"],
      types: ["Request for Change", "Off-Specification", "Problem/Concern"]
    },
    {
      name: "Progress",
      purpose: "Establish mechanisms to monitor and compare actual achievements against planned",
      keyDocuments: ["Highlight Report", "Checkpoint Report", "End Stage Report"],
      controls: ["Tolerances", "Stages", "Reports", "Reviews"]
    }
  ],
  
  processes: [
    {
      name: "Starting up a Project",
      purpose: "Ensure prerequisites for initiating the project are in place",
      activities: [
        "Appoint the Executive and Project Manager",
        "Capture previous lessons",
        "Design and appoint the project management team",
        "Prepare the outline Business Case",
        "Select the project approach",
        "Plan the initiation stage"
      ]
    },
    {
      name: "Directing a Project",
      purpose: "Enable the Project Board to be accountable for the project's success",
      activities: [
        "Authorize initiation",
        "Authorize the project",
        "Authorize a Stage or Exception Plan",
        "Give ad hoc direction",
        "Authorize project closure"
      ]
    },
    {
      name: "Initiating a Project",
      purpose: "Establish solid foundations for the project",
      activities: [
        "Prepare the Risk Management Approach",
        "Prepare the Quality Management Approach",
        "Prepare the Configuration Management Approach",
        "Prepare the Communication Management Approach",
        "Set up project controls",
        "Create the Project Plan",
        "Refine the Business Case",
        "Assemble the Project Initiation Documentation"
      ]
    },
    {
      name: "Controlling a Stage",
      purpose: "Assign work, monitor progress, deal with issues and report to the Project Board",
      activities: [
        "Authorize a Work Package",
        "Review Work Package status",
        "Receive completed Work Packages",
        "Review the stage status",
        "Report highlights",
        "Capture and examine issues and risks",
        "Escalate issues and risks"
      ]
    },
    {
      name: "Managing Product Delivery",
      purpose: "Control the link between Project Manager and Team Manager",
      activities: [
        "Accept a Work Package",
        "Execute a Work Package",
        "Deliver a Work Package"
      ]
    },
    {
      name: "Managing a Stage Boundary",
      purpose: "Enable the Project Board to assess project viability at stage boundaries",
      activities: [
        "Plan the next stage",
        "Update the Project Plan",
        "Update the Business Case",
        "Report stage end",
        "Produce an Exception Plan"
      ]
    },
    {
      name: "Closing a Project",
      purpose: "Provide a fixed point to confirm acceptance of the project product",
      activities: [
        "Prepare planned closure",
        "Prepare premature closure",
        "Hand over products",
        "Evaluate the project",
        "Recommend project closure"
      ]
    }
  ],
  
  managementProducts: {
    baselines: [
      {
        name: "Project Initiation Documentation (PID)",
        purpose: "Defines the project and forms the contract between the Project Board and Project Manager",
        sections: [
          "Project definition",
          "Business Case",
          "Organization structure",
          "Quality Management Approach",
          "Configuration Management Approach",
          "Risk Management Approach",
          "Communication Management Approach",
          "Project Plan",
          "Project controls",
          "Tailoring"
        ]
      },
      {
        name: "Business Case",
        purpose: "Documents the justification for the project based on estimated costs, benefits and risks",
        sections: [
          "Executive summary",
          "Reasons",
          "Business options",
          "Expected benefits",
          "Expected dis-benefits",
          "Timescale",
          "Costs",
          "Investment appraisal",
          "Major risks"
        ]
      }
    ],
    
    records: [
      {
        name: "Risk Register",
        purpose: "Capture and maintain information on all identified threats and opportunities",
        fields: ["Risk ID", "Description", "Probability", "Impact", "Response", "Owner", "Status"]
      },
      {
        name: "Issue Register",
        purpose: "Capture and maintain information on all issues",
        fields: ["Issue ID", "Type", "Description", "Priority", "Severity", "Owner", "Status"]
      },
      {
        name: "Quality Register",
        purpose: "Summarize all quality management activities",
        fields: ["Product", "Method", "Roles", "Dates", "Result", "Quality records"]
      },
      {
        name: "Lessons Log",
        purpose: "Record lessons learned throughout the project",
        fields: ["Lesson", "Category", "Impact", "Recommendations", "Date logged"]
      }
    ],
    
    reports: [
      {
        name: "Highlight Report",
        purpose: "Regular progress report from Project Manager to Project Board",
        frequency: "Regular (typically monthly)",
        content: ["Status", "Progress", "Issues", "Risks", "Forecast"]
      },
      {
        name: "End Stage Report",
        purpose: "Report on stage performance at stage boundaries",
        frequency: "End of each management stage",
        content: ["Achievements", "Issues and risks", "Lessons", "Forecast", "Next stage outlook"]
      },
      {
        name: "End Project Report",
        purpose: "Confirm project has delivered what was expected",
        frequency: "Project closure",
        content: ["Achievement assessment", "Performance review", "Lessons learned", "Post-project recommendations"]
      }
    ]
  },
  
  terminology: {
    "Executive": "Single individual with ultimate responsibility for the project",
    "Senior User": "Represents those who will use the project products",
    "Senior Supplier": "Represents those designing, developing, facilitating, procuring and implementing",
    "Project Manager": "Has authority to run the project on a day-to-day basis",
    "Team Manager": "Reports to and takes direction from the Project Manager",
    "Project Assurance": "Provides independent assurance that the project is being conducted properly",
    "Work Package": "Information on what is to be produced, constraints, and interfaces",
    "Product Description": "Defines what a product is, its purpose, composition, and quality criteria",
    "Stage": "Management stage providing a control point for the Project Board",
    "Tolerance": "Permissible deviation from a plan without escalating",
    "Exception": "Situation where tolerances are forecast to be exceeded",
    "Checkpoint": "Team-level review of progress and issues",
    "Configuration Item": "Entity that is subject to configuration management",
    "Baseline": "Reference level against which an entity is monitored and controlled"
  }
}