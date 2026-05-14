/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/TopBar.jsx                        ║
║                                                          ║
║  Cambios Fase 4.1:                                       ║
║  ✦ navTo('profile') → pushTo('profile')                  ║
║  ✦ navTo('search')  → pushTo('search')                   ║
║    → el botón ← del TopBar ahora funciona en ambas       ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from '../../context/AppContext'

export default function TopBar() {
  const {
    currentFrame,
    canGoBack,
    goBack,
    pushTo,          // ← antes era navTo, ahora pushTo para mantener el stack
    displayName,
    avatarUrl,
    user,
  } = useApp()

  const esHome = currentFrame.screen === 'home'

  const inicial = (displayName || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="topbar">

      {/* Izquierda: botón atrás — visible solo cuando hay stack */}
      <button
        className="ibtn"
        style={{ visibility: canGoBack ? 'visible' : 'hidden' }}
        onClick={goBack}
        aria-label="Volver"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <span className="topbar-title">{currentFrame.title}</span>

      {/* Derecha: avatar (home) o lupa (resto) */}
      {esHome ? (
        <button
          className="topbar-avatar"
          onClick={() => pushTo('profile', { title: 'Perfil' })}  // ← pushTo
          aria-label="Ir al perfil"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="topbar-avatar-img" />
          ) : (
            <span className="topbar-avatar-initial">{inicial}</span>
          )}
        </button>
      ) : (
        <button
          className="ibtn"
          onClick={() => pushTo('search', { title: 'Buscar' })}   // ← pushTo
          aria-label="Buscar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      )}

    </div>
  )
}
