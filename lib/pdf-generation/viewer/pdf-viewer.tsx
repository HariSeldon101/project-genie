/**
 * Syncfusion PDF Viewer Component
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Annotation,
  FormDesigner,
  FormFields,
  Inject
} from '@syncfusion/ej2-react-pdfviewer'
import { initializeSyncfusionLicense } from '../config/syncfusion-license'

// Initialize Syncfusion license
if (typeof window !== 'undefined') {
  initializeSyncfusionLicense()
}

export interface SyncfusionPDFViewerProps {
  /** PDF document URL or base64 string */
  documentPath: string
  /** Height of the viewer */
  height?: string
  /** Enable toolbar */
  enableToolbar?: boolean
  /** Enable navigation */
  enableNavigation?: boolean
  /** Enable print */
  enablePrint?: boolean
  /** Enable download */
  enableDownload?: boolean
  /** Enable text selection */
  enableTextSelection?: boolean
  /** Enable text search */
  enableTextSearch?: boolean
  /** Enable annotations */
  enableAnnotation?: boolean
  /** Enable form filling */
  enableFormFields?: boolean
  /** Custom toolbar items */
  toolbarSettings?: any
  /** Callback when document loads */
  onDocumentLoad?: () => void
  /** Callback when document fails to load */
  onDocumentLoadFailed?: (args: any) => void
  /** Custom CSS class */
  className?: string
  /** Service URL for server-side processing */
  serviceUrl?: string
  /** Resource URL for localization */
  resourceUrl?: string
}

export const SyncfusionPDFViewer: React.FC<SyncfusionPDFViewerProps> = ({
  documentPath,
  height = '100vh',
  enableToolbar = true,
  enableNavigation = true,
  enablePrint = true,
  enableDownload = true,
  enableTextSelection = true,
  enableTextSearch = true,
  enableAnnotation = false,
  enableFormFields = false,
  toolbarSettings,
  onDocumentLoad,
  onDocumentLoadFailed,
  className = '',
  serviceUrl,
  resourceUrl
}) => {
  const viewerRef = useRef<PdfViewerComponent>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Load the document when component mounts or documentPath changes
    if (viewerRef.current && documentPath) {
      loadDocument()
    }
  }, [documentPath])
  
  const loadDocument = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!viewerRef.current) return
      
      // Check if documentPath is a URL or base64
      if (documentPath.startsWith('data:') || documentPath.startsWith('http')) {
        // Direct load
        await viewerRef.current.load(documentPath)
      } else {
        // Assume it's a file path, fetch it
        const response = await fetch(documentPath)
        const blob = await response.blob()
        const base64 = await blobToBase64(blob)
        await viewerRef.current.load(base64)
      }
      
      setIsLoading(false)
      onDocumentLoad?.()
    } catch (err) {
      console.error('Failed to load PDF:', err)
      setError('Failed to load PDF document')
      setIsLoading(false)
      onDocumentLoadFailed?.(err)
    }
  }
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string)
        } else {
          reject(new Error('Failed to convert blob to base64'))
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
  
  // Toolbar customization
  const defaultToolbarSettings = {
    showTooltip: true,
    toolbarItems: [
      'OpenOption',
      'PageNavigationTool',
      'MagnificationTool',
      enablePrint && 'PrintOption',
      enableDownload && 'DownloadOption',
      enableTextSearch && 'SearchOption',
      'PanTool',
      'SelectionTool',
      enableAnnotation && 'AnnotationEditTool',
      enableFormFields && 'FormDesignerEditTool'
    ].filter(Boolean)
  }
  
  const finalToolbarSettings = toolbarSettings || defaultToolbarSettings
  
  return (
    <div className={`pdf-viewer-container ${className}`}>
      {isLoading && (
        <div className="pdf-viewer-loading">
          <div className="spinner" />
          <p>Loading PDF...</p>
        </div>
      )}
      
      {error && (
        <div className="pdf-viewer-error">
          <p>{error}</p>
          <button onClick={loadDocument}>Retry</button>
        </div>
      )}
      
      <PdfViewerComponent
        ref={viewerRef}
        id="pdf-viewer"
        documentPath=""
        serviceUrl={serviceUrl || ''}
        resourceUrl={resourceUrl}
        height={height}
        enableToolbar={enableToolbar}
        enableNavigationToolbar={enableNavigation}
        enablePrint={enablePrint}
        enableDownload={enableDownload}
        enableTextSelection={enableTextSelection}
        enableTextSearch={enableTextSearch}
        enableAnnotation={enableAnnotation}
        enableFormFields={enableFormFields}
        toolbarSettings={finalToolbarSettings}
        documentLoad={onDocumentLoad}
        documentLoadFailed={onDocumentLoadFailed}
      >
        <Inject services={[
          Toolbar,
          Magnification,
          Navigation,
          LinkAnnotation,
          BookmarkView,
          ThumbnailView,
          Print,
          TextSelection,
          TextSearch,
          enableAnnotation && Annotation,
          enableFormFields && FormDesigner,
          enableFormFields && FormFields
        ].filter(Boolean) as any[]} />
      </PdfViewerComponent>
      
      <style jsx>{`
        .pdf-viewer-container {
          position: relative;
          width: 100%;
          height: ${height};
          background: #f5f5f5;
        }
        
        .pdf-viewer-loading,
        .pdf-viewer-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          z-index: 1000;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .pdf-viewer-error {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .pdf-viewer-error p {
          color: #ef4444;
          margin-bottom: 1rem;
        }
        
        .pdf-viewer-error button {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .pdf-viewer-error button:hover {
          background: #764ba2;
        }
        
        /* Syncfusion theme overrides */
        .e-pdfviewer {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        .e-pdfviewer .e-toolbar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        }
        
        .e-pdfviewer .e-toolbar .e-btn {
          color: white !important;
        }
        
        .e-pdfviewer .e-toolbar .e-btn:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  )
}

/**
 * Lightweight PDF viewer for simple display
 */
export const SimplePDFViewer: React.FC<{
  documentPath: string
  height?: string
  className?: string
}> = ({ documentPath, height = '600px', className = '' }) => {
  return (
    <SyncfusionPDFViewer
      documentPath={documentPath}
      height={height}
      className={className}
      enableToolbar={false}
      enableAnnotation={false}
      enableFormFields={false}
      enableDownload={false}
      enablePrint={false}
    />
  )
}

export default SyncfusionPDFViewer