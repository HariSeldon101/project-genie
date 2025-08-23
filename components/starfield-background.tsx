'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  prevZ: number
  size: number
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Star configuration
    const numStars = 800
    const numBigStars = 15  // Add some bigger, brighter stars
    const stars: Star[] = []
    const maxDepth = 1000
    const speed = 0.5

    // Initialize regular stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * maxDepth,
        prevZ: 0,
        size: Math.random() * 2
      })
    }

    // Add bigger, brighter stars
    for (let i = 0; i < numBigStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        z: Math.random() * maxDepth,
        prevZ: 0,
        size: Math.random() * 3 + 2  // Bigger size range (2-5)
      })
    }

    // Mouse movement handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX - canvas.width / 2) * 0.0005,
        y: (e.clientY - canvas.height / 2) * 0.0005
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    let animationFrameId: number

    const animate = () => {
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) / 2
      )
      gradient.addColorStop(0, '#0a0e27')    // Dark blue center
      gradient.addColorStop(0.5, '#070b1f')  // Darker blue
      gradient.addColorStop(1, '#020207')    // Almost black edges

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw stars
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      stars.forEach(star => {
        // Store previous z position for motion blur
        star.prevZ = star.z

        // Move star towards viewer with parallax
        star.z -= speed + (star.z * 0.001)
        
        // Apply mouse influence for subtle movement
        star.x += mouseRef.current.x * (1000 - star.z) * 0.001
        star.y += mouseRef.current.y * (1000 - star.z) * 0.001

        // Reset star if it goes behind viewer
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * 2000
          star.y = (Math.random() - 0.5) * 2000
          star.z = maxDepth
          star.prevZ = maxDepth
        }

        // Calculate screen position with perspective
        const x = (star.x / star.z) * 500 + centerX
        const y = (star.y / star.z) * 500 + centerY

        // Calculate previous position for motion trail
        const prevX = (star.x / star.prevZ) * 500 + centerX
        const prevY = (star.y / star.prevZ) * 500 + centerY

        // Calculate size based on distance
        const size = (1 - star.z / maxDepth) * star.size * 2
        const opacity = 1 - star.z / maxDepth

        // Draw motion trail for fast-moving stars
        if (star.z < 300) {
          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(x, y)
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`
          ctx.lineWidth = size * 0.5
          ctx.stroke()
        }

        // Draw star
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        
        // Add glow effect for brighter stars
        if (size > 1) {
          const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
          glowGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
          glowGradient.addColorStop(0.1, `rgba(200, 220, 255, ${opacity * 0.8})`)
          glowGradient.addColorStop(0.5, `rgba(150, 180, 255, ${opacity * 0.3})`)
          glowGradient.addColorStop(1, 'rgba(100, 150, 255, 0)')
          ctx.fillStyle = glowGradient
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        }
        
        ctx.fill()
      })

      // Add subtle nebula clouds
      ctx.fillStyle = 'rgba(100, 150, 255, 0.02)'
      for (let i = 0; i < 3; i++) {
        const x = Math.sin(Date.now() * 0.00001 + i) * 200 + centerX
        const y = Math.cos(Date.now() * 0.00001 + i) * 200 + centerY
        ctx.beginPath()
        ctx.arc(x, y, 150, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: '#020207' }}
    />
  )
}