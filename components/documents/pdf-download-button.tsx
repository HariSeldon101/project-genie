'use client'

import React, { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Direct Download Button Component using new API
export const DirectPDFDownloadButton = ({ 
  document,
  size = 'sm',
  variant = 'outline',
  showIcon = true,
  buttonText = 'PDF',
  whiteLabel = false,
  showDraft = false,
  classification,
  forceRegenerate = false
}: { 
  document: any
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showIcon?: boolean
  buttonText?: string
  whiteLabel?: boolean
  showDraft?: boolean
  classification?: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC'
  forceRegenerate?: boolean
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  
  const handleDownload = async () => {
    try {
      setIsGenerating(true)
      
      console.log('🚀 PDF Generation Started:', {
        documentType: document.type,
        contentKeys: Object.keys(document.content || {}),
        documentTitle: document.title,
        forceRegenerate,
        timestamp: new Date().toISOString()
      })
      
      // Prepare request body
      const requestBody = {
        documentType: document.type.toLowerCase().replace(/ /g, '_'),
        content: document.content,
        projectName: document.project?.name || document.title || 'Project',
        companyName: 'Your Company',
        options: {
          whiteLabel,
          showDraft,
          classification,
          pageNumbers: true,
          watermarkText: whiteLabel ? undefined : 'Project Genie',
          forceRegenerate, // Add force regenerate flag
          useCache: !forceRegenerate // Disable cache if force regenerating
        },
        artifactId: document.id
      }
      
      // Call the PDF generation API
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
      
      // Trigger download
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Show more detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        alert(`PDF Generation Failed: ${error.message}`)
      } else {
        alert('PDF Generation Failed: Unknown error')
      }
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <Button 
      size={size} 
      variant={variant}
      disabled={isGenerating}
      onClick={handleDownload}
    >
      {showIcon && <FileSpreadsheet className="h-4 w-4 mr-1" />}
      {isGenerating ? 'Generating...' : buttonText}
    </Button>
  )
}