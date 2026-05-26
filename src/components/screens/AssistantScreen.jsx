/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AssistantScreen.jsx              ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Tab 💰 Finanzas — centro de comando financiero        ║
║    · Situación: registrar ingresos por fuente            ║
║    · Ideas: evaluar ideas de negocio con IA              ║
║    · Presupuesto: análisis con IA                        ║
║    · Proyección: simular camino a $1M/mes                ║
║    · Decisiones: debatir con el asistente                ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }       from '../../context/AppContext'
import { useStats }     from '../../hooks/useStats'
import { useAssistant } from '../../hooks/useAssistant'
import { useSpeech, useMic } from '../../hooks/useSpeech'

/* ── Íconos ── */
const IconSend     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconSearch   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconSave     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
const IconTrash    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
const IconMic      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
const IconVolumeOn  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
const IconVolumeOff = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
const IconCalendar  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconRefresh   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
const IconPlus      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconChevron   = ({ up }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points={up ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>

/* ── Constantes ── */
const SESSION_STYLES = {
  normal:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  color: '#3b82f6', emoji: '📖', label: 'Estudio'   },
  intensivo: { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  color: '#f97316', emoji: '🔥', label: 'Intensivo' },
  repaso:    { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)',  color: '#8b5cf6', emoji: '🔄', label: 'Repaso'    },
}
const HABIT_ESTADO = {
  excelente: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',  label: '🟢 Excelente' },
  bueno:     { color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  label: '🔵 Bueno'     },
  riesgo:    { color: '#d97706', bg: 'rgba(217,119,6,0.1)',  label: '🟡 En riesgo' },
  critico:   { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', label: '🔴 Crítico'   },
}
const INCOME_SOURCES = [
  { id: 'webdev',    label: 'Web / Apps',       emoji: '💻', color: '#3b82f6' },
  { id: 'barberia',  label: 'Barbería',          emoji: '✂️', color: '#8b5cf6' },
  { id: 'freelance', label: 'Freelance',         emoji: '🎯', color: '#f97316' },
  { id: 'otro',      label: 'Otro',              emoji: '💰', color: '#16a34a' },
]
const META_MENSUAL_DEFAULT = 1000000
function getMetaMensual() { try { return Number(localStorage.getItem('meta_mensual')) || META_MENSUAL_DEFAULT } catch { return META_MENSUAL_DEFAULT } }
function saveMetaMensual(v) { try { localStorage.setItem('meta_mensual', String(v)) } catch {} }

/* ── Helpers ── */
function htmlToText(h = '') { return h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }
function getTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }
function formatDate(s) { if (!s) return ''; return new Date(s + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) }
function daysUntil(s) { if (!s) return null; const t = new Date(s + 'T00:00:00'), today = new Date(); today.setHours(0,0,0,0); return Math.round((t - today) / 86400000) }
function fmoney(n) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0) }
function getMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function getMonthLabel(key) { const [y,m] = key.split('-'); return new Date(Number(y), Number(m)-1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) }


