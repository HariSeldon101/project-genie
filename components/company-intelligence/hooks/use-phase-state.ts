import { useState, useCallback, useRef } from 'react'
import { permanentLogger } from '@/lib/utils/permanent-logger'
import { Stage } from './use-stage-navigation'

interface SessionData {
  id: string
  domain: string
  createdAt: string
  updatedAt: string
}

/**
 * Centralized state management for phase data
 * Handles session management and data persistence
 */
export function usePhaseState() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [stageData, setStageData] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Track data changes for debugging
  const dataHistory = useRef<Array<{ timestamp: string, stage: string, action: string, data: any }>>([])

  // Sliding window configuration
  const MAX_STAGES_IN_MEMORY = 2 // Keep only 2 stages in memory at once

  /**
   * Initialize or update session
   */
  const initializeSession = useCallback(async (domain: string) => {
    permanentLogger.info('PHASE_STATE', 'Initializing session', { domain, existingSessionId: sessionId})
    
    try {
      // Extract company name from domain (e.g., "bigfluffy.ai" -> "BigFluffy")
      const company_name = domain
        .split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
      
      // Create session in database using new clean schema
      // IMPORTANT: Using company_name field per new schema, NOT session_name
      const response = await fetch('/api/company-intelligence/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain,
          company_name  // Using company_name per new clean schema
          // Status defaults to 'active' in database
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        permanentLogger.captureError('PHASE_STATE', new Error('Failed to create session'), { 
          status: response.status, 
          error: errorData,
          domain,
          company_name,
          details: errorData.details || 'No details available'
        })
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Authentication required - Please sign in to continue')
        } else if (response.status === 400) {
          throw new Error(errorData.error || 'Invalid session data')
        } else {
          throw new Error(errorData.error || `Failed to create session (${response.status})`)
        }
      }
      
      const data = await response.json()
      const session = data.session || data // Handle both response formats
      
      permanentLogger.info('Session initialized', {
        category: 'PHASE_STATE',
        sessionId: session.id,
        domain: session.domain,
        company_name: session.company_name
      })
      
      setSessionId(session.id)
      setSessionData({
        id: session.id,
        domain: session.domain,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      })
      
      return session.id
    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', new Error('Failed to initialize session'), { error, domain })
      throw error
    }
  }, [sessionId])

  /**
   * Store data for a specific stage
   */
  const setStageDataForStage = useCallback((stage: Stage, data: any) => {
    permanentLogger.info('Setting stage data', {
      category: 'PHASE_STATE',
      stage,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataSize: JSON.stringify(data || {}).length
    })
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage,
      action: 'set',
      data: { keys: data ? Object.keys(data) : [], size: JSON.stringify(data || {}).length }
    })
    
    // Keep only last 20 history entries
    if (dataHistory.current.length > 20) {
      dataHistory.current.shift()
    }
    
    setStageData(prev => {
      const newData = { ...prev, [stage]: data }

      // Implement sliding window - keep only MAX_STAGES_IN_MEMORY most recent stages
      const stageKeys = Object.keys(newData)
        .filter(key => newData[key]) // Only count stages with data
        .sort((a, b) => {
          // Sort by stage number (stage1, stage2, etc.)
          const numA = parseInt(a.replace(/\D/g, '') || '0')
          const numB = parseInt(b.replace(/\D/g, '') || '0')
          return numA - numB
        })

      // If we exceed max stages, remove oldest ones
      if (stageKeys.length > MAX_STAGES_IN_MEMORY) {
        const stagesToRemove = stageKeys.slice(0, stageKeys.length - MAX_STAGES_IN_MEMORY)

        permanentLogger.info('PHASE_STATE', 'Sliding window cleanup', {
          stagesToRemove,
          keptStages: stageKeys.slice(-MAX_STAGES_IN_MEMORY),
          totalStages: stageKeys.length
        })

        // Remove old stages from memory
        for (const stageToRemove of stagesToRemove) {
          delete newData[stageToRemove]
        }
      }

      permanentLogger.info('Stage data updated', {
        category: 'PHASE_STATE',
        stage,
        previousKeys: Object.keys(prev),
        newKeys: Object.keys(newData),
        totalStagesWithData: Object.keys(newData).filter(k => newData[k]).length,
        memorySizeEstimate: JSON.stringify(newData).length
      })

      // NO sessionStorage - data persists to DB only

      return newData
    })
  }, [sessionId])

  /**
   * Get data for a specific stage
   */
  const getStageData = useCallback<(stage: Stage) => any | undefined>((stage: Stage) => {
    const data = stageData[stage]
    
    permanentLogger.info('Getting stage data', {
      category: 'PHASE_STATE',
      stage,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    })
    
    return data
  }, [stageData])

  /**
   * Clear data for a specific stage
   */
  const clearStageData = useCallback((stage: Stage) => {
    permanentLogger.info('PHASE_STATE', 'Clearing stage data', { stage})
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage,
      action: 'clear',
      data: null
    })
    
    setStageData(prev => {
      const newData = { ...prev }
      delete newData[stage]
      
      permanentLogger.info('Stage data cleared', {
        category: 'PHASE_STATE',
        stage,
        remainingStages: Object.keys(newData)
      })
      
      return newData
    })
  }, [])

  /**
   * Clear all stage data
   */
  const clearAllStageData = useCallback(() => {
    permanentLogger.info('Clearing all stage data', {
      category: 'PHASE_STATE',
      previousStages: Object.keys(stageData)
    })
    
    // Track in history
    dataHistory.current.push({
      timestamp: new Date().toISOString(),
      stage: 'all',
      action: 'clear-all',
      data: null
    })
    
    setStageData({})

    // NO sessionStorage to clear - memory only
  }, [sessionId, stageData])

  /**
   * Load stage data from database (replaces sessionStorage restore)
   * Only loads the most recent stages to maintain sliding window
   */
  const loadStageDataFromDB = useCallback(async (stageToLoad?: Stage) => {
    if (!sessionId) {
      permanentLogger.info('PHASE_STATE', 'Cannot load: no session ID')
      return false
    }

    try {
      // Fetch stage data from database via API
      const response = await fetch(`/api/company-intelligence/sessions/${sessionId}/phase-data${stageToLoad ? `?stage=${stageToLoad}` : ''}`)

      if (!response.ok) {
        throw new Error(`Failed to load stage data: ${response.status}`)
      }

      const data = await response.json()

      if (data && Object.keys(data).length > 0) {
        permanentLogger.info('PHASE_STATE', 'Loaded stage data from database', {
          sessionId,
          stages: Object.keys(data),
          stageToLoad
        })

        if (stageToLoad) {
          // Load specific stage
          setStageDataForStage(stageToLoad, data[stageToLoad])
        } else {
          // Load all stages (respecting sliding window)
          setStageData(data)
        }

        return true
      }
    } catch (error) {
      permanentLogger.captureError('PHASE_STATE', new Error('Failed to load stage data from DB'), { error, sessionId, stageToLoad })
    }

    return false
  }, [sessionId, setStageDataForStage])

  /**
   * Update processing state with logging
   */
  const updateProcessingState = useCallback((processing: boolean, context?: string) => {
    permanentLogger.info('Updating processing state', {
      category: 'PHASE_STATE',
      processing,
      context,
      previousState: isProcessing
    })
    
    setIsProcessing(processing)
  }, [isProcessing])

  /**
   * Get data history for debugging
   */
  const getDataHistory = useCallback(() => {
    return [...dataHistory.current]
  }, [])

  /**
   * Check if stage has data
   */
  const hasStageData = useCallback((stage: Stage): boolean => {
    const hasData = !!stageData[stage]
    
    permanentLogger.info('Checking stage data existence', {
      category: 'PHASE_STATE',
      stage,
      hasData
    })
    
    return hasData
  }, [stageData])

  /**
   * Get all stages with data
   */
  const getStagesWithData = useCallback((): Stage[] => {
    const stages = Object.keys(stageData).filter(stage => stageData[stage]) as Stage[]
    
    permanentLogger.info('Getting stages with data', {
      category: 'PHASE_STATE',
      stages,
      count: stages.length
    })
    
    return stages
  }, [stageData])

  return {
    // Session
    sessionId,
    sessionData,
    initializeSession,
    
    // Stage data
    stageData,
    setStageDataForStage,
    getStageData,
    clearStageData,
    clearAllStageData,
    hasStageData,
    getStagesWithData,
    
    // Processing state
    isProcessing,
    setIsProcessing: updateProcessingState,
    
    // Utilities
    loadStageDataFromDB,
    getDataHistory
  }
}