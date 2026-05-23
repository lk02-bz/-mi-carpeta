/*
╔══════════════════════════════════════════════════════════╗
║  src/components/layout/TopBar.jsx                        ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Usa useSpeech hook en vez de lógica inline            ║
║  ✦ Mejor selección de voz española automática            ║
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

  /* Parar la voz al salir del editor */
  useEffect(() => {
    if (!esEditor) stop()
  }, [esEditor]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggleSpeech() {
    const nota = notes.find(n => n.id === currentFrame.noteId)
    if (!nota) return
    const texto = `${nota.title}. ${htmlToPlainText(nota.content)}`
    toggle(texto)
  }

  function getTitulo() {
    if (esHome) return '📚 Mi Carpeta'
    return currentFrame.title
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

      <span className="topbar-title">{getTitulo()}</span>

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
            title={isSpeaking ? 'Detener lectura' : 'Leer en voz alta'}
            style={{ color: isSpeaking ? 'var(--accent)' : undefined }}
          >
            {isSpeaking ? <IconVolumeOff /> : <IconVolumeOn />}
          </button>
          <button
            className="ibtn"
            onClick={openAiPanel}
            aria-label={`Abrir ${assistantName || 'Asistente'}`}
            title={assistantName || 'Asistente'}
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