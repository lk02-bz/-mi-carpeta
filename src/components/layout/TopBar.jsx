/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/TopBar.jsx                        ║
║  Rediseño NOVA: logo + Space Grotesk                     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useEffect }   from 'react'
import { useApp }      from '../../context/AppContext'
import { useSpeech }   from '../../hooks/useSpeech'

function htmlToPlainText(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const IconVolumeOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14"/>
    <path d="M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
)
const IconVolumeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
)

/* Logo N de NOVA */
const NovaLogo = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8,
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 0 10px rgba(99,102,241,0.4)',
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 13.5 L2.5 2.5 L5.5 2.5 L10.5 9.5 L10.5 2.5 L13.5 2.5 L13.5 13.5 L10.5 13.5 L5.5 6.5 L5.5 13.5 Z" fill="white"/>
      </svg>
    </div>
    <span style={{
      fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      background: 'linear-gradient(135deg, #e2e8f0 20%, #818cf8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>
      NOVA
    </span>
  </div>
)

export default function TopBar() {
  const {
    currentFrame, canGoBack, goBack, pushTo,
    displayName, avatarUrl, user,
    openAiPanel, assistantName,
    notes,
  } = useApp()

  const { isSpeaking, toggle, stop } = useSpeech()

  const esHome   = currentFrame.screen === 'home'
  const esEditor = currentFrame.screen === 'editor' && currentFrame.noteId !== null
  const inicial  = (displayName || user?.email || '?').charAt(0).toUpperCase()

  useEffect(() => {
    if (!esEditor) stop()
  }, [esEditor]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggleSpeech() {
    const nota = notes.find(n => n.id === currentFrame.noteId)
    if (!nota) return
    const texto = `${nota.title}. ${htmlToPlainText(nota.content)}`
    toggle(texto)
  }

  return (
    <div className="topbar">

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

      {/* Título o logo NOVA */}
      {esHome
        ? <NovaLogo />
        : <span className="topbar-title" style={{
            fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif",
            fontWeight: 600,
            color: '#e2e8f0',
          }}>
            {currentFrame.title}
          </span>
      }

      {esHome ? (
        <button
          className="topbar-avatar"
          onClick={() => pushTo('profile', { title: 'Perfil' })}
          aria-label="Ir al perfil"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="Avatar" className="topbar-avatar-img" />
            : <span className="topbar-avatar-initial">{inicial}</span>
          }
        </button>

      ) : esEditor ? (
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <button
            className="ibtn"
            onClick={handleToggleSpeech}
            aria-label={isSpeaking ? 'Detener lectura' : 'Leer en voz alta'}
            style={{ color: isSpeaking ? 'var(--accent)' : undefined }}
          >
            {isSpeaking ? <IconVolumeOff /> : <IconVolumeOn />}
          </button>
          <button
            className="ibtn"
            onClick={openAiPanel}
            aria-label={`Abrir ${assistantName || 'Asistente'}`}
            style={{ fontSize: 20, minWidth: 34 }}
          >
            🤖
          </button>
        </div>

      ) : (
        <button
          className="ibtn"
          onClick={() => pushTo('search', { title: 'Buscar' })}
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