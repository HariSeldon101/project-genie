/**
 * ScrapingStatsCard - Pure presentational component for displaying scraping statistics
 * 
 * SOLID Principles:
 * - Single Responsibility: Only displays statistics
 * - Open/Closed: Can be extended with new stat types
 * - Interface Segregation: Clean props interface
 * 
 * DRY: Reusable StatItem component for consistent display
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TooltipWrapper } from '../tooltip-wrapper'

// Define type locally since service was archived
interface ScrapingTotals {
  totalPages: number
  totalDataPoints: number
  totalDiscoveredLinks: number
}

interface ScrapingStatsCardProps {
  stats: ScrapingTotals
  scraperRunCount: number
  testId?: string
}

interface StatItemProps {
  value: number
  label: string
  tooltip: string
  testId?: string
}

/**
 * Individual stat item with tooltip
 */
const StatItem: React.FC<StatItemProps> = ({ value, label, tooltip, testId }) => (
  <TooltipWrapper content={tooltip}>
    <div className="text-center cursor-help" data-testid={testId}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  </TooltipWrapper>
)

/**
 * Main stats card component
 * Displays aggregated scraping statistics
 */
export const ScrapingStatsCard: React.FC<ScrapingStatsCardProps> = ({ 
  stats, 
  scraperRunCount,
  testId = "scraping-stats-card" 
}) => {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Additive Scraping Session</span>
          <Badge variant="outline" data-testid="scraper-run-count">
            {scraperRunCount} Scraper{scraperRunCount !== 1 ? 's' : ''} Run
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4" data-testid="scraping-stats">
          <StatItem
            value={stats.pagesScraped}
            label="Pages Scraped"
            tooltip="Total number of unique web pages successfully processed across all scraper runs. Each page is counted once even if scraped by multiple scrapers."
            testId="stat-pages-scraped"
          />
          
          <StatItem
            value={stats.dataPoints}
            label="Data Points"
            tooltip="Total data elements extracted including text content, images, metadata, structured data, and other information. More data points mean richer content for document generation."
            testId="stat-data-points"
          />
          
          <StatItem
            value={stats.discoveredLinks}
            label="Links Found"
            tooltip="New URLs discovered during scraping that could be explored in future sessions. These are potential pages for expanding your research scope."
            testId="stat-links-found"
          />
          
          <StatItem
            value={scraperRunCount}
            label="Scrapers Used"
            tooltip="Number of different scraper types run in this session. Each scraper adds unique data - Static for HTML, Dynamic for JavaScript content, etc."
            testId="stat-scrapers-used"
          />
        </div>
      </CardContent>
    </Card>
  )
}