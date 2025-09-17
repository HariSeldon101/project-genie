/**
 * ScrapingHistoryPanel - Displays scraper run history
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays history
 * - Dependency Inversion: Depends on ScraperRun interface
 * 
 * DRY: Uses existing AdditiveResults component
 */

import React from 'react'
import { AdditiveResults } from './additive-results'
import { ScraperRun } from '@/lib/company-intelligence/services/scraping-state-service'
import { permanentLogger } from '@/lib/utils/permanent-logger'

interface ScrapingHistoryPanelProps {
  history: ScraperRun[]
  onViewDetails?: (run: ScraperRun) => void
  testId?: string
}

/**
 * Empty state component
 */
const EmptyHistoryMessage: React.FC = () => (
  <div className="text-center py-8 text-muted-foreground" data-testid="empty-history">
    <p>No scraping history yet. Run a scraper to see results here.</p>
  </div>
)

/**
 * Main history panel component
 * Displays list of scraper runs with their results
 */
export const ScrapingHistoryPanel: React.FC<ScrapingHistoryPanelProps> = ({ 
  history, 
  onViewDetails,
  testId = "scraping-history-panel" 
}) => {
  // Log history updates for debugging
  React.useEffect(() => {
    permanentLogger.breadcrumb('HISTORY_PANEL_UPDATE', 'History panel updated', {
      historyCount: history.length,
      scraperIds: history.map(h => h.scraperId)
    })
  }, [history])
  
  if (history.length === 0) {
    return <EmptyHistoryMessage />
  }
  
  const handleViewDetails = (run: ScraperRun) => {
    permanentLogger.info('SCRAPING_HISTORY_PANEL', 'Viewing run details', { runId: run.id,
      scraperId: run.scraperId,
      status: run.status })
    
    if (onViewDetails) {
      onViewDetails(run)
    }
  }
  
  return (
    <div data-testid={testId}>
      <AdditiveResults 
        history={history}
        onViewDetails={handleViewDetails}
      />
    </div>
  )
}