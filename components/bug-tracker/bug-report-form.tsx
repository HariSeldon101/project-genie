'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Star, Upload, X, AlertCircle, CheckCircle, Clipboard } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface BugReportFormProps {
  projectId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function BugReportForm({ projectId, onSuccess, onCancel }: BugReportFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (screenshots.length + imageFiles.length > 2) {
      setError('Maximum 2 screenshots allowed')
      return
    }
    
    setScreenshots([...screenshots, ...imageFiles.slice(0, 2 - screenshots.length)])
  }

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index))
  }

  // Handle paste event for clipboard screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          
          const blob = item.getAsFile()
          if (blob) {
            // Check if we can add more screenshots
            if (screenshots.length >= 2) {
              setError('Maximum 2 screenshots allowed')
              return
            }
            
            // Create a File object with a proper name
            const file = new File([blob], `screenshot-${Date.now()}.png`, {
              type: blob.type
            })
            
            setScreenshots(prev => [...prev, file])
            setError('')
          }
        }
      }
    }

    // Add paste event listener
    document.addEventListener('paste', handlePaste)
    
    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste)
    }
  }, [screenshots.length])

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('bug-screenshots')
      .upload(fileName, file)

    if (error) {
      console.error('Screenshot upload error:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('bug-screenshots')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to submit a bug report')
        return
      }

      // Upload screenshots if any
      let screenshotUrls: (string | null)[] = []
      if (screenshots.length > 0) {
        setUploading(true)
        screenshotUrls = await Promise.all(screenshots.map(uploadScreenshot))
        setUploading(false)
      }

      // Create bug report
      const { error: insertError } = await supabase
        .from('bug_reports')
        .insert({
          project_id: projectId || null,
          user_id: user.id,
          title,
          description,
          severity,
          status: 'open',
          screenshot_url: screenshotUrls[0] || null,
          screenshot2_url: screenshotUrls[1] || null
        })

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      console.error('Error submitting bug report:', err)
      setError(err.message || 'Failed to submit bug report')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Bug report submitted successfully! Thank you for helping us improve.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Issue Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the issue"
          required
          disabled={submitting}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide detailed information about the issue, steps to reproduce, etc."
          rows={6}
          required
          disabled={submitting}
        />
      </div>

      <div>
        <Label>Severity</Label>
        <div className="flex items-center space-x-1 mt-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setSeverity(rating)}
              disabled={submitting}
              className="p-1 hover:scale-110 transition-transform"
            >
              <Star
                className={`h-6 w-6 ${
                  rating <= severity
                    ? 'fill-yellow-500 text-yellow-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {severity === 1 && 'Minor'}
            {severity === 2 && 'Low'}
            {severity === 3 && 'Medium'}
            {severity === 4 && 'High'}
            {severity === 5 && 'Critical'}
          </span>
        </div>
      </div>

      <div>
        <Label>Screenshots (Optional, max 2)</Label>
        <p className="text-sm text-muted-foreground mt-1">
          You can paste screenshots directly with Ctrl/Cmd+V or upload files
        </p>
        <div className="mt-2 space-y-2">
          {screenshots.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeScreenshot(index)}
                disabled={submitting}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          {screenshots.length < 2 && (
            <div>
              <input
                type="file"
                id="screenshot-upload"
                accept="image/*"
                multiple
                onChange={handleScreenshotUpload}
                disabled={submitting}
                className="hidden"
              />
              <label
                htmlFor="screenshot-upload"
                className="flex flex-col items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <div className="flex items-center mb-1">
                  <Upload className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Upload Screenshots</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clipboard className="h-3 w-3 mr-1" />
                  <span>or paste with Ctrl/Cmd+V</span>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? 'Submitting...' : uploading ? 'Uploading...' : 'Submit Report'}
        </Button>
      </div>
    </form>
  )
}