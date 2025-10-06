#!/usr/bin/env tsx
/**
 * Auto-generate PROJECT_MANIFEST.json by scanning the codebase
 * This ensures the manifest always reflects the actual project state
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'
import { createClient } from '@supabase/supabase-js'

const MANIFEST_PATH = path.join(process.cwd(), 'PROJECT_MANIFEST.json')
const PROJECT_ROOT = process.cwd()

// Initialize Supabase client if env variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

interface Manifest {
  version: string
  lastUpdated: string
  projectName: string
  description: string
  architecture: any
  pipeline: any
  components: any
  database: any
  apiEndpoints: any
  configuration: any
  testing: any
  dependencies: any
  integrations: any
  quickWins: any
  metadata: any
}

async function updateManifest() {
  console.log('🔍 Scanning project structure...')
  
  // Load existing manifest as base
  let manifest: Manifest
  try {
    const existing = fs.readFileSync(MANIFEST_PATH, 'utf-8')
    manifest = JSON.parse(existing)
  } catch {
    // Create new manifest if doesn't exist
    manifest = createEmptyManifest()
  }
  
  // Update timestamp
  manifest.lastUpdated = new Date().toISOString()
  
  // Scan for enrichers
  console.log('📦 Discovering enrichers...')
  await discoverEnrichers(manifest)
  
  // Scan for extractors
  console.log('📦 Discovering extractors...')
  await discoverExtractors(manifest)
  
  // Scan for unused components
  console.log('🔍 Finding unused components...')
  await findUnusedComponents(manifest)
  
  // Check database tables
  if (supabase) {
    console.log('📊 Checking database tables...')
    await checkDatabaseTables(manifest)
  }
  
  // Scan API endpoints
  console.log('🌐 Mapping API endpoints...')
  await mapApiEndpoints(manifest)
  
  // Check feature flags
  console.log('🚩 Checking feature flags...')
  await checkFeatureFlags(manifest)
  
  // Count files and lines
  console.log('📈 Calculating metrics...')
  await calculateMetrics(manifest)
  
  // Identify quick wins
  console.log('🎯 Identifying quick wins...')
  identifyQuickWins(manifest)
  
  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log('✅ PROJECT_MANIFEST.json updated successfully!')
  
  // Print summary
  printSummary(manifest)
}

function createEmptyManifest(): Manifest {
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    projectName: path.basename(PROJECT_ROOT),
    description: "",
    architecture: {
      framework: "Next.js",
      language: "TypeScript",
      styling: "Tailwind CSS",
      database: "Supabase",
      ai: "OpenAI"
    },
    pipeline: {
      companyIntelligence: {
        phases: []
      },
      documentGeneration: {
        documentTypes: []
      }
    },
    components: {
      ui: {
        unused: [],
        active: []
      }
    },
    database: {
      tables: {
        populated: [],
        empty: []
      }
    },
    apiEndpoints: {},
    configuration: {
      featureFlags: {}
    },
    testing: {
      framework: "Vitest + Playwright",
      testFiles: []
    },
    dependencies: {},
    integrations: {
      automatic: {
        rules: []
      }
    },
    quickWins: {
      immediate: []
    },
    metadata: {}
  }
}

async function discoverEnrichers(manifest: Manifest) {
  const enricherFiles = await glob('**/enrichers/*.ts', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'archive/**']
  })
  
  const enrichers = []
  for (const file of enricherFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const className = content.match(/export\s+class\s+(\w+)/)?.[1]
    
    if (className) {
      // Check if it's imported anywhere
      const importPattern = new RegExp(`import.*${className}.*from`)
      const isImported = await checkIfImported(className)
      
      // Check if enabled
      const isEnabled = !content.includes('enabled: false') && isImported
      
      enrichers.push({
        name: className,
        path: `/${file}`,
        enabled: isEnabled,
        connected: isImported,
        dataTypes: extractDataTypes(content),
        requiredKeys: extractRequiredKeys(content),
        tables: extractRelatedTables(content)
      })
    }
  }
  
  // Update manifest
  if (!manifest.pipeline.companyIntelligence) {
    manifest.pipeline.companyIntelligence = { phases: [] }
  }
  
  const enrichmentPhase = manifest.pipeline.companyIntelligence.phases.find(
    (p: any) => p.name === 'enrichment'
  )
  
  if (enrichmentPhase) {
    enrichmentPhase.handlers.enrichers = enrichers
  }
}

async function discoverExtractors(manifest: Manifest) {
  const extractorFiles = await glob('**/extractors/*.ts', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'archive/**']
  })
  
  const extractors = []
  for (const file of extractorFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const className = content.match(/export\s+class\s+(\w+)/)?.[1]
    
    if (className) {
      const isImported = await checkIfImported(className)
      
      extractors.push({
        name: className,
        path: `/${file}`,
        enabled: isImported,
        dataTypes: extractDataTypes(content)
      })
    }
  }
  
  const extractionPhase = manifest.pipeline.companyIntelligence.phases.find(
    (p: any) => p.name === 'extraction'
  )
  
  if (extractionPhase) {
    extractionPhase.handlers.extractors = extractors
  }
}

async function findUnusedComponents(manifest: Manifest) {
  const componentFiles = await glob('components/**/*.tsx', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'archive/**']
  })
  
  const unused = []
  const active = []
  
  for (const file of componentFiles) {
    const componentName = path.basename(file, '.tsx')
    const isUsed = await checkIfImported(componentName)
    
    if (isUsed) {
      active.push(`/${file}`)
    } else {
      unused.push({
        name: componentName,
        path: `/${file}`,
        description: extractComponentDescription(file),
        lastModified: getFileModifiedDate(file)
      })
    }
  }
  
  manifest.components.ui.unused = unused
  manifest.components.ui.active = active
}

async function checkIfImported(name: string): Promise<boolean> {
  const searchPattern = `import.*${name}|from.*${name}`
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', '**/test/**', '**/*.test.*', 'archive/**']
  })
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    if (content.match(new RegExp(searchPattern))) {
      return true
    }
  }
  
  return false
}

async function checkDatabaseTables(manifest: Manifest) {
  if (!supabase) return
  
  try {
    // Get all tables
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    const populated = []
    const empty = []
    
    for (const table of tables || []) {
      const { count } = await supabase
        .from(table.table_name)
        .select('*', { count: 'exact', head: true })
      
      if (count && count > 0) {
        populated.push({
          name: table.table_name,
          rowCount: count,
          description: '',
          connected: true
        })
      } else {
        empty.push({
          name: table.table_name,
          schema: 'created',
          purpose: '',
          connectedTo: []
        })
      }
    }
    
    manifest.database.tables.populated = populated
    manifest.database.tables.empty = empty
  } catch (error) {
    console.log('⚠️  Could not check database tables (database may be offline)')
  }
}

async function mapApiEndpoints(manifest: Manifest) {
  const apiFiles = await glob('app/api/**/*.ts', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'archive/**']
  })
  
  const endpoints: Record<string, string[]> = {
    companyIntelligence: [],
    documentGeneration: [],
    other: []
  }
  
  for (const file of apiFiles) {
    const endpoint = file
      .replace('app/api', '/api')
      .replace('/route.ts', '')
      .replace(/\[([^\]]+)\]/g, '[$1]')
    
    if (endpoint.includes('company-intelligence')) {
      endpoints.companyIntelligence.push(endpoint)
    } else if (endpoint.includes('generate') || endpoint.includes('pdf')) {
      endpoints.documentGeneration.push(endpoint)
    } else {
      endpoints.other.push(endpoint)
    }
  }
  
  manifest.apiEndpoints = endpoints
}

async function checkFeatureFlags(manifest: Manifest) {
  const configFiles = await glob('**/config*.ts', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'archive/**']
  })
  
  const flags: Record<string, any> = {}
  
  for (const file of configFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    
    // Find enabled/disabled flags
    const enabledMatches = content.matchAll(/(\w+):\s*(true|false)/g)
    for (const match of enabledMatches) {
      if (match[1].toLowerCase().includes('enable')) {
        flags[match[1]] = match[2] === 'true'
      }
    }
  }
  
  manifest.configuration.featureFlags = flags
}

async function calculateMetrics(manifest: Manifest) {
  const allFiles = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**', 'archive/**']
  })
  
  let totalLines = 0
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    totalLines += content.split('\n').length
  }
  
  manifest.metadata = {
    ...manifest.metadata,
    totalFiles: allFiles.length,
    linesOfCode: totalLines,
    lastAudit: new Date().toISOString().split('T')[0],
    nextAudit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
}

function identifyQuickWins(manifest: Manifest) {
  const quickWins = []
  
  // Check for disabled enrichers
  const enrichmentPhase = manifest.pipeline.companyIntelligence?.phases?.find(
    (p: any) => p.name === 'enrichment'
  )
  
  if (enrichmentPhase?.handlers?.enrichers) {
    const disabledEnrichers = enrichmentPhase.handlers.enrichers.filter(
      (e: any) => !e.enabled
    )
    
    if (disabledEnrichers.length > 0) {
      quickWins.push({
        action: `Enable ${disabledEnrichers.length} enrichers`,
        effort: "2 hours",
        impact: "Very High",
        location: "/api/company-intelligence/phases/enrichment/route.ts",
        changes: `Import and register: ${disabledEnrichers.map((e: any) => e.name).join(', ')}`
      })
    }
  }
  
  // Check for unused components
  if (manifest.components.ui.unused.length > 0) {
    quickWins.push({
      action: "Use unused UI components",
      effort: "30 minutes per component",
      impact: "Medium",
      location: "Various pages",
      changes: `${manifest.components.ui.unused.length} components available: ${manifest.components.ui.unused.map((c: any) => c.name).join(', ')}`
    })
  }
  
  // Check for empty tables
  if (manifest.database.tables?.empty?.length > 0) {
    quickWins.push({
      action: "Populate empty database tables",
      effort: "1-2 hours",
      impact: "High",
      location: "Database integration points",
      changes: `${manifest.database.tables.empty.length} tables ready for data`
    })
  }
  
  manifest.quickWins.immediate = quickWins
}

function extractDataTypes(content: string): string[] {
  const types: string[] = []
  // Simple extraction - can be improved
  if (content.includes('email')) types.push('email')
  if (content.includes('phone')) types.push('phone')
  if (content.includes('address')) types.push('address')
  if (content.includes('financial')) types.push('financial')
  if (content.includes('social')) types.push('social')
  return types
}

function extractRequiredKeys(content: string): string[] {
  const keys: string[] = []
  const envMatches = content.matchAll(/process\.env\.(\w+)/g)
  for (const match of envMatches) {
    keys.push(match[1])
  }
  return keys
}

function extractRelatedTables(content: string): string[] {
  const tables: string[] = []
  const tableMatches = content.matchAll(/from\(['"`](\w+)['"`]\)/g)
  for (const match of tableMatches) {
    tables.push(match[1])
  }
  return tables
}

function extractComponentDescription(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+)/)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

function getFileModifiedDate(filePath: string): string {
  const stats = fs.statSync(filePath)
  return stats.mtime.toISOString().split('T')[0]
}

function printSummary(manifest: Manifest) {
  console.log('\n📊 Manifest Summary:')
  console.log('═══════════════════════════════════════')
  
  const enrichers = manifest.pipeline.companyIntelligence?.phases
    ?.find((p: any) => p.name === 'enrichment')
    ?.handlers?.enrichers || []
  
  const enabledEnrichers = enrichers.filter((e: any) => e.enabled).length
  const disabledEnrichers = enrichers.filter((e: any) => !e.enabled).length
  
  console.log(`📦 Enrichers: ${enabledEnrichers} enabled, ${disabledEnrichers} disabled`)
  console.log(`🎨 Components: ${manifest.components.ui.active.length} active, ${manifest.components.ui.unused.length} unused`)
  console.log(`💾 Database: ${manifest.database.tables?.populated?.length || 0} populated, ${manifest.database.tables?.empty?.length || 0} empty tables`)
  console.log(`🌐 API Endpoints: ${Object.values(manifest.apiEndpoints).flat().length} total`)
  console.log(`📝 Lines of Code: ${manifest.metadata.linesOfCode?.toLocaleString() || 'Unknown'}`)
  
  if (manifest.quickWins.immediate.length > 0) {
    console.log('\n🎯 Quick Wins Available:')
    manifest.quickWins.immediate.forEach((win: any) => {
      console.log(`   • ${win.action} (${win.effort}, ${win.impact} impact)`)
    })
  }
  
  console.log('\n✨ Manifest saved to PROJECT_MANIFEST.json')
}

// Run the update
updateManifest().catch(console.error)