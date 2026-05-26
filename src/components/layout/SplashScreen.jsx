/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/SplashScreen.jsx                  ║
║  NOVA — Space Grotesk + robot placeholder                ║
╚══════════════════════════════════════════════════════════╝
*/

import { useEffect, useRef, useState } from 'react'

export default function SplashScreen() {
  const canvasRef = useRef(null)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 900)
    const t3 = setTimeout(() => setPhase(3), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

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

    const stars = Array.from({ length: 220 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.3 + 0.15,
      alpha: Math.random() * 0.8 + 0.1,
      speed: Math.random() * 0.016 + 0.004,
      phase: Math.random() * Math.PI * 2,
    }))

    const nebulas = [
      { cx: 0.18, cy: 0.15, r: 200, color: [99,102,241]  },
      { cx: 0.82, cy: 0.28, r: 160, color: [236,72,153]  },
      { cx: 0.5,  cy: 0.8,  r: 220, color: [16,185,129]  },
    ]

    // Shooting star state
    let shooter = { active: false, x: 0, y: 0, alpha: 0, timer: 120 }

    let t = 0
    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)

      nebulas.forEach(n => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.006 + n.cx * 9)
        const a = 0.04 + pulse * 0.05
        const g = ctx.createRadialGradient(n.cx*W, n.cy*H, 0, n.cx*W, n.cy*H, n.r)
        g.addColorStop(0, `rgba(${n.color},${a})`)
        g.addColorStop(1, `rgba(${n.color},0)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      })

      stars.forEach(s => {
        const a = s.alpha * (0.3 + 0.7 * Math.sin(t * s.speed + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
        if (s.r > 0.9) {
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(190,190,255,${a * 0.1})`
          ctx.fill()
        }
      })

      // Shooting star
      shooter.timer--
      if (shooter.timer <= 0 && !shooter.active) {
        shooter.active = true
        shooter.x = W + 20
        shooter.y = Math.random() * H * 0.5
        shooter.alpha = 0.9
        shooter.timer = Math.random() * 400 + 150
      }
      if (shooter.active) {
        shooter.x -= 5; shooter.y += 2.5; shooter.alpha -= 0.008
        if (shooter.alpha <= 0) { shooter.active = false }
        else {
          const g = ctx.createLinearGradient(shooter.x, shooter.y, shooter.x + 80, shooter.y - 40)
          g.addColorStop(0, `rgba(255,255,255,${shooter.alpha})`)
          g.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.beginPath()
          ctx.moveTo(shooter.x, shooter.y)
          ctx.lineTo(shooter.x + 80, shooter.y - 40)
          ctx.strokeStyle = g
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      t++
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#03030a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      overflow: 'hidden',
      fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
    }}>

      {/* Google Fonts — Space Grotesk */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');

        @keyframes splashBar {
          0%   { width: 0%;   margin-left: 0%;    }
          50%  { width: 65%;  margin-left: 17.5%; }
          100% { width: 0%;   margin-left: 100%;  }
        }
        @keyframes logoFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>

      {/* Canvas estrellas */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }} />

      {/* Contenido */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 32px',
      }}>

        {/* ── Ícono robot ── */}
        <div style={{
          width: 112, height: 112,
          borderRadius: 32,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 36,
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1)' : 'scale(0.3)',
          transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: phase >= 1
            ? '0 0 50px rgba(99,102,241,0.55), 0 0 100px rgba(99,102,241,0.18)'
            : 'none',
          animation: phase >= 1 ? 'logoFloat 3.5s ease-in-out infinite' : 'none',
          overflow: 'hidden',
        }}>
          <img
            src="/robot.png"
            alt="NOVA"
            style={{
              width: '80%',
              height: '80%',
              objectFit: 'contain',
            }}
          />
       
        </div>

        {/* ── NOVA — Space Grotesk con degradé ── */}
        <div style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 0.5s ease 0.1s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
          marginBottom: 10,
          lineHeight: 1,
        }}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 58,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg, #e2e8f0 0%, #818cf8 55%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'block',
          }}>
            NOVA
          </span>
        </div>

        {/* ── Acrónimo ── */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.45s ease',
          marginBottom: 54,
          display: 'flex', gap: 4, alignItems: 'center',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { inicial: 'N', palabra: 'avegá',    color: '#818cf8' },
            { inicial: 'O', palabra: 'rganizá',  color: '#a78bfa' },
            { inicial: 'V', palabra: 'isualizá', color: '#c084fc' },
            { inicial: 'A', palabra: 'lcanzá',   color: '#e879f9' },
          ].map(({ inicial, palabra, color }, i) => (
            <span key={inicial} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              color: '#555',
              letterSpacing: '.01em',
            }}>
              <span style={{ color, fontWeight: 700 }}>{inicial}</span>
              {palabra}
              {i < 3 && <span style={{ color: '#2a2a3a', marginLeft: 4 }}>·</span>}
            </span>
          ))}
        </div>

        {/* ── Barra de carga neon ── */}
        <div style={{
          width: 140,
          height: 2,
          background: 'rgba(99,102,241,0.12)',
          borderRadius: 2,
          overflow: 'hidden',
          opacity: phase >= 3 ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #4f46e5, #818cf8, #e879f9)',
            animation: 'splashBar 1.8s ease-in-out infinite',
          }} />
        </div>

      </div>
    </div>
  )
}