export default function AssistantScreen() {
  const {
    displayName, assistantName, updateAssistantName,
    habits, habitLogs, tasks, goals, notes, cats,
    getTasksForDate, createNote, createTask, createGoal, showToast, pushTo, navTo,
  } = useApp()

  const { habitStats, bestStreak } = useStats({ notes: [], habits, habitLogs, tasks })
  const todayStr   = new Date().toISOString().slice(0, 10)
  const tasksToday = getTasksForDate(todayStr)
  const contextData = { displayName: displayName||'Lucas', assistantName: assistantName||'Asistente', habitStats, tasksToday, goals, bestStreak }

  const assistant  = useAssistant({ contextData })
  const [activeTab, setActiveTab] = useState('chat')

  if (!assistantName) return <AssistantOnboarding onSave={updateAssistantName} />

  return (
    <div className="assistant-screen">
      <div className="assistant-tabs">
        {[
          { id: 'chat',     label: '💬' },
          { id: 'devo',     label: '✝️' },
          { id: 'plan',     label: '📚' },
          { id: 'coach',    label: '💪' },
          { id: 'finanzas', label: '💰' },
          { id: 'briefing', label: '📋' },
        ].map(tab => (
          <button key={tab.id} className={`assistant-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ fontSize: 18 }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="assistant-content">
        {activeTab === 'chat'     && <ChatTab       assistant={assistant} assistantName={assistantName} createNote={createNote} showToast={showToast} pushTo={pushTo} cats={cats} createTask={createTask} createGoal={createGoal} />}
        {activeTab === 'devo'     && <DevocionalTab assistant={assistant} showToast={showToast} cats={cats} createNote={createNote} />}
        {activeTab === 'plan'     && <StudyPlanTab  assistant={assistant} notes={notes} cats={cats} createTask={createTask} createNote={createNote} showToast={showToast} navTo={navTo} assistantName={assistantName} />}
        {activeTab === 'coach'    && <HabitCoachTab assistant={assistant} habitStats={habitStats} habitLogs={habitLogs} assistantName={assistantName} />}
        {activeTab === 'finanzas' && <FinanzasTab   assistant={assistant} assistantName={assistantName} showToast={showToast} />}
        {activeTab === 'briefing' && <BriefingTab   assistant={assistant} />}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   CHAT
   ════════════════════════════════════════════════════════ */
function ChatTab({ assistant, assistantName, createNote, showToast, pushTo, cats, createTask, createGoal }) {
  const { messages, loading, error, sendMessage, clearChat, saveLastResponseAsNote } = assistant
  const [input, setInput] = useState('')
  const [useSearch, setUseSearch] = useState(false)
  const recognitionRef = useRef(null)
  const bottomRef = useRef(null)

  // Acciones disponibles para el asistente
  const actions = {
    createTask,
    createGoal,
    createNote,
    defaultCatId: cats?.[0]?.id ?? null,
  }

  const { listening, toggleListening } = useMic({
    onResult: text => setInput(p => p ? `${p} ${text}` : text),
    onError:  msg  => showToast(msg),
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim(), useSearch, actions)
    setInput('')
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
              {[
                '¿Podés explicarme qué es la recursión?',
                'Creá una tarea para mañana: repasar algoritmos',
                'Nueva meta: conseguir 3 clientes web dev',
              ].map(s => (
                <button key={s} className="chat-suggestion" onClick={() => sendMessage(s, false, actions)}>{s}</button>
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
            {/* Badge de acción ejecutada */}
            {msg.accion && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, padding:'6px 10px', background: msg.accion.tipo==='tarea'?'rgba(37,99,235,0.1)':msg.accion.tipo==='meta'?'rgba(139,92,246,0.1)':'rgba(22,163,74,0.1)', borderRadius:8, fontSize:12, color: msg.accion.tipo==='tarea'?'#2563eb':msg.accion.tipo==='meta'?'#8b5cf6':'#16a34a', fontWeight:600 }}>
                {msg.accion.tipo==='tarea'  && `✅ Tarea creada: "${msg.accion.titulo}"`}
                {msg.accion.tipo==='meta'   && `🎯 Meta creada: "${msg.accion.titulo}"`}
                {msg.accion.tipo==='apunte' && `📝 Apunte guardado: "${msg.accion.titulo}"`}
              </div>
            )}
            {msg.role === 'assistant' && i === messages.length - 1 && <button className="chat-save-btn" onClick={handleSaveNote}><IconSave /> Guardar como apunte</button>}
          </div>
        ))}
        {loading && <div className="chat-msg assistant"><div className="chat-bubble chat-loading"><span className="dot"/><span className="dot"/><span className="dot"/></div></div>}
        {error && <div className="chat-error">⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>
      {listening && <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ef4444', flexShrink: 0 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'dotBounce .9s infinite' }} />Escuchando...</div>}
      <div className="chat-input-area">
        <div className="chat-search-toggle">
          <button className={`search-toggle-btn ${useSearch ? 'active' : ''}`} onClick={() => setUseSearch(v => !v)}><IconSearch />{useSearch ? 'Búsqueda ON' : 'Búsqueda OFF'}</button>
          {messages.length > 0 && <button className="clear-btn" onClick={clearChat}><IconTrash /></button>}
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" placeholder={listening ? 'Escuchando...' : 'Escribí tu mensaje...'} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} rows={2} />
          <button onClick={toggleListening} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: listening ? '#ef4444' : 'var(--bg2)', color: listening ? '#fff' : 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transition: 'all .2s', boxShadow: listening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none' }}><IconMic /></button>
          <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}><IconSend /></button>
        </div>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   DEVOCIONAL
   ════════════════════════════════════════════════════════ */
function DevocionalTab({ assistant, showToast, cats, createNote }) {
  const { devotional, devLoading, loadDevotional, userAnswer, setUserAnswer, answerSaved, saveDevotionalAnswer } = assistant
  const { isSpeaking, toggle, stop } = useSpeech()
  const [savingNote,   setSavingNote]   = useState(false)
  const [noteSaved,    setNoteSaved]    = useState(false)
  const [selectedCat,  setSelectedCat]  = useState('')
  const [showCatPick,  setShowCatPick]  = useState(false)
  useEffect(() => { return () => stop() }, []) // eslint-disable-line
  useEffect(() => { loadDevotional() }, [])
  useEffect(() => { if (cats?.length > 0 && !selectedCat) setSelectedCat(cats[0].id) }, [cats])

  const handleSave = async () => { await saveDevotionalAnswer(); showToast('✅ Reflexión guardada') }

  async function handleSaveAsNote() {
    if (!devotional || !selectedCat) return
    setSavingNote(true)
    const today = new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const content = [
      `<h2>✝️ ${devotional.verseRef || 'Devocional de hoy'}</h2>`,
      `<blockquote><p>${devotional.verse}</p></blockquote>`,
      devotional.historicalContext && `<h3>📜 Contexto histórico</h3><p>${devotional.historicalContext}</p>`,
      devotional.centralTeaching   && `<h3>💡 Enseñanza central</h3><p>${devotional.centralTeaching}</p>`,
      devotional.deepDive          && `<h3>📚 Profundizando</h3><p>${devotional.deepDive}</p>`,
      devotional.christianValue    && `<h3>🌱 Valor cristiano</h3><p>${devotional.christianValue}</p>`,
      devotional.meditationQuestion && `<h3>🤔 Para meditar</h3><p>${devotional.meditationQuestion}</p>`,
      devotional.prayer            && `<h3>🙏 Oración</h3><p><em>${devotional.prayer}</em></p>`,
      userAnswer && `<h3>✏️ Mi reflexión personal</h3><p>${userAnswer}</p>`,
    ].filter(Boolean).join('\n')

    const { error } = await createNote({
      title: `Devocional — ${today}`,
      content,
      categoryId: selectedCat,
    })
    setSavingNote(false)
    if (error) { showToast('Error al guardar'); return }
    setNoteSaved(true)
    showToast('✅ Devocional guardado como apunte')
  }
  function buildText() {
    if (!devotional) return ''
    return [devotional.verse, devotional.historicalContext&&`Contexto. ${devotional.historicalContext}`, devotional.centralTeaching&&`Enseñanza. ${devotional.centralTeaching}`, devotional.deepDive&&`Profundizando. ${devotional.deepDive}`, devotional.christianValue&&`Valor. ${devotional.christianValue}`, devotional.lifeConnection&&`Para hoy. ${devotional.lifeConnection}`, devotional.meditationQuestion&&`Para meditar. ${devotional.meditationQuestion}`, devotional.prayer&&`Oración. ${devotional.prayer}`].filter(Boolean).join('. ')
  }
  if (devLoading) return <div className="dev-loading"><div className="spinner"/><p>Preparando tu devocional...</p></div>
  if (!devotional) return <div className="dev-loading"><p>No se pudo cargar.</p><button className="dev-retry-btn" onClick={loadDevotional}>Reintentar</button></div>
  return (
    <div className="dev-container">
      <div className="dev-verse-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="dev-verse-icon">✝️</div>
          <button onClick={() => toggle(buildText())} style={{ background: isSpeaking?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '5px 7px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
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

      {/* Guardar devocional como apunte */}
      <div style={{ marginTop: 8, marginBottom: 32 }}>
        {!noteSaved ? (
          <>
            {showCatPick && cats?.length > 0 && (
              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid var(--accent)', background:'var(--bg2)', color:'var(--text)', fontSize:13, fontFamily:'var(--sans)', marginBottom:8 }}
              >
                {cats.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            )}
            <button
              onClick={() => { if (!showCatPick) { setShowCatPick(true) } else { handleSaveAsNote() } }}
              disabled={savingNote}
              style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'1.5px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--sans)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
            >
              <IconSave />
              {savingNote ? 'Guardando...' : showCatPick ? 'Confirmar y guardar como apunte' : 'Guardar como apunte'}
            </button>
          </>
        ) : (
          <div style={{ padding:'12px 0', textAlign:'center', fontSize:13, fontWeight:600, color:'#16a34a' }}>
            ✅ Guardado como apunte
          </div>
        )}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   PLAN DE ESTUDIO
   ════════════════════════════════════════════════════════ */
function StudyPlanTab({ assistant, notes, cats, createTask, createNote, showToast, navTo, assistantName }) {
  const { studyPlan, studyLoading, generateStudyPlan, resetStudyPlan } = assistant
  const [materia, setMateria] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [fechaInicio, setFechaInicio] = useState(getTomorrow())
  const [dias, setDias] = useState(7)
  const [horas, setHoras] = useState(2)
  const [fechaExamen, setFechaExamen] = useState('')
  const [exported, setExported] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState(null)
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
    showToast(`✅ ${studyPlan.sessions.length} sesiones exportadas`)
  }
  async function handleSavePlan() {
    if (!studyPlan?.sessions) return
    const content = [`<h2>${studyPlan.title}</h2>`, ...studyPlan.sessions.map(s => `<h3>${SESSION_STYLES[s.type]?.emoji||'📖'} ${s.dayName} ${formatDate(s.date)} — ${s.title}</h3><ul>${s.topics.map(t=>`<li>${t}</li>`).join('')}</ul><p><em>💡 ${s.tip}</em></p>`), `<h2>Tips</h2><ul>${studyPlan.tips?.map(t=>`<li>${t}</li>`).join('')||''}</ul>`].join('\n')
    await createNote({ title: studyPlan.title, content, categoryId: cats[0]?.id ?? null })
    showToast('✅ Plan guardado como apunte')
  }

  const inputS = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--sans)', boxSizing: 'border-box' }
  const labelS = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }

  if (!studyPlan && !studyLoading) {
    return (
      <div style={{ overflowY: 'auto', height: '100%', padding: '16px 14px 32px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📚 Plan de estudio</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>{assistantName||'El asistente'} va a crear un plan personalizado.</p>
        <div style={{ marginBottom: 14 }}><label style={labelS}>Materia o tema *</label><input type="text" value={materia} onChange={e=>setMateria(e.target.value)} placeholder="Ej: Cálculo 2, Algoritmos..." style={inputS} /></div>
        <div style={{ marginBottom: 14 }}><label style={labelS}>Apunte base (opcional)</label><select value={selectedNoteId} onChange={e=>setSelectedNoteId(e.target.value)} style={inputS}><option value="">Sin apunte</option>{notes.map(n=>{const c=cats.find(c=>c.id===n.category_id);return<option key={n.id} value={n.id}>{c?`${c.emoji} `:''}{n.title}</option>})}</select></div>
        <div style={{ marginBottom: 14 }}><label style={labelS}>Fecha de inicio</label><input type="date" value={fechaInicio} onChange={e=>setFechaInicio(e.target.value)} style={inputS} /></div>
        <div style={{ marginBottom: 14 }}><label style={labelS}>Días disponibles: <span style={{ color: 'var(--accent)' }}>{dias}d</span></label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{[3,5,7,10,14,21,30].map(d=><button key={d} onClick={()=>setDias(d)} style={{ padding:'8px 14px',borderRadius:20,fontSize:13,fontWeight:600,border:`1.5px solid ${dias===d?'var(--accent)':'var(--border)'}`,background:dias===d?'var(--accent)':'var(--bg2)',color:dias===d?'var(--accent-fg)':'var(--text)',cursor:'pointer',fontFamily:'var(--sans)' }}>{d}d</button>)}</div></div>
        <div style={{ marginBottom: 14 }}><label style={labelS}>Horas/sesión: <span style={{ color: 'var(--accent)' }}>{horas}h</span></label><div style={{ display: 'flex', gap: 6 }}>{[1,1.5,2,3].map(h=><button key={h} onClick={()=>setHoras(h)} style={{ flex:1,padding:'10px 0',borderRadius:10,fontSize:13,fontWeight:600,border:`1.5px solid ${horas===h?'var(--accent)':'var(--border)'}`,background:horas===h?'var(--accent)':'var(--bg2)',color:horas===h?'var(--accent-fg)':'var(--text)',cursor:'pointer',fontFamily:'var(--sans)' }}>{h}h</button>)}</div></div>
        <div style={{ marginBottom: 24 }}><label style={labelS}>Fecha del examen (opcional)</label><input type="date" value={fechaExamen} onChange={e=>setFechaExamen(e.target.value)} style={{...inputS, border:`1.5px solid ${fechaExamen?'var(--accent)':'var(--border)'}`}} />{diasHastaExamen!==null&&<p style={{ fontSize:12,marginTop:4,color:diasHastaExamen<=3?'#ef4444':diasHastaExamen<=7?'#f97316':'#16a34a',fontWeight:600 }}>{diasHastaExamen>0?`⏳ Quedan ${diasHastaExamen} días`:diasHastaExamen===0?'🎯 El examen es hoy':'⚠️ La fecha ya pasó'}</p>}</div>
        <button onClick={handleGenerate} disabled={!materia.trim()} style={{ width:'100%',padding:'14px 0',borderRadius:14,border:'none',background:materia.trim()?'var(--accent)':'var(--bg3)',color:materia.trim()?'var(--accent-fg)':'var(--text3)',fontSize:15,fontWeight:700,cursor:materia.trim()?'pointer':'not-allowed',fontFamily:'var(--sans)' }}>✨ Generar plan</button>
      </div>
    )
  }
  if (studyLoading) return <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight:600 }}>Creando tu plan...</p></div>
  if (studyPlan?.error) return <div className="dev-loading"><p style={{ color:'var(--danger)' }}>⚠️ {studyPlan.error}</p><button className="dev-retry-btn" onClick={resetStudyPlan} style={{ marginTop:12 }}>← Volver</button></div>

  const sessions=studyPlan?.sessions||[], tips=studyPlan?.tips||[], diasExamen=studyPlan?.examDate?daysUntil(studyPlan.examDate):null
  return (
    <div style={{ overflowY:'auto',height:'100%',padding:'16px 14px 32px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16 }}>
        <div><h2 style={{ fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:2 }}>{studyPlan.title}</h2><p style={{ fontSize:12,color:'var(--text2)' }}>{sessions.length} sesiones · {horas}h/sesión</p></div>
        <button onClick={resetStudyPlan} style={{ background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',fontSize:12,color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'var(--sans)' }}><IconRefresh />Nuevo</button>
      </div>
      {studyPlan.examDate&&<div style={{ marginBottom:16,padding:'10px 12px',borderRadius:10,background:diasExamen!==null&&diasExamen<=3?'rgba(239,68,68,0.08)':'var(--bg2)',border:'1px solid var(--border)' }}><div style={{ display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6 }}><span style={{ color:'var(--text2)' }}>Hoy</span><span style={{ fontWeight:600,color:diasExamen!==null&&diasExamen<=3?'#ef4444':'var(--text)' }}>{diasExamen!==null&&diasExamen>0?`🎯 Examen en ${diasExamen} días`:diasExamen===0?'🎯 ¡Hoy!':'Pasado'}</span></div><div style={{ height:6,background:'var(--bg3)',borderRadius:3 }}><div style={{ height:'100%',background:'var(--accent)',borderRadius:3,width:`${Math.min(100,(sessions.length/Math.max(sessions.length,1))*100)}%` }}/></div></div>}
      <div style={{ display:'flex',gap:10,marginBottom:12 }}>{Object.entries(SESSION_STYLES).map(([t,s])=><div key={t} style={{ display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text2)' }}><span>{s.emoji}</span><span>{s.label}</span></div>)}</div>
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
        {sessions.map((session,i)=>{
          const style=SESSION_STYLES[session.type]||SESSION_STYLES.normal, expanded=expandedIdx===i
          return(
            <div key={i} onClick={()=>setExpandedIdx(expanded?null:i)} style={{ background:style.bg,border:`1.5px solid ${style.border}`,borderRadius:14,padding:'12px 14px',cursor:'pointer' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:style.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{style.emoji}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',gap:8 }}><span style={{ fontSize:12,color:style.color,fontWeight:700 }}>{session.dayName} {formatDate(session.date)}</span><span style={{ fontSize:11,color:'var(--text3)',flexShrink:0 }}>⏱{session.duration}</span></div>
                  <p style={{ fontSize:14,fontWeight:600,color:'var(--text)',margin:'2px 0 0' }}>{session.title}</p>
                  {!expanded&&session.topics?.length>0&&<p style={{ fontSize:11,color:'var(--text3)',marginTop:3 }}>{session.topics.slice(0,2).join(' · ')}{session.topics.length>2?' ...':''}</p>}
                </div>
                <span style={{ fontSize:12,color:'var(--text3)',flexShrink:0 }}>{expanded?'▲':'▼'}</span>
              </div>
              {expanded&&<div style={{ marginTop:12,paddingTop:12,borderTop:`1px solid ${style.border}` }}>{session.topics?.length>0&&<div style={{ marginBottom:8 }}>{session.topics.map((t,j)=><div key={j} style={{ display:'flex',gap:6,marginBottom:4 }}><span style={{ color:style.color,fontSize:12,flexShrink:0 }}>•</span><span style={{ fontSize:13,color:'var(--text)' }}>{t}</span></div>)}</div>}{session.tip&&<div style={{ padding:'8px 10px',background:'var(--bg2)',borderRadius:8,fontSize:12,color:'var(--text2)',borderLeft:`3px solid ${style.color}` }}>💡 {session.tip}</div>}</div>}
            </div>
          )
        })}
      </div>
      {tips.length>0&&<div style={{ background:'var(--bg2)',borderRadius:14,padding:'14px 16px',marginBottom:16 }}><p style={{ fontSize:12,fontWeight:700,color:'var(--text)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:10 }}>💡 Consejos</p>{tips.map((tip,i)=><div key={i} style={{ display:'flex',gap:8,marginBottom:i<tips.length-1?8:0 }}><span style={{ color:'var(--accent)',flexShrink:0 }}>→</span><span style={{ fontSize:13,color:'var(--text2)',lineHeight:1.5 }}>{tip}</span></div>)}</div>}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {!exported?<button onClick={handleExport} disabled={exporting} style={{ width:'100%',padding:'14px 0',borderRadius:14,border:'none',background:'var(--accent)',color:'var(--accent-fg)',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'var(--sans)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:exporting?0.6:1 }}>{exporting?<><div className="spinner" style={{ width:16,height:16,borderWidth:2 }}/>Exportando...</>:<><IconCalendar/>Exportar al calendario ({sessions.length})</>}</button>:<div style={{ display:'flex',gap:8 }}><div style={{ flex:2,padding:'13px 0',borderRadius:14,textAlign:'center',background:'rgba(16,185,129,0.1)',color:'#16a34a',fontSize:13,fontWeight:700 }}>✅ Exportado</div><button onClick={()=>navTo('calendar')} style={{ flex:1,padding:'13px 0',borderRadius:14,border:'none',background:'var(--bg2)',color:'var(--text)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--sans)' }}>Ver →</button></div>}
        <button onClick={handleSavePlan} style={{ width:'100%',padding:'12px 0',borderRadius:14,border:'1.5px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--sans)',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}><IconSave/>Guardar como apunte</button>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   COACH DE HÁBITOS
   ════════════════════════════════════════════════════════ */
function HabitCoachTab({ assistant, habitStats, habitLogs, assistantName }) {
  const { habitAnalysis, habitLoading, analyzeHabits, resetHabitAnalysis } = assistant
  const [expandedHabit, setExpandedHabit] = useState(null)

  function getLocalStats(h) {
    const hace30=new Date(); hace30.setDate(hace30.getDate()-30)
    const logs30=habitLogs.filter(l=>l.habit_id===h.id&&new Date(l.date+'T00:00:00')>=hace30)
    const tasa=Math.round((logs30.length/30)*100)
    const dias7=h.last7.filter(d=>d.done).length
    const hoy=new Date(); hoy.setHours(0,0,0,0)
    const hace7=new Date(hoy); hace7.setDate(hoy.getDate()-7)
    const hace14=new Date(hoy); hace14.setDate(hoy.getDate()-14)
    const h7a14=habitLogs.filter(l=>{if(l.habit_id!==h.id)return false;const d=new Date(l.date+'T00:00:00');return d>=hace14&&d<hace7}).length
    const tendencia=dias7>h7a14?'↑':dias7<h7a14?'↓':'→'
    const estado=tasa>=70?'excelente':tasa>=40?'bueno':tasa>=20?'riesgo':'critico'
    const porDia=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((n,dow)=>({nombre:n,total:habitLogs.filter(l=>l.habit_id===h.id&&new Date(l.date+'T00:00:00').getDay()===dow).length}))
    const maxDia=Math.max(...porDia.map(d=>d.total),1)
    return{tasa,dias7,tendencia,estado,porDia,maxDia}
  }

  if(habitStats.length===0) return <div className="dev-loading"><p style={{ fontSize:36,marginBottom:8 }}>💪</p><p style={{ fontWeight:600,color:'var(--text)' }}>No tenés hábitos definidos</p><p style={{ fontSize:13,color:'var(--text2)',marginTop:4 }}>Creá hábitos desde el Calendario.</p></div>

  if(habitAnalysis&&!habitLoading){
    if(habitAnalysis.error) return <div className="dev-loading"><p style={{ color:'var(--danger)' }}>⚠️ {habitAnalysis.error}</p><button className="dev-retry-btn" onClick={resetHabitAnalysis} style={{ marginTop:12 }}>← Volver</button></div>
    return(
      <div style={{ overflowY:'auto',height:'100%',padding:'16px 14px 32px' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <h2 style={{ fontSize:17,fontWeight:700,color:'var(--text)' }}>💪 Análisis de hábitos</h2>
          <button onClick={resetHabitAnalysis} style={{ background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',fontSize:12,color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:'var(--sans)' }}><IconRefresh/>Nuevo</button>
        </div>
        <div style={{ background:'var(--bg2)',borderRadius:14,padding:'14px 16px',marginBottom:14,borderLeft:'4px solid var(--accent)' }}><p style={{ fontSize:14,lineHeight:1.7,color:'var(--text)' }}>{habitAnalysis.resumen}</p></div>
        {habitAnalysis.habitoFoco&&<div style={{ background:'rgba(139,92,246,0.08)',border:'1.5px solid rgba(139,92,246,0.25)',borderRadius:14,padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:10 }}><span style={{ fontSize:24 }}>🎯</span><div><p style={{ fontSize:11,fontWeight:700,color:'#8b5cf6',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:2 }}>Hábito foco esta semana</p><p style={{ fontSize:15,fontWeight:700,color:'var(--text)' }}>{habitAnalysis.habitoFoco}</p></div></div>}
        <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:16 }}>
          {(habitAnalysis.habitos||[]).map((h,i)=>{
            const estilo=HABIT_ESTADO[h.estado]||HABIT_ESTADO.bueno, localH=habitStats.find(s=>s.name===h.nombre), expanded=expandedHabit===i
            return(
              <div key={i} onClick={()=>setExpandedHabit(expanded?null:i)} style={{ background:estilo.bg,border:`1.5px solid ${estilo.color}40`,borderRadius:14,padding:'12px 14px',cursor:'pointer' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:estilo.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{localH?.emoji||'⚡'}</div>
                  <div style={{ flex:1,minWidth:0 }}><div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}><span style={{ fontSize:14,fontWeight:700,color:'var(--text)' }}>{h.nombre}</span><span style={{ fontSize:11,fontWeight:600,color:estilo.color,background:estilo.bg,padding:'2px 8px',borderRadius:20,border:`1px solid ${estilo.color}40` }}>{estilo.label}</span></div><p style={{ fontSize:12,color:'var(--text2)',marginTop:2 }}>{h.patron}</p></div>
                  <span style={{ fontSize:12,color:'var(--text3)',flexShrink:0 }}>{expanded?'▲':'▼'}</span>
                </div>
                {expanded&&<div style={{ marginTop:12,paddingTop:12,borderTop:`1px solid ${estilo.color}30` }}>
                  {h.causa_probable&&<div style={{ marginBottom:10 }}><p style={{ fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4 }}>🔍 Causa probable</p><p style={{ fontSize:13,color:'var(--text)',lineHeight:1.5 }}>{h.causa_probable}</p></div>}
                  {h.sugerencia&&<div style={{ padding:'10px 12px',background:'var(--bg2)',borderRadius:10,marginBottom:8,borderLeft:`3px solid ${estilo.color}` }}><p style={{ fontSize:11,fontWeight:700,color:estilo.color,marginBottom:4 }}>💡 SUGERENCIA</p><p style={{ fontSize:13,color:'var(--text)',lineHeight:1.5 }}>{h.sugerencia}</p></div>}
                  {h.microajuste&&<div style={{ padding:'10px 12px',background:'rgba(22,163,74,0.08)',borderRadius:10,border:'1px solid rgba(22,163,74,0.2)' }}><p style={{ fontSize:11,fontWeight:700,color:'#16a34a',marginBottom:4 }}>⚡ MICRO-AJUSTE HOY</p><p style={{ fontSize:13,color:'var(--text)',lineHeight:1.5 }}>{h.microajuste}</p></div>}
                </div>}
              </div>
            )
          })}
        </div>
        {habitAnalysis.mensajeFinal&&<div style={{ background:'var(--accent)',borderRadius:14,padding:'16px',color:'var(--accent-fg)' }}><p style={{ fontSize:14,lineHeight:1.7,fontStyle:'italic' }}>"{habitAnalysis.mensajeFinal}"</p><p style={{ fontSize:12,marginTop:8,opacity:0.8 }}>— {assistantName||'Tu asistente'}</p></div>}
      </div>
    )
  }
  if(habitLoading) return <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight:600 }}>Analizando patrones...</p></div>

  return(
    <div style={{ overflowY:'auto',height:'100%',padding:'16px 14px 32px' }}>
      <h2 style={{ fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:4 }}>💪 Coach de hábitos</h2>
      <p style={{ fontSize:13,color:'var(--text2)',marginBottom:20 }}>Detectá patrones y mejorá con sugerencias concretas.</p>
      <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:24 }}>
        {habitStats.map((h,i)=>{
          const{tasa,dias7,tendencia,estado,porDia,maxDia}=getLocalStats(h), estilo=HABIT_ESTADO[estado]||HABIT_ESTADO.bueno
          return(
            <div key={i} style={{ background:'var(--bg2)',borderRadius:14,padding:'14px',border:'1px solid var(--border)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                <div style={{ width:38,height:38,borderRadius:10,background:estilo.color+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{h.emoji||'⚡'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ fontSize:14,fontWeight:700,color:'var(--text)' }}>{h.name}</span><span style={{ fontSize:11,fontWeight:600,color:estilo.color }}>{estilo.label}</span></div>
                  <div style={{ display:'flex',gap:10,marginTop:2 }}><span style={{ fontSize:12,color:'var(--text2)' }}>🔥{h.streak}d</span><span style={{ fontSize:12,color:'var(--text2)' }}>30d:<strong style={{ color:'var(--text)' }}>{tasa}%</strong></span><span style={{ fontSize:12,color:tendencia==='↑'?'#16a34a':tendencia==='↓'?'#dc2626':'var(--text2)',fontWeight:700 }}>{tendencia}</span></div>
                </div>
              </div>
              <div style={{ marginBottom:10 }}>
                <p style={{ fontSize:10,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:6 }}>Últimos 7 días ({dias7}/7)</p>
                <div style={{ display:'flex',gap:4 }}>{h.last7.map((day,j)=><div key={j} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}><div style={{ width:'100%',height:28,borderRadius:6,background:day.done?(day.isRecovered?'#a78bfa':estilo.color):'var(--bg3)',opacity:day.done?1:0.4 }}/><span style={{ fontSize:9,color:'var(--text3)' }}>{['D','L','M','X','J','V','S'][new Date(day.dateStr+'T12:00:00').getDay()]}</span></div>)}</div>
              </div>
              <div>
                <p style={{ fontSize:10,fontWeight:600,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:6 }}>Por día de semana</p>
                <div style={{ display:'flex',gap:3,alignItems:'flex-end',height:32 }}>{porDia.map((d,j)=><div key={j} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}><div style={{ width:'100%',background:estilo.color,borderRadius:'3px 3px 0 0',height:`${Math.max(4,(d.total/maxDia)*28)}px`,opacity:0.8 }}/><span style={{ fontSize:8,color:'var(--text3)' }}>{d.nombre.slice(0,1)}</span></div>)}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={()=>analyzeHabits({habitStats,habitLogs})} style={{ width:'100%',padding:'14px 0',borderRadius:14,border:'none',background:'var(--accent)',color:'var(--accent-fg)',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'var(--sans)' }}>
        🤖 Analizar con {assistantName||'el asistente'}
      </button>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   FINANZAS — CENTRO DE COMANDO
   ════════════════════════════════════════════════════════ */
function FinanzasTab({ assistant, assistantName, showToast }) {
  const [subTab, setSubTab] = useState('situacion')

  const subTabs = [
    { id: 'situacion',  label: '📊 Situación' },
    { id: 'ideas',      label: '💡 Ideas'      },
    { id: 'presupuesto',label: '💰 Presupuesto'},
    { id: 'proyeccion', label: '📈 Proyección' },
    { id: 'decisiones', label: '🧠 Decisiones' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sub-tabs scrolleable */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0, padding: '0 4px' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{
              padding: '10px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--sans)',
              color: subTab === t.id ? 'var(--accent)' : 'var(--text2)',
              borderBottom: subTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {subTab === 'situacion'   && <SituacionTab   assistant={assistant} showToast={showToast} />}
        {subTab === 'ideas'       && <IdeasTab        assistant={assistant} assistantName={assistantName} showToast={showToast} />}
        {subTab === 'presupuesto' && <PresupuestoTab  assistant={assistant} assistantName={assistantName} showToast={showToast} />}
        {subTab === 'proyeccion'  && <ProyeccionTab   />}
        {subTab === 'decisiones'  && <DecisionesTab   assistant={assistant} assistantName={assistantName} showToast={showToast} />}
      </div>
    </div>
  )
}


/* ── Sub-tab: Situación actual ── */
function SituacionTab({ assistant, showToast }) {
  const { incomeRecords, financeLoading, loadIncomeRecords, addIncomeRecord, deleteIncomeRecord } = assistant
  const [showForm,   setShowForm]   = useState(false)
  const [source,     setSource]     = useState('webdev')
  const [amount,     setAmount]     = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().slice(0,10))
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [metaMensual,    setMetaMensualState] = useState(getMetaMensual)
  const [editingMeta,    setEditingMeta]      = useState(false)
  const [metaInput,      setMetaInput]        = useState('')

  function handleSaveMeta() {
    const v = Number(metaInput.replace(/\./g, '').replace(',',''))
    if (!v || v < 1000) { showToast('Ingresá un monto válido'); return }
    setMetaMensualState(v)
    saveMetaMensual(v)
    setEditingMeta(false)
    showToast('✅ Meta actualizada')
  }

  useEffect(() => { loadIncomeRecords() }, [])

  async function handleAdd() {
    if (!amount || !date) { showToast('Completá monto y fecha'); return }
    setSaving(true)
    const { error } = await addIncomeRecord({ source, amount, date, note })
    setSaving(false)
    if (error) { showToast('Error al guardar'); return }
    showToast('✅ Ingreso registrado')
    setAmount(''); setNote(''); setShowForm(false)
  }

  // Calcular métricas
  const now = new Date()
  const mesActualKey = getMonthKey(now)
  const mesAnteriorKey = getMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  const ingresosMesActual  = incomeRecords.filter(r => r.date?.slice(0,7) === mesActualKey).reduce((s,r) => s + Number(r.amount), 0)
  const ingresosMesAnterior = incomeRecords.filter(r => r.date?.slice(0,7) === mesAnteriorKey).reduce((s,r) => s + Number(r.amount), 0)
  const pctMeta = Math.min(100, Math.round((ingresosMesActual / metaMensual) * 100))
  const tendencia = ingresosMesActual >= ingresosMesAnterior ? '↑' : '↓'

  // Agrupar por fuente este mes
  const porFuente = INCOME_SOURCES.map(src => ({
    ...src,
    total: incomeRecords.filter(r => r.date?.slice(0,7) === mesActualKey && r.source === src.id).reduce((s,r) => s + Number(r.amount), 0)
  })).filter(s => s.total > 0)

  // Últimas 4 semanas por semana
  const porSemana = Array.from({ length: 4 }, (_, i) => {
    const start = new Date(); start.setDate(start.getDate() - (i+1)*7)
    const end   = new Date(); end.setDate(end.getDate() - i*7)
    const total = incomeRecords.filter(r => {
      const d = new Date(r.date + 'T00:00:00')
      return d >= start && d < end
    }).reduce((s,r) => s + Number(r.amount), 0)
    return { label: i === 0 ? 'Esta sem.' : `Hace ${i}s`, total }
  }).reverse()
  const maxSemana = Math.max(...porSemana.map(s => s.total), 1)

  const inputS = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', boxSizing: 'border-box' }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '14px 14px 32px' }}>

      {/* Meta mensual */}
      <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Este mes</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{fmoney(ingresosMesActual)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Meta mensual</p>
            {editingMeta ? (
              <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                <input
                  type="number"
                  value={metaInput}
                  onChange={e => setMetaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveMeta()}
                  autoFocus
                  style={{ width: 110, padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)' }}
                />
                <button onClick={handleSaveMeta} style={{ padding:'4px 10px', borderRadius:8, border:'none', background:'var(--accent)', color:'var(--accent-fg)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--sans)' }}>✓</button>
                <button onClick={() => setEditingMeta(false)} style={{ padding:'4px 8px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'var(--sans)' }}>✕</button>
              </div>
            ) : (
              <button onClick={() => { setMetaInput(String(metaMensual)); setEditingMeta(true) }}
                style={{ background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'right', display:'block', marginLeft:'auto' }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{fmoney(metaMensual)} ✏️</p>
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', background: pctMeta >= 100 ? '#16a34a' : 'var(--accent)', borderRadius: 5, width: `${pctMeta}%`, transition: 'width .5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text2)' }}>{pctMeta}% de la meta</span>
          <span style={{ color: pctMeta >= 100 ? '#16a34a' : 'var(--text2)' }}>
            {pctMeta >= 100 ? '🎉 Meta superada!' : `Faltan ${fmoney(metaMensual - ingresosMesActual)}`}
          </span>
        </div>
        {ingresosMesAnterior > 0 && (
          <p style={{ fontSize: 11, color: tendencia === '↑' ? '#16a34a' : '#dc2626', marginTop: 6, fontWeight: 600 }}>
            {tendencia} vs mes anterior: {fmoney(ingresosMesAnterior)}
          </p>
        )}
      </div>

      {/* Distribución por fuente */}
      {porFuente.length > 0 && (
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Por fuente este mes</p>
          {porFuente.map((src, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text)' }}>{src.emoji} {src.label}</span>
                <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{fmoney(src.total)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                <div style={{ height: '100%', background: src.color, borderRadius: 3, width: `${Math.round((src.total/ingresosMesActual)*100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tendencia semanal */}
      {porSemana.some(s => s.total > 0) && (
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Tendencia semanal</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
            {porSemana.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', background: 'var(--accent)', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (s.total/maxSemana)*56)}px`, opacity: i === 3 ? 1 : 0.5 }} />
                <span style={{ fontSize: 9, color: 'var(--text3)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón agregar */}
      <button onClick={() => setShowForm(v => !v)}
        style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        <IconPlus /> Registrar ingreso
      </button>

      {/* Formulario de ingreso */}
      {showForm && (
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 14, marginBottom: 14, border: '1.5px solid var(--accent)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Nuevo ingreso</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {INCOME_SOURCES.map(s => (
              <button key={s.id} onClick={() => setSource(s.id)}
                style={{ padding: '7px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${source===s.id?s.color:'var(--border)'}`, background: source===s.id?s.color+'20':'transparent', color: source===s.id?s.color:'var(--text2)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Monto ($)" style={{...inputS, flex: 1}} />
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inputS, flex: 1}} />
          </div>
          <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Descripción (opcional)" style={{...inputS, marginBottom: 10}} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando...' : '✅ Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de ingresos recientes */}
      {incomeRecords.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Historial reciente</p>
          {incomeRecords.slice(0, 20).map((r, i) => {
            const src = INCOME_SOURCES.find(s => s.id === r.source) || INCOME_SOURCES[3]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 19 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: src.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{src.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmoney(r.amount)}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>{src.label} · {formatDate(r.date)}{r.note ? ` — ${r.note}` : ''}</p>
                </div>
                <button onClick={() => deleteIncomeRecord(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><IconTrash /></button>
              </div>
            )
          })}
        </div>
      )}

      {incomeRecords.length === 0 && !financeLoading && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>📊</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Todavía no registraste ingresos</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Registrá tu primer ingreso para empezar a trackear tu progreso.</p>
        </div>
      )}
    </div>
  )
}


/* ── Sub-tab: Ideas de negocio ── */
function IdeasTab({ assistant, assistantName, showToast }) {
  const { businessIdeas, loadBusinessIdeas, addBusinessIdea, updateBusinessIdea, deleteBusinessIdea, debateIdea } = assistant
  const [showForm,  setShowForm]  = useState(false)
  const [title,     setTitle]     = useState('')
  const [context,   setContext]   = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result,    setResult]    = useState(null)
  const [expanded,  setExpanded]  = useState(null)

  useEffect(() => { loadBusinessIdeas() }, [])

  async function handleDebate() {
    if (!title.trim()) { showToast('Describí tu idea primero'); return }
    setAnalyzing(true); setResult(null)
    const { data, error } = await debateIdea({ idea: title, context })
    setAnalyzing(false)
    if (error) { showToast('Error al analizar'); return }
    setResult(data)
  }

  async function handleSaveIdea() {
    if (!result) return
    await addBusinessIdea({
      title:      result.titulo || title,
      description: title,
      potential:  result.potencialIngresos,
      difficulty: result.dificultad,
      next_step:  result.pasosConcretosParaEmpezar?.[0],
      notes:      result.razonVeredicto,
      status:     'activa',
    })
    showToast('✅ Idea guardada')
    setShowForm(false); setTitle(''); setContext(''); setResult(null)
  }

  const VEREDICTO_COLOR = { 'Recomendada': '#16a34a', 'Prometedora': '#2563eb', 'Con reservas': '#d97706', 'No recomendada': '#dc2626' }
  const DIFICULTAD_COLOR = { baja: '#16a34a', media: '#d97706', alta: '#dc2626' }

  const inputS = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', boxSizing: 'border-box' }

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '14px 14px 32px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>💡 Ideas de negocio</h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{assistantName||'El asistente'} evalúa tus ideas</p>
        </div>
        <button onClick={() => { setShowForm(v=>!v); setResult(null) }}
          style={{ padding: '8px 14px', borderRadius: 20, border: '1.5px solid var(--accent)', background: showForm?'var(--accent)':'transparent', color: showForm?'var(--accent-fg)':'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconPlus /> Nueva
        </button>
      </div>

      {/* Formulario de nueva idea */}
      {showForm && (
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 14, marginBottom: 16, border: '1.5px solid var(--accent)' }}>
          {!result && !analyzing && (
            <>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>¿Cuál es tu idea?</p>
              <textarea value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Hacer automatizaciones con IA para barberías, cobrar $50k/mes por mantenimiento..." rows={3} style={{...inputS, resize: 'none', marginBottom: 8}} />
              <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="Contexto adicional (opcional): ¿Ya tenés clientes? ¿Cuánto tiempo podés dedicarle?..." rows={2} style={{...inputS, resize: 'none', marginBottom: 10}} />
              <button onClick={handleDebate}
                style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: title.trim()?'var(--accent)':'var(--bg3)', color: title.trim()?'var(--accent-fg)':'var(--text3)', fontSize: 13, fontWeight: 700, cursor: title.trim()?'pointer':'not-allowed', fontFamily: 'var(--sans)' }}>
                🤖 Analizar con {assistantName||'el asistente'}
              </button>
            </>
          )}

          {analyzing && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text2)', fontSize: 13, padding: '16px 0' }}><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}/>Analizando tu idea...</div>}

          {result && !analyzing && (
            <>
              {/* Veredicto */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{result.titulo}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: VEREDICTO_COLOR[result.veredicto]||'var(--text)', background: (VEREDICTO_COLOR[result.veredicto]||'var(--accent)')+'15', padding: '2px 8px', borderRadius: 20 }}>{result.veredicto}</span>
                    <span style={{ fontSize: 11, color: DIFICULTAD_COLOR[result.dificultad]||'var(--text2)' }}>Dificultad: {result.dificultad}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>Potencial</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{result.potencialIngresos}</p>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>{result.razonVeredicto}</p>

              {/* Pros/contras */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'rgba(22,163,74,0.08)', borderRadius: 10, padding: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✅ A FAVOR</p>
                  {result.prosContra?.pros?.map((p,i) => <p key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4, marginBottom: 3 }}>• {p}</p>)}
                </div>
                <div style={{ background: 'rgba(220,38,38,0.08)', borderRadius: 10, padding: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ RIESGOS</p>
                  {result.prosContra?.contras?.map((c,i) => <p key={i} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4, marginBottom: 3 }}>• {c}</p>)}
                </div>
              </div>

              {/* Próximos pasos */}
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Próximos pasos</p>
                {result.pasosConcretosParaEmpezar?.map((p,i) => <p key={i} style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}><strong style={{ color: 'var(--accent)' }}>{i+1}.</strong> {p}</p>)}
              </div>

              {result.alternativa && (
                <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, marginBottom: 10, borderLeft: '3px solid var(--accent)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>💡 ALTERNATIVA MEJOR</p>
                  <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{result.alternativa}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveIdea} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sans)' }}>💾 Guardar idea</button>
                <button onClick={() => { setResult(null); setTitle(''); setContext('') }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)' }}>Nueva</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Lista de ideas guardadas */}
      {businessIdeas.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text3)' }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>💡</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>Todavía no guardaste ideas</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Tocá "+ Nueva" para evaluar tu primera idea de negocio.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {businessIdeas.map((idea, i) => {
          const isExpanded = expanded === idea.id
          return (
            <div key={idea.id} style={{ background: 'var(--bg2)', borderRadius: 14, padding: 14, border: '1px solid var(--border)' }}>
              <div onClick={() => setExpanded(isExpanded ? null : idea.id)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{idea.title}</p>
                    {idea.potential && <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>💰 {idea.potential}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: idea.status==='activa'?'rgba(37,99,235,0.1)':'rgba(22,163,74,0.1)', color: idea.status==='activa'?'#2563eb':'#16a34a', fontWeight: 600 }}>{idea.status}</span>
                    <button onClick={e => { e.stopPropagation(); deleteBusinessIdea(idea.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}><IconTrash /></button>
                  </div>
                </div>
                {isExpanded && idea.next_step && (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 3 }}>PRÓXIMO PASO</p>
                    <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{idea.next_step}</p>
                  </div>
                )}
                {isExpanded && idea.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, lineHeight: 1.5 }}>{idea.notes}</p>
                )}
              </div>
              {isExpanded && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {['activa','en_progreso','descartada'].map(s => (
                    <button key={s} onClick={() => updateBusinessIdea(idea.id, { status: s })}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${idea.status===s?'var(--accent)':'var(--border)'}`, background: idea.status===s?'var(--accent)':'transparent', color: idea.status===s?'var(--accent-fg)':'var(--text2)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                      {s==='activa'?'Activa':s==='en_progreso'?'En progreso':'Descartada'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


/* ── Sub-tab: Presupuesto ── */
function PresupuestoTab({ assistant, assistantName, showToast }) {
  const { budgetAnalysis, budgetLoading, analyzeBudget, resetBudgetAnalysis } = assistant

  const [ingresos, setIngresos] = useState([
    { id: 1, label: 'Web dev / Apps',  amount: '' },
    { id: 2, label: 'Barbería',        amount: '' },
    { id: 3, label: 'Otro',            amount: '' },
  ])
  const [gastos, setGastos] = useState([
    { id: 1, label: 'Vivienda',        amount: '' },
    { id: 2, label: 'Comida',          amount: '' },
    { id: 3, label: 'Transporte',      amount: '' },
    { id: 4, label: 'Herramientas/Tech',amount: '' },
    { id: 5, label: 'Otros',           amount: '' },
  ])
  const [meta,  setMeta]  = useState('1000000')
  const [plazo, setPlazo] = useState('12')

  const totalIngresos = ingresos.reduce((s,i) => s + (Number(i.amount)||0), 0)
  const totalGastos   = gastos.reduce((s,g) => s + (Number(g.amount)||0), 0)
  const canAnalyze    = totalIngresos > 0 && totalGastos > 0

  function updateIngreso(id, amount) { setIngresos(prev => prev.map(i => i.id===id ? {...i, amount} : i)) }
  function updateGasto(id, amount)   { setGastos(prev => prev.map(g => g.id===id ? {...g, amount} : g)) }

  async function handleAnalyze() {
    if (!canAnalyze) { showToast('Completá al menos un ingreso y un gasto'); return }
    await analyzeBudget({
      ingresos: ingresos.filter(i => Number(i.amount) > 0),
      gastos:   gastos.filter(g => Number(g.amount) > 0),
      meta, plazo,
    })
  }

  const inputS = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)', boxSizing: 'border-box' }
  const SALUD_COLOR = { excelente:'#16a34a', buena:'#2563eb', ajustada:'#d97706', critica:'#dc2626' }

  if (budgetAnalysis && !budgetLoading) {
    if (budgetAnalysis.error) return <div className="dev-loading"><p style={{ color:'var(--danger)' }}>⚠️ {budgetAnalysis.error}</p><button className="dev-retry-btn" onClick={resetBudgetAnalysis}>← Volver</button></div>
    return (
      <div style={{ overflowY:'auto', height:'100%', padding:'14px 14px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>💰 Análisis de presupuesto</h3>
          <button onClick={resetBudgetAnalysis} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', fontSize:12, color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'var(--sans)' }}><IconRefresh/>Nuevo</button>
        </div>

        <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:12, borderLeft:`4px solid ${SALUD_COLOR[budgetAnalysis.saludFinanciera]||'var(--accent)'}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color:SALUD_COLOR[budgetAnalysis.saludFinanciera]||'var(--accent)', textTransform:'uppercase' }}>Salud financiera: {budgetAnalysis.saludFinanciera}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Ahorro posible: {fmoney(budgetAnalysis.saldoParaAhorrar)}</span>
          </div>
          <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>{budgetAnalysis.diagnostico}</p>
        </div>

        {budgetAnalysis.distribucionIdeal?.length > 0 && (
          <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Distribución ideal</p>
            {budgetAnalysis.distribucionIdeal.map((cat,i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--text)', fontWeight:500 }}>{cat.categoria}</span>
                  <span style={{ color:'var(--text2)' }}>{fmoney(cat.montoSugerido)} ({cat.porcentaje}%)</span>
                </div>
                <div style={{ height:6, background:'var(--bg3)', borderRadius:3 }}>
                  <div style={{ height:'100%', background:'var(--accent)', borderRadius:3, width:`${Math.min(100,cat.porcentaje)}%` }}/>
                </div>
                {cat.observacion && <p style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{cat.observacion}</p>}
              </div>
            ))}
          </div>
        )}

        {budgetAnalysis.alertas?.length > 0 && (
          <div style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:12, padding:12, marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:6 }}>⚠️ Alertas</p>
            {budgetAnalysis.alertas.map((a,i) => <p key={i} style={{ fontSize:12, color:'var(--text)', lineHeight:1.4, marginBottom:3 }}>• {a}</p>)}
          </div>
        )}

        {budgetAnalysis.oportunidad && (
          <div style={{ background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:12, padding:12, marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:4 }}>🚀 Mayor oportunidad</p>
            <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{budgetAnalysis.oportunidad}</p>
          </div>
        )}

        {budgetAnalysis.pasosSemanaQueViene?.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>⚡ Esta semana</p>
            {budgetAnalysis.pasosSemanaQueViene.map((paso,i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'var(--bg2)', borderRadius:10, marginBottom:6 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--accent)', color:'var(--accent-fg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.4, margin:0 }}>{paso}</p>
              </div>
            ))}
          </div>
        )}

        {budgetAnalysis.mensajeFinal && (
          <div style={{ background:'var(--accent)', borderRadius:14, padding:14, color:'var(--accent-fg)' }}>
            <p style={{ fontSize:13, lineHeight:1.7, fontStyle:'italic' }}>"{budgetAnalysis.mensajeFinal}"</p>
            <p style={{ fontSize:11, marginTop:6, opacity:0.8 }}>— {assistantName||'Tu asistente'}</p>
          </div>
        )}
      </div>
    )
  }

  if (budgetLoading) return <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight:600 }}>Analizando tu presupuesto...</p></div>

  return (
    <div style={{ overflowY:'auto', height:'100%', padding:'14px 14px 32px' }}>
      <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>💰 Presupuesto mensual</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:16 }}>Ingresá tus números y {assistantName||'el asistente'} te dice cómo distribuirlos mejor.</p>

      <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:12 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>📥 Ingresos mensuales</p>
        {ingresos.map(item => (
          <div key={item.id} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'var(--text2)', minWidth:120, flexShrink:0 }}>{item.label}</span>
            <input type="number" value={item.amount} onChange={e=>updateIngreso(item.id,e.target.value)} placeholder="$0" style={inputS} />
          </div>
        ))}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4, display:'flex', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ color:'var(--text2)', fontWeight:600 }}>Total ingresos</span>
          <span style={{ color:'var(--text)', fontWeight:800 }}>{fmoney(totalIngresos)}</span>
        </div>
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:12 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>📤 Gastos mensuales</p>
        {gastos.map(item => (
          <div key={item.id} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:12, color:'var(--text2)', minWidth:120, flexShrink:0 }}>{item.label}</span>
            <input type="number" value={item.amount} onChange={e=>updateGasto(item.id,e.target.value)} placeholder="$0" style={inputS} />
          </div>
        ))}
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:8, marginTop:4, display:'flex', justifyContent:'space-between', fontSize:13 }}>
          <span style={{ color:'var(--text2)', fontWeight:600 }}>Total gastos</span>
          <span style={{ color:totalGastos > totalIngresos ? '#dc2626' : 'var(--text)', fontWeight:800 }}>{fmoney(totalGastos)}</span>
        </div>
        {totalIngresos > 0 && (
          <div style={{ marginTop:6, display:'flex', justifyContent:'space-between', fontSize:13, paddingTop:6, borderTop:'1px solid var(--border)' }}>
            <span style={{ fontWeight:700, color:'var(--text)' }}>Saldo disponible</span>
            <span style={{ fontWeight:800, color: totalIngresos-totalGastos >= 0 ? '#16a34a' : '#dc2626' }}>{fmoney(totalIngresos - totalGastos)}</span>
          </div>
        )}
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:10 }}>🎯 Meta</p>
        <div style={{ marginBottom:8 }}>
          <p style={{ fontSize:11, color:'var(--text2)', marginBottom:5 }}>Meta mensual ($)</p>
          <input type="number" value={meta} onChange={e=>setMeta(e.target.value)} placeholder="1000000" style={inputS} />
        </div>
        <div>
          <p style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Plazo para llegar a la meta</p>
          <div style={{ display:'flex', gap:6 }}>
            {['6','12','18','24','36'].map(m => (
              <button key={m} onClick={()=>setPlazo(m)} style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:600, border:`1.5px solid ${plazo===m?'var(--accent)':'var(--border)'}`, background:plazo===m?'var(--accent)':'transparent', color:plazo===m?'var(--accent-fg)':'var(--text)', cursor:'pointer', fontFamily:'var(--sans)' }}>{m}m</button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleAnalyze} disabled={!canAnalyze}
        style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'none', background:canAnalyze?'var(--accent)':'var(--bg3)', color:canAnalyze?'var(--accent-fg)':'var(--text3)', fontSize:15, fontWeight:700, cursor:canAnalyze?'pointer':'not-allowed', fontFamily:'var(--sans)' }}>
        🤖 Analizar con {assistantName||'el asistente'}
      </button>
    </div>
  )
}


