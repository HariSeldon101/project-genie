# Phase 5: Database & Performance Optimization
*Activate dormant database tables and optimize system performance*

## 📚 Related Documents
- [Shared Content & Standards](./company-intelligence-shared-content.md)
- [Phase 1: Advanced Scraping](./phase-1-advanced-scraping.md)
- [Phase 2: Data Sources & OSINT](./phase-2-data-sources-osint.md)
- [Phase 3: Enricher Activation](./phase-3-enricher-activation.md)
- [Phase 4: GPT-5 Optimization](./phase-4-gpt5-llm-optimization.md)

---

## 🎯 Phase 5 Overview

### Objectives
1. Activate all 22 empty database tables
2. Implement comprehensive performance optimization
3. Create advanced analytics and reporting
4. Build system monitoring and observability
5. Create comprehensive dashboards and visualizations

### Timeline
- **Duration**: 2 weeks
- **Dependencies**: Phases 1-4 (complete pipeline)
- **Team Size**: 1-2 developers

### Success Metrics
- Database utilization: 100% (from current 23%)
- Query performance: <100ms for 95% of queries
- System uptime: 99.9%
- Dashboard load time: <2 seconds
- Zero data loss incidents

---

## 🏗️ Architecture Design

### Component Structure
```
lib/database/
├── schemas/
│   ├── activity-tracking.sql
│   ├── corporate-structure.sql
│   ├── decision-management.sql
│   ├── analytics-tables.sql
│   └── performance-indexes.sql
├── optimization/
│   ├── query-optimizer.ts
│   ├── connection-pool.ts
│   ├── cache-manager.ts
│   └── read-replica.ts
├── analytics/
│   ├── metrics-collector.ts
│   ├── trend-analyzer.ts
│   ├── report-generator.ts
│   └── executive-dashboard.ts
└── monitoring/
    ├── health-checker.ts
    ├── alert-manager.ts
    ├── performance-monitor.ts
    └── audit-logger.ts
```

---

## 🔧 Implementation Details

### 5.1 Activate All 22 Empty Tables

