/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AssistantScreen.jsx              ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Nueva tab "💰 Fin" con análisis financiero completo   ║
║  ✦ Rentabilidad barbería, presupuesto, ahorro, padres    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }       from '../../context/AppContext'
import { useStats }     from '../../hooks/useStats'
import { useAssistant } from '../../hooks/useAssistant'
import { useSpeech }    from '../../hooks/useSpeech'

const IconSend     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconSearch   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconSave     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const IconTrash    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
const IconMic      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconVolumeOn  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
const IconVolumeOff = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
const IconCalendar  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconRefresh   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>

const SESSION_STYLES = {
  normal:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  color: '#3b82f6', emoji: '📖', label: 'Estudio'   },
  intensivo: { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  color: '#f97316', emoji: '🔥', label: 'Intensivo' },
  repaso:    { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)',  color: '#8b5cf6', emoji: '🔄', label: 'Repaso'    },
}

const HABIT_ESTADO = {
  excelente: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: '🟢 Excelente' },
  bueno:     { color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   label: '🔵 Bueno'     },
  riesgo:    { color: '#d97706', bg: 'rgba(217,119,6,0.1)',   label: '🟡 En riesgo' },
  critico:   { color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   label: '🔴 Crítico'   },
}

const BUDGET_COLORS = {
  bien:   '#16a34a',
  ok:     '#2563eb',
  riesgo: '#dc2626',
}

function htmlToText(html = '') { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
function formatDate(s) { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) }
function daysUntil(s) { if (!s) return null; const t = new Date(s + 'T00:00:00'), today = new Date(); today.setHours(0,0,0,0); return Math.round((t - today) / 86400000) }
function formatMoney(n) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0) }


