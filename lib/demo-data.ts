// Demo data for development testing - REMOVE IN PRODUCTION
export const demoProjects = {
  techStartup: {
    projectName: "CloudSync Platform Development",
    vision: "To create a revolutionary cloud synchronization platform that enables seamless real-time collaboration across distributed teams, with enterprise-grade security and AI-powered workflow optimization.",
    businessCase: "The global cloud collaboration market is expected to reach $23.8B by 2025. Our platform addresses the critical gap in secure, real-time synchronization for hybrid work environments. Expected ROI of 280% within 24 months with a break-even point at month 14. Target market includes 50,000+ SMEs currently underserved by enterprise solutions.",
    description: "Development of a next-generation cloud synchronization platform featuring end-to-end encryption, real-time collaboration tools, AI-powered file organization, and seamless integration with existing productivity suites. The platform will support web, desktop, and mobile applications with offline capabilities.",
    methodology: "agile" as const,
    companyWebsite: "https://techventures.io",
    sector: "Technology / SaaS",
    stakeholders: [
      { name: "Sarah Chen", role: "CEO & Product Visionary", email: "s.chen@techventures.io" },
      { name: "Marcus Johnson", role: "CTO & Technical Lead", email: "m.johnson@techventures.io" },
      { name: "Emily Rodriguez", role: "Head of Customer Success", email: "e.rodriguez@techventures.io" },
      { name: "David Park", role: "Lead Developer", email: "d.park@techventures.io" },
      { name: "Lisa Thompson", role: "UX/UI Director", email: "l.thompson@techventures.io" }
    ],
    prince2Stakeholders: {
      seniorUser: { name: "Emily Rodriguez", role: "Head of Customer Success" },
      seniorSupplier: { name: "Marcus Johnson", role: "CTO & Technical Lead" },
      executive: { name: "Sarah Chen", role: "CEO & Product Visionary" }
    },
    agilometer: {
      flexibility: 85,
      teamExperience: 75,
      riskTolerance: 70,
      documentation: 40,
      governance: 45
    }
  },

  bankingCompliance: {
    projectName: "Digital Banking Transformation Initiative",
    vision: "To modernize our core banking infrastructure, ensuring PSD2 compliance while delivering a superior digital customer experience that positions us as the leading digital-first bank in the European market.",
    businessCase: "Regulatory compliance with PSD2 is mandatory by Q3 2024, with potential fines of up to 4% of annual turnover for non-compliance. Additionally, digital transformation will reduce operational costs by 35% and increase customer acquisition by 45%. Investment of £12M with projected savings of £8M annually and new revenue streams worth £15M per year.",
    description: "Complete overhaul of legacy banking systems including implementation of open banking APIs, real-time payment processing, enhanced KYC/AML procedures, mobile-first customer portal, and AI-driven fraud detection. Project includes migration of 2.3 million customer accounts with zero downtime requirement.",
    methodology: "prince2" as const,
    companyWebsite: "https://premiers-bank.co.uk",
    sector: "Financial Services / Banking",
    stakeholders: [
      { name: "James Wellington", role: "Chief Executive Officer", email: "j.wellington@premiers-bank.co.uk" },
      { name: "Margaret Thornton", role: "Chief Risk Officer", email: "m.thornton@premiers-bank.co.uk" },
      { name: "Robert Hayes", role: "Head of Digital Transformation", email: "r.hayes@premiers-bank.co.uk" },
      { name: "Patricia Kumar", role: "Compliance Director", email: "p.kumar@premiers-bank.co.uk" },
      { name: "Oliver Mitchell", role: "IT Infrastructure Manager", email: "o.mitchell@premiers-bank.co.uk" },
      { name: "Charlotte Evans", role: "Customer Experience Director", email: "c.evans@premiers-bank.co.uk" }
    ],
    prince2Stakeholders: {
      seniorUser: { name: "Charlotte Evans", role: "Customer Experience Director" },
      seniorSupplier: { name: "Oliver Mitchell", role: "IT Infrastructure Manager" },
      executive: { name: "Robert Hayes", role: "Head of Digital Transformation" }
    },
    agilometer: {
      flexibility: 30,
      teamExperience: 40,
      riskTolerance: 25,
      documentation: 95,
      governance: 90
    }
  },

  healthcareSystem: {
    projectName: "Integrated Patient Care Management System",
    vision: "To revolutionize patient care delivery through an integrated, AI-assisted healthcare management system that connects all stakeholders in the patient journey, reducing wait times by 60% and improving patient outcomes by 40%.",
    businessCase: "Healthcare delivery inefficiencies cost the NHS trust £3.2M annually. This integrated system will streamline patient flow, reduce administrative burden by 50%, eliminate paper-based processes, and improve diagnostic accuracy through AI assistance. Expected benefits include £2.1M annual savings, 40% reduction in patient wait times, and 25% improvement in staff satisfaction scores.",
    description: "Implementation of a comprehensive healthcare management platform integrating patient records, appointment scheduling, diagnostic imaging, laboratory results, prescription management, and telemedicine capabilities. The system will feature AI-powered diagnostic assistance, predictive analytics for resource planning, and real-time collaboration tools for multi-disciplinary teams.",
    methodology: "hybrid" as const,
    companyWebsite: "https://royalhealth-nhs.org.uk",
    sector: "Healthcare / Public Sector",
    stakeholders: [
      { name: "Dr. Amanda Foster", role: "Medical Director", email: "a.foster@royalhealth-nhs.org.uk" },
      { name: "Michael O'Brien", role: "Chief Operating Officer", email: "m.obrien@royalhealth-nhs.org.uk" },
      { name: "Dr. Raj Patel", role: "Head of Clinical Innovation", email: "r.patel@royalhealth-nhs.org.uk" },
      { name: "Susan Wright", role: "Chief Nursing Officer", email: "s.wright@royalhealth-nhs.org.uk" },
      { name: "Thomas Clark", role: "IT Director", email: "t.clark@royalhealth-nhs.org.uk" },
      { name: "Jennifer Martinez", role: "Patient Experience Manager", email: "j.martinez@royalhealth-nhs.org.uk" },
      { name: "Dr. Alan Hughes", role: "Clinical Safety Officer", email: "a.hughes@royalhealth-nhs.org.uk" }
    ],
    prince2Stakeholders: {
      seniorUser: { name: "Dr. Amanda Foster", role: "Medical Director" },
      seniorSupplier: { name: "Thomas Clark", role: "IT Director" },
      executive: { name: "Michael O'Brien", role: "Chief Operating Officer" }
    },
    agilometer: {
      flexibility: 60,
      teamExperience: 55,
      riskTolerance: 45,
      documentation: 75,
      governance: 80
    }
  }
}

export type DemoProjectKey = keyof typeof demoProjects

export const getDemoProject = (key: DemoProjectKey) => {
  return demoProjects[key]
}

// Helper function to fill form with demo data
export const fillWizardWithDemoData = (projectKey: DemoProjectKey) => {
  const data = demoProjects[projectKey]
  
  // This function would be called by the wizard component
  // to auto-fill all form fields
  return {
    ...data,
    // Add any additional transformations needed
    timestamp: new Date().toISOString(),
    demoMode: true
  }
}