/* ── Sub-tab: Proyección ── */
function ProyeccionTab() {
  const [ingresosActuales, setIngresosActuales] = useState('')
  const [crecimientoMensual, setCrecimientoMensual] = useState('20')
  const [meta, setMeta] = useState('1000000')

  function calcularProyeccion() {
    const base = Number(ingresosActuales) || 0
    const tasa = (Number(crecimientoMensual) || 0) / 100
    const metaN = Number(meta) || META_MENSUAL_DEFAULT
    if (!base || !tasa) return []

    const puntos = []
    let actual = base
    let mes = 0
    while (actual < metaN && mes < 60) {
      mes++
      actual = base * Math.pow(1 + tasa, mes)
      if (mes <= 6 || mes % 3 === 0 || actual >= metaN) {
        puntos.push({ mes, monto: Math.round(actual) })
      }
      if (actual >= metaN) break
    }
    return puntos
  }

  const proyeccion = ingresosActuales ? calcularProyeccion() : []
  const mesesParaMeta = proyeccion.length > 0 ? proyeccion[proyeccion.length - 1]?.mes : null
  const maxMonto = Math.max(...proyeccion.map(p => p.monto), Number(meta)||META_MENSUAL_DEFAULT)

  const inputS = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:14, fontFamily:'var(--sans)', boxSizing:'border-box' }

  return (
    <div style={{ overflowY:'auto', height:'100%', padding:'14px 14px 32px' }}>
      <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>📈 Proyección de ingresos</h3>
      <p style={{ fontSize:12, color:'var(--text2)', marginBottom:16 }}>Simulá tu crecimiento hasta la meta de $1M/mes.</p>

      <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:14 }}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Ingresos actuales/mes ($)</label>
          <input type="number" value={ingresosActuales} onChange={e=>setIngresosActuales(e.target.value)} placeholder="Ej: 150000" style={inputS} />
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Crecimiento mensual estimado: <span style={{ color:'var(--accent)' }}>{crecimientoMensual}%</span></label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['10','15','20','30','40','50'].map(v => (
              <button key={v} onClick={()=>setCrecimientoMensual(v)} style={{ padding:'7px 12px', borderRadius:20, fontSize:12, fontWeight:600, border:`1.5px solid ${crecimientoMensual===v?'var(--accent)':'var(--border)'}`, background:crecimientoMensual===v?'var(--accent)':'transparent', color:crecimientoMensual===v?'var(--accent-fg)':'var(--text)', cursor:'pointer', fontFamily:'var(--sans)' }}>{v}%</button>
            ))}
          </div>
          <p style={{ fontSize:10, color:'var(--text3)', marginTop:6 }}>Crecer 20% mensual = duplicás ingresos cada ~4 meses. Es ambicioso pero alcanzable en web dev.</p>
        </div>
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Meta mensual ($)</label>
          <input type="number" value={meta} onChange={e=>setMeta(e.target.value)} placeholder="1000000" style={inputS} />
        </div>
      </div>

      {proyeccion.length > 0 && (
        <>
          {/* Headline */}
          <div style={{ background:mesesParaMeta&&mesesParaMeta<=24?'rgba(22,163,74,0.08)':'rgba(249,115,22,0.08)', border:`1px solid ${mesesParaMeta&&mesesParaMeta<=24?'rgba(22,163,74,0.2)':'rgba(249,115,22,0.2)'}`, borderRadius:14, padding:14, marginBottom:14, textAlign:'center' }}>
            {mesesParaMeta ? (
              <>
                <p style={{ fontSize:32, fontWeight:900, color:'var(--text)' }}>{mesesParaMeta} meses</p>
                <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>para llegar a {fmoney(Number(meta)||META_MENSUAL_DEFAULT)}/mes creciendo {crecimientoMensual}% mensual</p>
                <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Desde hoy → {new Date(new Date().setMonth(new Date().getMonth()+mesesParaMeta)).toLocaleDateString('es-AR',{month:'long',year:'numeric'})}</p>
              </>
            ) : (
              <p style={{ fontSize:14, color:'var(--text2)' }}>Ya superás la meta 🎉</p>
            )}
          </div>

          {/* Gráfico de barras */}
          <div style={{ background:'var(--bg2)', borderRadius:14, padding:14, marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:12 }}>Curva de crecimiento</p>
            <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:80 }}>
              {proyeccion.slice(0, 12).map((p, i) => {
                const h = Math.max(4, (p.monto / maxMonto) * 76)
                const isGoal = p.monto >= (Number(meta)||META_MENSUAL_DEFAULT)
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ width:'100%', background:isGoal?'#16a34a':'var(--accent)', borderRadius:'3px 3px 0 0', height:`${h}px`, opacity:0.8 }}/>
                    <span style={{ fontSize:8, color:'var(--text3)' }}>{p.mes}m</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hitos */}
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Hitos del camino</p>
            {proyeccion.map((p, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i < proyeccion.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:p.monto>=(Number(meta)||META_MENSUAL_DEFAULT)?'rgba(22,163,74,0.15)':'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:p.monto>=(Number(meta)||META_MENSUAL_DEFAULT)?'#16a34a':'var(--text2)' }}>{p.mes}</div>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>Mes {p.mes}</span>
                </div>
                <span style={{ fontSize:14, fontWeight:700, color:p.monto>=(Number(meta)||META_MENSUAL_DEFAULT)?'#16a34a':'var(--text)' }}>{fmoney(p.monto)}/mes</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!ingresosActuales && (
        <div style={{ textAlign:'center', padding:'24px 16px', color:'var(--text3)' }}>
          <p style={{ fontSize:36, marginBottom:8 }}>📈</p>
          <p style={{ fontSize:13 }}>Ingresá tus ingresos actuales para ver la proyección.</p>
        </div>
      )}
    </div>
  )
}


