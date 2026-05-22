/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AssistantScreen.jsx              ║
║                                                          ║
║  Pantalla del asistente personal con 3 tabs:             ║
║  - Chat libre con Gemini + búsqueda web                  ║
║  - Devocional diario                                     ║
║  - Briefing diario                                       ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }         from '../../context/AppContext'
import { useStats }       from '../../hooks/useStats'
import { useAssistant }   from '../../hooks/useAssistant'

/* ── Íconos simples como componentes ───────────────────── */
const IconSend    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconSearch  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconSave    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const IconTrash   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
const IconBook    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>


/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════ */

export default function AssistantScreen() {
 const {
    displayName, assistantName, updateAssistantName,
    habits, habitLogs,
    tasks, goals, getTasksForDate, createNote, showToast,
  } = useApp()

  /* ── Construir habitStats con useStats ──────────────── */
  const { habitStats, bestStreak } = useStats({ 
    notes: [], habits, habitLogs, tasks 
  })

  /* ── Tareas de hoy ───────────────────────────────────── */
  const todayStr    = new Date().toISOString().slice(0, 10)
  const tasksToday  = getTasksForDate(todayStr)

  /* ── contextData para el hook ───────────────────────── */
  const contextData = {
    displayName: displayName || 'Lucas',
    habitStats,
    tasksToday,
    goals,
    bestStreak,
  }

  const assistant = useAssistant({ contextData })

  /* ── Tab activo ──────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('chat')
  if (!assistantName) {
    return <AssistantOnboarding onSave={updateAssistantName} />
  }
  return (
    <div className="assistant-screen">

      {/* ── Tabs ─────────────────────────────────────── */}
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

      {/* ── Contenido según tab activo ───────────────── */}
      <div className="assistant-content">
        {activeTab === 'chat' && <ChatTab assistant={assistant} assistantName={assistantName} createNote={createNote} showToast={showToast} />}
        {activeTab === 'devocional' && <DevocionalTab assistant={assistant} showToast={showToast}  />}
        {activeTab === 'briefing'   && <BriefingTab   assistant={assistant} />}
      </div>

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   TAB 1 — CHAT LIBRE
   ════════════════════════════════════════════════════════ */

