/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/TopBar.jsx                        ║
║                                                          ║
║  Cambios Fase 3.1.A (ajuste):                            ║
║  ✦ En Home:            derecha = logout (igual que antes)║
║  ✦ En otras pantallas: derecha = lupa → navega a Buscar  ║
║                                                          ║
║  En Fase 3.1.B el logout se moverá al Perfil y           ║
║  la lupa quedará en todas las pantallas.                  ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from '../../context/AppContext'

export default function TopBar() {
  const { currentFrame, canGoBack, goBack, logout, navTo } = useApp()
  const esHome = currentFrame.screen === 'home'

  return (
    <div className="topbar">

      {/* Izquierda: botón atrás (invisible en raíz para mantener centrado el título) */}
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
            - En Home      → logout (igual que siempre, no rompemos nada)
            - En el resto  → lupa  (acceso rápido a Buscar desde cualquier pantalla)
          En Fase 3.1.B el logout se mueve al Perfil y la lupa queda en todos lados.
      */}
      {esHome ? (
        <button
          className="ibtn"
          onClick={logout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
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