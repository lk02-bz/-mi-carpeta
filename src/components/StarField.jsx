/*
╔══════════════════════════════════════════════════════════╗
║  src/components/StarField.jsx                            ║
║  Fondo cósmico global — estrellas + nebulas + fugaces    ║
╚══════════════════════════════════════════════════════════╝
*/
import { useEffect, useRef } from 'react'

export default function StarField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    /* ── Estrellas ── */
    const stars = Array.from({ length: 280 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.4 + 0.15,
      alpha: Math.random() * 0.8 + 0.1,
      speed: Math.random() * 0.018 + 0.004,
      phase: Math.random() * Math.PI * 2,
    }))

    /* ── Estrellas fugaces ── */
    const shooters = Array.from({ length: 4 }, () => ({
      x: 0, y: 0, len: 0, speed: 0, alpha: 0,
      active: false,
      timer: Math.random() * 300 + 80,
    }))

    /* ── Nebulas ── */
    const nebulas = [
      { cx: 0.15, cy: 0.12, r: 220, color: [99,102,241]  },
      { cx: 0.85, cy: 0.28, r: 180, color: [236,72,153]  },
      { cx: 0.25, cy: 0.72, r: 200, color: [16,185,129]  },
      { cx: 0.78, cy: 0.65, r: 160, color: [245,158,11]  },
    ]

    let t = 0

    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      /* Nebulas pulsantes */
      nebulas.forEach(n => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.006 + n.cx * 10)
        const alpha = 0.04 + pulse * 0.04
        const grad  = ctx.createRadialGradient(n.cx*W, n.cy*H, 0, n.cx*W, n.cy*H, n.r)
        grad.addColorStop(0, `rgba(${n.color},${alpha})`)
        grad.addColorStop(1, `rgba(${n.color},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)
      })

      /* Estrellas */
      stars.forEach(s => {
        const a = s.alpha * (0.3 + 0.7 * Math.sin(t * s.speed + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
        if (s.r > 0.9) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(190,190,255,${a * 0.12})`
          ctx.fill()
        }
      })

      /* Estrellas fugaces */
      shooters.forEach(s => {
        s.timer--
        if (s.timer <= 0 && !s.active) {
          s.active = true
          s.x = W + 30
          s.y = Math.random() * H * 0.55
          s.len   = Math.random() * 90 + 40
          s.speed = Math.random() * 4 + 2
          s.alpha = 1
          s.timer = Math.random() * 500 + 200
        }
        if (s.active) {
          s.x -= s.speed * 2.5
          s.y += s.speed * 0.8
          s.alpha -= 0.009
          if (s.alpha <= 0) { s.active = false; return }
          const g = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y - s.len * 0.8)
          g.addColorStop(0, `rgba(255,255,255,${s.alpha})`)
          g.addColorStop(0.4, `rgba(180,180,255,${s.alpha * 0.5})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(s.x + s.len, s.y - s.len * 0.8)
          ctx.strokeStyle = g
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      })

      t++
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
