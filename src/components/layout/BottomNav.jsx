/*
  src/components/layout/BottomNav.jsx — Barra de navegación inferior

  Equivalente React del div.bnav del HTML original.

  Diferencias con la versión vanilla:
  - En vez de llamar a navTo('home') como función global,
    usamos el hook useApp() para obtener navTo del contexto.
  - El estado activo viene del contexto (currentFrame.screen)
    en vez de manipular clases CSS manualmente con setNav().
*/

import { useApp } from '../../context/AppContext'

export default function BottomNav() {
  const { currentFrame, navTo, pushTo } = useApp()
  const active = currentFrame.screen // pantalla actual para marcar el botón activo

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
        Categorías
      </button>

      {/*
        ── Botón "+" central ──
        Equivalente a quickAdd() en la app vanilla.
        pushTo en vez de navTo porque abre el editor sobre la pantalla actual
        (el usuario puede volver atrás y no pierde su contexto).
      */}
      <button
        className="addbtn"
        onClick={() => pushTo('editor', { title: 'Nuevo apunte', noteId: null })}
        aria-label="Nuevo apunte"
      >
        +
      </button>

      {/* ── Buscar ── */}
      <button
        className={`nbtn ${active === 'search' ? 'on' : ''}`}
        onClick={() => navTo('search')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Buscar
      </button>

    </div>
  )
}
