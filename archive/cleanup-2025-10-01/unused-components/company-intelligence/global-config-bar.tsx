/**
 * Global Configuration Bar
 * Top bar with global settings that apply across all stages
 */

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Settings, 
  Brain,
  Globe,
  Shield,
  DollarSign,
  Zap,
  Monitor,
  Database,
  Activity,
  HelpCircle
} from 'lucide-react'
import { AllowedModel } from '@/lib/llm/services/model-selector'
import { SessionSelector } from './session-selector'
import { TooltipWrapper, QuickTooltip, IconTooltip } from './tooltip-wrapper'

interface GlobalConfig {
  model: AllowedModel
  environment: 'testing' | 'production'
  enableReviewGates: boolean
  enableWebSearch: boolean
  autoOptimize: boolean
  debugMode: boolean
  maxBudget: number
  scraperMode: 'auto' | 'static' | 'dynamic'
}

interface GlobalConfigBarProps {
  config: GlobalConfig
  onConfigChange: (config: Partial<GlobalConfig>) => void
  currentDomain?: string
  onSessionLoad?: (session: any) => void
  onSessionSave?: () => void
  sessionStatus?: {
    isActive: boolean
    sessionName?: string
    stage?: string
  }
  className?: string
}

export function GlobalConfigBar({
  config,
  onConfigChange,
  currentDomain,
  onSessionLoad,
  onSessionSave,
  sessionStatus,
  className
}: GlobalConfigBarProps) {
  const modelOptions = [
    { value: AllowedModel.GPT5_NANO, label: 'GPT-5 Nano (Default)', cost: '$', speed: '⚡⚡⚡' },
    { value: AllowedModel.GPT5_MINI, label: 'GPT-5 Mini', cost: '$$', speed: '⚡⚡' },
    { value: AllowedModel.GPT5, label: 'GPT-5', cost: '$$$', speed: '⚡' },
    { value: AllowedModel.GPT4_1_NANO, label: 'GPT-4.1 Nano (Structured)', cost: '$', speed: '⚡⚡⚡' },
    { value: AllowedModel.GPT4_1_MINI, label: 'GPT-4.1 Mini (Structured)', cost: '$$', speed: '⚡⚡' }
  ]

  const scraperModes = [
    { value: 'auto', label: 'Auto Detect', icon: <Zap className="w-3 h-3" /> },
    { value: 'static', label: 'Static (Fast)', icon: <Activity className="w-3 h-3" /> },
    { value: 'dynamic', label: 'Dynamic (JS)', icon: <Monitor className="w-3 h-3" /> }
  ]

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center gap-2 lg:gap-4 px-4 py-3 overflow-x-auto">
        {/* Session Management */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <TooltipWrapper content="Manage research sessions - save, load, and switch between different research sessions">
            <Database className="w-4 h-4 text-muted-foreground" />
          </TooltipWrapper>
          <SessionSelector
            currentDomain={currentDomain}
            onSessionLoad={onSessionLoad}
            onSessionSave={onSessionSave}
          />
          {sessionStatus?.isActive && (
            <Badge variant="outline" className="ml-2">
              {sessionStatus.stage || 'Active'}
            </Badge>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* AI Model Selection */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <TooltipWrapper content="Select AI model - GPT-5 models are default for general tasks, GPT-4.1 only for structured data">
            <Brain className="w-4 h-4 text-muted-foreground" />
          </TooltipWrapper>
          <Label htmlFor="model-select" className="text-sm">Model:</Label>
          <Select
            value={config.model}
            onValueChange={(value) => onConfigChange({ model: value as AllowedModel })}
          >
            <SelectTrigger id="model-select" className="w-[120px] md:w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{option.label}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <TooltipWrapper content={`Cost tier: ${option.cost} | Speed: ${option.speed}`}>
                        <span className="text-xs text-muted-foreground">{option.cost}</span>
                        <span className="text-xs">{option.speed}</span>
                      </TooltipWrapper>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Scraper Mode */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <TooltipWrapper content="Select scraping mode - Auto detects the best approach, Static for simple sites, Dynamic for JavaScript-heavy sites">
            <Monitor className="w-4 h-4 text-muted-foreground" />
          </TooltipWrapper>
          <Label htmlFor="scraper-select" className="text-sm">Scraper:</Label>
          <Select
            value={config.scraperMode}
            onValueChange={(value) => onConfigChange({ scraperMode: value as 'auto' | 'static' | 'dynamic' })}
          >
            <SelectTrigger id="scraper-select" className="w-[110px] md:w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scraperModes.map(mode => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <span>{mode.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Feature Toggles */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <TooltipWrapper content="Enable review gates to require manual approval at each stage before proceeding">
            <div className="flex items-center gap-2">
              <Switch
                id="review-gates"
                checked={config.enableReviewGates}
                onCheckedChange={(checked) => onConfigChange({ enableReviewGates: checked })}
              />
              <Label htmlFor="review-gates" className="text-sm cursor-pointer flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span className="truncate">Review Gates</span>
              </Label>
            </div>
          </TooltipWrapper>

          <TooltipWrapper content="Enable web search to gather real-time information from the internet during research">
            <div className="flex items-center gap-2">
              <Switch
                id="web-search"
                checked={config.enableWebSearch}
                onCheckedChange={(checked) => onConfigChange({ enableWebSearch: checked })}
              />
              <Label htmlFor="web-search" className="text-sm cursor-pointer flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span className="truncate">Web Search</span>
              </Label>
            </div>
          </TooltipWrapper>

          <TooltipWrapper content="Automatically optimize settings for best performance and cost efficiency">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-optimize"
                checked={config.autoOptimize}
                onCheckedChange={(checked) => onConfigChange({ autoOptimize: checked })}
              />
              <Label htmlFor="auto-optimize" className="text-sm cursor-pointer flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span className="truncate">Auto-Optimize</span>
              </Label>
            </div>
          </TooltipWrapper>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2 min-w-0">
          {/* Environment Badge */}
          <Badge 
            variant={config.environment === 'production' ? 'default' : 'secondary'}
            className="text-xs shrink-0"
          >
            {config.environment === 'production' ? 'PROD' : 'TEST'}
          </Badge>

          {/* Budget Indicator */}
          <TooltipWrapper content="Maximum budget per request in USD - helps control API costs">
            <Badge variant="outline" className="text-xs flex items-center gap-1 shrink-0">
              <DollarSign className="w-3 h-3" />
              <span className="truncate max-w-[3rem]">${config.maxBudget.toFixed(2)}</span>
            </Badge>
          </TooltipWrapper>

          {/* Debug Mode */}
          <TooltipWrapper content="Enable debug mode to see detailed logs and troubleshooting information">
            <div className="flex items-center gap-2">
              <Switch
                id="debug-mode"
                checked={config.debugMode}
                onCheckedChange={(checked) => onConfigChange({ debugMode: checked })}
              />
              <Label htmlFor="debug-mode" className="text-sm cursor-pointer">
                <span className="hidden sm:inline truncate">Debug</span>
              </Label>
            </div>
          </TooltipWrapper>

          {/* Settings Button */}
          <IconTooltip
            icon={<Settings className="w-4 h-4" />}
            tooltip="Open advanced settings panel for detailed configuration options"
            onClick={() => {
              // Open advanced settings
              const event = new CustomEvent('openAdvancedSettings')
              window.dispatchEvent(event)
            }}
            buttonClassName="h-8 w-8 p-0"
          />
        </div>
      </div>
    </Card>
  )
}