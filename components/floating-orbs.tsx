'use client'

import { useEffect, useRef } from 'react'

export function FloatingOrbs() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const orbs = [
      {
        x: 0.2,
        y: 0.3,
        vx: 0.0002,
        vy: 0.0001,
        radius: 0.4,
        color: { r: 59, g: 130, b: 246, a: 0.3 }, // Blue
      },
      {
        x: 0.8,
        y: 0.2,
        vx: -0.0001,
        vy: 0.0002,
        radius: 0.35,
        color: { r: 168, g: 85, b: 247, a: 0.3 }, // Purple
      },
      {
        x: 0.5,
        y: 0.8,
        vx: 0.0001,
        vy: -0.0001,
        radius: 0.45,
        color: { r: 236, g: 72, b: 153, a: 0.3 }, // Pink
      },
      {
        x: 0.1,
        y: 0.9,
        vx: 0.0002,
        vy: -0.0002,
        radius: 0.3,
        color: { r: 34, g: 197, b: 94, a: 0.2 }, // Green
      },
    ]

    let animationFrameId: number

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      orbs.forEach(orb => {
        // Update position
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce off walls
        if (orb.x <= 0 || orb.x >= 1) orb.vx = -orb.vx
        if (orb.y <= 0 || orb.y >= 1) orb.vy = -orb.vy

        // Draw orb
        const x = orb.x * canvas.width
        const y = orb.y * canvas.height
        const radius = orb.radius * Math.min(canvas.width, canvas.height) * 0.5

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.color.a})`)
        gradient.addColorStop(0.5, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, ${orb.color.a * 0.5})`)
        gradient.addColorStop(1, `rgba(${orb.color.r}, ${orb.color.g}, ${orb.color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      })

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
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ 
        background: 'linear-gradient(to bottom right, #0f0c29, #302b63, #24243e)',
        filter: 'blur(40px)',
      }}
    />
  )
}