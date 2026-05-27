/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Rediseño NOVA:                                          ║
║  ✦ Devocional del día con fondo estrellado dorado        ║
║  ✦ Racha con efecto fuego (activa) / hielo (inactiva)    ║
║  ✦ Vision Board más grande con meta superpuesta          ║
║  ✦ Hábitos con dots neon y checkbox brillante            ║
║  ✦ Apuntes con borde neon violeta animado                ║
║  ✦ Space Grotesk en todo                                 ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp }        from '../../context/AppContext'
import { useStats }      from '../../hooks/useStats'
import { useInsights }   from '../../hooks/useInsights'
import { supabase }      from '../../lib/supabase'
import { getGreeting, fdate, truncate, stripHtml } from '../../utils/helpers'

function todayLocal() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}
function todayDisplay() {
  return new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
}

/* ── Partícula dorada decorativa ── */
function GoldParticle({ style }) {
  return (
    <div style={{
      position: 'absolute', width: 3, height: 3,
      borderRadius: '50%', background: '#fbbf24',
      boxShadow: '0 0 4px #fbbf24',
      animation: 'particleFloat 3s ease-in-out infinite',
      ...style,
    }} />
  )
}

export default function HomeScreen() {
  const {
    user, cats, notes, dataLoading,
    pushTo, navTo,
    toggleFavorite, getTagsForNote,
    displayName,
    habits, habitLogs, tasks,
    goalImages, goals, goalItems,
    toggleHabitLog, toggleTask, deleteTask,
    getTasksForDate, getProgress,
    getYesterdayPendingTasks,
    moveTaskToToday,
    archiveHabit,
    recoverStreak,
    isRecoverable,
    showToast,
  } = useApp()

  const today      = todayLocal()
  const tasksToday = getTasksForDate(today)

  const { habitStats, notesByWeek, taskStats } = useStats({ notes, habits, habitLogs, tasks })
  const { insights } = useInsights({
    habitStats, tasksToday, notes, notesByWeek,
    goals, goalItems, goalImages, getProgress, taskStats,
  })

  const [reward,          setReward]          = useState(null)
  const [consolidacion,   setConsolidacion]   = useState(null)
  const [ayerModal,       setAyerModal]       = useState(null)
  const [notasExpandidas, setNotasExpandidas] = useState(false)
  const [devotional,      setDevotional]      = useState(null)
  const [devLeido,        setDevLeido]        = useState(false)

  const ayerChecked = useRef(false)
  useEffect(() => {
    if (ayerChecked.current) return
    if (tasks.length === 0) return
    ayerChecked.current = true
    const pendientes = getYesterdayPendingTasks()
    if (pendientes.length > 0) setAyerModal(pendientes)
  }, [tasks]) // eslint-disable-line

  /* ── Cargar devocional de hoy ── */
  useEffect(() => {
    async function loadDev() {
      try {
        const { data } = await supabase
          .from('devotional_diary')
          .select('verse, user_answer, reflection')
          .eq('date', today)
          .maybeSingle()
        if (data) {
          let parsed = null
          try { parsed = JSON.parse(data.reflection) } catch { parsed = null }
          setDevotional({
            verse:    parsed?.verse || data.verse,
            verseRef: parsed?.verseRef || '',
          })
          setDevLeido(!!data.user_answer)
        }
      } catch (e) { /* silencioso */ }
    }
    loadDev()
  }, [today])

  const recoverableIds = new Set(
    habitStats.filter(h => !h.doneToday && isRecoverable(h.id)).map(h => h.id)
  )

  const favoritos    = notes.filter(n => n.is_favorite)
  const recientes    = notasExpandidas ? notes.slice(0, 8) : notes.slice(0, 3)
  const boardPreview = goalImages.slice(0, 6)
  const habitsSorted = [
    ...habitStats.filter(h => !h.doneToday),
    ...habitStats.filter(h =>  h.doneToday),
  ]

  const habitosDone  = habitStats.filter(h => h.doneToday).length
  const habitosTotal = habitStats.length
  const tareasDone   = tasksToday.filter(t => t.completed).length
  const tareasTotal  = tasksToday.length
  const bestStreak   = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.streak)) : 0
  const hasStreak    = bestStreak > 0

  async function handleToggleHabit(habitId) {
    const result = await toggleHabitLog(habitId, today)
    if (result?.consolidation) setConsolidacion({ habitId, habitName: result.habitName })
    else if (result?.milestone) setReward({ habitName: result.habitName, rewardText: result.rewardText, streak: result.milestone })
  }
  async function handleRecoverStreak(habitId) {
    await recoverStreak(habitId); showToast('⚡ Racha recuperada')
  }
  async function handleArchivarHabito(habitId) {
    await archiveHabit(habitId); setConsolidacion(null); showToast('🏆 Hábito archivado')
  }
  async function handleMoverTareasDeAyer() {
    if (!ayerModal) return
    await Promise.all(ayerModal.map(t => moveTaskToToday(t.id)))
    setAyerModal(null); showToast('✅ Tareas movidas a hoy')
  }
  async function handleDescartarTareasDeAyer() {
    if (!ayerModal) return
    await Promise.all(ayerModal.map(t => deleteTask(t.id)))
    setAyerModal(null)
  }
  function getNombreCat(catId) {
    const cat = cats.find(c => c.id === catId)
    return cat ? `${cat.emoji} ${cat.name}` : ''
  }

  if (dataLoading) return (
    <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--text2)' }}>
      Cargando...
    </div>
  )

  const SL = { fontFamily: "'Space Grotesk', 'DM Sans', system-ui, sans-serif" }
  const SEC = ({ icon, label, color='var(--text2)', action, onAction }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <span style={{ ...SL, fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color, flex:1 }}>{label}</span>
      {action && <button onClick={onAction} style={{ ...SL, fontSize:12, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>{action}</button>}
    </div>
  )

  return (
    <div style={{ padding: '16px 14px 120px', ...SL }}>

      {/* ── Saludo ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize:11, color:'#6b7280', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:4 }}>
          {todayDisplay()}
        </div>
        <div style={{ fontSize:24, fontWeight:700, lineHeight:1.2, color:'#f1f5f9' }}>
          {getGreeting()},{' '}
          <span style={{ color:'#818cf8', textShadow:'0 0 18px rgba(129,140,248,0.55)' }}>
            {displayName || user?.email?.split('@')[0] || 'vos'}
          </span>{' '}👋
        </div>
      </div>

      {/* ── Asistente ── */}
      <button onClick={() => pushTo('asistente', { title:'Asistente' })}
        style={{
          width:'100%', marginBottom:16, padding:'12px 16px',
          borderRadius:16, border:'0.5px solid rgba(99,102,241,0.45)',
          background:'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(124,58,237,0.18))',
          cursor:'pointer', display:'flex', alignItems:'center', gap:12,
          textAlign:'left', animation:'cosmicFloat 4s ease-in-out infinite',
        }}>
        <div style={{
          width:42, height:42, borderRadius:13, flexShrink:0,
          background:'linear-gradient(135deg, #4f46e5, #7c3aed)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
          boxShadow:'0 0 14px rgba(99,102,241,0.4)',
        }}>🤖</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ ...SL, fontSize:14, fontWeight:700, color:'#c7d2fe', marginBottom:2 }}>Asistente NOVA</div>
          <div style={{ fontSize:12, color:'#6b7280' }}>Chat · Devocional · Briefing del día</div>
        </div>
        <div style={{ fontSize:18, color:'rgba(99,102,241,0.5)' }}>›</div>
      </button>


      {/* ══════════════════════════════════════════════════════
          DEVOCIONAL DEL DÍA — estrellado dorado
          ══════════════════════════════════════════════════════ */}
      <SEC icon="✝️" label="Devocional de hoy" color="#fbbf24" />
      <div className="neon-spin-gold" style={{ marginBottom:16 }}>
        <div className="neon-spin-gold-inner" style={{ position:'relative', overflow:'hidden', minHeight:100 }}>
          {/* Partículas doradas decorativas */}
          <GoldParticle style={{ top:'12%', left:'8%',  animationDelay:'0s'   }} />
          <GoldParticle style={{ top:'20%', right:'12%', animationDelay:'.8s'  }} />
          <GoldParticle style={{ bottom:'20%', left:'20%', animationDelay:'1.4s' }} />
          <GoldParticle style={{ bottom:'15%', right:'8%', animationDelay:'.4s'  }} />
          <GoldParticle style={{ top:'50%', left:'50%', width:2, height:2, animationDelay:'1s' }} />

          {devotional ? (
            <>
              <div style={{ fontSize:11, color:'#92400e', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>
                ✨ Palabra del día
              </div>
              <p style={{
                fontFamily:"'Playfair Display', Georgia, serif",
                fontSize:15, lineHeight:1.75,
                color:'#fef3c7', fontStyle:'italic',
                marginBottom:10,
              }}>
                "{devotional.verse.length > 140 ? devotional.verse.slice(0,140)+'…' : devotional.verse}"
              </p>
              {devotional.verseRef && (
                <p style={{ fontSize:12, color:'#d97706', fontWeight:600, marginBottom:12 }}>
                  — {devotional.verseRef}
                </p>
              )}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                {devLeido
                  ? <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#16a34a', fontWeight:600 }}>
                      <span>✅</span> Reflexión guardada
                    </div>
                  : <div style={{ fontSize:12, color:'#78350f' }}>Sin reflexión hoy</div>
                }
                <button onClick={() => pushTo('asistente', { title:'Asistente' })}
                  style={{
                    ...SL, fontSize:12, fontWeight:700, color:'#fbbf24',
                    background:'rgba(251,191,36,0.1)', border:'0.5px solid rgba(251,191,36,0.35)',
                    borderRadius:20, padding:'5px 12px', cursor:'pointer',
                  }}>
                  {devLeido ? 'Ver devocional' : 'Leer ahora'} →
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✝️</div>
              <p style={{ fontSize:13, color:'#d97706', marginBottom:10 }}>Aún no generaste el devocional de hoy</p>
              <button onClick={() => pushTo('asistente', { title:'Asistente' })}
                style={{
                  ...SL, fontSize:13, fontWeight:700, color:'#fbbf24',
                  background:'rgba(251,191,36,0.1)', border:'0.5px solid rgba(251,191,36,0.35)',
                  borderRadius:20, padding:'8px 18px', cursor:'pointer',
                }}>
                Generar devocional ✨
              </button>
            </div>
          )}
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════
          RACHA — fuego o hielo
          ══════════════════════════════════════════════════════ */}
      {habitosTotal > 0 && (
        <>
          <SEC icon={hasStreak ? '🔥' : '🧊'} label="Mi racha" color={hasStreak ? '#f97316' : '#60a5fa'} />
          <div className={hasStreak ? 'neon-spin-fire' : 'neon-spin-ice'} style={{ marginBottom:16 }}>
            <div className={hasStreak ? 'neon-spin-fire-inner' : 'neon-spin-ice-inner'}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  {hasStreak ? (
                    <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                      <span className="flame-anim" style={{ fontSize:22 }}>🔥</span>
                      <span className="flame-anim" style={{ fontSize:18 }}>🔥</span>
                      <span className="flame-anim" style={{ fontSize:15 }}>🔥</span>
                    </div>
                  ) : (
                    <div style={{ fontSize:24, marginBottom:6, animation:'iceShimmer 2s ease-in-out infinite', display:'inline-block' }}>🧊</div>
                  )}
                  <div style={{
                    fontSize:44, fontWeight:700, lineHeight:1,
                    color: hasStreak ? '#fbbf24' : '#60a5fa',
                    textShadow: hasStreak
                      ? '0 0 20px rgba(251,191,36,0.5)'
                      : '0 0 20px rgba(96,165,250,0.5)',
                    animation: !hasStreak ? 'iceShimmer 2s ease-in-out infinite' : 'none',
                  }}>
                    {bestStreak}
                  </div>
                  <div style={{ fontSize:12, color: hasStreak ? '#92400e' : '#1d4ed8', marginTop:2, fontWeight:600 }}>
                    {hasStreak ? 'días consecutivos' : 'Empezá hoy y descongelá tu racha'}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color: hasStreak ? '#92400e' : '#1d4ed8', marginBottom:8, fontWeight:600 }}>
                    Hábitos hoy
                  </div>
                  <div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap', maxWidth:160 }}>
                    {habitsSorted.slice(0,5).map((h,i) => (
                      <div key={i} style={{
                        width:28, height:28, borderRadius:8,
                        background: h.doneToday
                          ? (hasStreak ? 'rgba(249,115,22,0.3)' : 'rgba(96,165,250,0.3)')
                          : 'rgba(30,30,40,0.5)',
                        border: `1.5px solid ${h.doneToday ? (hasStreak ? '#f97316' : '#60a5fa') : '#1e1e2e'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13,
                        boxShadow: h.doneToday ? `0 0 8px ${hasStreak ? 'rgba(249,115,22,0.4)' : 'rgba(96,165,250,0.4)'}` : 'none',
                      }}>
                        {h.doneToday ? '✓' : h.emoji||''}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:12, color: hasStreak ? '#78350f' : '#1d4ed8', marginTop:8, fontWeight:600 }}>
                    {habitosDone}/{habitosTotal} completos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}


      {/* ══════════════════════════════════════════════════════
          VISION BOARD — más grande
          ══════════════════════════════════════════════════════ */}
      <SEC icon="🖼️" label="Vision Board" color="var(--c-vision)"
        action={boardPreview.length > 0 ? 'Ver todo →' : 'Crear →'}
        onAction={() => navTo('vision')}
      />
      {boardPreview.length > 0 ? (
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6, marginBottom:20, scrollbarWidth:'none' }}>
          {boardPreview.map(img => (
            <button key={img.id} onClick={() => navTo('vision')}
              style={{ flexShrink:0, width:130, height:110, borderRadius:14, overflow:'hidden', border:'none', padding:0, cursor:'pointer', position:'relative', background:'#1a1a2e' }}>
              <img src={img.url} alt={img.caption||''} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
              {img.caption && (
                <div style={{
                  position:'absolute', bottom:0, left:0, right:0,
                  background:'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  padding:'16px 8px 6px',
                }}>
                  <p style={{ ...SL, fontSize:11, fontWeight:600, color:'#fff', lineHeight:1.3 }}>
                    {img.caption.length > 30 ? img.caption.slice(0,30)+'…' : img.caption}
                  </p>
                </div>
              )}
            </button>
          ))}
          <button onClick={() => navTo('vision')}
            style={{ flexShrink:0, width:80, height:110, borderRadius:14, border:'0.5px dashed rgba(236,72,153,0.4)', background:'rgba(236,72,153,0.06)', color:'var(--c-vision)', fontSize:26, cursor:'pointer' }}>
            +
          </button>
        </div>
      ) : (
        <button onClick={() => navTo('vision')}
          style={{ ...SL, width:'100%', padding:'14px 0', borderRadius:14, border:'0.5px dashed rgba(236,72,153,0.35)', background:'rgba(236,72,153,0.05)', color:'var(--c-vision)', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:20 }}>
          🖼️ Agregá imágenes que te inspiren
        </button>
      )}


      {/* ══════════════════════════════════════════════════════
          HÁBITOS DE HOY
          ══════════════════════════════════════════════════════ */}
      {habitsSorted.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <SEC icon="⚡" label="Hábitos de hoy" color="var(--c-habits)" action="Ver todos →" onAction={() => navTo('calendar')} />
          <div style={{ background:'rgba(14,14,26,0.85)', borderRadius:16, padding:'4px 14px', border:'0.5px solid rgba(249,115,22,0.15)' }}>
            {habitsSorted.map(habit => (
              <HabitRow key={habit.id} habit={habit}
                recoverable={recoverableIds.has(habit.id)}
                onToggle={() => handleToggleHabit(habit.id)}
                onRecover={() => handleRecoverStreak(habit.id)}
              />
            ))}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          TAREAS DE HOY
          ══════════════════════════════════════════════════════ */}
      {tasksToday.length > 0 ? (
        <div style={{ marginBottom:20 }}>
          <SEC icon="✅" label="Tareas de hoy" color="var(--c-tasks)" action="Agregar →" onAction={() => navTo('calendar')} />
          <div style={{ background:'rgba(14,14,26,0.85)', borderRadius:16, padding:'4px 14px', border:'0.5px solid rgba(96,165,250,0.2)' }}>
            {tasksToday.map(task => (
              <div key={task.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}
                className="task-quick-row">
                <button
                  style={{
                    width:22, height:22, borderRadius:'50%', flexShrink:0,
                    border: task.completed ? 'none' : '1.5px solid #374151',
                    background: task.completed ? '#60a5fa' : 'transparent',
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow: task.completed ? '0 0 8px rgba(96,165,250,0.5)' : 'none',
                    transition:'all .15s',
                  }}
                  onClick={() => toggleTask(task.id, task.completed)}
                >
                  {task.completed && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="1.5,5.5 4.5,8.5 9.5,2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span style={{
                  ...SL, flex:1, fontSize:14, fontWeight:500,
                  color: task.completed ? 'var(--text3)' : 'var(--text)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}>
                  {task.title}
                  {task.moved_from_date && !task.completed && <span style={{ fontSize:10, color:'var(--text3)', marginLeft:6 }}>(movida)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => navTo('calendar')}
          style={{ ...SL, width:'100%', marginBottom:20, padding:'11px 0', borderRadius:12, border:'0.5px dashed rgba(96,165,250,0.3)', background:'rgba(96,165,250,0.05)', color:'var(--c-tasks)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          📋 Planificar tareas para hoy
        </button>
      )}


      {/* ══════════════════════════════════════════════════════
          MI ANÁLISIS
          ══════════════════════════════════════════════════════ */}
      {insights.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <SEC icon="🧠" label="Mi análisis" color="var(--c-insights)" />
          {insights.map((ins, i) => (
            <div key={i} className={`insight-card ${ins.type}`} style={{ marginBottom:8 }}>
              <div className="insight-emoji">{ins.emoji}</div>
              <div className="insight-body">
                <div className="insight-title">{ins.title}</div>
                {ins.detail && <div className="insight-detail">{ins.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          FAVORITOS
          ══════════════════════════════════════════════════════ */}
      {favoritos.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <SEC icon="⭐" label="Favoritos" color="#fbbf24" />
          {favoritos.slice(0,3).map(note => (
            <NoteCard key={note.id} note={note}
              catLabel={getNombreCat(note.category_id)}
              notaTags={getTagsForNote(note.id)}
              onPress={() => pushTo('editor', { noteId:note.id, catId:note.category_id, title:'Editar apunte' })}
              onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
            />
          ))}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════
          APUNTES RECIENTES — neon violeta
          ══════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:8 }}>
        <SEC icon="📝" label="Apuntes recientes" color="#a78bfa" action="+ Nuevo" onAction={() => pushTo('editor', { title:'Nuevo apunte' })} />
        {recientes.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 16px', color:'var(--text3)', fontSize:13 }}>
            Tocá <strong style={{ color:'var(--text2)' }}>+ Nuevo</strong> para crear tu primer apunte.
          </div>
        ) : (
          <>
            {recientes.map(note => (
              <NoteCard key={note.id} note={note}
                catLabel={getNombreCat(note.category_id)}
                notaTags={getTagsForNote(note.id)}
                onPress={() => pushTo('editor', { noteId:note.id, catId:note.category_id, title:'Editar apunte' })}
                onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
              />
            ))}
            {notes.length > 3 && (
              <button onClick={() => setNotasExpandidas(p => !p)}
                style={{ ...SL, width:'100%', padding:'10px 0', borderRadius:10, border:'0.5px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:6 }}>
                {notasExpandidas ? '▲ Ver menos' : `▼ Ver todos (${notes.length})`}
              </button>
            )}
          </>
        )}
      </div>


      {/* ── Modales ── */}
      {reward && <RewardModal streak={reward.streak} habitName={reward.habitName} rewardText={reward.rewardText} onClose={() => setReward(null)} />}
      {consolidacion && <ConsolidacionModal habitName={consolidacion.habitName} onArchivar={() => handleArchivarHabito(consolidacion.habitId)} onSeguir={() => setConsolidacion(null)} />}
      {ayerModal && <AyerModal tareas={ayerModal} onMover={handleMoverTareasDeAyer} onDescartar={handleDescartarTareasDeAyer} />}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   HABIT ROW
   ════════════════════════════════════════════════════════ */
function HabitRow({ habit, recoverable, onToggle, onRecover }) {
  const { doneToday, streak, last7 } = habit
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'10px 0',
      borderBottom:'0.5px solid rgba(255,255,255,0.04)',
    }}>
      <button onClick={onToggle} style={{
        width:26, height:26, borderRadius:8, flexShrink:0,
        border:`2px solid ${doneToday ? '#f97316' : '#374151'}`,
        background: doneToday ? '#f97316' : 'transparent',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all .15s',
        boxShadow: doneToday ? '0 0 10px rgba(249,115,22,0.45)' : 'none',
      }}>
        {doneToday && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontFamily:"'Space Grotesk',system-ui,sans-serif",
          fontSize:14, fontWeight:600,
          color: doneToday ? 'var(--text3)' : 'var(--text)',
          textDecoration: doneToday ? 'line-through' : 'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {habit.emoji} {habit.name}
        </div>
        <div style={{ display:'flex', gap:3, marginTop:5 }}>
          {last7.map((day, i) => (
            <div key={i} style={{
              width:8, height:8, borderRadius:'50%',
              background: day.done ? (day.isRecovered ? '#a78bfa' : '#f97316') : 'rgba(55,65,81,0.6)',
              boxShadow: day.done ? `0 0 5px ${day.isRecovered ? '#a78bfa' : '#f97316'}` : 'none',
              transition:'all .2s',
            }} />
          ))}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
        {recoverable && !doneToday ? (
          <button onClick={onRecover} style={{
            fontFamily:"'Space Grotesk',system-ui,sans-serif",
            fontSize:11, fontWeight:700, padding:'3px 8px',
            borderRadius:8, border:'0.5px solid #a78bfa',
            background:'rgba(167,139,250,0.12)', color:'#a78bfa',
            cursor:'pointer',
          }}>⚡ Recuperar</button>
        ) : streak > 0 ? (
          <>
            <span style={{ fontSize:13 }}>🔥</span>
            <span style={{ fontFamily:"'Space Grotesk',system-ui,sans-serif", fontSize:13, fontWeight:700, color: streak >= 7 ? '#f97316' : 'var(--text)' }}>{streak}</span>
          </>
        ) : (
          <span style={{ fontSize:11, color:'var(--text3)' }}>—</span>
        )}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   NOTE CARD — neon violeta
   ════════════════════════════════════════════════════════ */
function NoteCard({ note, catLabel, notaTags, onPress, onToggleFavorite }) {
  const preview = truncate(stripHtml(note.content))
  return (
    <div className="neon-spin-violet" style={{ marginBottom:10, cursor:'pointer' }} onClick={onPress}>
      <div className="neon-spin-violet-inner">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
          <div style={{ fontFamily:"'Space Grotesk',system-ui,sans-serif", fontSize:14, fontWeight:700, color:'#e2e8f0', flex:1 }}>
            {note.title}
          </div>
          <button onClick={e => { e.stopPropagation(); onToggleFavorite() }}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:15, padding:'2px 4px', lineHeight:1, flexShrink:0, opacity:note.is_favorite?1:0.2, color:'#fbbf24', transition:'opacity .15s' }}>
            ★
          </button>
        </div>
        {preview && <div style={{ fontSize:12, color:'var(--text2)', marginTop:4, lineHeight:1.55 }}>{preview}</div>}
        {notaTags.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:7 }}>
            {notaTags.map(tag => (
              <span key={tag.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'0.5px solid rgba(167,139,250,0.25)' }}>#{tag.name}</span>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:8 }}>
          <span style={{ fontSize:11, color:'var(--text3)' }}>{fdate(note.updated_at)}</span>
          {catLabel && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'rgba(99,102,241,0.12)', color:'#818cf8', border:'0.5px solid rgba(99,102,241,0.2)' }}>{catLabel}</span>}
        </div>
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   MODALES (sin cambios visuales mayores, solo colores)
   ════════════════════════════════════════════════════════ */
function AyerModal({ tareas, onMover, onDescartar }) {
  const SL = { fontFamily:"'Space Grotesk',system-ui,sans-serif" }
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 24px' }}>
      <div style={{ width:'100%',maxWidth:420,background:'rgba(14,14,26,0.98)',borderRadius:'24px 24px 16px 16px',padding:'28px 24px 20px',border:'0.5px solid rgba(255,255,255,0.08)',animation:'slideUp 0.25s ease' }}>
        <div style={{ fontSize:28,textAlign:'center',marginBottom:8 }}>⚠️</div>
        <div style={{ ...SL,fontSize:17,fontWeight:700,textAlign:'center',marginBottom:4,color:'var(--text)' }}>
          {tareas.length===1?'Quedó 1 tarea de ayer':'Quedaron '+tareas.length+' tareas de ayer'}
        </div>
        <div style={{ ...SL,fontSize:13,color:'var(--text2)',textAlign:'center',marginBottom:20 }}>¿Qué hacemos con ellas?</div>
        <div style={{ background:'rgba(20,20,38,0.8)',borderRadius:12,padding:'4px 14px',marginBottom:20 }}>
          {tareas.map((t,i)=>(
            <div key={t.id} style={{ ...SL,fontSize:13,fontWeight:500,padding:'8px 0',color:'var(--text2)',borderBottom:i<tareas.length-1?'0.5px solid rgba(255,255,255,0.05)':'none' }}>• {t.title}</div>
          ))}
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onDescartar} style={{ ...SL,flex:1,padding:'13px 0',borderRadius:12,border:'0.5px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:14,fontWeight:600,cursor:'pointer' }}>Descartar</button>
          <button onClick={onMover} style={{ ...SL,flex:1,padding:'13px 0',borderRadius:12,border:'none',background:'#60a5fa',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer' }}>📋 Mover a hoy</button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}

function ConsolidacionModal({ habitName, onArchivar, onSeguir }) {
  const SL = { fontFamily:"'Space Grotesk',system-ui,sans-serif" }
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div style={{ width:'100%',maxWidth:340,background:'rgba(14,14,26,0.98)',borderRadius:24,padding:'32px 24px',textAlign:'center',border:'0.5px solid rgba(249,115,22,0.3)',animation:'popIn 0.25s ease' }}>
        <div style={{ fontSize:56,marginBottom:12,lineHeight:1 }}>🏆</div>
        <div style={{ ...SL,fontSize:22,fontWeight:700,marginBottom:6,color:'var(--text)' }}>¡30 días seguidos!</div>
        <div style={{ ...SL,fontSize:14,color:'var(--c-habits)',fontWeight:600,marginBottom:12 }}>{habitName}</div>
        <div style={{ ...SL,fontSize:13,color:'var(--text2)',marginBottom:24,lineHeight:1.6 }}>Este hábito ya está consolidado. Podés archivarlo como logro o seguir manteniéndolo.</div>
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <button onClick={onArchivar} style={{ ...SL,width:'100%',padding:'14px 0',borderRadius:14,border:'none',background:'#f97316',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer' }}>🏅 Archivarlo como logrado</button>
          <button onClick={onSeguir} style={{ ...SL,width:'100%',padding:'13px 0',borderRadius:14,border:'0.5px solid var(--border)',background:'transparent',color:'var(--text)',fontSize:14,fontWeight:600,cursor:'pointer' }}>Seguir manteniéndolo</button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

function RewardModal({ streak, habitName, rewardText, onClose }) {
  const SL = { fontFamily:"'Space Grotesk',system-ui,sans-serif" }
  const emoji = streak >= 21 ? '🌟' : '🎉'
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
      <div style={{ width:'100%',maxWidth:340,background:'rgba(14,14,26,0.98)',borderRadius:24,padding:'32px 24px',textAlign:'center',border:'0.5px solid rgba(249,115,22,0.3)',animation:'popIn 0.25s ease' }}>
        <div style={{ fontSize:56,marginBottom:12,lineHeight:1 }}>{emoji}</div>
        <div style={{ ...SL,fontSize:22,fontWeight:700,marginBottom:6,color:'var(--text)' }}>¡{streak} días seguidos!</div>
        <div style={{ ...SL,fontSize:14,color:'var(--c-habits)',fontWeight:600,marginBottom:16 }}>{habitName}</div>
        {rewardText
          ? <div style={{ background:'rgba(20,20,38,0.8)',borderRadius:14,padding:'14px 16px',marginBottom:24 }}><div style={{ ...SL,fontSize:11,color:'var(--text2)',marginBottom:4,fontWeight:700,textTransform:'uppercase' }}>Tu premio</div><div style={{ ...SL,fontSize:16,fontWeight:700,color:'var(--text)' }}>🎁 {rewardText}</div></div>
          : <div style={{ background:'rgba(20,20,38,0.8)',borderRadius:14,padding:'12px 16px',marginBottom:24,...SL,fontSize:13,color:'var(--text2)' }}>Configurá un premio al crear hábitos 🎁</div>
        }
        <button onClick={onClose} style={{ ...SL,width:'100%',padding:'14px 0',borderRadius:14,border:'none',background:'#f97316',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer' }}>
          {streak >= 21 ? '¡Lo merezco! 🌟' : '¡Sigo así! 💪'}
        </button>
      </div>
    </div>
  )
}