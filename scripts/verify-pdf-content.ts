import { DocumentPDFFormatter } from '../lib/utils/document-pdf-formatter'

// Sample PID document structure based on the database
const samplePIDDocument = {
  executiveSummary: "Executive summary content",
  projectDefinition: {
    background: "Background info",
    objectives: ["Objective 1", "Objective 2"],
    desiredOutcomes: ["Outcome 1", "Outcome 2"],
    scope: {
      included: ["Included item 1", "Included item 2"],
      excluded: ["Excluded item 1", "Excluded item 2"]
    },
    constraints: ["Constraint 1", "Constraint 2"],
    assumptions: ["Assumption 1", "Assumption 2"],
    deliverables: [
      {
        name: "Deliverable 1",
        description: "Description of deliverable 1",
        qualityCriteria: ["Quality criterion 1", "Quality criterion 2"]
      }
    ],
    interfaces: ["Interface 1", "Interface 2"]
  },
  businessCase: {
    reasons: "Business reasons",
    businessOptions: [
      {
        option: "Option 1",
        description: "Description",
        costs: "£1M",
        benefits: "Benefits",
        risks: "Risks"
      }
    ],
    expectedBenefits: [
      {
        benefit: "Benefit 1",
        measurable: true,
        measurement: "How to measure",
        baseline: "Baseline",
        target: "Target"
      }
    ],
    expectedDisBenefits: ["Disbenefit 1"],
    timescale: "6 months",
    costs: {
      development: "£5M",
      operational: "£1M",
      maintenance: "£0.5M",
      total: "£6.5M"
    },
    investmentAppraisal: {
      roi: "150%",
      paybackPeriod: "2 years",
      npv: "£2M"
    },
    majorRisks: ["Risk 1", "Risk 2"]
  },
  organizationStructure: {
    projectBoard: {
      executive: "John Smith",
      seniorUser: "Jane Doe",
      seniorSupplier: "Bob Johnson"
    },
    projectManager: "Alice Brown",
    teamManagers: ["Manager 1", "Manager 2"],
    projectAssurance: {
      business: "Business Assurance",
      user: "User Assurance",
      specialist: "Specialist Assurance"
    },
    projectSupport: "PMO Support"
  },
  projectPlan: {
    stages: [
      {
        name: "Stage 1",
        startDate: "2024-01-01",
        endDate: "2024-03-31",
        objectives: ["Stage 1 Objective"],
        deliverables: ["Stage 1 Deliverable"]
      }
    ],
    milestones: [
      {
        name: "Milestone 1",
        date: "2024-02-15",
        criteria: "Success criteria"
      }
    ],
    dependencies: [
      {
        type: "internal",
        description: "Dependency description",
        impact: "Impact description"
      }
    ],
    schedule: "Schedule summary"
  },
  riskManagementApproach: {
    procedure: "Risk procedure",
    riskTolerance: {
      time: "+/- 2 weeks",
      cost: "+/- 10%",
      quality: "Must meet standards",
      scope: "No changes",
      benefits: "Must achieve",
      risk: "Low to medium"
    },
    riskCategories: ["Technical", "Operational"],
    riskRegisterFormat: "Excel format",
    toolsAndTechniques: ["Tool 1", "Tool 2"],
    rolesAndResponsibilities: [
      {
        role: "Risk Manager",
        responsibilities: ["Identify risks", "Maintain register"]
      }
    ],
    reporting: "Monthly reports",
    timingOfRiskManagementActivities: "Start of each stage"
  },
  qualityManagementApproach: {
    qualityMethod: "Quality method description",
    qualityCriteria: ["Criterion 1", "Criterion 2"],
    qualityStandards: ["ISO 9001", "ISO 27001"],
    qualityResponsibilities: "Quality team responsibilities"
  },
  communicationManagementApproach: {
    procedure: "Communication procedure",
    methods: ["Email", "Meetings"],
    frequency: "Weekly",
    reporting: "Weekly reports",
    toolsAndTechniques: ["MS Teams", "Email"],
    stakeholderAnalysis: [
      {
        stakeholder: "Project Board",
        interest: "high",
        influence: "high",
        communicationMethod: "Monthly meetings",
        frequency: "Monthly"
      }
    ],
    rolesAndResponsibilities: "PM responsible for communication"
  },
  configurationManagementApproach: {
    purpose: "Configuration purpose",
    procedure: "Configuration procedure",
    toolsAndTechniques: ["JIRA", "Confluence"],
    issueAndChangeControl: "Change control process"
  },
  tailoring: {
    approach: "Tailoring approach",
    justification: "Tailoring justification"
  },
  projectControls: {
    stages: ["Stage 1", "Stage 2"],
    tolerances: {
      cost: "+/- 10%",
      time: "+/- 2 weeks",
      scope: "No changes",
      quality: "Must meet standards",
      benefits: "Must achieve",
      risk: "Low to medium"
    },
    reportingArrangements: "Weekly reports"
  }
}

