/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AssistantScreen.jsx              ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Micrófono en el chat — hablar en vez de escribir      ║
║  ✦ Animación de escucha + feedback visual                ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }       from '../../context/AppContext'
import { useStats }     from '../../hooks/useStats'
import { useAssistant } from '../../hooks/useAssistant'
import { useSpeech }    from '../../hooks/useSpeech'

const IconSend   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconSave   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const IconTrash  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

const IconVolumeOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14"/>
    <path d="M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
)
const IconVolumeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
)


export default function AssistantScreen() {
  const {
    displayName, assistantName, updateAssistantName,
    habits, habitLogs, tasks, goals,
    getTasksForDate, createNote, showToast, pushTo, cats,
  } = useApp()

  const { habitStats, bestStreak } = useStats({ notes: [], habits, habitLogs, tasks })
  const todayStr   = new Date().toISOString().slice(0, 10)
  const tasksToday = getTasksForDate(todayStr)

  const contextData = {
    displayName:   displayName   || 'Lucas',
    assistantName: assistantName || 'Asistente',
    habitStats, tasksToday, goals, bestStreak,
  }

  const assistant  = useAssistant({ contextData })
  const [activeTab, setActiveTab] = useState('chat')

  if (!assistantName) {
    return <AssistantOnboarding onSave={updateAssistantName} />
  }

  return (
    <div className="assistant-screen">
      <div className="assistant-tabs">
        {[
          { id: 'chat',       label: '💬 Chat'      },
          { id: 'devocional', label: '✝️ Devocional' },
          { id: 'briefing',   label: '📋 Briefing'  },
        ].map(tab => (
          <button
            key={tab.id}
            className={`assistant-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="assistant-content">
        {activeTab === 'chat'       && <ChatTab       assistant={assistant} assistantName={assistantName} createNote={createNote} showToast={showToast} pushTo={pushTo} cats={cats} />}
        {activeTab === 'devocional' && <DevocionalTab assistant={assistant} showToast={showToast} />}
        {activeTab === 'briefing'   && <BriefingTab   assistant={assistant} />}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   TAB 1 — CHAT LIBRE
   ════════════════════════════════════════════════════════ */

function ChatTab({ assistant, assistantName, createNote, showToast, pushTo, cats }) {
  const { messages, loading, error, sendMessage, clearChat, saveLastResponseAsNote } = assistant

  const [input,      setInput]      = useState('')
  const [useSearch,  setUseSearch]  = useState(false)
  const [listening,  setListening]  = useState(false)
  const recognitionRef = useRef(null)
  const bottomRef      = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Limpiar reconocimiento al desmontar */
  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim(), useSearch)
    setInput('')
  }

  /* ── Micrófono ── */
  function handleMic() {
    if (listening) {
      recognitionRef.current?.abort()
      setListening(false)
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      showToast('Tu navegador no soporta reconocimiento de voz')
      return
    }

    const recognition = new SR()
    recognition.lang             = 'es-AR'
    recognition.continuous       = false
    recognition.interimResults   = false
    recognition.maxAlternatives  = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      setListening(false)
    }

    recognition.onerror = (e) => {
      if (e.error !== 'aborted') showToast('No se pudo escuchar, intentá de nuevo')
      setListening(false)
    }

    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const handleSaveNote = async () => {
    const firstCatId = cats?.[0]?.id ?? null
    const note = await saveLastResponseAsNote(createNote, firstCatId)
    if (note?.id) {
      showToast('✅ Guardado como apunte')
      setTimeout(() => pushTo('editor', { noteId: note.id, title: note.title }), 1000)
    } else {
      showToast('Error al guardar')
    }
  }

  const sugerencias = [
    '¿Podés explicarme qué es la recursión?',
    '¿Cómo organizo mejor mi tiempo cuando tengo mucho para hacer?',
    '¿Qué es la programación orientada a objetos?',
  ]

  return (
    <div className="chat-container">
      <div className="chat-messages">

        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Hola, soy {assistantName} 👋</p>
            <p className="chat-empty-sub">Preguntame lo que quieras — código, ideas, dudas, lo que sea.</p>
            <div className="chat-suggestions">
              {sugerencias.map(s => (
                <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-bubble">
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
              {msg.sources?.length > 0 && (
                <div className="chat-sources">
                  <span className="chat-sources-label">Fuentes:</span>
                  {msg.sources.map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noreferrer" className="chat-source-link">
                      {s.title || s.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'assistant' && i === messages.length - 1 && (
              <button className="chat-save-btn" onClick={handleSaveNote}>
                <IconSave /> Guardar como apunte
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-bubble chat-loading">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        {error && <div className="chat-error">⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Indicador de escucha */}
      {listening && (
        <div style={{
          padding: '8px 16px', background: 'rgba(239,68,68,0.1)',
          borderTop: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#ef4444', flexShrink: 0,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
            animation: 'dotBounce .9s infinite',
          }} />
          Escuchando... (tocá el micrófono para detener)
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-search-toggle">
          <button
            className={`search-toggle-btn ${useSearch ? 'active' : ''}`}
            onClick={() => setUseSearch(v => !v)}
          >
            <IconSearch />
            {useSearch ? 'Búsqueda ON' : 'Búsqueda OFF'}
          </button>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat}><IconTrash /></button>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder={listening ? 'Escuchando...' : 'Escribí tu mensaje...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            rows={2}
          />

          {/* Botón micrófono */}
          <button
            onClick={handleMic}
            title={listening ? 'Detener' : 'Hablar'}
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: listening ? '#ef4444' : 'var(--bg2)',
              color: listening ? '#fff' : 'var(--text2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, padding: 0,
              transition: 'all .2s',
              boxShadow: listening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none',
            }}
          >
            <IconMic />
          </button>

          {/* Botón enviar */}
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   TAB 2 — DEVOCIONAL DIARIO
   ════════════════════════════════════════════════════════ */

function DevocionalTab({ assistant, showToast }) {
  const {
    devotional, devLoading, loadDevotional,
    userAnswer, setUserAnswer, answerSaved, saveDevotionalAnswer,
  } = assistant

  const { isSpeaking, toggle, stop } = useSpeech()

  useEffect(() => { return () => stop() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadDevotional() }, [])

  const handleSave = async () => {
    await saveDevotionalAnswer()
    showToast('✅ Reflexión guardada')
  }

  function buildDevotionalText() {
    if (!devotional) return ''
    return [
      devotional.verse,
      devotional.historicalContext && `Contexto histórico. ${devotional.historicalContext}`,
      devotional.centralTeaching   && `Enseñanza central. ${devotional.centralTeaching}`,
      devotional.deepDive          && `Profundizando. ${devotional.deepDive}`,
      devotional.christianValue    && `Valor cristiano. ${devotional.christianValue}`,
      devotional.lifeConnection    && `Para hoy. ${devotional.lifeConnection}`,
      devotional.meditationQuestion && `Para meditar. ${devotional.meditationQuestion}`,
      devotional.prayer            && `Oración. ${devotional.prayer}`,
    ].filter(Boolean).join('. ')
  }

  if (devLoading) return (
    <div className="dev-loading"><div className="spinner" /><p>Preparando tu devocional de hoy...</p></div>
  )

  if (!devotional) return (
    <div className="dev-loading">
      <p>No se pudo cargar el devocional.</p>
      <button className="dev-retry-btn" onClick={loadDevotional}>Reintentar</button>
    </div>
  )

  return (
    <div className="dev-container">

      <div className="dev-verse-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="dev-verse-icon">✝️</div>
          <button
            onClick={() => toggle(buildDevotionalText())}
            style={{
              background: isSpeaking ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
              cursor: 'pointer', color: '#fff', padding: '5px 7px',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
            }}
          >
            {isSpeaking ? <IconVolumeOff /> : <IconVolumeOn />}
            {isSpeaking ? 'Detener' : 'Escuchar'}
          </button>
        </div>
        <p className="dev-verse-text">"{devotional.verse}"</p>
        {devotional.verseRef && (
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8, fontStyle: 'normal', fontWeight: 600 }}>
            — {devotional.verseRef}
          </p>
        )}
      </div>

      {devotional.historicalContext && (
        <div className="dev-section">
          <h3 className="dev-section-title">📜 Contexto histórico</h3>
          <p className="dev-section-body">{devotional.historicalContext}</p>
        </div>
      )}
      {devotional.centralTeaching && (
        <div className="dev-section">
          <h3 className="dev-section-title">💡 Enseñanza central</h3>
          <p className="dev-section-body">{devotional.centralTeaching}</p>
        </div>
      )}
      {devotional.deepDive && (
        <div className="dev-section">
          <h3 className="dev-section-title">📚 Profundizando</h3>
          <p className="dev-section-body">{devotional.deepDive}</p>
        </div>
      )}
      {devotional.christianValue && (
        <div className="dev-section">
          <h3 className="dev-section-title">🌱 Valor cristiano</h3>
          <p className="dev-section-body">{devotional.christianValue}</p>
        </div>
      )}
      {devotional.lifeConnection && (
        <div className="dev-section dev-question">
          <h3 className="dev-section-title">⚡ Para hoy</h3>
          <p className="dev-section-body">{devotional.lifeConnection}</p>
        </div>
      )}
      <div className="dev-section dev-question">
        <h3 className="dev-section-title">🤔 Para meditar</h3>
        <p className="dev-section-body">{devotional.meditationQuestion ?? devotional.question}</p>
      </div>
      {devotional.prayer && (
        <div className="dev-section" style={{
          background: 'var(--bg2)', borderRadius: 14,
          padding: 16, borderTop: '3px solid var(--accent)',
        }}>
          <h3 className="dev-section-title">🙏 Oración</h3>
          <p className="dev-section-body" style={{ fontStyle: 'italic', lineHeight: 1.8 }}>
            {devotional.prayer}
          </p>
        </div>
      )}

      <div className="dev-section">
        <h3 className="dev-section-title">✏️ Tu reflexión personal</h3>
        <textarea
          className="dev-answer-input"
          placeholder="¿Qué te habló Dios hoy a través de esto? Escribilo acá..."
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          rows={4}
          disabled={answerSaved}
        />
        {!answerSaved ? (
          <button className="dev-save-btn" onClick={handleSave} disabled={!userAnswer.trim()}>
            Guardar reflexión
          </button>
        ) : (
          <p className="dev-saved-msg">✅ Reflexión guardada para hoy</p>
        )}
      </div>

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   TAB 3 — BRIEFING DIARIO
   ════════════════════════════════════════════════════════ */

function BriefingTab({ assistant }) {
  const { briefing, briefLoading, loadBriefing } = assistant
  useEffect(() => { loadBriefing() }, [])

  if (briefLoading) return (
    <div className="dev-loading"><div className="spinner" /><p>Analizando tu día...</p></div>
  )
  if (!briefing) return (
    <div className="dev-loading">
      <p>No se pudo generar el briefing.</p>
      <button className="dev-retry-btn" onClick={loadBriefing}>Reintentar</button>
    </div>
  )

  return (
    <div className="dev-container">
      <div className="brief-card">
        <p className="brief-date">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{briefing}</p>
      </div>
      <button className="dev-retry-btn" onClick={() => { assistant.briefing = null; loadBriefing() }}>
        🔄 Regenerar
      </button>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ONBOARDING
   ════════════════════════════════════════════════════════ */
function AssistantOnboarding({ onSave }) {
  const [name,   setName]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim())
    setSaving(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '32px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
        ¡Hola! Soy tu asistente personal
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32, lineHeight: 1.6 }}>
        Voy a acompañarte en tu fe, tu estudio y tu crecimiento. ¿Cómo querés llamarme?
      </p>
      <input
        type="text"
        placeholder="Ej: Elías, Rafa, Sam..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        style={{
          width: '100%', maxWidth: 280, padding: '14px 16px', fontSize: 16,
          borderRadius: 14, border: '1.5px solid var(--border)',
          background: 'var(--bg2)', color: 'var(--text)',
          textAlign: 'center', fontFamily: 'var(--sans)', marginBottom: 16, outline: 'none',
        }}
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        style={{
          width: '100%', maxWidth: 280, padding: '14px 0', borderRadius: 14,
          background: 'var(--accent)', color: 'var(--accent-fg)',
          border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          opacity: (!name.trim() || saving) ? 0.4 : 1,
          fontFamily: 'var(--sans)', marginTop: 0,
        }}
      >
        {saving ? 'Guardando...' : `Listo, te llamo ${name || '...'}`}
      </button>
    </div>
  )
}