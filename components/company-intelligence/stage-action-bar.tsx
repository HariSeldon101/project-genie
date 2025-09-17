'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, X } from 'lucide-react'

interface StageActionBarProps {
  stage: string
  onApprove: () => void
  onReject?: () => void
  isProcessing?: boolean
  showReject?: boolean
}

export function StageActionBar({
  stage,
  onApprove,
  onReject,
  isProcessing = false,
  showReject = true
}: StageActionBarProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex gap-3 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
      {showReject && onReject && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isProcessing}
        >
          <X className="mr-1 h-4 w-4" />
          Reject
        </Button>
      )}
      <Button
        variant="default"
        size="sm"
        onClick={onApprove}
        disabled={isProcessing}
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle2 className="mr-1 h-4 w-4" />
        Approve & Continue
      </Button>
    </div>
  )
}