/* ── Sub-tab: Decisiones ── */
function DecisionesTab({ assistant, assistantName, showToast }) {
  const { decisionResult, decisionLoading, debateDecision, resetDecision } = assistant
  const [decision, setDecision] = useState('')
  const [context,  setContext]  = useState('')

  async function handleDebate() {
    if (!decision.trim()) { showToast('Describí la decisión primero'); return }
    await debateDecision({ decision, context })
  }

  const inputS = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13, fontFamily:'var(--sans)', boxSizing:'border-box', resize:'none' }
  const MARCOS_COLOR = ['var(--accent)', '#16a34a', '#d97706', '#8b5cf6']

  return (
    <div style={{ overflowY:'auto', height:'100%', padding:'14px 14px 32px' }}>

      {!decisionResult && !decisionLoading && (
        <>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>🧠 Debatir una decisión</h3>
          <p style={{ fontSize:12, color:'var(--text2)', marginBottom:16 }}>{assistantName||'El asistente'} analiza tu decisión desde múltiples ángulos antes de tomarla.</p>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>¿Qué decisión tenés que tomar?</label>
            <textarea value={decision} onChange={e=>setDecision(e.target.value)} placeholder="Ej: ¿Debería dejar de estudiar un semestre para enfocarme 100% en web dev y conseguir más clientes?" rows={3} style={inputS} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>Contexto adicional (opcional)</label>
            <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="Ej: Tengo 3 materias cursando, 1 cliente actual, necesito $X para X..." rows={2} style={inputS} />
          </div>

          <div style={{ marginBottom:16, padding:12, background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)' }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--text2)', marginBottom:8 }}>Ejemplos de decisiones para debatir:</p>
            {[
              '¿Me conviene tomar un curso de $X o aprender solo?',
              '¿Debería bajar precios para conseguir más clientes?',
              '¿Comprar herramienta X o esperar a tener más ingresos?',
              '¿Enfocarme en web dev o aprender automatizaciones primero?',
            ].map((ej, i) => (
              <button key={i} onClick={() => setDecision(ej)}
                style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', padding:'4px 0', fontSize:12, color:'var(--accent)', cursor:'pointer', fontFamily:'var(--sans)' }}>
                → {ej}
              </button>
            ))}
          </div>

          <button onClick={handleDebate} disabled={!decision.trim()}
            style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'none', background:decision.trim()?'var(--accent)':'var(--bg3)', color:decision.trim()?'var(--accent-fg)':'var(--text3)', fontSize:15, fontWeight:700, cursor:decision.trim()?'pointer':'not-allowed', fontFamily:'var(--sans)' }}>
            🤖 Debatir con {assistantName||'el asistente'}
          </button>
        </>
      )}

      {decisionLoading && <div className="dev-loading"><div className="spinner"/><p style={{ fontWeight:600 }}>Analizando la decisión...</p></div>}

      {decisionResult && !decisionLoading && (
        <>
          {decisionResult.error ? (
            <div className="dev-loading"><p style={{ color:'var(--danger)' }}>⚠️ {decisionResult.error}</p><button className="dev-retry-btn" onClick={resetDecision}>← Volver</button></div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>🧠 Análisis de decisión</h3>
                <button onClick={resetDecision} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', fontSize:12, color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'var(--sans)' }}><IconRefresh/>Nueva</button>
              </div>

              <div style={{ background:'var(--bg2)', borderRadius:14, padding:12, marginBottom:12 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>Decisión analizada</p>
                <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{decisionResult.decision}</p>
              </div>

              {/* Marcos de análisis */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                {decisionResult.marcos?.map((marco, i) => (
                  <div key={i} style={{ background:'var(--bg2)', borderRadius:12, padding:12, borderTop:`3px solid ${MARCOS_COLOR[i%4]}` }}>
                    <p style={{ fontSize:11, fontWeight:700, color:MARCOS_COLOR[i%4], marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>{marco.nombre}</p>
                    <p style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{marco.perspectiva}</p>
                  </div>
                ))}
              </div>

              {/* Pros/contras */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                <div style={{ background:'rgba(22,163,74,0.08)', borderRadius:12, padding:12 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#16a34a', marginBottom:6 }}>✅ A FAVOR</p>
                  {decisionResult.pros?.map((p,i) => <p key={i} style={{ fontSize:11, color:'var(--text)', lineHeight:1.4, marginBottom:3 }}>• {p}</p>)}
                </div>
                <div style={{ background:'rgba(220,38,38,0.08)', borderRadius:12, padding:12 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#dc2626', marginBottom:6 }}>⚠️ EN CONTRA</p>
                  {decisionResult.contras?.map((c,i) => <p key={i} style={{ fontSize:11, color:'var(--text)', lineHeight:1.4, marginBottom:3 }}>• {c}</p>)}
                </div>
              </div>

              {/* Preguntas */}
              {decisionResult.preguntasQueDebesHacerte?.length > 0 && (
                <div style={{ background:'rgba(99,102,241,0.08)', borderRadius:12, padding:12, marginBottom:12, border:'1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:6 }}>🤔 Antes de decidir, preguntate:</p>
                  {decisionResult.preguntasQueDebesHacerte.map((p,i) => <p key={i} style={{ fontSize:12, color:'var(--text)', lineHeight:1.5, marginBottom:4 }}>{i+1}. {p}</p>)}
                </div>
              )}

              {/* Recomendación */}
              <div style={{ background:'var(--accent)', borderRadius:14, padding:14, marginBottom:decisionResult.alternativa?12:0, color:'var(--accent-fg)' }}>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, opacity:0.8 }}>Recomendación del asistente</p>
                <p style={{ fontSize:14, lineHeight:1.7 }}>{decisionResult.recomendacion}</p>
              </div>

              {decisionResult.alternativa && (
                <div style={{ background:'var(--bg2)', borderRadius:12, padding:12, marginTop:12, borderLeft:'3px solid #16a34a' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:4 }}>💡 ¿Consideraste esta alternativa?</p>
                  <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{decisionResult.alternativa}</p>
                </div>
              )}
            </>
          )}
        </>
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
  if (!briefing)    return <div className="dev-loading"><p>No se pudo generar.</p><button className="dev-retry-btn" onClick={loadBriefing}>Reintentar</button></div>
  return (
    <div className="dev-container">
      <div className="brief-card">
        <p className="brief-date">{new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</p>
        <p style={{ whiteSpace:'pre-wrap', lineHeight:1.7 }}>{briefing}</p>
      </div>
      <button className="dev-retry-btn" onClick={() => { assistant.briefing = null; loadBriefing() }}>🔄 Regenerar</button>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ONBOARDING
   ════════════════════════════════════════════════════════ */
function AssistantOnboarding({ onSave }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { if (!name.trim()) return; setSaving(true); await onSave(name.trim()); setSaving(false) }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'32px 24px', textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🤖</div>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8, color:'var(--text)' }}>¡Hola! Soy tu asistente personal</h2>
      <p style={{ fontSize:14, color:'var(--text2)', marginBottom:32, lineHeight:1.6 }}>Voy a acompañarte en tu fe, tu estudio y tu crecimiento. ¿Cómo querés llamarme?</p>
      <input type="text" placeholder="Ej: Elías, Rafa, Sam..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSave()} style={{ width:'100%', maxWidth:280, padding:'14px 16px', fontSize:16, borderRadius:14, border:'1.5px solid var(--border)', background:'var(--bg2)', color:'var(--text)', textAlign:'center', fontFamily:'var(--sans)', marginBottom:16, outline:'none' }} autoFocus />
      <button onClick={handleSave} disabled={!name.trim()||saving} style={{ width:'100%', maxWidth:280, padding:'14px 0', borderRadius:14, background:'var(--accent)', color:'var(--accent-fg)', border:'none', fontSize:15, fontWeight:700, cursor:'pointer', opacity:(!name.trim()||saving)?0.4:1, fontFamily:'var(--sans)', marginTop:0 }}>
        {saving?'Guardando...':`Listo, te llamo ${name||'...'}`}
      </button>
    </div>
  )
}