'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Filter,
  Sparkles,
  Star,
  Shield,
  Minimize2,
  ChevronDown,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { SELECTION_PRESETS, SelectionPreset } from './types'

interface SelectionToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onApplyPreset: (preset: SelectionPreset) => void
  onExport?: () => void
  onImport?: () => void
  onRefresh?: () => void
}

const presetIcons: Record<string, React.ReactNode> = {
  essential: <Star className="w-4 h-4" />,
  'high-quality': <Sparkles className="w-4 h-4" />,
  verified: <Shield className="w-4 h-4" />,
  minimal: <Minimize2 className="w-4 h-4" />
}

export function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onApplyPreset,
  onExport,
  onImport,
  onRefresh
}: SelectionToolbarProps) {
  const selectionPercent = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0

  return (
    <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        {/* Selection Status */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} / {totalCount}
          </Badge>
          <span className="text-sm text-gray-500">
            ({selectionPercent}% selected)
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onSelectAll}
            disabled={selectedCount === totalCount}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Select All
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onDeselectAll}
            disabled={selectedCount === 0}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Deselect All
          </Button>

          {/* Preset Selections */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Filter className="w-4 h-4 mr-1" />
                Quick Select
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Selection Presets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SELECTION_PRESETS.map(preset => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start gap-2 w-full">
                    {presetIcons[preset.id]}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{preset.name}</p>
                      <p className="text-xs text-gray-500">{preset.description}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}

        {onExport && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onExport}
            title="Export selection"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}

        {onImport && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onImport}
            title="Import selection"
          >
            <Upload className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}