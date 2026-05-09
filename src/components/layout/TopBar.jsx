/*
  src/components/layout/TopBar.jsx — VERSIÓN FINAL

  Agrega un botón de logout (cerrar sesión) que aparece
  SOLO en la pantalla de inicio (home).
  En el resto de pantallas sigue mostrando el botón "atrás".
*/

import { useApp } from '../../context/AppContext'

export default function TopBar() {
  const { currentFrame, canGoBack, goBack, logout } = useApp()
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

      {/* Derecha: logout en home, spacer en el resto */}
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
        <div style={{ minWidth: 34 }} />
      )}

    </div>
  )
}
