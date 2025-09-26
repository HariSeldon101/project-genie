'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { GripVertical, Maximize2, Minimize2, X } from 'lucide-react'
import { Button } from './button'

interface ResizableModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
  minWidth?: number
  minHeight?: number
  defaultWidth?: number
  defaultHeight?: number
}

export function ResizableModal({
  isOpen,
  onClose,
  children,
  title,
  className,
  minWidth = 600,
  minHeight = 400,
  defaultWidth,
  defaultHeight
}: ResizableModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  // SSR-safe: Use safe defaults, then update on client
  const [dimensions, setDimensions] = useState({
    width: defaultWidth || 1024,  // Safe server-side default
    height: defaultHeight || 768   // Safe server-side default
  })
  const [position, setPosition] = useState({
    x: 0,
    y: 0
  })
  const [isResizing, setIsResizing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const dragStartRef = useRef({ x: 0, y: 0, modalX: 0, modalY: 0 })

  // SSR-safe: Update dimensions on client after mount
  useEffect(() => {
    // Only update if no explicit dimensions were provided
    if (!defaultWidth || !defaultHeight) {
      setDimensions({
        width: defaultWidth || window.innerWidth * 0.8,
        height: defaultHeight || window.innerHeight * 0.8
      })
    }
  }, []) // Run once on mount

  // Center modal on open
  useEffect(() => {
    if (isOpen && !isFullscreen) {
      // Safe to use window here as this only runs on client
      setPosition({
        x: (window.innerWidth - dimensions.width) / 2,
        y: (window.innerHeight - dimensions.height) / 2
      })
    }
  }, [isOpen, dimensions.width, dimensions.height])

  // Handle resize
  const startResize = (e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const deltaX = e.clientX - resizeStartRef.current.x
      const deltaY = e.clientY - resizeStartRef.current.y
      
      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height
      let newX = position.x
      let newY = position.y

      if (direction.includes('right')) {
        newWidth = Math.max(minWidth, resizeStartRef.current.width + deltaX)
      }
      if (direction.includes('left')) {
        newWidth = Math.max(minWidth, resizeStartRef.current.width - deltaX)
        newX = position.x + deltaX
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(minHeight, resizeStartRef.current.height + deltaY)
      }
      if (direction.includes('top')) {
        newHeight = Math.max(minHeight, resizeStartRef.current.height - deltaY)
        newY = position.y + deltaY
      }

      setDimensions({ width: newWidth, height: newHeight })
      if (direction.includes('left') || direction.includes('top')) {
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Handle drag
  const startDrag = (e: React.MouseEvent) => {
    if (isFullscreen) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      modalX: position.x,
      modalY: position.y
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      
      setPosition({
        x: dragStartRef.current.modalX + deltaX,
        y: dragStartRef.current.modalY + deltaY
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    if (!isFullscreen) {
      // Store current dimensions before fullscreen
      localStorage.setItem('modal-dimensions', JSON.stringify(dimensions))
    } else {
      // Restore dimensions after fullscreen
      const stored = localStorage.getItem('modal-dimensions')
      if (stored) {
        setDimensions(JSON.parse(stored))
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          "absolute bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col",
          isFullscreen && "!inset-4 !w-auto !h-auto",
          className
        )}
        style={!isFullscreen ? {
          width: dimensions.width,
          height: dimensions.height,
          left: position.x,
          top: position.y,
          maxWidth: '95vw',
          maxHeight: '95vh'
        } : {}}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-800 rounded-t-lg cursor-move select-none"
          onMouseDown={startDrag}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            {title && <h3 className="font-semibold">{title}</h3>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* Resize handles */}
        {!isFullscreen && (
          <>
            {/* Corners */}
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => startResize(e, 'top-left')}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => startResize(e, 'top-right')}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => startResize(e, 'bottom-left')}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => startResize(e, 'bottom-right')}
            />
            
            {/* Edges */}
            <div
              className="absolute top-0 left-3 right-3 h-1 cursor-n-resize"
              onMouseDown={(e) => startResize(e, 'top')}
            />
            <div
              className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize"
              onMouseDown={(e) => startResize(e, 'bottom')}
            />
            <div
              className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize"
              onMouseDown={(e) => startResize(e, 'left')}
            />
            <div
              className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize"
              onMouseDown={(e) => startResize(e, 'right')}
            />
          </>
        )}
      </div>
    </div>
  )
}