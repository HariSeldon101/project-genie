'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Star, Calendar, User, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'

interface BugDetailModalProps {
  bug: any
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
  isAdmin?: boolean
}

export function BugDetailModal({ bug, isOpen, onClose, onUpdate, isAdmin = false }: BugDetailModalProps) {
  const [status, setStatus] = useState(bug?.status || 'open')
  const [resolutionNotes, setResolutionNotes] = useState(bug?.resolution_notes || '')
  const [userConfirmed, setUserConfirmed] = useState(bug?.confirmed_by_user || false)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleUpdate = async () => {
    setError('')
    setUpdating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to update')
        return
      }

      const updates: any = {
        status,
        resolution_notes: resolutionNotes,
        confirmed_by_user: userConfirmed
      }

      if (status === 'resolved' && !bug.resolved_at) {
        updates.resolved_by = user.id
        updates.resolved_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('bug_reports')
        .update(updates)
        .eq('id', bug.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        onUpdate?.()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update bug report')
    } finally {
      setUpdating(false)
    }
  }

  if (!bug) return null

  const getSeverityStars = (severity: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= severity
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm">
          {severity === 1 && 'Minor'}
          {severity === 2 && 'Low'}
          {severity === 3 && 'Medium'}
          {severity === 4 && 'High'}
          {severity === 5 && 'Critical'}
        </span>
      </div>
    )
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'destructive'
      case 'investigating':
        return 'outline'
      case 'resolved':
        return 'secondary'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{bug.title}</DialogTitle>
          <DialogDescription>
            Bug Report #{bug.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Severity */}
          <div className="flex items-center justify-between">
            <Badge variant={getStatusBadgeVariant(bug.status) as any}>
              {bug.status}
            </Badge>
            {getSeverityStars(bug.severity)}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span>Reported by: {bug.user?.email || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Created: {format(new Date(bug.created_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            {bug.project && (
              <div className="col-span-2">
                Project: <Badge variant="outline">{bug.project.name}</Badge>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-base font-semibold">Description</Label>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="whitespace-pre-wrap">{bug.description}</p>
            </div>
          </div>

          {/* Screenshots */}
          {(bug.screenshot_url || bug.screenshot2_url) && (
            <div>
              <Label className="text-base font-semibold">Screenshots</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {bug.screenshot_url && (
                  <a href={bug.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-xs text-center mt-2">Screenshot 1</p>
                    </div>
                  </a>
                )}
                {bug.screenshot2_url && (
                  <a href={bug.screenshot2_url} target="_blank" rel="noopener noreferrer">
                    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-xs text-center mt-2">Screenshot 2</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Resolution Section */}
          {(isAdmin || bug.user_id === bug.current_user_id) && (
            <>
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Update Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={updating}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resolution">Resolution Notes</Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about the resolution..."
                  rows={4}
                  disabled={updating}
                  className="mt-2"
                />
              </div>

              {bug.user_id === bug.current_user_id && status === 'resolved' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmed"
                    checked={userConfirmed}
                    onCheckedChange={(checked) => setUserConfirmed(checked as boolean)}
                    disabled={updating}
                  />
                  <label
                    htmlFor="confirmed"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I confirm this issue has been resolved
                  </label>
                </div>
              )}
            </>
          )}

          {/* Resolution History */}
          {bug.resolved_at && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>
                  Resolved on {format(new Date(bug.resolved_at), 'MMM dd, yyyy HH:mm')}
                  {bug.resolved_by && ` by ${bug.resolved_by}`}
                </span>
              </div>
              {bug.resolution_notes && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm">{bug.resolution_notes}</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>Bug report updated successfully!</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {(isAdmin || bug.user_id === bug.current_user_id) && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={updating}>
                Close
              </Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating ? 'Updating...' : 'Update Report'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}