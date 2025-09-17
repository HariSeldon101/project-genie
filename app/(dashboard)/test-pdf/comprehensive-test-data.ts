/**
 * Comprehensive test data for all document types
 * Includes rich content to test all formatting features
 */

export const testDocuments = {
  pid: {
    documentType: 'pid',
    projectName: 'Enterprise Digital Transformation',
    companyName: 'TechCorp Industries',
    content: {
      executiveSummary: 'This Project Initiation Document outlines the comprehensive digital transformation initiative for TechCorp Industries, aimed at modernizing our technology infrastructure, enhancing customer experience, and improving operational efficiency across all business units.',
      projectBackground: 'TechCorp Industries has identified the need for a comprehensive digital transformation to remain competitive in the rapidly evolving technology landscape. Legacy systems are limiting growth, and customer expectations for digital services continue to rise.',
      projectDefinition: {
        objectives: [
          'Modernize core technology infrastructure',
          'Implement cloud-native architecture',
          'Enhance customer digital experience',
          'Improve operational efficiency by 40%',
          'Enable data-driven decision making'
        ],
        scope: {
          inScope: [
            'Migration to cloud infrastructure',
            'Implementation of new CRM system',
            'Development of customer mobile app',
            'Data analytics platform deployment',
            'Staff training and change management'
          ],
          outOfScope: [
            'Physical office renovations',
            'Manufacturing equipment upgrades',
            'Third-party vendor systems'
          ]
        },
        deliverables: [
          'Cloud infrastructure deployment',
          'CRM system implementation',
          'Mobile application (iOS and Android)',
          'Data analytics dashboard',
          'Training documentation and materials'
        ],
        constraints: [
          'Budget limited to $5 million',
          'Must maintain business continuity',
          'Compliance with data protection regulations',
          'Timeline of 18 months'
        ],
        assumptions: [
          'Executive sponsorship will remain consistent',
          'Resources will be available as planned',
          'Vendor support will be adequate',
          'No major regulatory changes'
        ]
      },
      businessCase: {
        benefits: [
          'Increased revenue through digital channels (projected 25% increase)',
          'Cost reduction through automation (projected $2M annual savings)',
          'Improved customer satisfaction (target NPS of 70+)',
          'Enhanced competitive positioning'
        ],
        costs: {
          initial: '$5 million capital investment',
          ongoing: '$500,000 annual operational costs',
          resources: '50 FTE for 18 months'
        },
        roi: 'Projected ROI of 150% within 3 years'
      },
      projectApproach: {
        methodology: 'Hybrid Agile-Waterfall approach',
        workPackages: [
          'Infrastructure modernization',
          'Application development',
          'Data migration',
          'Testing and quality assurance',
          'Training and change management'
        ]
      },
      projectPlan: {
        phases: [
          {
            name: 'Initiation Phase',
            duration: '2 months',
            description: 'Project setup and planning',
            deliverables: ['Project charter', 'Detailed project plan']
          },
          {
            name: 'Design Phase',
            duration: '3 months',
            description: 'Architecture and solution design',
            deliverables: ['Technical architecture', 'Solution blueprints']
          },
          {
            name: 'Implementation Phase',
            duration: '8 months',
            description: 'Development and deployment',
            deliverables: ['Deployed systems', 'Migrated data']
          },
          {
            name: 'Testing Phase',
            duration: '3 months',
            description: 'Comprehensive testing',
            deliverables: ['Test reports', 'Performance benchmarks']
          },
          {
            name: 'Closure Phase',
            duration: '2 months',
            description: 'Project handover and closure',
            deliverables: ['Documentation', 'Lessons learned']
          }
        ],
        milestones: [
          { milestone: 'Project Kickoff', date: '2025-01-01', status: 'Planned' },
          { milestone: 'Design Complete', date: '2025-04-01', status: 'Planned' },
          { milestone: 'Phase 1 Go-Live', date: '2025-08-01', status: 'Planned' },
          { milestone: 'Full Deployment', date: '2025-12-01', status: 'Planned' },
          { milestone: 'Project Closure', date: '2026-06-30', status: 'Planned' }
        ]
      },
      projectOrganization: {
        structure: 'Matrix organization with dedicated project team',
        roles: [
          { role: 'Project Sponsor', name: 'John Smith', responsibilities: ['Executive oversight', 'Budget approval'] },
          { role: 'Project Manager', name: 'Jane Doe', responsibilities: ['Day-to-day management', 'Stakeholder coordination'] },
          { role: 'Technical Lead', name: 'Bob Johnson', responsibilities: ['Technical decisions', 'Architecture oversight'] },
          { role: 'Business Analyst', name: 'Alice Brown', responsibilities: ['Requirements gathering', 'Process mapping'] }
        ],
        stakeholders: [
          { name: 'Executive Board', interest: 'High', influence: 'High', strategy: 'Manage Closely' },
          { name: 'IT Department', interest: 'High', influence: 'Medium', strategy: 'Keep Satisfied' },
          { name: 'End Users', interest: 'Medium', influence: 'Low', strategy: 'Keep Informed' },
          { name: 'Customers', interest: 'High', influence: 'Medium', strategy: 'Keep Informed' }
        ]
      },
      qualityManagement: {
        approach: 'Continuous quality assurance throughout project lifecycle',
        standards: ['ISO 9001', 'ITIL framework', 'Agile best practices'],
        reviews: ['Weekly team reviews', 'Monthly steering committee', 'Quarterly executive briefings']
      },
      riskManagement: {
        approach: 'Proactive risk identification and mitigation',
        risks: [
          { risk: 'Scope creep', probability: 'High', impact: 'High', mitigation: 'Strong change control process' },
          { risk: 'Resource availability', probability: 'Medium', impact: 'High', mitigation: 'Resource contingency planning' },
          { risk: 'Technology compatibility', probability: 'Low', impact: 'High', mitigation: 'Thorough testing and POCs' },
          { risk: 'User adoption', probability: 'Medium', impact: 'Medium', mitigation: 'Comprehensive training program' }
        ]
      }
    }
  },
  
  business_case: {
    documentType: 'business_case',
    projectName: 'Cloud Migration Initiative',
    companyName: 'GlobalTech Solutions',
    content: {
      executiveSummary: 'This business case presents the rationale for migrating our on-premises infrastructure to cloud services, projecting significant cost savings and operational improvements.',
      strategicAlignment: 'This initiative aligns with our digital-first strategy and supports our goals of scalability, flexibility, and innovation.',
      problemStatement: 'Current on-premises infrastructure is costly to maintain, difficult to scale, and limiting our ability to innovate rapidly.',
      proposedSolution: 'Migration to AWS cloud services with a phased approach over 12 months.',
      benefits: {
        financial: [
          'Reduce infrastructure costs by 35%',
          'Eliminate $2M in hardware refresh costs',
          'Save $500K annually in maintenance'
        ],
        operational: [
          'Improve system availability to 99.99%',
          'Reduce deployment time by 70%',
          'Enable global scalability'
        ],
        strategic: [
          'Accelerate innovation cycles',
          'Improve competitive positioning',
          'Enable new business models'
        ]
      },
      costs: {
        oneTime: {
          migration: 1500000,
          training: 200000,
          consulting: 300000
        },
        recurring: {
          cloudServices: 800000,
          support: 150000,
          licenses: 100000
        }
      },
      financialAnalysis: {
        npv: 3500000,
        irr: 0.42,
        paybackPeriod: '18 months',
        roi: 2.5
      },
      risks: [
        { risk: 'Data migration failures', impact: 'High', probability: 'Low', mitigation: 'Phased migration with rollback plans' },
        { risk: 'Security breaches', impact: 'High', probability: 'Low', mitigation: 'Enhanced security measures and training' },
        { risk: 'Vendor lock-in', impact: 'Medium', probability: 'Medium', mitigation: 'Multi-cloud strategy' }
      ],
      alternatives: [
        { option: 'Do nothing', assessment: 'Increasing technical debt and competitive disadvantage' },
        { option: 'Hybrid cloud', assessment: 'More complex but allows gradual transition' },
        { option: 'Private cloud', assessment: 'Higher costs but more control' }
      ],
      recommendation: 'Proceed with public cloud migration using AWS as primary provider with phased approach starting Q2 2025.'
    }
  },
  
  risk_register: {
    documentType: 'risk_register',
    projectName: 'New Product Launch',
    companyName: 'InnovateTech',
    content: {
      overview: 'Comprehensive risk register for the new product launch initiative.',
      riskCategories: ['Technical', 'Financial', 'Market', 'Operational', 'Regulatory'],
      risks: [
        {
          id: 'R001',
          category: 'Technical',
          risk: 'Software bugs in production',
          description: 'Critical bugs may be discovered after product launch',
          probability: 'Medium',
          impact: 'High',
          score: 15,
          owner: 'Technical Lead',
          mitigation: 'Comprehensive testing strategy with automated and manual testing',
          contingency: 'Rapid response team for critical fixes',
          status: 'Active',
          dateIdentified: '2025-01-15',
          lastReviewed: '2025-08-29'
        },
        {
          id: 'R002',
          category: 'Market',
          risk: 'Competitor product release',
          description: 'Competitor may release similar product before our launch',
          probability: 'High',
          impact: 'Medium',
          score: 12,
          owner: 'Product Manager',
          mitigation: 'Accelerated development timeline and unique feature focus',
          contingency: 'Pricing strategy adjustment and marketing pivot',
          status: 'Active',
          dateIdentified: '2025-01-20',
          lastReviewed: '2025-08-29'
        },
        {
          id: 'R003',
          category: 'Financial',
          risk: 'Budget overrun',
          description: 'Project costs may exceed allocated budget',
          probability: 'Medium',
          impact: 'Medium',
          score: 9,
          owner: 'Project Manager',
          mitigation: 'Weekly budget reviews and strict change control',
          contingency: 'Executive approval for additional funding',
          status: 'Monitoring',
          dateIdentified: '2025-01-10',
          lastReviewed: '2025-08-29'
        },
        {
          id: 'R004',
          category: 'Regulatory',
          risk: 'Compliance violations',
          description: 'Product may not meet all regulatory requirements',
          probability: 'Low',
          impact: 'Very High',
          score: 12,
          owner: 'Compliance Officer',
          mitigation: 'Early engagement with regulatory bodies',
          contingency: 'Legal team engagement and compliance remediation',
          status: 'Active',
          dateIdentified: '2025-02-01',
          lastReviewed: '2025-08-29'
        },
        {
          id: 'R005',
          category: 'Operational',
          risk: 'Supply chain disruption',
          description: 'Key components may face supply delays',
          probability: 'Medium',
          impact: 'High',
          score: 15,
          owner: 'Operations Manager',
          mitigation: 'Multiple supplier relationships and buffer inventory',
          contingency: 'Alternative supplier activation',
          status: 'Active',
          dateIdentified: '2025-02-15',
          lastReviewed: '2025-08-29'
        }
      ],
      riskMatrix: {
        high: ['R001', 'R005'],
        medium: ['R002', 'R003'],
        low: ['R004']
      },
      riskAppetite: 'Moderate risk appetite with zero tolerance for regulatory and safety risks',
      reviewSchedule: 'Monthly risk review meetings with quarterly executive briefings'
    }
  },
  
  project_plan: {
    documentType: 'project_plan',
    projectName: 'Website Redesign',
    companyName: 'DigitalFirst Corp',
    content: {
      overview: 'Complete redesign and redevelopment of corporate website with modern technologies.',
      objectives: [
        'Improve user experience and engagement',
        'Increase conversion rates by 30%',
        'Enhance mobile responsiveness',
        'Improve site performance and SEO'
      ],
      scope: {
        included: ['Homepage redesign', 'Product catalog', 'Customer portal', 'Blog platform'],
        excluded: ['Internal admin systems', 'Third-party integrations']
      },
      timeline: {
        startDate: '2025-03-01',
        endDate: '2025-09-30',
        duration: '7 months'
      },
      phases: [
        {
          phase: 'Discovery',
          duration: '1 month',
          activities: ['User research', 'Competitive analysis', 'Requirements gathering'],
          deliverables: ['Research report', 'Requirements document']
        },
        {
          phase: 'Design',
          duration: '2 months',
          activities: ['Information architecture', 'Wireframing', 'Visual design', 'Prototyping'],
          deliverables: ['Design system', 'Interactive prototypes']
        },
        {
          phase: 'Development',
          duration: '3 months',
          activities: ['Frontend development', 'Backend integration', 'Content migration'],
          deliverables: ['Developed website', 'CMS setup']
        },
        {
          phase: 'Testing & Launch',
          duration: '1 month',
          activities: ['QA testing', 'Performance optimization', 'Launch preparation'],
          deliverables: ['Test reports', 'Live website']
        }
      ],
      milestones: [
        { name: 'Project Kickoff', date: '2025-03-01' },
        { name: 'Design Approval', date: '2025-05-01' },
        { name: 'Development Complete', date: '2025-08-15' },
        { name: 'Go Live', date: '2025-09-30' }
      ],
      resources: {
        team: [
          { role: 'Project Manager', allocation: '100%' },
          { role: 'UX Designer', allocation: '100%' },
          { role: 'UI Designer', allocation: '80%' },
          { role: 'Frontend Developer', allocation: '100%', count: 2 },
          { role: 'Backend Developer', allocation: '100%' },
          { role: 'QA Engineer', allocation: '50%' }
        ],
        budget: {
          total: 250000,
          breakdown: {
            design: 50000,
            development: 120000,
            testing: 30000,
            infrastructure: 20000,
            contingency: 30000
          }
        }
      },
      dependencies: [
        { task: 'Development', dependsOn: 'Design Approval' },
        { task: 'Content Migration', dependsOn: 'CMS Setup' },
        { task: 'Launch', dependsOn: 'Testing Complete' }
      ]
    }
  },
  
  communication_plan: {
    documentType: 'communication_plan',
    projectName: 'Organizational Restructure',
    companyName: 'FutureCorp',
    content: {
      executiveSummary: 'Communication strategy for managing stakeholder engagement during organizational restructuring.',
      objectives: [
        'Ensure transparent communication throughout restructure',
        'Maintain employee morale and engagement',
        'Manage external stakeholder expectations',
        'Minimize disruption to operations'
      ],
      stakeholderAnalysis: [
        { 
          name: 'Employees',
          interest: 'High',
          influence: 'Medium',
          strategy: 'Keep Informed',
          concerns: ['Job security', 'Role changes', 'Career development']
        },
        {
          name: 'Shareholders',
          interest: 'High',
          influence: 'High',
          strategy: 'Manage Closely',
          concerns: ['Financial impact', 'Strategic direction']
        },
        {
          name: 'Customers',
          interest: 'Medium',
          influence: 'High',
          strategy: 'Keep Satisfied',
          concerns: ['Service continuity', 'Point of contact changes']
        },
        {
          name: 'Media',
          interest: 'Medium',
          influence: 'Medium',
          strategy: 'Monitor',
          concerns: ['Company stability', 'Market position']
        }
      ],
      methods: [
        { method: 'All-hands meetings', purpose: 'Major announcements', audience: 'All employees', frequency: 'Monthly' },
        { method: 'Email updates', purpose: 'Regular updates', audience: 'All stakeholders', frequency: 'Weekly' },
        { method: 'Team meetings', purpose: 'Detailed discussions', audience: 'Affected teams', frequency: 'Weekly' },
        { method: 'Executive briefings', purpose: 'Strategic updates', audience: 'Board/Executives', frequency: 'Bi-weekly' },
        { method: 'Customer newsletters', purpose: 'Service updates', audience: 'Customers', frequency: 'Monthly' }
      ],
      schedule: [
        { communication: 'Restructure Announcement', audience: 'All stakeholders', method: 'Multiple channels', timing: 'Day 1' },
        { communication: 'Detailed Plan Sharing', audience: 'Employees', method: 'All-hands meeting', timing: 'Week 1' },
        { communication: 'Progress Updates', audience: 'All stakeholders', method: 'Email/Portal', timing: 'Weekly' },
        { communication: 'Milestone Celebrations', audience: 'All employees', method: 'Town halls', timing: 'Monthly' }
      ],
      keyMessages: [
        { audience: 'Employees', message: 'Your contributions are valued and we are committed to supporting you through this transition' },
        { audience: 'Customers', message: 'Service excellence remains our priority with enhanced capabilities coming' },
        { audience: 'Shareholders', message: 'Strategic restructuring will position us for sustained growth and profitability' }
      ],
      risks: [
        { risk: 'Information leaks', impact: 'High', likelihood: 'Medium', mitigation: 'Controlled information release and NDAs' },
        { risk: 'Rumor spread', impact: 'Medium', likelihood: 'High', mitigation: 'Proactive communication and rumor response team' },
        { risk: 'Stakeholder resistance', impact: 'High', likelihood: 'Medium', mitigation: 'Early engagement and feedback channels' }
      ]
    }
  },
  
  quality_management: {
    documentType: 'quality_management',
    projectName: 'Software Development Excellence',
    companyName: 'QualityTech Inc',
    content: {
      introduction: 'Quality Management Strategy for ensuring excellence in software development and delivery.',
      policy: {
        statement: 'We are committed to delivering high-quality software that exceeds customer expectations through continuous improvement and adherence to best practices.',
        principles: [
          'Customer focus',
          'Continuous improvement',
          'Evidence-based decision making',
          'Employee engagement',
          'Process approach'
        ]
      },
      standards: [
        { standard: 'ISO 9001:2015', description: 'Quality Management System', compliance: 'Required', status: 'Compliant' },
        { standard: 'ISO 27001', description: 'Information Security', compliance: 'Required', status: 'In Progress' },
        { standard: 'CMMI Level 3', description: 'Process Maturity', compliance: 'Target', status: 'Planned' }
      ],
      processes: [
        {
          name: 'Code Review Process',
          description: 'Peer review of all code before merge',
          steps: ['Submit PR', 'Automated checks', 'Peer review', 'Approval', 'Merge'],
          inputs: 'Code changes',
          outputs: 'Reviewed and approved code'
        },
        {
          name: 'Testing Process',
          description: 'Comprehensive testing at multiple levels',
          steps: ['Unit testing', 'Integration testing', 'System testing', 'UAT', 'Performance testing'],
          inputs: 'Developed features',
          outputs: 'Test reports and verified functionality'
        }
      ],
      metrics: [
        { metric: 'Code Coverage', target: '80%', current: '75%', unit: 'percentage' },
        { metric: 'Defect Density', target: '<5', current: '6.2', unit: 'defects/KLOC' },
        { metric: 'Customer Satisfaction', target: '>4.5', current: '4.3', unit: 'rating/5' },
        { metric: 'On-time Delivery', target: '95%', current: '92%', unit: 'percentage' }
      ],
      assurance: {
        activities: [
          'Regular audits',
          'Process compliance checks',
          'Customer feedback analysis',
          'Metric monitoring'
        ],
        schedule: 'Monthly QA reviews with quarterly audits',
        checklist: [
          'Requirements review completed',
          'Design review conducted',
          'Code review performed',
          'Testing completed',
          'Documentation updated'
        ]
      },
      control: {
        methods: ['Automated testing', 'Manual inspection', 'Statistical sampling'],
        criteria: 'All deliverables must meet defined acceptance criteria',
        procedures: 'Defects tracked in JIRA with severity-based SLAs'
      },
      reviews: [
        { type: 'Sprint Review', frequency: 'Bi-weekly', participants: 'Team and stakeholders', deliverables: 'Sprint report' },
        { type: 'Quality Review', frequency: 'Monthly', participants: 'QA team', deliverables: 'Quality metrics report' },
        { type: 'Management Review', frequency: 'Quarterly', participants: 'Leadership', deliverables: 'Strategic quality report' }
      ],
      improvement: {
        approach: 'Kaizen continuous improvement methodology',
        initiatives: [
          'Automation of manual testing',
          'Implementation of AI-powered code review',
          'Process optimization using lean principles'
        ]
      }
    }
  },
  
  technical_landscape: {
    documentType: 'technical_landscape',
    projectName: 'Technology Assessment 2025',
    companyName: 'TechVision Corp',
    content: {
      summary: 'Comprehensive analysis of current and future technology landscape for strategic planning.',
      currentState: {
        systems: [
          { name: 'ERP System', technology: 'SAP', version: 'S/4HANA', status: 'Stable' },
          { name: 'CRM Platform', technology: 'Salesforce', version: 'Enterprise', status: 'Current' },
          { name: 'Data Warehouse', technology: 'Oracle', version: '19c', status: 'Legacy' }
        ],
        challenges: [
          'Aging infrastructure requiring modernization',
          'Integration complexity between systems',
          'Limited scalability of current architecture',
          'High maintenance costs'
        ]
      },
      techStack: {
        frontend: ['React', 'Vue.js', 'Angular'],
        backend: ['Java Spring', 'Node.js', '.NET Core'],
        database: ['PostgreSQL', 'MongoDB', 'Redis'],
        infrastructure: ['AWS', 'Kubernetes', 'Docker'],
        tools: ['Jenkins', 'GitLab', 'Jira', 'Confluence']
      },
      architecture: {
        overview: 'Microservices architecture with API gateway pattern',
        components: [
          { name: 'API Gateway', type: 'Infrastructure', technology: 'Kong' },
          { name: 'Service Mesh', type: 'Infrastructure', technology: 'Istio' },
          { name: 'Message Queue', type: 'Middleware', technology: 'RabbitMQ' }
        ],
        patterns: ['Microservices', 'Event-driven', 'CQRS', 'API-first'],
        decisions: [
          { decision: 'Adopt microservices', rationale: 'Scalability and team autonomy', impact: 'High complexity but better agility' },
          { decision: 'Cloud-first strategy', rationale: 'Cost efficiency and scalability', impact: 'Reduced infrastructure overhead' }
        ]
      },
      integrations: [
        { system: 'Payment Gateway', type: 'REST API', protocol: 'HTTPS', frequency: 'Real-time' },
        { system: 'Analytics Platform', type: 'Event Stream', protocol: 'Kafka', frequency: 'Near real-time' },
        { system: 'Email Service', type: 'SMTP', protocol: 'TLS', frequency: 'Async batch' }
      ],
      security: {
        authentication: 'OAuth 2.0 with JWT tokens',
        authorization: 'Role-based access control (RBAC)',
        encryption: 'TLS 1.3 for transit, AES-256 for rest',
        compliance: ['GDPR', 'SOC 2', 'ISO 27001']
      },
      performance: [
        { metric: 'Response Time', target: '<200ms', current: '250ms', priority: 'High' },
        { metric: 'Availability', target: '99.99%', current: '99.95%', priority: 'Critical' },
        { metric: 'Throughput', target: '10K req/s', current: '8K req/s', priority: 'Medium' }
      ],
      technicalDebt: [
        { issue: 'Legacy database migration needed', severity: 'High', effort: 'Large', recommendation: 'Phased migration approach' },
        { issue: 'Outdated frontend frameworks', severity: 'Medium', effort: 'Medium', recommendation: 'Gradual modernization' },
        { issue: 'Missing API documentation', severity: 'Low', effort: 'Small', recommendation: 'Implement OpenAPI specs' }
      ],
      futureState: {
        vision: 'Cloud-native, AI-enabled, fully automated technology platform',
        roadmap: [
          { phase: 'Foundation', timeline: 'Q1-Q2 2025', deliverables: ['Cloud migration', 'CI/CD pipeline'] },
          { phase: 'Modernization', timeline: 'Q3-Q4 2025', deliverables: ['Microservices transformation', 'API platform'] },
          { phase: 'Innovation', timeline: '2026', deliverables: ['AI/ML integration', 'Edge computing'] }
        ]
      },
      recommendations: [
        { recommendation: 'Accelerate cloud migration', priority: 'High', benefits: 'Cost reduction and scalability' },
        { recommendation: 'Implement DevOps practices', priority: 'High', benefits: 'Faster delivery and quality' },
        { recommendation: 'Adopt container orchestration', priority: 'Medium', benefits: 'Operational efficiency' }
      ]
    }
  },
  
  comparable_projects: {
    documentType: 'comparable_projects',
    projectName: 'Market Entry Strategy',
    companyName: 'GlobalExpand Inc',
    content: {
      summary: 'Analysis of comparable market entry projects to inform our expansion strategy.',
      approach: 'Systematic review of similar projects with focus on lessons learned and success factors.',
      projects: [
        {
          name: 'TechCorp Asia Expansion',
          client: 'TechCorp',
          industry: 'Technology',
          duration: '18 months',
          budget: '$15M',
          teamSize: '50',
          status: 'Successful',
          description: 'Expansion into Asian markets with localized products',
          objectives: ['Market penetration', 'Brand establishment', 'Revenue growth'],
          approach: 'Phased rollout starting with Singapore',
          technologies: ['Cloud infrastructure', 'Multi-language support', 'Local payment gateways'],
          challenges: ['Cultural differences', 'Regulatory compliance', 'Local competition'],
          solutions: ['Local partnerships', 'Compliance team', 'Differentiated offerings'],
          results: ['25% market share in 2 years', '$50M revenue', 'Break-even in 18 months'],
          lessons: ['Local partnerships critical', 'Cultural adaptation essential', 'Patience required']
        },
        {
          name: 'RetailGiant Digital Transformation',
          client: 'RetailGiant',
          industry: 'Retail',
          duration: '24 months',
          budget: '$30M',
          teamSize: '100',
          status: 'Partial Success',
          description: 'Complete digital transformation of retail operations',
          objectives: ['Omnichannel experience', 'Operational efficiency', 'Customer engagement'],
          approach: 'Big bang transformation',
          technologies: ['E-commerce platform', 'Mobile apps', 'Analytics'],
          challenges: ['Change resistance', 'Technical complexity', 'Timeline pressure'],
          solutions: ['Change management program', 'Phased technical rollout', 'Extended timeline'],
          results: ['60% digital adoption', '15% efficiency gain', 'Mixed customer feedback'],
          lessons: ['Phased approach better', 'Change management crucial', 'User training essential']
        }
      ],
      comparison: [
        { aspect: 'Timeline', project_a: '18 months', project_b: '24 months', our_project: '20 months' },
        { aspect: 'Budget', project_a: '$15M', project_b: '$30M', our_project: '$20M' },
        { aspect: 'Team Size', project_a: '50', project_b: '100', our_project: '75' },
        { aspect: 'Success Rate', project_a: '100%', project_b: '60%', our_project: 'Target 80%' }
      ],
      lessons: [
        { lesson: 'Local partnerships accelerate market entry', category: 'Strategy', impact: 'High', application: 'Identify partners early' },
        { lesson: 'Phased approach reduces risk', category: 'Execution', impact: 'High', application: 'Adopt iterative rollout' },
        { lesson: 'Change management is critical', category: 'People', impact: 'Critical', application: 'Invest in change program' }
      ],
      bestPractices: [
        { practice: 'Conduct thorough market research', category: 'Planning', benefit: 'Reduced market risk' },
        { practice: 'Establish local presence early', category: 'Execution', benefit: 'Better market understanding' },
        { practice: 'Invest in cultural training', category: 'People', benefit: 'Improved adaptation' }
      ],
      risks: [
        { pattern: 'Underestimating cultural differences', frequency: 'Common', impact: 'High', mitigation: 'Cultural consultants' },
        { pattern: 'Regulatory compliance issues', frequency: 'Common', impact: 'Very High', mitigation: 'Legal expertise' },
        { pattern: 'Timeline optimism', frequency: 'Very Common', impact: 'Medium', mitigation: 'Buffer planning' }
      ],
      successFactors: [
        { factor: 'Executive sponsorship', importance: 'Critical', evidence: 'All successful projects had strong sponsorship' },
        { factor: 'Local expertise', importance: 'High', evidence: '80% success correlation' },
        { factor: 'Adequate funding', importance: 'High', evidence: 'Underfunded projects 70% more likely to fail' }
      ],
      recommendations: [
        { recommendation: 'Start with pilot market', priority: 'High', rationale: 'Reduces risk and allows learning' },
        { recommendation: 'Invest in local team', priority: 'High', rationale: 'Critical for market understanding' },
        { recommendation: 'Plan for 20% buffer', priority: 'Medium', rationale: 'Common timeline overruns' }
      ]
    }
  },
  
  backlog: {
    documentType: 'backlog',
    projectName: 'E-Commerce Platform',
    companyName: 'ShopTech Solutions',
    content: {
      overview: 'Product backlog for new e-commerce platform development.',
      stories: [
        {
          id: 'US-001',
          type: 'Story',
          title: 'User Registration',
          priority: 'High',
          points: 5,
          status: 'Ready',
          sprint: 1,
          as_a: 'new customer',
          i_want: 'to create an account',
          so_that: 'I can make purchases and track orders',
          acceptance_criteria: [
            'Email validation implemented',
            'Password strength requirements met',
            'Confirmation email sent',
            'User profile created'
          ],
          tags: ['authentication', 'frontend', 'backend'],
          assignee: 'John Developer'
        },
        {
          id: 'US-002',
          type: 'Story',
          title: 'Product Search',
          priority: 'Critical',
          points: 8,
          status: 'In Progress',
          sprint: 1,
          as_a: 'customer',
          i_want: 'to search for products',
          so_that: 'I can find items I want to purchase',
          acceptance_criteria: [
            'Search by keyword',
            'Filter by category',
            'Sort by price/rating',
            'Search suggestions'
          ],
          tags: ['search', 'frontend', 'elasticsearch'],
          assignee: 'Jane Developer'
        },
        {
          id: 'US-003',
          type: 'Bug',
          title: 'Cart calculation error',
          priority: 'Critical',
          points: 3,
          status: 'Done',
          sprint: 1,
          description: 'Cart total not updating correctly when quantities change',
          acceptance_criteria: [
            'Cart total updates immediately',
            'Tax calculation correct',
            'Discounts applied properly'
          ],
          tags: ['bug', 'cart', 'urgent'],
          assignee: 'Bob Developer'
        }
      ],
      epics: [
        {
          name: 'User Management',
          description: 'All user-related functionality',
          stories: ['US-001', 'US-004', 'US-005'],
          progress: 30
        },
        {
          name: 'Shopping Cart',
          description: 'Cart and checkout functionality',
          stories: ['US-003', 'US-006', 'US-007'],
          progress: 60
        }
      ],
      sprints: [
        {
          number: 1,
          name: 'Sprint 1 - Foundation',
          status: 'active',
          dates: 'Aug 15 - Aug 29',
          goal: 'Establish core user and search functionality',
          points: 35,
          stories: ['US-001', 'US-002', 'US-003'],
          velocity: { committed: 35, completed: 20 }
        },
        {
          number: 2,
          name: 'Sprint 2 - Shopping Experience',
          status: 'planned',
          dates: 'Aug 30 - Sep 13',
          goal: 'Complete shopping cart and checkout',
          points: 40,
          stories: ['US-004', 'US-005', 'US-006']
        }
      ],
      priorities: [
        { item: 'Payment integration', priority: 'Critical', effort: 'High', value: 'High', risk: 'Medium' },
        { item: 'Mobile responsiveness', priority: 'High', effort: 'Medium', value: 'High', risk: 'Low' },
        { item: 'Admin dashboard', priority: 'Medium', effort: 'High', value: 'Medium', risk: 'Low' }
      ],
      velocity: {
        average: 32,
        lastSprint: 35,
        predictability: 85
      },
      dependencies: [
        { item: 'Checkout', dependsOn: 'Payment Gateway', type: 'Hard', status: 'Resolved' },
        { item: 'Order Tracking', dependsOn: 'Shipping API', type: 'Hard', status: 'Pending' }
      ],
      acceptanceCriteria: {
        definitionOfDone: [
          'Code reviewed and approved',
          'Unit tests written and passing',
          'Integration tests passing',
          'Documentation updated',
          'Deployed to staging'
        ]
      }
    }
  },
  
  charter: {
    documentType: 'charter',
    projectName: 'Customer Portal Upgrade',
    companyName: 'ServiceFirst Inc',
    content: {
      projectTitle: 'Customer Portal Modernization Initiative',
      projectSponsor: 'Jane Executive, CEO',
      projectManager: 'John Manager, PMP',
      dateCreated: '2025-08-30',
      version: '1.0',
      purpose: 'To modernize our customer portal to improve user experience, increase self-service capabilities, and reduce support costs.',
      objectives: [
        'Reduce support tickets by 40%',
        'Improve customer satisfaction score to 4.5+',
        'Enable mobile access for all features',
        'Integrate with new CRM system'
      ],
      scope: {
        inScope: [
          'Portal redesign and development',
          'Mobile application development',
          'CRM integration',
          'User training materials'
        ],
        outOfScope: [
          'Backend system replacements',
          'Third-party integrations beyond CRM',
          'Internal employee portals'
        ]
      },
      deliverables: [
        'Redesigned customer portal',
        'Mobile applications (iOS/Android)',
        'API documentation',
        'Training materials',
        'Migration plan'
      ],
      stakeholders: [
        { name: 'Customer Service Team', role: 'Primary Users', interest: 'High' },
        { name: 'IT Department', role: 'Implementation', interest: 'High' },
        { name: 'Customers', role: 'End Users', interest: 'High' },
        { name: 'Finance', role: 'Budget Approval', interest: 'Medium' }
      ],
      constraints: [
        'Budget limited to $500,000',
        'Must be completed by Q4 2025',
        'Cannot disrupt current operations',
        'Must maintain data security compliance'
      ],
      assumptions: [
        'CRM system will be ready for integration',
        'Resources will be available as planned',
        'No major technology changes during project'
      ],
      risks: [
        'Integration complexity with legacy systems',
        'User adoption challenges',
        'Potential scope creep'
      ],
      budget: {
        total: 500000,
        breakdown: {
          development: 300000,
          design: 50000,
          testing: 50000,
          training: 30000,
          infrastructure: 40000,
          contingency: 30000
        }
      },
      timeline: {
        kickoff: '2025-09-01',
        phase1: '2025-11-01',
        phase2: '2026-01-01',
        completion: '2026-03-31'
      },
      successCriteria: [
        'Portal launched on schedule',
        'All features functioning as specified',
        'User adoption rate >70%',
        'Support ticket reduction achieved'
      ],
      approvals: {
        projectSponsor: { name: 'Jane Executive', date: '2025-08-30', signature: 'Approved' },
        projectManager: { name: 'John Manager', date: '2025-08-30', signature: 'Approved' },
        stakeholderRep: { name: 'Bob Stakeholder', date: '2025-08-30', signature: 'Approved' }
      }
    }
  }
}

/**
 * Get test document by type
 */
export function getTestDocument(type: string) {
  return testDocuments[type as keyof typeof testDocuments] || testDocuments.pid
}

/**
 * Get all document types
 */
export function getDocumentTypes() {
  return Object.keys(testDocuments)
}

/**
 * Get document type display names
 */
export function getDocumentTypeDisplayNames() {
  return {
    pid: 'Project Initiation Document (PID)',
    business_case: 'Business Case',
    risk_register: 'Risk Register',
    project_plan: 'Project Plan',
    communication_plan: 'Communication Plan',
    quality_management: 'Quality Management Plan',
    technical_landscape: 'Technical Landscape Analysis',
    comparable_projects: 'Comparable Projects Analysis',
    backlog: 'Product Backlog',
    charter: 'Project Charter'
  }
}
// Import kanban test data
import { kanbanTestData } from './kanban-test-data'

// Add kanban to test documents
export const allTestDocuments = {
  ...testDocuments,
  kanban: kanbanTestData
}

// Export alias for compatibility
export const comprehensiveTestData = allTestDocuments

// Also export as default for convenience
export default allTestDocuments
