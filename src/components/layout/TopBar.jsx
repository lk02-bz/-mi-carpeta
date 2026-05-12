/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/TopBar.jsx                        ║
║                                                          ║
║  Cambios Fase 3.1.B:                                     ║
║  ✦ Home:          derecha = avatar → navega a Perfil     ║
║  ✦ Otras screens: derecha = lupa   → navega a Buscar     ║
║  ✦ El logout se movió a ProfileScreen                    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from '../../context/AppContext'

export default function TopBar() {
  const {
    currentFrame,
    canGoBack,
    goBack,
    navTo,
    displayName,
    avatarUrl,
    user,
  } = useApp()

  const esHome = currentFrame.screen === 'home'

  /* Primera letra del nombre o email para las iniciales del avatar */
  const inicial = (displayName || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="topbar">

      {/* Izquierda: botón atrás */}
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

      {/* Derecha:
            - Home      → avatar tocable (va al Perfil)
            - El resto  → lupa (va al Buscador)
      */}
      {esHome ? (
        <button
          className="topbar-avatar"
          onClick={() => navTo('profile')}
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
          onClick={() => navTo('search')}
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
