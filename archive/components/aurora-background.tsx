'use client'

import { useEffect, useRef } from 'react'

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Aurora wave configurations
    const waves = [
      {
        y: 0.3,
        amplitude: 0.15,
        frequency: 0.0008,
        speed: 0.0002,
        phase: 0,
        colors: [
          { r: 34, g: 211, b: 238, a: 0.3 },  // Cyan
          { r: 59, g: 130, b: 246, a: 0.3 },  // Blue
          { r: 147, g: 51, b: 234, a: 0.3 },  // Purple
        ]
      },
      {
        y: 0.4,
        amplitude: 0.2,
        frequency: 0.001,
        speed: 0.0003,
        phase: Math.PI / 3,
        colors: [
          { r: 16, g: 185, b: 129, a: 0.25 }, // Green
          { r: 34, g: 211, b: 238, a: 0.25 }, // Cyan
          { r: 59, g: 130, b: 246, a: 0.25 }, // Blue
        ]
      },
      {
        y: 0.5,
        amplitude: 0.12,
        frequency: 0.0012,
        speed: 0.00015,
        phase: Math.PI / 2,
        colors: [
          { r: 147, g: 51, b: 234, a: 0.2 },  // Purple
          { r: 217, g: 70, b: 239, a: 0.2 },  // Pink-Purple
          { r: 236, g: 72, b: 153, a: 0.2 },  // Pink
        ]
      },
      {
        y: 0.6,
        amplitude: 0.18,
        frequency: 0.0006,
        speed: 0.00025,
        phase: Math.PI,
        colors: [
          { r: 59, g: 130, b: 246, a: 0.15 }, // Blue
          { r: 147, g: 51, b: 234, a: 0.15 }, // Purple
          { r: 16, g: 185, b: 129, a: 0.15 }, // Green
        ]
      }
    ]

    let time = 0
    let animationFrameId: number

    const drawWave = (wave: typeof waves[0], index: number) => {
      ctx.beginPath()
      
      const points: { x: number, y: number }[] = []
      
      // Calculate wave points
      for (let x = 0; x <= canvas.width; x += 5) {
        const normalizedX = x / canvas.width
        const waveY = wave.y + 
          Math.sin(normalizedX * Math.PI * 2 * wave.frequency * canvas.width + time * wave.speed + wave.phase) * 
          wave.amplitude * 
          Math.sin(time * 0.0001 + index) // Slow modulation
        
        const y = waveY * canvas.height
        points.push({ x, y })
        
        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      // Complete the path for filling
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      wave.colors.forEach((color, i) => {
        const stop = i / (wave.colors.length - 1)
        gradient.addColorStop(stop, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`)
      })
      
      // Apply glow effect
      ctx.shadowBlur = 40
      ctx.shadowColor = `rgba(${wave.colors[1].r}, ${wave.colors[1].g}, ${wave.colors[1].b}, 0.5)`
      
      ctx.fillStyle = gradient
      ctx.fill()
      
      // Reset shadow for next wave
      ctx.shadowBlur = 0
    }

    const animate = () => {
      // Create dark sky gradient background
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      skyGradient.addColorStop(0, 'rgba(2, 6, 23, 1)')     // Very dark blue (top)
      skyGradient.addColorStop(0.4, 'rgba(10, 15, 35, 1)') // Dark blue
      skyGradient.addColorStop(0.7, 'rgba(15, 23, 42, 1)') // Midnight blue
      skyGradient.addColorStop(1, 'rgba(30, 41, 59, 1)')   // Slate blue (bottom)
      
      ctx.fillStyle = skyGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw aurora waves
      waves.forEach((wave, index) => {
        drawWave(wave, index)
      })
      
      // Add subtle stars
      if (time % 100 === 0) {
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height * 0.5
          const radius = Math.random() * 1.5
          
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8})`
          ctx.fill()
        }
      }
      
      time++
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
    />
  )
}