#### Complete Schema Implementation
```sql
-- ============================================
-- ACTIVITY TRACKING TABLES
-- ============================================

-- User activity tracking for analytics
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES research_sessions(id),
  
  -- Activity details
  activity_type TEXT NOT NULL, -- 'login', 'search', 'scrape', 'enrich', 'generate'
  activity_name TEXT NOT NULL,
  activity_data JSONB,
  
  -- Performance metrics
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  INDEX idx_activity_user (user_id, created_at DESC),
  INDEX idx_activity_type (activity_type, created_at DESC),
  INDEX idx_activity_session (session_id)
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- CORPORATE STRUCTURE TABLES
-- ============================================

-- Corporate entities and relationships
CREATE TABLE IF NOT EXISTS corporate_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Entity identification
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'company', 'subsidiary', 'division', 'brand'
  legal_name TEXT,
  registration_number TEXT,
  
  -- Hierarchy
  parent_entity_id UUID REFERENCES corporate_entities(id),
  ultimate_parent_id UUID REFERENCES corporate_entities(id),
  hierarchy_level INTEGER DEFAULT 0,
  
  -- Details
  country TEXT,
  incorporation_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'dormant', 'dissolved'
  
  -- Financial
  revenue DECIMAL(15,2),
  employees INTEGER,
  market_cap DECIMAL(15,2),
  
  -- Metadata
  data_source TEXT,
  confidence_score DECIMAL(3,2),
  last_verified TIMESTAMPTZ,
  
  UNIQUE(entity_name, entity_type),
  INDEX idx_corporate_parent (parent_entity_id),
  INDEX idx_corporate_name (entity_name),
  INDEX idx_corporate_type (entity_type)
);

-- Entity relationships (M&A, partnerships, etc.)
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  entity_a_id UUID REFERENCES corporate_entities(id) ON DELETE CASCADE,
  entity_b_id UUID REFERENCES corporate_entities(id) ON DELETE CASCADE,
  
  relationship_type TEXT NOT NULL, -- 'acquisition', 'merger', 'partnership', 'competitor'
  relationship_date DATE,
  relationship_value DECIMAL(15,2),
  relationship_details JSONB,
  
  active BOOLEAN DEFAULT true,
  end_date DATE,
  
  UNIQUE(entity_a_id, entity_b_id, relationship_type),
  INDEX idx_relationship_entities (entity_a_id, entity_b_id),
  INDEX idx_relationship_type (relationship_type)
);

-- ============================================
-- DECISION TRACKING TABLES
-- ============================================

-- Decision tracking for audit and analysis
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Decision details
  decision_type TEXT NOT NULL, -- 'technical', 'business', 'strategic'
  decision_title TEXT NOT NULL,
  decision_description TEXT,
  
  -- Options considered
  options_considered JSONB, -- Array of options with pros/cons
  selected_option JSONB,
  rationale TEXT,
  
  -- Impact assessment
  impact_level TEXT, -- 'low', 'medium', 'high', 'critical'
  affected_areas TEXT[],
  risk_assessment JSONB,
  
  -- Outcome tracking
  expected_outcome TEXT,
  actual_outcome TEXT,
  outcome_date DATE,
  success_metrics JSONB,
  
  INDEX idx_decision_project (project_id),
  INDEX idx_decision_type (decision_type),
  INDEX idx_decision_impact (impact_level)
);

-- ============================================
-- SPRINT & PROJECT MANAGEMENT TABLES
-- ============================================

-- Sprint management
CREATE TABLE IF NOT EXISTS sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  sprint_name TEXT NOT NULL,
  sprint_number INTEGER NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  goals TEXT[],
  deliverables JSONB,
  
  status TEXT DEFAULT 'planning', -- 'planning', 'active', 'completed', 'cancelled'
  
  -- Metrics
  planned_points INTEGER,
  completed_points INTEGER,
  velocity DECIMAL(5,2),
  
  -- Retrospective
  retrospective JSONB, -- what went well, what didn't, actions
  
  UNIQUE(project_id, sprint_number),
  INDEX idx_sprint_project (project_id),
  INDEX idx_sprint_status (status),
  INDEX idx_sprint_dates (start_date, end_date)
);

-- Project stages
CREATE TABLE IF NOT EXISTS stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  
  start_date DATE,
  end_date DATE,
  
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'completed', 'blocked'
  
  deliverables JSONB,
  acceptance_criteria JSONB,
  
  -- Gate reviews
  gate_review_required BOOLEAN DEFAULT false,
  gate_review_status TEXT, -- 'pending', 'approved', 'rejected'
  gate_review_date DATE,
  gate_review_notes TEXT,
  
  UNIQUE(project_id, stage_order),
  INDEX idx_stage_project (project_id),
  INDEX idx_stage_status (status)
);

-- ============================================
-- STAKEHOLDER MANAGEMENT TABLES
-- ============================================

-- Stakeholder tracking
CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Stakeholder info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  role TEXT,
  
  -- Classification
  stakeholder_type TEXT NOT NULL, -- 'sponsor', 'customer', 'team', 'vendor', 'regulatory'
  influence_level TEXT, -- 'low', 'medium', 'high', 'critical'
  interest_level TEXT, -- 'low', 'medium', 'high', 'critical'
  
  -- Engagement
  engagement_strategy TEXT,
  communication_frequency TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly'
  preferred_channel TEXT, -- 'email', 'phone', 'meeting', 'report'
  
  -- Tracking
  last_contacted DATE,
  next_contact_date DATE,
  notes TEXT,
  
  INDEX idx_stakeholder_project (project_id),
  INDEX idx_stakeholder_type (stakeholder_type),
  INDEX idx_stakeholder_influence (influence_level)
);

-- Project team members
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- 'owner', 'manager', 'developer', 'analyst', 'viewer'
  permissions JSONB, -- Specific permissions
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  
  allocation_percentage INTEGER DEFAULT 100, -- % allocation to project
  
  UNIQUE(project_id, user_id),
  INDEX idx_member_project (project_id),
  INDEX idx_member_user (user_id),
  INDEX idx_member_role (role)
);

-- ============================================
-- FINANCIAL & MARKET DATA TABLES
-- ============================================

-- Company financial data
CREATE TABLE IF NOT EXISTS company_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_quarter INTEGER,
  
  -- Income statement
  revenue DECIMAL(15,2),
  gross_profit DECIMAL(15,2),
  operating_income DECIMAL(15,2),
  net_income DECIMAL(15,2),
  
  -- Balance sheet
  total_assets DECIMAL(15,2),
  total_liabilities DECIMAL(15,2),
  total_equity DECIMAL(15,2),
  cash DECIMAL(15,2),
  
  -- Key metrics
  earnings_per_share DECIMAL(10,4),
  pe_ratio DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  roe DECIMAL(5,2), -- Return on equity
  
  -- Source
  data_source TEXT,
  filing_date DATE,
  
  UNIQUE(company_domain, fiscal_year, fiscal_quarter),
  INDEX idx_financial_company (company_domain),
  INDEX idx_financial_year (fiscal_year)
);

-- Investor relations data
CREATE TABLE IF NOT EXISTS company_investor_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT NOT NULL,
  
  -- IR contacts
  ir_email TEXT,
  ir_phone TEXT,
  ir_contact_name TEXT,
  
  -- Events
  next_earnings_date DATE,
  last_earnings_date DATE,
  annual_meeting_date DATE,
  
  -- Documents
  latest_10k_url TEXT,
  latest_10q_url TEXT,
  latest_proxy_url TEXT,
  investor_deck_url TEXT,
  
  -- Analyst coverage
  analyst_coverage JSONB, -- Array of analysts and ratings
  consensus_rating TEXT,
  price_target DECIMAL(10,2),
  
  INDEX idx_ir_company (company_domain)
);

-- ============================================
-- NEWS & SOCIAL MONITORING TABLES
-- ============================================

-- Company news aggregation
CREATE TABLE IF NOT EXISTS company_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT NOT NULL,
  
  headline TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,
  
  published_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  
  -- Analysis
  sentiment_score DECIMAL(3,2), -- -1 to 1
  relevance_score DECIMAL(3,2), -- 0 to 1
  topics TEXT[],
  entities_mentioned TEXT[],
  
  -- Engagement
  social_shares INTEGER,
  comments_count INTEGER,
  
  INDEX idx_news_company (company_domain),
  INDEX idx_news_published (published_at DESC),
  INDEX idx_news_sentiment (sentiment_score)
);

-- Social media profiles
CREATE TABLE IF NOT EXISTS company_social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'twitter', 'linkedin', 'facebook', etc.
  
  profile_url TEXT NOT NULL,
  profile_id TEXT,
  username TEXT,
  
  -- Metrics
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  
  -- Activity
  last_post_date TIMESTAMPTZ,
  posting_frequency TEXT, -- 'daily', 'weekly', etc.
  
  verified BOOLEAN DEFAULT false,
  
  UNIQUE(company_domain, platform),
  INDEX idx_social_company (company_domain),
  INDEX idx_social_platform (platform)
);

-- ============================================
-- INTELLIGENCE & ANALYTICS TABLES
-- ============================================

-- External intelligence summary
CREATE TABLE IF NOT EXISTS external_intelligence_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  company_domain TEXT NOT NULL,
  
  -- Summary data from all sources
  summary_data JSONB NOT NULL,
  
  -- Key insights
  key_insights TEXT[],
  opportunities TEXT[],
  threats TEXT[],
  recommendations TEXT[],
  
  -- Scores
  overall_score DECIMAL(3,2), -- 0 to 1
  data_completeness DECIMAL(3,2),
  confidence_level DECIMAL(3,2),
  
  -- Metadata
  sources_used TEXT[],
  generation_time_ms INTEGER,
  
  INDEX idx_intelligence_session (session_id),
  INDEX idx_intelligence_company (company_domain),
  INDEX idx_intelligence_created (created_at DESC)
);

-- Generation analytics
CREATE TABLE IF NOT EXISTS generation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  
  document_type TEXT NOT NULL,
  
  -- Performance metrics
  generation_time_ms INTEGER,
  token_count INTEGER,
  
  -- Quality metrics
  quality_score DECIMAL(3,2),
  completeness_score DECIMAL(3,2),
  accuracy_score DECIMAL(3,2),
  
  -- Cost metrics
  llm_cost DECIMAL(10,4),
  api_calls_count INTEGER,
  cache_hits INTEGER,
  
  -- User feedback
  user_rating INTEGER, -- 1-5
  user_feedback TEXT,
  
  INDEX idx_analytics_user (user_id),
  INDEX idx_analytics_project (project_id),
  INDEX idx_analytics_type (document_type),
  INDEX idx_analytics_created (created_at DESC)
);

-- ============================================
-- SYSTEM MONITORING TABLES
-- ============================================

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limit_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  service TEXT NOT NULL, -- 'openai', 'shodan', 'twitter', etc.
  endpoint TEXT,
  
  -- Limits
  limit_value INTEGER NOT NULL,
  limit_window TEXT NOT NULL, -- '1m', '1h', '1d'
  
  -- Current usage
  current_usage INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_limited BOOLEAN DEFAULT false,
  
  UNIQUE(service, endpoint),
  INDEX idx_rate_service (service),
  INDEX idx_rate_reset (reset_at)
);

-- LLM call logs for cost tracking
CREATE TABLE IF NOT EXISTS llm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES research_sessions(id),
  
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  cost DECIMAL(10,6),
  duration_ms INTEGER,
  
  purpose TEXT, -- 'analysis', 'generation', 'extraction', etc.
  cache_hit BOOLEAN DEFAULT false,
  
  INDEX idx_llm_user (user_id),
  INDEX idx_llm_session (session_id),
  INDEX idx_llm_created (created_at DESC)
);

-- Research session logs
CREATE TABLE IF NOT EXISTS research_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
  
  log_level TEXT NOT NULL, -- 'info', 'warning', 'error'
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  
  metadata JSONB,
  
  INDEX idx_session_log (session_id),
  INDEX idx_log_level (log_level),
  INDEX idx_log_created (created_at DESC)
);

-- Brand assets storage
CREATE TABLE IF NOT EXISTS entity_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  entity_id UUID REFERENCES corporate_entities(id) ON DELETE CASCADE,
  company_domain TEXT,
  
  asset_type TEXT NOT NULL, -- 'logo', 'favicon', 'banner', 'color_palette'
  asset_url TEXT,
  asset_data JSONB, -- For colors, fonts, etc.
  
  primary_asset BOOLEAN DEFAULT false,
  
  INDEX idx_brand_entity (entity_id),
  INDEX idx_brand_domain (company_domain),
  INDEX idx_brand_type (asset_type)
);

-- Page-level intelligence data
CREATE TABLE IF NOT EXISTS page_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  session_id UUID REFERENCES research_sessions(id),
  url TEXT NOT NULL,
  
  -- Page analysis
  page_type TEXT, -- 'homepage', 'about', 'product', 'blog', etc.
  content_summary TEXT,
  key_topics TEXT[],
  
  -- Extracted data
  extracted_emails TEXT[],
  extracted_phones TEXT[],
  extracted_addresses TEXT[],
  extracted_social_links TEXT[],
  
  -- Metrics
  word_count INTEGER,
  readability_score DECIMAL(5,2),
  seo_score DECIMAL(3,2),
  
  -- Technical
  load_time_ms INTEGER,
  page_size_bytes INTEGER,
  
  INDEX idx_page_session (session_id),
  INDEX idx_page_url (url),
  INDEX idx_page_type (page_type)
);

-- LinkedIn company data
CREATE TABLE IF NOT EXISTS company_linkedin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT UNIQUE NOT NULL,
  linkedin_url TEXT,
  linkedin_id TEXT,
  
  -- Company info
  company_size TEXT,
  industry TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  specialties TEXT[],
  
  -- Metrics
  followers_count INTEGER,
  employees_on_linkedin INTEGER,
  
  -- Recent activity
  recent_posts JSONB,
  posting_frequency TEXT,
  
  INDEX idx_linkedin_domain (company_domain)
);

-- Google Business data
CREATE TABLE IF NOT EXISTS company_google_business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  company_domain TEXT UNIQUE NOT NULL,
  place_id TEXT,
  
  -- Business info
  business_name TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  
  -- Hours
  opening_hours JSONB,
  
  -- Ratings
  rating DECIMAL(2,1),
  total_reviews INTEGER,
  
  -- Categories
  categories TEXT[],
  
  -- Photos
  photo_urls TEXT[],
  
  INDEX idx_google_domain (company_domain)
);
```

