/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/BottomNav.jsx                     ║
║                                                          ║
║  Cambios Fase 3.1.A (ajuste):                            ║
║  ✦ Elimina botón Buscar (se mueve al TopBar)             ║
║  ✦ Layout final simétrico 2 · + · 2:                     ║
║    Inicio | Cats | + | Stats | Calendario                ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from '../../context/AppContext'

export default function BottomNav() {
  const { currentFrame, navTo, pushTo } = useApp()
  const active = currentFrame.screen

  return (
    <div className="bnav">

      {/* ── Inicio ── */}
      <button
        className={`nbtn ${active === 'home' ? 'on' : ''}`}
        onClick={() => navTo('home')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Inicio
      </button>

      {/* ── Categorías ── */}
      <button
        className={`nbtn ${active === 'cats' ? 'on' : ''}`}
        onClick={() => navTo('cats')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3"  y="3"  width="7" height="7" rx="1" />
          <rect x="14" y="3"  width="7" height="7" rx="1" />
          <rect x="3"  y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Cats
      </button>

      {/* ── Botón "+" central ── */}
      <button
        className="addbtn"
        onClick={() => pushTo('editor', { title: 'Nuevo apunte', noteId: null })}
        aria-label="Nuevo apunte"
      >
        +
      </button>

      {/* ── Stats ── */}
      <button
        className={`nbtn ${active === 'stats' ? 'on' : ''}`}
        onClick={() => navTo('stats')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4"  />
          <line x1="6"  y1="20" x2="6"  y2="14" />
          <line x1="2"  y1="20" x2="22" y2="20" />
        </svg>
        Stats
      </button>

      {/* ── Calendario ── */}
      <button
        className={`nbtn ${active === 'calendar' ? 'on' : ''}`}
        onClick={() => navTo('calendar')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8"  y1="2" x2="8"  y2="6" />
          <line x1="3"  y1="10" x2="21" y2="10" />
        </svg>
        Cal
      </button>

    </div>
  )
}