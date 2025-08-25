import { ContextManager } from '../context/context-manager'

const contextManager = new ContextManager()

export const technicalLandscapePrompts = {
  analysis: {
    buildPrompt: (params: any) => {
      const systemPrompt = `You are a Senior Technical Architect and Technology Strategist creating comprehensive technical landscape analyses.
You have deep expertise in enterprise architecture, technology trends, and digital transformation.
Generate detailed technical documentation that provides strategic insights and actionable recommendations.

ANALYSIS FRAMEWORK:
1. Current State Assessment - Existing technology inventory
2. Future State Vision - Emerging technologies and trends
3. Gap Analysis - What's needed to bridge current to future
4. Risk Assessment - Technical debt and obsolescence risks
5. Opportunity Identification - Innovation and optimization areas
6. Roadmap Development - Phased approach to transformation

IMPORTANT: 
- Research current technology trends (2024-2025)
- Consider industry-specific requirements
- Balance innovation with pragmatism
- Include both technical and business perspectives`

      const userPrompt = `Create a comprehensive Technical Landscape Analysis for:

Project Name: ${params.projectName}
Description: ${params.description}
Industry Sector: ${params.sector}
Company Website: ${params.companyWebsite}
Vision: ${params.vision}

SYSTEMATIC ANALYSIS PROCESS:
1. Research ${params.companyWebsite} to understand current technology context
2. Analyze ${params.sector} industry technology trends and standards
3. Identify relevant emerging technologies
4. Map technology stack requirements
5. Define integration architecture
6. Create technology glossary
7. Compile resource repository

Generate a detailed Technical Landscape document with:

1. EXECUTIVE SUMMARY
   - Technology vision statement
   - Key findings and recommendations
   - Strategic technology priorities
   - Investment requirements summary
   - Risk and opportunity highlights

2. CURRENT TECHNOLOGY ASSESSMENT
   - Existing Technology Stack
     * Frontend technologies
     * Backend frameworks
     * Database systems
     * Infrastructure and cloud platforms
     * DevOps tools and practices
     * Security technologies
   - Technology Maturity Assessment
     * Emerging (experimental)
     * Growing (adoption increasing)
     * Mature (widely adopted)
     * Declining (consider replacement)
     * Obsolete (requires migration)
   - Technical Debt Analysis
     * Legacy system dependencies
     * Outdated frameworks/libraries
     * Security vulnerabilities
     * Performance bottlenecks
     * Maintenance challenges

3. INDUSTRY TECHNOLOGY TRENDS (${params.sector})
   - Sector-Specific Technologies
     * Industry-standard platforms
     * Regulatory technology requirements
     * Compliance frameworks
     * Best-in-class solutions
   - Competitive Technology Analysis
     * What leaders are using
     * Emerging differentiators
     * Table stakes technologies
     * Innovation opportunities
   - Market Dynamics
     * Technology adoption rates
     * Vendor landscape
     * Open source vs proprietary
     * Cloud vs on-premise trends

4. EMERGING TECHNOLOGIES ASSESSMENT
   - Artificial Intelligence & Machine Learning
     * Applicable use cases
     * Implementation complexity
     * ROI potential
     * Required expertise
   - Cloud Native Technologies
     * Microservices architecture
     * Container orchestration
     * Serverless computing
     * Edge computing
   - Data Technologies
     * Real-time analytics
     * Data lakes/warehouses
     * Stream processing
     * Data governance tools
   - Security Technologies
     * Zero trust architecture
     * Identity management
     * Threat detection
     * Compliance automation
   - Other Relevant Technologies
     * IoT and sensors
     * Blockchain/DLT
     * AR/VR/Metaverse
     * Quantum computing readiness

5. PROPOSED TECHNOLOGY STACK
   - Architecture Principles
     * Scalability requirements
     * Performance targets
     * Security standards
     * Integration patterns
   - Recommended Stack Components
     * Frontend: [Framework, libraries, tools]
     * Backend: [Languages, frameworks, services]
     * Database: [SQL/NoSQL, caching, search]
     * Infrastructure: [Cloud provider, IaC tools]
     * DevOps: [CI/CD, monitoring, logging]
     * Security: [Auth, encryption, scanning]
   - Technology Selection Criteria
     * Total cost of ownership
     * Skills availability
     * Vendor support
     * Community strength
     * Future-proofing

6. INTEGRATION ARCHITECTURE
   - System Integration Map
     * Internal systems
     * External services
     * Partner integrations
     * Data flows
   - API Strategy
     * API design standards
     * Versioning approach
     * Documentation requirements
     * Security protocols
   - Event-Driven Architecture
     * Event streaming
     * Message queuing
     * Event sourcing
     * CQRS patterns
   - Data Integration
     * ETL/ELT processes
     * Real-time synchronization
     * Data quality management
     * Master data management

7. TECHNICAL GLOSSARY
   - Project-Specific Terms
     * Domain terminology
     * Technical acronyms
     * Architecture patterns
     * Protocol definitions
   - Technology Definitions
     * Framework descriptions
     * Tool explanations
     * Standard definitions
     * Methodology terms
   - Stakeholder Translation
     * Technical to business mapping
     * Benefit explanations
     * Risk descriptions
     * Success metrics

8. COMPATIBILITY MATRIX
   - Technology Dependencies
     * Version compatibilities
     * Library dependencies
     * Platform requirements
     * Browser support
   - Integration Compatibility
     * Protocol support
     * Data format standards
     * Authentication methods
     * Performance characteristics
   - Known Conflicts
     * Incompatible technologies
     * Version conflicts
     * Licensing issues
     * Performance impacts

9. RESOURCE REPOSITORY
   - Official Documentation
     * Vendor documentation links
     * API references
     * Configuration guides
     * Best practices guides
   - Learning Resources
     * Tutorials and courses
     * Books and publications
     * Video resources
     * Certification paths
   - Community Resources
     * Forums and communities
     * Stack Overflow tags
     * GitHub repositories
     * Discord/Slack channels
   - Tools and Utilities
     * Development tools
     * Testing frameworks
     * Monitoring solutions
     * Debugging utilities

10. IMPLEMENTATION ROADMAP
    - Phase 1: Foundation (Months 1-3)
      * Core infrastructure setup
      * Development environment
      * Basic integrations
      * Security baseline
    - Phase 2: Enhancement (Months 4-6)
      * Advanced features
      * Performance optimization
      * Extended integrations
      * Automation implementation
    - Phase 3: Innovation (Months 7-12)
      * Emerging technology pilots
      * AI/ML integration
      * Advanced analytics
      * Continuous improvement

11. RISK MITIGATION STRATEGIES
    - Technology Risks
      * Vendor lock-in mitigation
      * Obsolescence planning
      * Skills gap addressing
      * Security vulnerability management
    - Implementation Risks
      * Complexity management
      * Integration challenges
      * Performance issues
      * Adoption barriers

12. SUCCESS METRICS
    - Technical Metrics
      * System performance KPIs
      * Availability targets
      * Security scores
      * Technical debt ratio
    - Business Metrics
      * Time to market
      * Development velocity
      * Operational costs
      * Innovation index

Research current technology trends and provide specific, actionable recommendations.
Include 2024-2025 technology perspectives and future-proofing strategies.
Format as structured JSON with comprehensive details.`

      return { system: systemPrompt, user: userPrompt }
    }
  }
}