export default function AssistantScreen() {
  const {
    displayName, assistantName, updateAssistantName,
    habits, habitLogs, tasks, goals, notes, cats,
    getTasksForDate, createNote, createTask, showToast, pushTo, navTo,
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

  if (!assistantName) return <AssistantOnboarding onSave={updateAssistantName} />

  return (
    <div className="assistant-screen">
      <div className="assistant-tabs">
        {[
          { id: 'chat',     label: '💬'  },
          { id: 'devo',     label: '✝️'  },
          { id: 'plan',     label: '📚'  },
          { id: 'coach',    label: '💪'  },
          { id: 'finanzas', label: '💰'  },
          { id: 'briefing', label: '📋'  },
        ].map(tab => (
          <button key={tab.id} className={`assistant-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ fontSize: 18 }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="assistant-content">
        {activeTab === 'chat'     && <ChatTab       assistant={assistant} assistantName={assistantName} createNote={createNote} showToast={showToast} pushTo={pushTo} cats={cats} />}
        {activeTab === 'devo'     && <DevocionalTab assistant={assistant} showToast={showToast} />}
        {activeTab === 'plan'     && <StudyPlanTab  assistant={assistant} notes={notes} cats={cats} createTask={createTask} createNote={createNote} showToast={showToast} navTo={navTo} assistantName={assistantName} />}
        {activeTab === 'coach'    && <HabitCoachTab assistant={assistant} habitStats={habitStats} habitLogs={habitLogs} assistantName={assistantName} showToast={showToast} />}
        {activeTab === 'finanzas' && <FinanzasTab   assistant={assistant} assistantName={assistantName} showToast={showToast} />}
        {activeTab === 'briefing' && <BriefingTab   assistant={assistant} />}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   CHAT
   ════════════════════════════════════════════════════════ */
function ChatTab({ assistant, assistantName, createNote, showToast, pushTo, cats }) {
  const { messages, loading, error, sendMessage, clearChat, saveLastResponseAsNote } = assistant
  const [input, setInput]         = useState('')
  const [useSearch, setUseSearch] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const bottomRef      = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { return () => recognitionRef.current?.abort() }, [])

  const handleSend = () => { if (!input.trim()) return; sendMessage(input.trim(), useSearch); setInput('') }

  function handleMic() {
    if (listening) { recognitionRef.current?.abort(); setListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { showToast('Tu navegador no soporta reconocimiento de voz'); return }
    const r = new SR(); r.lang = 'es-AR'; r.continuous = false; r.interimResults = false
    r.onresult = e => { setInput(p => p ? `${p} ${e.results[0][0].transcript}` : e.results[0][0].transcript); setListening(false) }
    r.onerror  = e => { if (e.error !== 'aborted') showToast('No se pudo escuchar'); setListening(false) }
    r.onend    = () => setListening(false)
    recognitionRef.current = r; r.start(); setListening(true)
  }

  const handleSaveNote = async () => {
    const note = await saveLastResponseAsNote(createNote, cats?.[0]?.id ?? null)
    if (note?.id) { showToast('✅ Guardado como apunte'); setTimeout(() => pushTo('editor', { noteId: note.id, title: note.title }), 1000) }
    else showToast('Error al guardar')
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">Hola, soy {assistantName} 👋</p>
            <p className="chat-empty-sub">Preguntame lo que quieras — código, ideas, dudas, lo que sea.</p>
            <div className="chat-suggestions">
              {['¿Podés explicarme qué es la recursión?','¿Cómo organizo mejor mi tiempo?','¿Qué es la programación orientada a objetos?'].map(s => (
                <button key={s} className="chat-suggestion" onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className="chat-bubble">
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
              {msg.sources?.length > 0 && <div className="chat-sources"><span className="chat-sources-label">Fuentes:</span>{msg.sources.map((s, j) => <a key={j} href={s.url} target="_blank" rel="noreferrer" className="chat-source-link">{s.title || s.url}</a>)}</div>}
            </div>
            {msg.role === 'assistant' && i === messages.length - 1 && <button className="chat-save-btn" onClick={handleSaveNote}><IconSave /> Guardar como apunte</button>}
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="chat-bubble chat-loading"><span className="dot"/><span className="dot"/><span className="dot"/></div></div>}
        {error && <div className="chat-error">⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>
      {listening && <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444', flexShrink: 0 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'dotBounce .9s infinite' }} />Escuchando...</div>}
      <div className="chat-input-area">
        <div className="chat-search-toggle">
          <button className={`search-toggle-btn ${useSearch ? 'active' : ''}`} onClick={() => setUseSearch(v => !v)}><IconSearch />{useSearch ? 'Búsqueda ON' : 'Búsqueda OFF'}</button>
          {messages.length > 0 && <button className="clear-btn" onClick={clearChat}><IconTrash /></button>}
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" placeholder={listening ? 'Escuchando...' : 'Escribí tu mensaje...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} rows={2} />
          <button onClick={handleMic} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: listening ? '#ef4444' : 'var(--bg2)', color: listening ? '#fff' : 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transition: 'all .2s', boxShadow: listening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none' }}><IconMic /></button>
          <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}><IconSend /></button>
        </div>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   DEVOCIONAL
   ════════════════════════════════════════════════════════ */
function DevocionalTab({ assistant, showToast }) {
  const { devotional, devLoading, loadDevotional, userAnswer, setUserAnswer, answerSaved, saveDevotionalAnswer } = assistant
  const { isSpeaking, toggle, stop } = useSpeech()
  useEffect(() => { return () => stop() }, []) // eslint-disable-line
  useEffect(() => { loadDevotional() }, [])
  const handleSave = async () => { await saveDevotionalAnswer(); showToast('✅ Reflexión guardada') }
  function buildText() {
    if (!devotional) return ''
    return [devotional.verse, devotional.historicalContext && `Contexto. ${devotional.historicalContext}`, devotional.centralTeaching && `Enseñanza. ${devotional.centralTeaching}`, devotional.deepDive && `Profundizando. ${devotional.deepDive}`, devotional.christianValue && `Valor. ${devotional.christianValue}`, devotional.lifeConnection && `Para hoy. ${devotional.lifeConnection}`, devotional.meditationQuestion && `Para meditar. ${devotional.meditationQuestion}`, devotional.prayer && `Oración. ${devotional.prayer}`].filter(Boolean).join('. ')
  }
  if (devLoading) return <div className="dev-loading"><div className="spinner"/><p>Preparando tu devocional...</p></div>
  if (!devotional) return <div className="dev-loading"><p>No se pudo cargar.</p><button className="dev-retry-btn" onClick={loadDevotional}>Reintentar</button></div>
  return (
    <div className="dev-container">
      <div className="dev-verse-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="dev-verse-icon">✝️</div>
          <button onClick={() => toggle(buildText())} style={{ background: isSpeaking ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '5px 7px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
            {isSpeaking ? <IconVolumeOff /> : <IconVolumeOn />}{isSpeaking ? 'Detener' : 'Escuchar'}
          </button>
        </div>
        <p className="dev-verse-text">"{devotional.verse}"</p>
        {devotional.verseRef && <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8, fontStyle: 'normal', fontWeight: 600 }}>— {devotional.verseRef}</p>}
      </div>
      {devotional.historicalContext && <div className="dev-section"><h3 className="dev-section-title">📜 Contexto histórico</h3><p className="dev-section-body">{devotional.historicalContext}</p></div>}
      {devotional.centralTeaching   && <div className="dev-section"><h3 className="dev-section-title">💡 Enseñanza central</h3><p className="dev-section-body">{devotional.centralTeaching}</p></div>}
      {devotional.deepDive          && <div className="dev-section"><h3 className="dev-section-title">📚 Profundizando</h3><p className="dev-section-body">{devotional.deepDive}</p></div>}
      {devotional.christianValue    && <div className="dev-section"><h3 className="dev-section-title">🌱 Valor cristiano</h3><p className="dev-section-body">{devotional.christianValue}</p></div>}
      {devotional.lifeConnection    && <div className="dev-section dev-question"><h3 className="dev-section-title">⚡ Para hoy</h3><p className="dev-section-body">{devotional.lifeConnection}</p></div>}
      <div className="dev-section dev-question"><h3 className="dev-section-title">🤔 Para meditar</h3><p className="dev-section-body">{devotional.meditationQuestion ?? devotional.question}</p></div>
      {devotional.prayer && <div className="dev-section" style={{ background: 'var(--bg2)', borderRadius: 14, padding: 16, borderTop: '3px solid var(--accent)' }}><h3 className="dev-section-title">🙏 Oración</h3><p className="dev-section-body" style={{ fontStyle: 'italic', lineHeight: 1.8 }}>{devotional.prayer}</p></div>}
      <div className="dev-section">
        <h3 className="dev-section-title">✏️ Tu reflexión personal</h3>
        <textarea className="dev-answer-input" placeholder="¿Qué te habló Dios hoy?" value={userAnswer} onChange={e => setUserAnswer(e.target.value)} rows={4} disabled={answerSaved} />
        {!answerSaved ? <button className="dev-save-btn" onClick={handleSave} disabled={!userAnswer.trim()}>Guardar reflexión</button> : <p className="dev-saved-msg">✅ Reflexión guardada para hoy</p>}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   PLAN DE ESTUDIO
   ════════════════════════════════════════════════════════ */
function StudyPlanTab({ assistant, notes, cats, createTask, createNote, showToast, navTo, assistantName }) {
  const { studyPlan, studyLoading, generateStudyPlan, resetStudyPlan } = assistant
  const [materia, setMateria]               = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [fechaInicio, setFechaInicio]       = useState(getTomorrow())
  const [dias, setDias]                     = useState(7)
  const [horas, setHoras]                   = useState(2)
  const [fechaExamen, setFechaExamen]       = useState('')
  const [exported, setExported]             = useState(false)
  const [exporting, setExporting]           = useState(false)
  const [expandedIdx, setExpandedIdx]       = useState(null)
  const diasHastaExamen = fechaExamen ? daysUntil(fechaExamen) : null

  async function handleGenerate() {
    if (!materia.trim()) { showToast('Escribí la materia primero'); return }
    const selectedNote = notes.find(n => n.id === selectedNoteId)
    setExported(false); setExpandedIdx(null)
    await generateStudyPlan({ materia: materia.trim(), noteContent: selectedNote ? htmlToText(selectedNote.content) : '', diasDisponibles: dias, horasPorDia: horas, fechaInicio, fechaExamen: fechaExamen || null })
  }

  async function handleExport() {
    if (!studyPlan?.sessions || exporting) return
    setExporting(true)
    for (const s of studyPlan.sessions) await createTask({ title: `📚 ${s.title}`, date: s.date, completed: false })
    setExporting(false); setExported(true)
    showToast(`✅ ${studyPlan.sessions.length} sesiones exportadas al calendario`)
  }

  async function handleSavePlan() {
    if (!studyPlan?.sessions) return
    const content = [`<h2>${studyPlan.title}</h2>`, ...studyPlan.sessions.map(s => `<h3>${SESSION_STYLES[s.type]?.emoji||'📖'} ${s.dayName} ${formatDate(s.date)} — ${s.title}</h3><ul>${s.topics.map(t=>`<li>${t}</li>`).join('')}</ul><p><em>💡 ${s.tip}</em></p>`), `<h2>Tips</h2><ul>${studyPlan.tips?.map(t=>`<li>${t}</li>`).join('')||''}</ul>`].join('\n')
    await createNote({ title: studyPlan.title, content, categoryId: cats[0]?.id ?? null })
    showToast('✅ Plan guardado como apunte')
  }

  if (!studyPlan && !studyLoading) {
    return (
      <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
        <div style={{ marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📚 Plan de estudio</h2><p style={{ fontSize: 13, color: 'var(--text2)' }}>{assistantName || 'El asistente'} va a crear un plan personalizado para vos.</p></div>
        <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>¿Qué materia o tema?</label><input type="text" value={materia} onChange={e => setMateria(e.target.value)} placeholder="Ej: Cálculo 2, Algoritmos..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)', boxSizing: 'border-box' }} /></div>
        <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Apunte base (opcional)</label><select value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)' }}><option value="">Sin apunte — usar solo el tema</option>{notes.map(n => { const c = cats.find(c => c.id === n.category_id); return <option key={n.id} value={n.id}>{c ? `${c.emoji} ` : ''}{n.title}</option> })}</select></div>
        <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>¿Cuándo empezás?</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)', boxSizing: 'border-box' }} /></div>
        <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Días disponibles: <span style={{ color: 'var(--accent)' }}>{dias} días</span></label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{[3,5,7,10,14,21,30].map(d => <button key={d} onClick={() => setDias(d)} style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${dias===d?'var(--accent)':'var(--border)'}`, background: dias===d?'var(--accent)':'var(--bg2)', color: dias===d?'var(--accent-fg)':'var(--text)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>{d}d</button>)}</div></div>
        <div style={{ marginBottom: 16 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Horas por sesión: <span style={{ color: 'var(--accent)' }}>{horas}h</span></label><div style={{ display: 'flex', gap: 6 }}>{[1,1.5,2,3].map(h => <button key={h} onClick={() => setHoras(h)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1.5px solid ${horas===h?'var(--accent)':'var(--border)'}`, background: horas===h?'var(--accent)':'var(--bg2)', color: horas===h?'var(--accent-fg)':'var(--text)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>{h}h</button>)}</div></div>
        <div style={{ marginBottom: 24 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Fecha del examen (opcional)</label><input type="date" value={fechaExamen} onChange={e => setFechaExamen(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${fechaExamen?'var(--accent)':'var(--border)'}`, background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)', boxSizing: 'border-box' }} />{diasHastaExamen !== null && <p style={{ fontSize: 12, marginTop: 4, color: diasHastaExamen<=3?'#ef4444':diasHastaExamen<=7?'#f97316':'#16a34a', fontWeight: 600 }}>{diasHastaExamen>0?`⏳ Quedan ${diasHastaExamen} días`:diasHastaExamen===0?'🎯 El examen es hoy':'⚠️ La fecha ya pasó'}</p>}</div>
        <button onClick={handleGenerate} disabled={!materia.trim()} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: materia.trim()?'var(--accent)':'var(--bg3)', color: materia.trim()?'var(--accent-fg)':'var(--text3)', fontSize: 15, fontWeight: 700, cursor: materia.trim()?'pointer':'not-allowed', fontFamily: 'var(--sans)' }}>✨ Generar plan con {assistantName || 'el asistente'}</button>
      </div>
    )
  }

  if (studyLoading) return <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight: 600 }}>Creando tu plan...</p></div>
  if (studyPlan?.error) return <div className="dev-loading"><p style={{ color: 'var(--danger)' }}>⚠️ {studyPlan.error}</p><button className="dev-retry-btn" onClick={resetStudyPlan} style={{ marginTop: 12 }}>← Volver</button></div>

  const sessions = studyPlan?.sessions || []
  const tips     = studyPlan?.tips     || []
  const diasExamen = studyPlan?.examDate ? daysUntil(studyPlan.examDate) : null

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{studyPlan.title}</h2><p style={{ fontSize: 12, color: 'var(--text2)' }}>{sessions.length} sesiones · {horas}h por sesión</p></div>
          <button onClick={resetStudyPlan} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)' }}><IconRefresh /> Nuevo</button>
        </div>
        {studyPlan.examDate && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: diasExamen!==null&&diasExamen<=3?'rgba(239,68,68,0.08)':'var(--bg2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ color: 'var(--text2)' }}>Hoy</span><span style={{ fontWeight: 600, color: diasExamen!==null&&diasExamen<=3?'#ef4444':'var(--text)' }}>{diasExamen!==null&&diasExamen>0?`🎯 Examen en ${diasExamen} días`:diasExamen===0?'🎯 ¡Hoy es el examen!':`📅 Examen: ${formatDate(studyPlan.examDate)}`}</span></div>
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3 }}><div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${Math.min(100, (sessions.length/Math.max(sessions.length,1))*100)}%` }} /></div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>{Object.entries(SESSION_STYLES).map(([t,s]) => <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text2)' }}><span>{s.emoji}</span><span>{s.label}</span></div>)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {sessions.map((session, i) => {
          const style = SESSION_STYLES[session.type] || SESSION_STYLES.normal
          const expanded = expandedIdx === i
          return (
            <div key={i} onClick={() => setExpandedIdx(expanded?null:i)} style={{ background: style.bg, border: `1.5px solid ${style.border}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: style.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{style.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 12, color: style.color, fontWeight: 700 }}>{session.dayName} {formatDate(session.date)}</span><span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>⏱ {session.duration}</span></div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '2px 0 0' }}>{session.title}</p>
                  {!expanded && session.topics?.length > 0 && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{session.topics.slice(0,2).join(' · ')}{session.topics.length>2?' ...':''}</p>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>{expanded?'▲':'▼'}</span>
              </div>
              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${style.border}` }}>
                  {session.topics?.length > 0 && <div style={{ marginBottom: 8 }}><p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Temas</p>{session.topics.map((t,j) => <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}><span style={{ color: style.color, fontSize: 12, flexShrink: 0, marginTop: 1 }}>•</span><span style={{ fontSize: 13, color: 'var(--text)' }}>{t}</span></div>)}</div>}
                  {session.tip && <div style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 8, fontSize: 12, color: 'var(--text2)', borderLeft: `3px solid ${style.color}` }}>💡 {session.tip}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {tips.length > 0 && <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>💡 Consejos</p>{tips.map((tip,i) => <div key={i} style={{ display: 'flex', gap: 8, marginBottom: i<tips.length-1?8:0 }}><span style={{ color: 'var(--accent)', flexShrink: 0 }}>→</span><span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{tip}</span></div>)}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!exported ? <button onClick={handleExport} disabled={exporting} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: exporting?0.6:1 }}>{exporting?<><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Exportando...</>:<><IconCalendar />Exportar al calendario ({sessions.length} sesiones)</>}</button> : <div style={{ display: 'flex', gap: 8 }}><div style={{ flex: 2, padding: '13px 0', borderRadius: 14, textAlign: 'center', background: 'rgba(16,185,129,0.1)', color: '#16a34a', fontSize: 13, fontWeight: 700 }}>✅ Exportado</div><button onClick={() => navTo('calendar')} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Ver →</button></div>}
        <button onClick={handleSavePlan} style={{ width: '100%', padding: '12px 0', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><IconSave />Guardar como apunte</button>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   COACH DE HÁBITOS
   ════════════════════════════════════════════════════════ */
function HabitCoachTab({ assistant, habitStats, habitLogs, assistantName, showToast }) {
  const { habitAnalysis, habitLoading, analyzeHabits, resetHabitAnalysis } = assistant
  const [expandedHabit, setExpandedHabit] = useState(null)

  function getLocalStats(h) {
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
    const logs30 = habitLogs.filter(l => l.habit_id === h.id && new Date(l.date+'T00:00:00') >= hace30)
    const tasa = Math.round((logs30.length / 30) * 100)
    const dias7 = h.last7.filter(d => d.done).length
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const hace7 = new Date(hoy); hace7.setDate(hoy.getDate()-7)
    const hace14 = new Date(hoy); hace14.setDate(hoy.getDate()-14)
    const hace7a14 = habitLogs.filter(l => { if(l.habit_id!==h.id) return false; const d=new Date(l.date+'T00:00:00'); return d>=hace14&&d<hace7 }).length
    const tendencia = dias7>hace7a14?'↑':dias7<hace7a14?'↓':'→'
    const estado = tasa>=70?'excelente':tasa>=40?'bueno':tasa>=20?'riesgo':'critico'
    const porDia = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((nombre,dow) => ({ nombre, total: habitLogs.filter(l => l.habit_id===h.id && new Date(l.date+'T00:00:00').getDay()===dow).length }))
    const maxDia = Math.max(...porDia.map(d => d.total), 1)
    return { tasa, dias7, tendencia, estado, porDia, maxDia }
  }

  if (habitStats.length === 0) return <div className="dev-loading"><p style={{ fontSize: 36, marginBottom: 8 }}>💪</p><p style={{ fontWeight: 600, color: 'var(--text)' }}>No tenés hábitos definidos</p><p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Creá algunos hábitos desde el Calendario.</p></div>

  if (habitAnalysis && !habitLoading) {
    if (habitAnalysis.error) return <div className="dev-loading"><p style={{ color: 'var(--danger)' }}>⚠️ {habitAnalysis.error}</p><button className="dev-retry-btn" onClick={resetHabitAnalysis} style={{ marginTop: 12 }}>← Volver</button></div>
    return (
      <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>💪 Análisis de hábitos</h2>
          <button onClick={resetHabitAnalysis} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)' }}><IconRefresh /> Nuevo</button>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, borderLeft: '4px solid var(--accent)' }}><p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{habitAnalysis.resumen}</p></div>
        {habitAnalysis.habitoFoco && <div style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 24 }}>🎯</span><div><p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Hábito foco esta semana</p><p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{habitAnalysis.habitoFoco}</p></div></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {(habitAnalysis.habitos || []).map((h, i) => {
            const estilo = HABIT_ESTADO[h.estado] || HABIT_ESTADO.bueno
            const localH = habitStats.find(s => s.name === h.nombre)
            const expanded = expandedHabit === i
            return (
              <div key={i} onClick={() => setExpandedHabit(expanded?null:i)} style={{ background: estilo.bg, border: `1.5px solid ${estilo.color}40`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: estilo.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{localH?.emoji||'⚡'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{h.nombre}</span><span style={{ fontSize: 11, fontWeight: 600, color: estilo.color, background: estilo.bg, padding: '2px 8px', borderRadius: 20, border: `1px solid ${estilo.color}40` }}>{estilo.label}</span></div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{h.patron}</p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>{expanded?'▲':'▼'}</span>
                </div>
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${estilo.color}30` }}>
                    {h.causa_probable && <div style={{ marginBottom: 10 }}><p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>🔍 Causa probable</p><p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{h.causa_probable}</p></div>}
                    {h.sugerencia && <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${estilo.color}` }}><p style={{ fontSize: 11, fontWeight: 700, color: estilo.color, marginBottom: 4 }}>💡 SUGERENCIA PARA ESTA SEMANA</p><p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{h.sugerencia}</p></div>}
                    {h.microajuste && <div style={{ padding: '10px 12px', background: 'rgba(22,163,74,0.08)', borderRadius: 10, border: '1px solid rgba(22,163,74,0.2)' }}><p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>⚡ MICRO-AJUSTE HOY MISMO</p><p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{h.microajuste}</p></div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {habitAnalysis.mensajeFinal && <div style={{ background: 'var(--accent)', borderRadius: 14, padding: '16px', color: 'var(--accent-fg)', marginBottom: 16 }}><p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>"{habitAnalysis.mensajeFinal}"</p><p style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>— {assistantName || 'Tu asistente'}</p></div>}
      </div>
    )
  }

  if (habitLoading) return <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight: 600 }}>Analizando tus patrones...</p></div>

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
      <div style={{ marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>💪 Coach de hábitos</h2><p style={{ fontSize: 13, color: 'var(--text2)' }}>{assistantName || 'El asistente'} va a detectar tus patrones y darte sugerencias concretas.</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {habitStats.map((h, i) => {
          const { tasa, dias7, tendencia, estado, porDia, maxDia } = getLocalStats(h)
          const estilo = HABIT_ESTADO[estado] || HABIT_ESTADO.bueno
          return (
            <div key={i} style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: estilo.color+'15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{h.emoji||'⚡'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{h.name}</span><span style={{ fontSize: 11, fontWeight: 600, color: estilo.color }}>{estilo.label}</span></div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 2 }}><span style={{ fontSize: 12, color: 'var(--text2)' }}>🔥 {h.streak}d</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>30d: <strong style={{ color: 'var(--text)' }}>{tasa}%</strong></span><span style={{ fontSize: 12, color: tendencia==='↑'?'#16a34a':tendencia==='↓'?'#dc2626':'var(--text2)', fontWeight: 700 }}>{tendencia}</span></div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Últimos 7 días ({dias7}/7)</p>
                <div style={{ display: 'flex', gap: 4 }}>{h.last7.map((day, j) => <div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><div style={{ width: '100%', height: 28, borderRadius: 6, background: day.done?(day.isRecovered?'#a78bfa':estilo.color):'var(--bg3)', opacity: day.done?1:0.4 }} /><span style={{ fontSize: 9, color: 'var(--text3)' }}>{['D','L','M','X','J','V','S'][new Date(day.dateStr+'T12:00:00').getDay()]}</span></div>)}</div>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Por día de semana (histórico)</p>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>{porDia.map((d,j) => <div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}><div style={{ width: '100%', background: estilo.color, borderRadius: '3px 3px 0 0', height: `${Math.max(4,(d.total/maxDia)*28)}px`, opacity: 0.8 }} /><span style={{ fontSize: 8, color: 'var(--text3)' }}>{d.nombre.slice(0,1)}</span></div>)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={() => analyzeHabits({ habitStats, habitLogs })} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        🤖 Analizar patrones con {assistantName || 'el asistente'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>Detecta en qué días fallás, por qué y cómo mejorar.</p>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ANÁLISIS FINANCIERO
   ════════════════════════════════════════════════════════ */
function FinanzasTab({ assistant, assistantName, showToast }) {
  const { financialAnalysis, financeLoading, analyzeFinances, resetFinancialAnalysis } = assistant

  const [ingresosBarberia,  setIngresosBarberia]  = useState('')
  const [horasSemana,       setHorasSemana]        = useState('')
  const [gastosBarberia,    setGastosBarberia]     = useState('')
  const [gastosPersonales,  setGastosPersonales]   = useState('')
  const [otrosIngresos,     setOtrosIngresos]      = useState('')
  const [metaAhorro,        setMetaAhorro]         = useState('')
  const [plazoMeses,        setPlazoMeses]         = useState('12')
  const [aportePadres,      setAportePadres]       = useState('')

  const canAnalyze = ingresosBarberia && horasSemana && gastosBarberia && gastosPersonales && metaAhorro

  async function handleAnalyze() {
    if (!canAnalyze) { showToast('Completá los campos obligatorios'); return }
    await analyzeFinances({ ingresosBarberia, horasSemana, gastosBarberia, gastosPersonales, otrosIngresos, metaAhorro, plazoMeses, aportePadres })
  }

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }
  const sectionStyle = { fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }

  /* ── Formulario ── */
  if (!financialAnalysis && !financeLoading) {
    return (
      <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>💰 Análisis financiero</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{assistantName || 'El asistente'} va a analizar tu situación y darte un plan concreto.</p>
        </div>

        {/* Barbería */}
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
          <p style={sectionStyle}>✂️ Barbería</p>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Ingresos brutos mensuales ($) *</label>
            <input type="number" value={ingresosBarberia} onChange={e=>setIngresosBarberia(e.target.value)} placeholder="Ej: 500000" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Horas/semana *</label>
              <input type="number" value={horasSemana} onChange={e=>setHorasSemana(e.target.value)} placeholder="Ej: 40" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Gastos fijos/mes ($) *</label>
              <input type="number" value={gastosBarberia} onChange={e=>setGastosBarberia(e.target.value)} placeholder="Ej: 150000" style={inputStyle} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Gastos: alquiler, productos, servicios, etc.</p>
        </div>

        {/* Gastos personales */}
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
          <p style={sectionStyle}>🏠 Gastos personales</p>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Total gastos personales/mes ($) *</label>
            <input type="number" value={gastosPersonales} onChange={e=>setGastosPersonales(e.target.value)} placeholder="Ej: 200000" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>Otros ingresos/mes ($) — opcional</label>
            <input type="number" value={otrosIngresos} onChange={e=>setOtrosIngresos(e.target.value)} placeholder="Ej: 50000 (facu, freelance...)" style={inputStyle} />
          </div>
        </div>

        {/* Metas */}
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 20 }}>
          <p style={sectionStyle}>🎯 Metas</p>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Meta de ahorro ($) *</label>
            <input type="number" value={metaAhorro} onChange={e=>setMetaAhorro(e.target.value)} placeholder="Ej: 1000000" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Plazo (meses)</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['6','12','18','24','36'].map(m => (
                  <button key={m} onClick={() => setPlazoMeses(m)} style={{ padding: '7px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${plazoMeses===m?'var(--accent)':'var(--border)'}`, background: plazoMeses===m?'var(--accent)':'transparent', color: plazoMeses===m?'var(--accent-fg)':'var(--text)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>{m}m</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Aporte mensual para padres ($) — opcional</label>
            <input type="number" value={aportePadres} onChange={e=>setAportePadres(e.target.value)} placeholder="Ej: 30000" style={inputStyle} />
          </div>
        </div>

        <button onClick={handleAnalyze} disabled={!canAnalyze}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: canAnalyze?'var(--accent)':'var(--bg3)', color: canAnalyze?'var(--accent-fg)':'var(--text3)', fontSize: 15, fontWeight: 700, cursor: canAnalyze?'pointer':'not-allowed', fontFamily: 'var(--sans)' }}>
          🤖 Analizar con {assistantName || 'el asistente'}
        </button>
        {!canAnalyze && <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>Completá los campos marcados con *</p>}
      </div>
    )
  }

  if (financeLoading) return (
    <div className="dev-loading">
      <div className="spinner"/>
      <p style={{ fontWeight: 600 }}>Analizando tu situación financiera...</p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Esto puede tardar unos segundos</p>
    </div>
  )

  if (financialAnalysis?.error) return (
    <div className="dev-loading">
      <p style={{ color: 'var(--danger)' }}>⚠️ {financialAnalysis.error}</p>
      <button className="dev-retry-btn" onClick={resetFinancialAnalysis} style={{ marginTop: 12 }}>← Volver</button>
    </div>
  )

  /* ── Vista del análisis ── */
  const { resumen, barberia, presupuesto, ahorro, padres, accionesPrioritarias, mensajeFinal } = financialAnalysis

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>💰 Análisis financiero</h2>
        <button onClick={resetFinancialAnalysis} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--sans)' }}><IconRefresh /> Nuevo</button>
      </div>

      {/* Resumen */}
      <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, borderLeft: '4px solid var(--accent)' }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{resumen}</p>
      </div>

      {/* Métricas clave barbería */}
      {barberia && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>✂️ Rentabilidad de la barbería</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, padding: '12px' }}>
              <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>Ganancia neta/mes</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(barberia.gananciaNetaMensual)}</p>
            </div>
            <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: '12px' }}>
              <p style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginBottom: 4 }}>Ganancia/hora</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(barberia.gananciaPorHora)}</p>
            </div>
            <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 12, padding: '12px' }}>
              <p style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginBottom: 4 }}>Margen de ganancia</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{barberia.margenGanancia}%</p>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px' }}>
              <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>Diagnóstico</p>
              <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{barberia.diagnostico}</p>
            </div>
          </div>
          {barberia.potencial && (
            <div style={{ padding: '10px 12px', background: 'rgba(22,163,74,0.06)', borderRadius: 10, borderLeft: '3px solid #16a34a', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 3 }}>🚀 POTENCIAL DE CRECIMIENTO</p>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{barberia.potencial}</p>
            </div>
          )}
          {barberia.puntosAMejorar?.length > 0 && (
            <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Puntos a mejorar:</p>
              {barberia.puntosAMejorar.map((p, i) => <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3 }}><span style={{ color: '#d97706', flexShrink: 0 }}>•</span><span style={{ fontSize: 12, color: 'var(--text2)' }}>{p}</span></div>)}
            </div>
          )}
        </div>
      )}

      {/* Distribución del presupuesto */}
      {presupuesto && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>📊 Distribución del presupuesto</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
            <span>Ingreso total: <strong style={{ color: 'var(--text)' }}>{formatMoney(presupuesto.ingresoTotal)}</strong></span>
            <span>Saldo libre: <strong style={{ color: presupuesto.saldoLibre >= 0 ? '#16a34a' : '#dc2626' }}>{formatMoney(presupuesto.saldoLibre)}</strong></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(presupuesto.categorias || []).map((cat, i) => {
              const color = BUDGET_COLORS[cat.color] || '#2563eb'
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{cat.nombre}</span>
                    <span style={{ color: 'var(--text2)' }}>{formatMoney(cat.monto)} ({cat.porcentaje}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: color, borderRadius: 4, width: `${Math.min(100, cat.porcentaje)}%`, transition: 'width .5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Proyección de ahorro */}
      {ahorro && (
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>💎 Proyección de ahorro</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, padding: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Ahorro/mes sugerido</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(ahorro.montoMensualRecomendado)}</p>
            </div>
            <div style={{ flex: 1, background: ahorro.esAlcanzable ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', borderRadius: 10, padding: '10px', textAlign: 'center', border: `1px solid ${ahorro.esAlcanzable ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>¿Alcanzable?</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: ahorro.esAlcanzable ? '#16a34a' : '#dc2626' }}>{ahorro.esAlcanzable ? `✅ ${ahorro.mesesReales}m` : `⚠️ ${ahorro.mesesReales}m`}</p>
            </div>
          </div>
          {/* Timeline de proyección */}
          {ahorro.proyeccion?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Proyección de acumulado:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ahorro.proyeccion.map((punto, i) => {
                  const pct = metaAhorro ? Math.min(100, Math.round((punto.acumulado / Number(metaAhorro)) * 100)) : 0
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: 'var(--text2)' }}>Mes {punto.mes}{punto.hito ? ` — ${punto.hito}` : ''}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatMoney(punto.acumulado)} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                        <div style={{ height: '100%', background: pct >= 100 ? '#16a34a' : 'var(--accent)', borderRadius: 3, width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {ahorro.consejo && <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, borderLeft: '3px solid var(--accent)', fontSize: 12, color: 'var(--text2)' }}>💡 {ahorro.consejo}</div>}
        </div>
      )}

      {/* Ayuda a los padres */}
      {padres && (
        <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>❤️ Ayuda a tus padres</p>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
            {padres.posible ? `✅ Posible apartar ${formatMoney(padres.montoSugerido)}/mes` : '⚠️ Todavía no es el momento ideal'}
          </p>
          {padres.cuandoEmpezar && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 6 }}>{padres.cuandoEmpezar}</p>}
          {padres.estrategia   && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{padres.estrategia}</p>}
        </div>
      )}

      {/* Acciones prioritarias */}
      {accionesPrioritarias?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>⚡ Acciones prioritarias</p>
          {accionesPrioritarias.map((accion, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i+1}</div>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{accion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mensaje final */}
      {mensajeFinal && (
        <div style={{ background: 'var(--accent)', borderRadius: 14, padding: '16px', color: 'var(--accent-fg)' }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>"{mensajeFinal}"</p>
          <p style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>— {assistantName || 'Tu asistente'}</p>
        </div>
      )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   BRIEFING
   ════════════════════════════════════════════════════════ */
function BriefingTab({ assistant }) {
  const { briefing, briefLoading, loadBriefing } = assistant
  useEffect(() => { loadBriefing() }, [])
  if (briefLoading) return <div className="dev-loading"><div className="spinner"/><p>Analizando tu día...</p></div>
  if (!briefing)    return <div className="dev-loading"><p>No se pudo generar el briefing.</p><button className="dev-retry-btn" onClick={loadBriefing}>Reintentar</button></div>
  return (
    <div className="dev-container">
      <div className="brief-card">
        <p className="brief-date">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{briefing}</p>
      </div>
      <button className="dev-retry-btn" onClick={() => { assistant.briefing = null; loadBriefing() }}>🔄 Regenerar</button>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ONBOARDING
   ════════════════════════════════════════════════════════ */
function AssistantOnboarding({ onSave }) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { if (!name.trim()) return; setSaving(true); await onSave(name.trim()); setSaving(false) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🤖</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>¡Hola! Soy tu asistente personal</h2>
      <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32, lineHeight: 1.6 }}>Voy a acompañarte en tu fe, tu estudio y tu crecimiento. ¿Cómo querés llamarme?</p>
      <input type="text" placeholder="Ej: Elías, Rafa, Sam..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} style={{ width: '100%', maxWidth: 280, padding: '14px 16px', fontSize: 16, borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', textAlign: 'center', fontFamily: 'var(--sans)', marginBottom: 16, outline: 'none' }} autoFocus />
      <button onClick={handleSave} disabled={!name.trim() || saving} style={{ width: '100%', maxWidth: 280, padding: '14px 0', borderRadius: 14, background: 'var(--accent)', color: 'var(--accent-fg)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (!name.trim() || saving) ? 0.4 : 1, fontFamily: 'var(--sans)', marginTop: 0 }}>
        {saving ? 'Guardando...' : `Listo, te llamo ${name || '...'}`}
      </button>
    </div>
  )
}