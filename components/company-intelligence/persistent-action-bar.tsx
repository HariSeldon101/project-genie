'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Check, ChevronLeft, AlertCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TooltipWrapper } from './tooltip-wrapper'

interface PersistentActionBarProps {
  currentStage: string
  stageLabel: string
  onApprove: () => void
  onReject: () => void
  onGoBack: () => void
  isProcessing?: boolean
  approveText?: string
  additionalInfo?: string // For sitemap phase to show "with X pages"
  approveDisabled?: boolean // Allow disabling approve button independently
}

export function PersistentActionBar({
  currentStage,
  stageLabel,
  onApprove,
  onReject,
  onGoBack,
  isProcessing = false,
  approveText,
  additionalInfo,
  approveDisabled = false
}: PersistentActionBarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  const handleReject = () => {
    setShowRejectDialog(true)
  }

  const handleRejectConfirm = (action: 'back' | 'abort') => {
    setShowRejectDialog(false)
    if (action === 'back') {
      onGoBack()
    } else {
      onReject()
    }
  }

  // Generate dynamic approve button text
  const getApproveText = () => {
    if (approveText) return approveText
    
    const baseText = `Approve ${stageLabel}`
    if (additionalInfo) {
      return `${baseText} ${additionalInfo}`
    }
    return baseText
  }

  return (
    <>
      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-4">
            {/* Reject Button */}
            <TooltipWrapper content="Reject current stage and choose next action">
              <Button
                variant="outline"
                size="lg"
                onClick={handleReject}
                disabled={isProcessing}
                className="min-w-[140px] h-12 text-base font-medium border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
            </TooltipWrapper>

            {/* Approve Button */}
            <TooltipWrapper content={
              approveDisabled || isProcessing 
                ? `Please wait for ${stageLabel.toLowerCase()} to complete`
                : `Confirm and proceed with ${stageLabel.toLowerCase()}`
            }>
              <Button
                variant="default"
                size="lg"
                onClick={onApprove}
                disabled={isProcessing || approveDisabled}
                className="min-w-[200px] h-12 text-base font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5 mr-2" />
                {getApproveText()}
              </Button>
            </TooltipWrapper>
          </div>
        </div>
      </div>

      {/* Reject Action Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Choose Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              What would you like to do after rejecting {stageLabel}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => {
                setShowRejectDialog(false)
                handleRejectConfirm('back')
              }}
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Return to Previous Phase
            </Button>
            <Button
              onClick={() => {
                setShowRejectDialog(false)
                handleRejectConfirm('abort')
              }}
              variant="destructive"
              className="w-full justify-start"
            >
              <X className="w-4 h-4 mr-2" />
              Abort Process Entirely
            </Button>
            <AlertDialogCancel className="w-full mt-2">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}