function ChatTab({ assistant, assistantName, createNote,showToast }) {
  const { messages, loading, error, sendMessage, clearChat, saveLastResponseAsNote } = assistant

  const [input,     setInput]     = useState('')
  const [useSearch, setUseSearch] = useState(false)
  const bottomRef = useRef(null)

  /* Scroll automático al último mensaje */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim(), useSearch)
    setInput('')
  }

  const handleSaveNote = async () => {
    const note = await saveLastResponseAsNote(createNote)
    if (note) showToast('✅ Guardado como apunte')
  }

  return (
    <div className="chat-container">

      {/* ── Mensajes ─────────────────────────────────── */}
      <div className="chat-messages">

        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Hola, soy {assistantName} 👋</p>
            <p className="chat-empty-sub">Preguntame lo que quieras. Puedo buscar en internet, resumir apuntes, explicar temas o simplemente charlar.</p>
            <div className="chat-suggestions">
              {[
                '¿Cuál es el versículo del día para mi situación?',
                'Explicame recursión con una analogía simple',
                '¿Cómo maximizo mis ingresos con barbería + facu?',
              ].map(s => (
                <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-bubble">
              {/* Texto del mensaje — respeta saltos de línea */}
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>

              {/* Fuentes web si usó búsqueda */}
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

            {/* Botón guardar como apunte (solo en respuestas del asistente) */}
            {msg.role === 'assistant' && i === messages.length - 1 && (
              <button className="chat-save-btn" onClick={handleSaveNote} title="Guardar como apunte">
                <IconSave /> Guardar apunte
              </button>
            )}
          </div>
        ))}

        {/* Indicador de carga */}
        {loading && (
          <div className="chat-msg assistant">
            <div className="chat-bubble chat-loading">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="chat-error">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────── */}
      <div className="chat-input-area">

        {/* Toggle búsqueda web */}
        <div className="chat-search-toggle">
          <button
            className={`search-toggle-btn ${useSearch ? 'active' : ''}`}
            onClick={() => setUseSearch(v => !v)}
          >
            <IconSearch />
            {useSearch ? 'Búsqueda ON' : 'Búsqueda OFF'}
          </button>

          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat} title="Limpiar chat">
              <IconTrash />
            </button>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder="Escribí tu mensaje..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={2}
          />
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

  useEffect(() => { loadDevotional() }, [])

  const handleSave = async () => {
    await saveDevotionalAnswer()
    showToast('✅ Reflexión guardada')
  }

  if (devLoading) return (
    <div className="dev-loading">
      <div className="spinner" />
      <p>Preparando tu devocional de hoy...</p>
    </div>
  )

  if (!devotional) return (
    <div className="dev-loading">
      <p>No se pudo cargar el devocional.</p>
      <button className="dev-retry-btn" onClick={loadDevotional}>Reintentar</button>
    </div>
  )

  return (
    <div className="dev-container">

      {/* ── Versículo central ── */}
      <div className="dev-verse-card">
        <div className="dev-verse-icon">✝️</div>
        <p className="dev-verse-text">"{devotional.verse}"</p>
        {devotional.verseRef && (
          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8, fontStyle: 'normal', fontWeight: 600 }}>
            — {devotional.verseRef}
          </p>
        )}
      </div>

      {/* ── Contexto histórico ── */}
      {devotional.historicalContext && (
        <div className="dev-section">
          <h3 className="dev-section-title">📜 Contexto histórico</h3>
          <p className="dev-section-body">{devotional.historicalContext}</p>
        </div>
      )}

     {/* ── Enseñanza central ── */}
      {devotional.centralTeaching && (
        <div className="dev-section">
          <h3 className="dev-section-title">💡 Enseñanza central</h3>
          <p className="dev-section-body">{devotional.centralTeaching}</p>
        </div>
      )}

      {/* ── Profundizando ── */}
      {devotional.deepDive && (
        <div className="dev-section">
          <h3 className="dev-section-title">📚 Profundizando</h3>
          <p className="dev-section-body">{devotional.deepDive}</p>
        </div>
      )}

      {/* ── Valor cristiano ── */}
      {devotional.christianValue && (
        <div className="dev-section">
          <h3 className="dev-section-title">🌱 Valor cristiano</h3>
          <p className="dev-section-body">{devotional.christianValue}</p>
        </div>
      )}

      {/* ── Aplicación práctica ── */}
      {devotional.practicalApplication && (
        <div className="dev-section dev-question">
          <h3 className="dev-section-title">⚡ Para hoy</h3>
          <p className="dev-section-body">{devotional.practicalApplication}</p>
        </div>
      )}

      {/* ── Pregunta para meditar ── */}
      <div className="dev-section dev-question">
        <h3 className="dev-section-title">🤔 Para meditar</h3>
        <p className="dev-section-body">
          {devotional.meditationQuestion ?? devotional.question}
        </p>
      </div>

      {/* ── Oración ── */}
      {devotional.prayer && (
        <div className="dev-section" style={{
          background: 'var(--bg2)',
          borderRadius: 14,
          padding: 16,
          borderTop: '3px solid var(--accent)',
        }}>
          <h3 className="dev-section-title">🙏 Oración</h3>
          <p className="dev-section-body" style={{ fontStyle: 'italic', lineHeight: 1.8 }}>
            {devotional.prayer}
          </p>
        </div>
      )}

      {/* ── Tu respuesta personal ── */}
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
          <button
            className="dev-save-btn"
            onClick={handleSave}
            disabled={!userAnswer.trim()}
          >
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
    <div className="dev-loading">
      <div className="spinner" />
      <p>Analizando tu día...</p>
    </div>
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
   ONBOARDING — Primera vez que abrís el asistente
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
        Voy a acompañarte en tu fe, tu estudio y tu crecimiento.
        ¿Cómo querés llamarme?
      </p>
      <input
        type="text"
        placeholder="Ej: Elías, Rafa, Sam..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        style={{
          width: '100%', maxWidth: 280,
          padding: '14px 16px', fontSize: 16,
          borderRadius: 14, border: '1.5px solid var(--border)',
          background: 'var(--bg2)', color: 'var(--text)',
          textAlign: 'center', fontFamily: 'var(--sans)',
          marginBottom: 16, outline: 'none',
        }}
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={!name.trim() || saving}
        style={{
          width: '100%', maxWidth: 280,
          padding: '14px 0', borderRadius: 14,
          background: 'var(--accent)', color: 'var(--accent-fg)',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          opacity: (!name.trim() || saving) ? 0.4 : 1,
          fontFamily: 'var(--sans)', marginTop: 0,
        }}
      >
        {saving ? 'Guardando...' : `Listo, te llamo ${name || '...'}`}
      </button>
    </div>
  )
}