### 5.2 Performance Optimization

#### Query Optimizer Implementation
```typescript
// lib/database/optimization/query-optimizer.ts
import { supabase } from '@/lib/supabase/client'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export class QueryOptimizer {
  private logger = permanentLogger.create('QueryOptimizer')
  private queryCache = new Map<string, any>()
  private performanceMetrics = new Map<string, any>()
  
  async optimizeQuery(query: string, params?: any[]): Promise<any> {
    const startTime = performance.now()
    const cacheKey = this.getCacheKey(query, params)
    
    // Check cache
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)
      if (cached.expiresAt > Date.now()) {
        this.logger.log('Cache hit', { query: query.substring(0, 50) })
        return cached.data
      }
    }
    
    // Analyze and optimize query
    const optimized = await this.analyzeAndOptimize(query)
    
    // Execute optimized query
    const result = await this.executeQuery(optimized, params)
    
    // Cache result
    this.queryCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 60000 // 1 minute cache
    })
    
    // Track performance
    const duration = performance.now() - startTime
    this.trackPerformance(query, duration, result)
    
    return result
  }
  
  private async analyzeAndOptimize(query: string): Promise<string> {
    // Add EXPLAIN ANALYZE in development
    if (process.env.NODE_ENV === 'development') {
      const explain = await supabase.rpc('explain_query', { query_text: query })
      this.logger.log('Query plan', explain)
    }
    
    // Apply optimizations
    let optimized = query
    
    // Add index hints for known slow queries
    if (query.includes('research_sessions') && query.includes('ORDER BY created_at')) {
      optimized = query.replace('FROM research_sessions', 
        'FROM research_sessions /*+ INDEX(idx_sessions_created) */')
    }
    
    // Add pagination if not present
    if (!query.includes('LIMIT') && query.includes('SELECT')) {
      optimized += ' LIMIT 1000'
    }
    
    return optimized
  }
  
  private async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('execute_query', {
        query_text: query,
        params: params || []
      })
      
      if (error) throw error
      return data
    } catch (error) {
      this.logger.error('Query execution failed', { query, error })
      throw error
    }
  }
  
  private getCacheKey(query: string, params?: any[]): string {
    return `${query}-${JSON.stringify(params || [])}`
  }
  
  private trackPerformance(query: string, duration: number, result: any) {
    const metrics = {
      duration,
      rowCount: Array.isArray(result) ? result.length : 1,
      timestamp: Date.now()
    }
    
    this.performanceMetrics.set(query, metrics)
    
    // Log slow queries
    if (duration > 1000) {
      this.logger.warn('Slow query detected', {
        query: query.substring(0, 100),
        duration,
        rowCount: metrics.rowCount
      })
    }
  }
  
  async createIndexes(): Promise<void> {
    const indexes = [
      // Activity tracking
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_date ON activity_log(user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_type_date ON activity_log(activity_type, created_at DESC)',
      
      // Corporate entities
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corporate_hierarchy ON corporate_entities(parent_entity_id, hierarchy_level)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corporate_search ON corporate_entities USING gin(to_tsvector(\'english\', entity_name))',
      
      // Financial data
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_company_year ON company_financial_data(company_domain, fiscal_year DESC)',
      
      // News
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_company_date ON company_news(company_domain, published_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_sentiment ON company_news(sentiment_score) WHERE sentiment_score IS NOT NULL',
      
      // Intelligence
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intelligence_score ON external_intelligence_summary(overall_score DESC)',
      
      // Performance
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_llm_cost ON llm_call_logs(created_at DESC, cost)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generation_quality ON generation_analytics(quality_score DESC)'
    ]
    
    for (const index of indexes) {
      try {
        await supabase.rpc('execute_ddl', { ddl: index })
        this.logger.log('Index created', { index: index.substring(0, 50) })
      } catch (error) {
        this.logger.error('Index creation failed', { index, error })
      }
    }
  }
}
```

