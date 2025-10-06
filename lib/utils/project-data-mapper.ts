/**
 * Project Data Mapper
 *
 * Provides a single source of truth for transforming database records
 * into the canonical ProjectDataSchema used throughout the application.
 *
 * This ensures consistency between:
 * - Wizard data (sessionStorage)
 * - Database records (reconstructed)
 * - Document generator (API calls)
 */

export interface Stakeholder {
  name: string
  email: string
  title: string
}

export interface ProjectDataSchema {
  // Basic Information
  name: string
  description: string
  vision: string
  businessCase: string

  // Methodology
  methodology: 'agile' | 'prince2' | 'hybrid'

  // Company Information
  companyWebsite: string
  sector: string

  // Financial & Timeline
  budget: string
  timeline: string
  startDate: string
  endDate: string

  // Stakeholders
  stakeholders: Stakeholder[]

  // PRINCE2-specific (optional)
  prince2Stakeholders?: {
    seniorUser: Stakeholder
    seniorSupplier: Stakeholder
    executive: Stakeholder
  }

  // Hybrid-specific (optional)
  agilometer?: {
    flexibility: number
    teamExperience: number
    riskTolerance: number
    documentation: number
    governance: number
  }
}

/**
 * Map database record to canonical ProjectDataSchema
 *
 * @param projectRecord - Raw project record from database
 * @param stakeholders - Array of stakeholder records from database
 * @returns Normalized ProjectDataSchema object
 */
export function mapDatabaseToProjectData(
  projectRecord: any,
  stakeholders: any[]
): ProjectDataSchema {
  // Extract company info from JSONB column
  const companyInfo = projectRecord.company_info || {}

  // Reconstruct PRINCE2 stakeholder hierarchy if available
  let prince2Stakeholders: ProjectDataSchema['prince2Stakeholders'] = undefined

  if (projectRecord.methodology_type === 'prince2' && projectRecord.prince2_roles) {
    const roles = projectRecord.prince2_roles

    // Find stakeholders by ID from role mapping
    const seniorUser = stakeholders.find(s => s.id === roles.seniorUserId)
    const seniorSupplier = stakeholders.find(s => s.id === roles.seniorSupplierId)
    const executive = stakeholders.find(s => s.id === roles.executiveId)

    // Fallback: Try to find by role name if IDs don't match
    if (!seniorUser || !seniorSupplier || !executive) {
      const fallbackSeniorUser = stakeholders.find(s => s.role === 'Senior User')
      const fallbackSeniorSupplier = stakeholders.find(s => s.role === 'Senior Supplier')
      const fallbackExecutive = stakeholders.find(s => s.role === 'Executive')

      prince2Stakeholders = {
        seniorUser: seniorUser || fallbackSeniorUser || { name: '', email: '', title: '' },
        seniorSupplier: seniorSupplier || fallbackSeniorSupplier || { name: '', email: '', title: '' },
        executive: executive || fallbackExecutive || { name: '', email: '', title: '' }
      }
    } else {
      prince2Stakeholders = {
        seniorUser: { name: seniorUser.name, email: seniorUser.email || '', title: seniorUser.role || '' },
        seniorSupplier: { name: seniorSupplier.name, email: seniorSupplier.email || '', title: seniorSupplier.role || '' },
        executive: { name: executive.name, email: executive.email || '', title: executive.role || '' }
      }
    }
  }

  // Build canonical data structure
  const projectData: ProjectDataSchema = {
    // Basic fields
    name: projectRecord.name || '',
    description: projectRecord.description || '',
    vision: projectRecord.vision || '',
    businessCase: projectRecord.business_case || '',

    // Methodology
    methodology: projectRecord.methodology_type || 'agile',

    // Company info (from JSONB)
    companyWebsite: companyInfo.website || '',
    sector: companyInfo.sector || '',

    // Financial & timeline (from JSONB)
    budget: companyInfo.budget || '',
    timeline: companyInfo.timeline || '',
    startDate: companyInfo.startDate || '',
    endDate: companyInfo.endDate || '',

    // Regular stakeholders
    stakeholders: stakeholders
      ?.filter(s => {
        // Exclude PRINCE2 role stakeholders from general list
        if (projectRecord.methodology_type === 'prince2') {
          return !['Senior User', 'Senior Supplier', 'Executive'].includes(s.role)
        }
        return true
      })
      .map(s => ({
        name: s.name || '',
        email: s.email || '',
        title: s.role || ''
      })) || []
  }

  // Add PRINCE2 stakeholders if reconstructed
  if (prince2Stakeholders) {
    projectData.prince2Stakeholders = prince2Stakeholders
  }

  // Add agilometer if exists (Hybrid methodology)
  if (projectRecord.agilometer) {
    projectData.agilometer = {
      flexibility: projectRecord.agilometer.flexibility || 50,
      teamExperience: projectRecord.agilometer.teamExperience || 50,
      riskTolerance: projectRecord.agilometer.riskTolerance || 50,
      documentation: projectRecord.agilometer.documentation || 50,
      governance: projectRecord.agilometer.governance || 50
    }
  }

  return projectData
}

/**
 * Validate that project data has required fields for document generation
 *
 * @param projectData - Project data to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateProjectData(projectData: ProjectDataSchema): string[] {
  const errors: string[] = []

  if (!projectData.name?.trim()) {
    errors.push('Project name is required')
  }

  if (!projectData.methodology) {
    errors.push('Methodology is required')
  }

  if (!projectData.vision?.trim() && !projectData.description?.trim()) {
    errors.push('Either vision or description is required')
  }

  if (!projectData.companyWebsite?.trim()) {
    errors.push('Company website is required for research')
  }

  if (!projectData.sector?.trim()) {
    errors.push('Industry sector is required')
  }

  // Methodology-specific validation
  if (projectData.methodology === 'prince2') {
    if (!projectData.prince2Stakeholders) {
      errors.push('PRINCE2 methodology requires Senior User, Senior Supplier, and Executive roles')
    }
  }

  if (projectData.methodology === 'hybrid') {
    if (!projectData.agilometer) {
      errors.push('Hybrid methodology requires agilometer settings')
    }
  }

  return errors
}