function extractAllFields(obj: any, prefix = ''): Set<string> {
  const fields = new Set<string>()
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      fields.add(fullKey)
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        const nestedFields = extractAllFields(obj[key], fullKey)
        nestedFields.forEach(field => fields.add(field))
      }
    }
  }
  
  return fields
}

function verifyPDFContent() {
  console.log('=== PDF Content Verification Test ===\n')
  
  // Get all fields from the original document
  const originalFields = extractAllFields(samplePIDDocument)
  console.log(`Total fields in original document: ${originalFields.size}`)
  console.log('\nOriginal document fields:')
  Array.from(originalFields).sort().forEach(field => {
    console.log(`  - ${field}`)
  })
  
  // Format the document for PDF
  const formattedContent = DocumentPDFFormatter.format(samplePIDDocument, 'pid')
  
  console.log('\n=== Formatted PDF Content ===')
  console.log(`Total characters: ${formattedContent.length}`)
  console.log(`Total lines: ${formattedContent.split('\n').length}`)
  
  // Check which fields are present in the formatted content
  const missingFields: string[] = []
  const foundFields: string[] = []
  
  // Check for key content in the formatted output
  const contentChecks = [
    { field: 'executiveSummary', searchText: 'Executive summary content' },
    { field: 'projectDefinition.background', searchText: 'Background info' },
    { field: 'projectDefinition.objectives', searchText: 'Objective 1' },
    { field: 'projectDefinition.scope.included', searchText: 'Included item 1' },
    { field: 'projectDefinition.scope.excluded', searchText: 'Excluded item 1' },
    { field: 'businessCase.reasons', searchText: 'Business reasons' },
    { field: 'businessCase.costs.development', searchText: '£5M' },
    { field: 'businessCase.investmentAppraisal.roi', searchText: '150%' },
    { field: 'organizationStructure.projectManager', searchText: 'Alice Brown' },
    { field: 'projectPlan.stages', searchText: 'Stage 1' },
    { field: 'riskManagementApproach.procedure', searchText: 'Risk procedure' },
    { field: 'qualityManagementApproach.qualityStandards', searchText: 'ISO 9001' },
    { field: 'communicationManagementApproach.methods', searchText: 'Email' },
    { field: 'configurationManagementApproach.toolsAndTechniques', searchText: 'JIRA' },
    { field: 'tailoring.approach', searchText: 'Tailoring approach' },
    { field: 'projectControls.reportingArrangements', searchText: 'Weekly reports' }
  ]
  
  console.log('\n=== Content Verification ===')
  contentChecks.forEach(check => {
    if (formattedContent.includes(check.searchText)) {
      foundFields.push(check.field)
      console.log(`✅ ${check.field}: "${check.searchText}" found`)
    } else {
      missingFields.push(check.field)
      console.log(`❌ ${check.field}: "${check.searchText}" NOT found`)
    }
  })
  
  console.log('\n=== Summary ===')
  console.log(`Fields found: ${foundFields.length}/${contentChecks.length}`)
  console.log(`Fields missing: ${missingFields.length}/${contentChecks.length}`)
  
  if (missingFields.length > 0) {
    console.log('\n⚠️  Missing fields:')
    missingFields.forEach(field => console.log(`  - ${field}`))
  }
  
  // Print sections found in formatted content
  const sections = formattedContent.split('\n').filter(line => 
    line.match(/^[A-Z][A-Z\s]+$/) && line.length < 50
  )
  
  console.log('\n=== Sections in PDF ===')
  sections.forEach(section => console.log(`  - ${section}`))
  
  return {
    totalFields: originalFields.size,
    foundFields: foundFields.length,
    missingFields: missingFields.length,
    success: missingFields.length === 0
  }
}

// Run the verification
const result = verifyPDFContent()

if (!result.success) {
  console.log('\n❌ PDF content verification failed - some fields are missing!')
  process.exit(1)
} else {
  console.log('\n✅ All fields are properly included in the PDF!')
  process.exit(0)
}