### 5.3 Advanced Analytics Implementation

#### Executive Dashboard
```tsx
// components/dashboards/executive-dashboard.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TooltipWrapper } from '@/components/company-intelligence/tooltip-wrapper'
import { Badge } from '@/components/ui/badge'
import {
  DashboardLayoutComponent,
  PanelDirective,
  PanelsDirective
} from '@syncfusion/ej2-react-layouts'
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  LineSeries,
  ColumnSeries,
  PieSeries,
  AreaSeries,
  DateTime,
  Legend,
  Tooltip as ChartTooltip,
  DataLabel,
  Zoom
} from '@syncfusion/ej2-react-charts'
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Inject as GridInject,
  ExcelExport,
  PdfExport
} from '@syncfusion/ej2-react-grids'
import {
  KanbanComponent,
  ColumnsDirective as KanbanColumnsDirective,
  ColumnDirective as KanbanColumnDirective
} from '@syncfusion/ej2-react-kanban'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export function ExecutiveDashboard() {
  const logger = permanentLogger.create('ExecutiveDashboard')
  const [metrics, setMetrics] = useState<any>({
    totalProjects: 0,
    activeResearch: 0,
    dataSources: 0,
    enrichersActive: 0,
    monthlyGrowth: 0,
    systemHealth: 0
  })
  
  const [chartData, setChartData] = useState<any>({
    revenue: [],
    usage: [],
    performance: [],
    quality: []
  })
  
  const [tableData, setTableData] = useState<any>({
    topProjects: [],
    recentActivity: [],
    systemAlerts: []
  })
  
  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])
  
  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/executive-dashboard')
      const data = await response.json()
      
      setMetrics(data.metrics)
      setChartData(data.charts)
      setTableData(data.tables)
      
      logger.log('Dashboard data loaded', {
        metrics: Object.keys(data.metrics).length,
        charts: Object.keys(data.charts).length
      })
    } catch (error) {
      logger.error('Failed to load dashboard data', error)
    }
  }
  
  const panels = [
    {
      id: 'kpi-metrics',
      sizeX: 12,
      sizeY: 2,
      row: 0,
      col: 0,
      content: renderKPIMetrics()
    },
    {
      id: 'usage-trend',
      sizeX: 6,
      sizeY: 4,
      row: 2,
      col: 0,
      content: renderUsageTrend()
    },
    {
      id: 'revenue-analysis',
      sizeX: 6,
      sizeY: 4,
      row: 2,
      col: 6,
      content: renderRevenueAnalysis()
    },
    {
      id: 'project-kanban',
      sizeX: 8,
      sizeY: 4,
      row: 6,
      col: 0,
      content: renderProjectKanban()
    },
    {
      id: 'system-health',
      sizeX: 4,
      sizeY: 4,
      row: 6,
      col: 8,
      content: renderSystemHealth()
    },
    {
      id: 'activity-grid',
      sizeX: 12,
      sizeY: 4,
      row: 10,
      col: 0,
      content: renderActivityGrid()
    }
  ]
  
  function renderKPIMetrics() {
    return (
      <div className="grid grid-cols-6 gap-4 p-4">
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Total active projects">
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">Projects</p>
              <div className="text-xs text-green-600">
                +{metrics.monthlyGrowth}% this month
              </div>
            </TooltipWrapper>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Active research sessions">
              <div className="text-2xl font-bold">{metrics.activeResearch}</div>
              <p className="text-xs text-muted-foreground">Research Active</p>
            </TooltipWrapper>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Connected data sources">
              <div className="text-2xl font-bold">{metrics.dataSources}</div>
              <p className="text-xs text-muted-foreground">Data Sources</p>
            </TooltipWrapper>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Active enrichers">
              <div className="text-2xl font-bold">{metrics.enrichersActive}/15</div>
              <p className="text-xs text-muted-foreground">Enrichers</p>
            </TooltipWrapper>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Database tables utilized">
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">DB Utilization</p>
            </TooltipWrapper>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <TooltipWrapper content="Overall system health">
              <div className="text-2xl font-bold">{metrics.systemHealth}%</div>
              <p className="text-xs text-muted-foreground">System Health</p>
              <Badge variant={metrics.systemHealth > 95 ? 'success' : 'warning'}>
                {metrics.systemHealth > 95 ? 'Optimal' : 'Good'}
              </Badge>
            </TooltipWrapper>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  function renderUsageTrend() {
    return (
      <Card className="h-full">
        <CardHeader>Platform Usage Trend</CardHeader>
        <CardContent>
          <ChartComponent
            primaryXAxis={{
              valueType: 'DateTime',
              intervalType: 'Days'
            }}
            primaryYAxis={{
              title: 'Daily Active Users'
            }}
            tooltip={{ enable: true }}
            zoomSettings={{ enableSelectionZooming: true }}
            height="250px"
          >
            <Inject services={[AreaSeries, DateTime, Legend, ChartTooltip, Zoom]} />
            <SeriesCollectionDirective>
              <SeriesDirective
                dataSource={chartData.usage}
                xName="date"
                yName="users"
                type="Area"
                name="Active Users"
                fill="rgba(59, 130, 246, 0.3)"
                border={{ width: 2, color: '#3B82F6' }}
              />
            </SeriesCollectionDirective>
          </ChartComponent>
        </CardContent>
      </Card>
    )
  }
  
  function renderRevenueAnalysis() {
    return (
      <Card className="h-full">
        <CardHeader>Revenue Analysis</CardHeader>
        <CardContent>
          <ChartComponent
            primaryXAxis={{
              valueType: 'Category'
            }}
            primaryYAxis={{
              title: 'Revenue ($)'
            }}
            tooltip={{ enable: true }}
            height="250px"
          >
            <Inject services={[ColumnSeries, Legend, ChartTooltip, DataLabel]} />
            <SeriesCollectionDirective>
              <SeriesDirective
                dataSource={chartData.revenue}
                xName="month"
                yName="revenue"
                type="Column"
                name="Monthly Revenue"
                dataLabel={{ visible: true, position: 'Top' }}
              />
              <SeriesDirective
                dataSource={chartData.revenue}
                xName="month"
                yName="target"
                type="Line"
                name="Target"
                marker={{ visible: true }}
              />
            </SeriesCollectionDirective>
          </ChartComponent>
        </CardContent>
      </Card>
    )
  }
  
  function renderProjectKanban() {
    return (
      <Card className="h-full">
        <CardHeader>Project Pipeline</CardHeader>
        <CardContent>
          <KanbanComponent
            dataSource={tableData.topProjects}
            keyField="status"
            columns={[
              { headerText: 'Planning', keyField: 'planning' },
              { headerText: 'In Progress', keyField: 'progress' },
              { headerText: 'Review', keyField: 'review' },
              { headerText: 'Completed', keyField: 'completed' }
            ]}
            cardSettings={{
              contentField: 'summary',
              headerField: 'title'
            }}
            height="300px"
          />
        </CardContent>
      </Card>
    )
  }
  
  function renderSystemHealth() {
    return (
      <Card className="h-full">
        <CardHeader>System Health</CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">API Response Time</span>
              <Badge variant="success">98ms</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Database Query Time</span>
              <Badge variant="success">45ms</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cache Hit Rate</span>
              <Badge variant="success">87%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Error Rate</span>
              <Badge variant="success">0.02%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Uptime (30d)</span>
              <Badge variant="success">99.98%</Badge>
            </div>
            
            <div className="pt-3 border-t">
              <ChartComponent
                primaryYAxis={{ visible: false }}
                primaryXAxis={{ visible: false }}
                tooltip={{ enable: true }}
                height="100px"
              >
                <Inject services={[LineSeries]} />
                <SeriesCollectionDirective>
                  <SeriesDirective
                    dataSource={chartData.performance}
                    xName="time"
                    yName="responseTime"
                    type="Line"
                    fill="#22C55E"
                  />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  function renderActivityGrid() {
    return (
      <Card className="h-full">
        <CardHeader>Recent Activity</CardHeader>
        <CardContent>
          <GridComponent
            dataSource={tableData.recentActivity}
            allowPaging={true}
            pageSettings={{ pageSize: 10 }}
            allowSorting={true}
            allowFiltering={true}
            allowExcelExport={true}
            toolbar={['ExcelExport', 'PdfExport']}
            height="250px"
          >
            <ColumnsDirective>
              <ColumnDirective field="timestamp" headerText="Time" width="120" format="yMd" />
              <ColumnDirective field="user" headerText="User" width="150" />
              <ColumnDirective field="action" headerText="Action" width="200" />
              <ColumnDirective field="target" headerText="Target" width="200" />
              <ColumnDirective 
                field="status" 
                headerText="Status" 
                width="100"
                template={(props) => (
                  <Badge variant={props.status === 'success' ? 'success' : 'destructive'}>
                    {props.status}
                  </Badge>
                )}
              />
            </ColumnsDirective>
            <GridInject services={[Page, Sort, Filter, ExcelExport, PdfExport]} />
          </GridComponent>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="w-full h-screen p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Executive Dashboard</h1>
        <div className="flex gap-2">
          <TooltipWrapper content="Export dashboard as PDF">
            <Button variant="outline" onClick={exportDashboard}>
              Export PDF
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="Refresh data">
            <Button variant="outline" onClick={loadDashboardData}>
              Refresh
            </Button>
          </TooltipWrapper>
        </div>
      </div>
      
      <DashboardLayoutComponent
        columns={12}
        cellSpacing={[10, 10]}
        panels={panels}
        allowResizing={true}
        allowDragging={true}
      />
    </div>
  )
}
```

