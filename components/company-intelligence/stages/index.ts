/**
 * Stage Components Index
 * 
 * Central export point for all stage-related components.
 * These components are used to build the research workflow UI
 * in a modular and maintainable way.
 * 
 * @module stages
 */

// Progress tracking
export { ProgressIndicator } from './progress-indicator'

// Individual stage components
export { SiteAnalysisStage } from './site-analysis-stage'
export { GenerationStage } from './generation-stage'

// Shared UI patterns
export { StageActionBar, SingleActionButton } from './stage-action-bar'

// Re-export types for convenience
export type { 
  ProgressIndicatorProps 
} from './progress-indicator'

export type { 
  SiteAnalysisStageProps,
  SiteAnalysisResult 
} from './site-analysis-stage'

export type { 
  GenerationStageProps 
} from './generation-stage'

export type { 
  StageActionBarProps,
  SingleActionProps 
} from './stage-action-bar'