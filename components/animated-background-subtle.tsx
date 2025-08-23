"use client"

import { useEffect, useRef } from 'react'

export function AnimatedBackgroundSubtle() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let time = 0

    const waves = [
      {
        amplitude: 100,
        wavelength: 0.008,
        frequency: 0.015,
        offset: -100,
        colors: [
          { r: 147, g: 51, b: 234, a: 0.15 },
          { r: 59, g: 130, b: 246, a: 0.1 }
        ]
      },
      {
        amplitude: 120,
        wavelength: 0.006,
        frequency: 0.01,
        offset: 0,
        colors: [
          { r: 59, g: 130, b: 246, a: 0.12 },
          { r: 147, g: 51, b: 234, a: 0.08 }
        ]
      },
      {
        amplitude: 80,
        wavelength: 0.01,
        frequency: 0.018,
        offset: 100,
        colors: [
          { r: 236, g: 72, b: 153, a: 0.1 },
          { r: 99, g: 102, b: 241, a: 0.06 }
        ]
      }
    ]

    function drawWave(wave: typeof waves[0], index: number) {
      if (!ctx || !canvas) return

      const points: { x: number; y: number }[] = []
      
      for (let x = 0; x <= canvas.width; x += 5) {
        const y = 
          canvas.height / 2 +
          wave.offset +
          wave.amplitude * Math.sin(x * wave.wavelength + time * wave.frequency) +
          wave.amplitude * 0.5 * Math.sin(x * wave.wavelength * 2 + time * wave.frequency * 0.5) +
          Math.sin(x * 0.003 + time * 0.01) * 50

        points.push({ x, y })
      }

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
      }
      
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, `rgba(${wave.colors[0].r}, ${wave.colors[0].g}, ${wave.colors[0].b}, ${wave.colors[0].a})`)
      gradient.addColorStop(0.5, `rgba(${wave.colors[1].r}, ${wave.colors[1].g}, ${wave.colors[1].b}, ${wave.colors[1].a})`)
      gradient.addColorStop(1, `rgba(${wave.colors[0].r}, ${wave.colors[0].g}, ${wave.colors[0].b}, ${wave.colors[0].a * 0.3})`)

      ctx.fillStyle = gradient
      ctx.fill()
    }

    function animate() {
      if (!ctx || !canvas) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.globalCompositeOperation = 'multiply'

      waves.forEach((wave, index) => {
        drawWave(wave, index)
      })

      ctx.globalCompositeOperation = 'source-over'

      time += 0.5
      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
    />
  )
}