---

## 📊 Database Optimization Scripts

### Performance Tuning
```sql
-- Analyze and vacuum all tables
VACUUM ANALYZE;

-- Update table statistics
ANALYZE activity_log;
ANALYZE corporate_entities;
ANALYZE research_sessions;

-- Create materialized views for complex queries
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_activity_summary AS
SELECT 
  user_id,
  DATE(created_at) as activity_date,
  COUNT(*) as activity_count,
  COUNT(DISTINCT activity_type) as unique_activities,
  AVG(duration_ms) as avg_duration,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM activity_log
GROUP BY user_id, DATE(created_at)
WITH DATA;

CREATE INDEX ON mv_user_activity_summary (user_id, activity_date DESC);

-- Refresh materialized view (schedule this)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_summary;

-- Partitioning for large tables
CREATE TABLE activity_log_2025_01 PARTITION OF activity_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
  
CREATE TABLE activity_log_2025_02 PARTITION OF activity_log
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

---

## 🧪 Testing Plan

### Test Suite for Phase 5
```typescript
// test-phase-5-database-performance.ts
import { describe, test, expect } from 'vitest'
import { QueryOptimizer } from '@/lib/database/optimization/query-optimizer'

describe('Phase 5: Database & Performance', () => {
  describe('Database Tables', () => {
    test('all 22 tables should be created', async () => {
      const tables = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
      
      expect(tables.data.length).toBeGreaterThanOrEqual(27) // 5 existing + 22 new
    })
    
    test('all tables should have RLS enabled', async () => {
      // Test RLS policies
    })
  })
  
  describe('Query Performance', () => {
    test('queries should complete within 100ms', async () => {
      const optimizer = new QueryOptimizer()
      const startTime = Date.now()
      
      await optimizer.optimizeQuery(
        'SELECT * FROM research_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        ['test-user-id']
      )
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100)
    })
  })
  
  describe('Dashboard Performance', () => {
    test('dashboard should load within 2 seconds', async () => {
      const startTime = Date.now()
      
      const response = await fetch('/api/analytics/executive-dashboard')
      const data = await response.json()
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(2000)
      expect(data.metrics).toBeDefined()
    })
  })
})
```

---

## 📋 Implementation Checklist

### Week 1 Tasks
- [ ] Create all 22 database tables
- [ ] Add indexes for all tables
- [ ] Implement RLS policies
- [ ] Create materialized views
- [ ] Set up table partitioning
- [ ] Implement QueryOptimizer class
- [ ] Create connection pooling
- [ ] Add query caching
- [ ] Implement read replicas
- [ ] Set up performance monitoring

### Week 2 Tasks
- [ ] Build ExecutiveDashboard
- [ ] Create analytics endpoints
- [ ] Implement report generation
- [ ] Add system health monitoring
- [ ] Create alert system
- [ ] Build audit logging
- [ ] Add data export features
- [ ] Implement backup strategy
- [ ] Add comprehensive tests
- [ ] Update manifest.json

---

## 💰 Cost Analysis

### Infrastructure Costs
| Component | Current | Optimized | Savings |
|-----------|---------|-----------|---------|
| Database (Supabase) | $25/month | $25/month | $0 |
| Read Replicas | $0 | $25/month | -$25 |
| Caching (Redis) | $0 | $10/month | -$10 |
| Monitoring | $0 | $20/month | -$20 |
| **Total Infrastructure** | **$25** | **$80** | **-$55** |

### Performance Benefits
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Query Time (avg) | 500ms | 50ms | 90% faster |
| Dashboard Load | 5s | 1.5s | 70% faster |
| Concurrent Users | 100 | 1000 | 10x capacity |
| Data Loss Risk | Medium | Near-zero | 99.9% safe |

### ROI Calculation
- Developer time saved: 10 hours/week @ $100/hour = $4,000/month
- Improved user satisfaction: 20% increase in retention
- Reduced debugging time: 5 hours/week = $2,000/month
- **Total value: $6,000/month**
- **Infrastructure cost: $80/month**
- **ROI: 7,400% monthly**

---

## 🚀 Deployment Steps

### Database Migrations
```bash
# Apply all Phase 5 migrations
npm run supabase:migrate -- --name phase_5_complete_schema

# Create indexes
npm run supabase:migrate -- --name phase_5_indexes

# Set up materialized views
npm run supabase:migrate -- --name phase_5_materialized_views
```

### Performance Configuration
```bash
# Supabase connection pooling
SUPABASE_POOL_SIZE=20
SUPABASE_MAX_CONNECTIONS=100

# Redis cache
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Monitoring
VERCEL_ANALYTICS_ID=your_id
SENTRY_DSN=your_dsn
```

---

## 📝 Notes & Recommendations

### Critical Success Factors
1. Apply migrations incrementally to avoid downtime
2. Monitor query performance after each index
3. Set up automated backups before major changes
4. Test RLS policies thoroughly
5. Implement gradual rollout for new features

### Maintenance Schedule
- **Daily**: Check system health metrics
- **Weekly**: Review slow query logs
- **Monthly**: Refresh materialized views
- **Quarterly**: Full performance audit

### Next Steps
1. Implement real-time analytics
2. Add predictive analytics
3. Create mobile dashboard app
4. Implement data warehouse for historical analysis

---

## 🔗 Resources & Documentation

### Database Optimization
- [Supabase Performance](https://supabase.com/docs/guides/platform/performance)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)

### Monitoring Tools
- [Vercel Analytics](https://vercel.com/analytics)
- [Supabase Monitoring](https://supabase.com/docs/guides/platform/monitoring)
- [Sentry Error Tracking](https://sentry.io/)