/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Rediseño Cósmico:                                       ║
║  ✦ Canvas de estrellas animadas de fondo                 ║
║  ✦ Estrellas fugaces aleatorias                          ║
║  ✦ Cards con bordes neon por sección                     ║
║  ✦ Toda la lógica existente preservada                   ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }                       from '../../context/AppContext'
import { useStats }                     from '../../hooks/useStats'
import { useInsights }                  from '../../hooks/useInsights'
import { getGreeting, fdate,
         truncate, stripHtml }          from '../../utils/helpers'


function todayLocal() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}

function todayDisplay() {
  return new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
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
    goals, goalItems, goalImages, getProgress,
    taskStats,
  })

  const [reward,          setReward]          = useState(null)
  const [consolidacion,   setConsolidacion]   = useState(null)
  const [ayerModal,       setAyerModal]       = useState(null)
  const [notasExpandidas, setNotasExpandidas] = useState(false)

  const ayerChecked = useRef(false)
  useEffect(() => {
    if (ayerChecked.current) return
    if (tasks.length === 0)  return
    ayerChecked.current = true
    const pendientes = getYesterdayPendingTasks()
    if (pendientes.length > 0) setAyerModal(pendientes)
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps



  const recoverableIds = new Set(
    habitStats.filter(h => !h.doneToday && isRecoverable(h.id)).map(h => h.id)
  )

  const favoritos    = notes.filter(n => n.is_favorite)
  const recientes    = notasExpandidas ? notes.slice(0, 8) : notes.slice(0, 3)
  const boardPreview = goalImages.slice(0, 5)

  const habitsSorted = [
    ...habitStats.filter(h => !h.doneToday),
    ...habitStats.filter(h =>  h.doneToday),
  ]

  const habitosDone  = habitStats.filter(h => h.doneToday).length
  const habitosTotal = habitStats.length
  const tareasDone   = tasksToday.filter(t => t.completed).length
  const tareasTotal  = tasksToday.length

  async function handleToggleHabit(habitId) {
    const result = await toggleHabitLog(habitId, today)
    if (result.consolidation) {
      setConsolidacion({ habitId, habitName: result.habitName })
    } else if (result.milestone) {
      setReward({ habitName: result.habitName, rewardText: result.rewardText, streak: result.milestone })
    }
  }

  async function handleRecoverStreak(habitId) {
    await recoverStreak(habitId)
    showToast('⚡ Racha recuperada para hoy')
  }

  async function handleArchivarHabito(habitId) {
    await archiveHabit(habitId)
    setConsolidacion(null)
    showToast('🏆 Hábito archivado. ¡Considerá sumar uno nuevo!')
  }

  async function handleMoverTareasDeAyer() {
    if (!ayerModal) return
    await Promise.all(ayerModal.map(t => moveTaskToToday(t.id)))
    setAyerModal(null)
    showToast('✅ Tareas movidas a hoy')
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

  if (dataLoading) {
    return (
      <div className="home-cosmic">
        <div className="home-content">
          <div className="empty">Cargando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-cosmic">

      <div className="home-content">

        {/* ── Saludo ── */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, color: '#4a4a6a', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            {todayDisplay()}
          </div>
          <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, color: '#fff' }}>
            {getGreeting()},{' '}
            <span style={{ color: '#818cf8', textShadow: '0 0 20px rgba(129,140,248,0.6)' }}>
              {displayName || user?.email?.split('@')[0] || 'vos'}
            </span>{' '}👋
          </div>
        </div>

        {/* ── Asistente personal ── */}
        <button
          onClick={() => pushTo('asistente', { title: 'Asistente' })}
          style={{
            width: '100%', marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 16,
            border: '0.5px solid rgba(99,102,241,0.5)',
            background: 'linear-gradient(135deg, rgba(79,70,229,0.22) 0%, rgba(124,58,237,0.22) 100%)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            textAlign: 'left',
            animation: 'cosmicFloat 4s ease-in-out infinite',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}>
            🤖
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#c7d2fe', marginBottom: 2 }}>
              Asistente personal
            </div>
            <div style={{ fontSize: 12, color: '#4a4a6a' }}>
              Chat · Devocional · Briefing del día
            </div>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(99,102,241,0.6)', flexShrink: 0 }}>›</div>
        </button>

        {/* ── Barra de foco del día ── */}
        {(habitosTotal > 0 || tareasTotal > 0) && (
          <div className="focus-bar">
            {habitosTotal > 0 && (
              <div className="focus-pill" style={{ background: 'rgba(249,115,22,0.08)' }}>
                <div className="focus-pill-icon">⚡</div>
                <div className="focus-pill-info">
                  <div className="focus-pill-label" style={{ color: 'var(--c-habits)' }}>Hábitos</div>
                  <div className="focus-pill-value" style={{ color: 'var(--c-habits)' }}>
                    {habitosDone}<span style={{ fontSize: 12, opacity: 0.6 }}>/{habitosTotal}</span>
                  </div>
                </div>
                {habitosDone === habitosTotal && <span style={{ fontSize: 16 }}>✅</span>}
              </div>
            )}
            {tareasTotal > 0 && (
              <div className="focus-pill" style={{ background: 'rgba(96,165,250,0.08)' }}>
                <div className="focus-pill-icon">📋</div>
                <div className="focus-pill-info">
                  <div className="focus-pill-label" style={{ color: 'var(--c-tasks)' }}>Tareas</div>
                  <div className="focus-pill-value" style={{ color: 'var(--c-tasks)' }}>
                    {tareasDone}<span style={{ fontSize: 12, opacity: 0.6 }}>/{tareasTotal}</span>
                  </div>
                </div>
                {tareasDone === tareasTotal && tareasTotal > 0 && <span style={{ fontSize: 16 }}>✅</span>}
              </div>
            )}
          </div>
        )}


        {/* ── Hábitos de hoy ── */}
        {habitsSorted.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="sec-header habits">
              <div className="sec-icon">⚡</div>
              <span className="sec-label">Hábitos de hoy</span>
              <button className="sec-action" onClick={() => navTo('calendar')}>Ver todos →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {habitsSorted.map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  recoverable={recoverableIds.has(habit.id)}
                  onToggle={() => handleToggleHabit(habit.id)}
                  onRecover={() => handleRecoverStreak(habit.id)}
                />
              ))}
            </div>
          </div>
        )}


        {/* ── Tareas de hoy ── */}
        {tasksToday.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <div className="sec-header tasks">
              <div className="sec-icon">✅</div>
              <span className="sec-label">Tareas de hoy</span>
              <button className="sec-action" onClick={() => navTo('calendar')}>Agregar →</button>
            </div>
            <div style={{ background: 'rgba(14,14,26,0.8)', borderRadius: 14, padding: '4px 14px', border: '0.5px solid rgba(96,165,250,0.3)' }}>
              {tasksToday.map(task => (
                <div key={task.id} className="task-quick-row">
                  <button
                    className={`task-check ${task.completed ? 'done' : ''}`}
                    onClick={() => toggleTask(task.id, task.completed)}
                  >
                    {task.completed && (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <polyline points="1.5,5.5 4.5,8.5 9.5,2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 500,
                    color: task.completed ? 'var(--text3)' : 'var(--text)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    transition: 'all 0.15s',
                  }}>
                    {task.title}
                    {task.moved_from_date && !task.completed && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                        (movida)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => navTo('calendar')}
            style={{
              width: '100%', marginBottom: 24, padding: '11px 0',
              borderRadius: 12, border: '0.5px dashed rgba(96,165,250,0.3)',
              background: 'rgba(96,165,250,0.05)', color: 'var(--c-tasks)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            📋 Planificar tareas para hoy
          </button>
        )}


        {/* ── Mi Análisis ── */}
        {insights.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="sec-header insights">
              <div className="sec-icon">🧠</div>
              <span className="sec-label">Mi análisis</span>
            </div>
            {insights.map((ins, i) => (
              <div key={i} className={`insight-card ${ins.type}`}>
                <div className="insight-emoji">{ins.emoji}</div>
                <div className="insight-body">
                  <div className="insight-title">{ins.title}</div>
                  {ins.detail && <div className="insight-detail">{ins.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* ── Vision Board preview ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="sec-header vision">
            <div className="sec-icon">🖼️</div>
            <span className="sec-label">Vision Board</span>
            <button className="sec-action" onClick={() => navTo('vision')}>
              {boardPreview.length > 0 ? 'Ver todo →' : 'Crear →'}
            </button>
          </div>
          {boardPreview.length > 0 ? (
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
              {boardPreview.map(img => (
                <button key={img.id} onClick={() => navTo('vision')} style={{ flexShrink:0, width:88, height:88, borderRadius:12, overflow:'hidden', border:'none', padding:0, cursor:'pointer' }}>
                  <img src={img.url} alt={img.caption||''} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                </button>
              ))}
              <button onClick={() => navTo('vision')} style={{ flexShrink:0, width:88, height:88, borderRadius:12, border:'0.5px dashed rgba(236,72,153,0.35)', background:'rgba(236,72,153,0.06)', color:'var(--c-vision)', fontSize:24, cursor:'pointer' }}>+</button>
            </div>
          ) : (
            <button onClick={() => navTo('vision')} style={{ width:'100%', padding:'14px 0', borderRadius:12, border:'0.5px dashed rgba(236,72,153,0.3)', background:'rgba(236,72,153,0.05)', color:'var(--c-vision)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              🖼️ Agregá imágenes que te inspiren
            </button>
          )}
        </div>


        {/* ── Favoritos ── */}
        {favoritos.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div className="sec-header notes">
              <div className="sec-icon">⭐</div>
              <span className="sec-label">Favoritos</span>
            </div>
            {favoritos.slice(0, 3).map(note => (
              <NoteCard key={note.id} note={note}
                catLabel={getNombreCat(note.category_id)}
                notaTags={getTagsForNote(note.id)}
                onPress={() => pushTo('editor', { noteId:note.id, catId:note.category_id, title:'Editar apunte' })}
                onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
              />
            ))}
          </div>
        )}


        {/* ── Recientes ── */}
        <div style={{ marginBottom: 8 }}>
          <div className="sec-header notes">
            <div className="sec-icon">📝</div>
            <span className="sec-label">Recientes</span>
            <button className="sec-action" onClick={() => pushTo('editor', { title:'Nuevo apunte' })}>+ Nuevo</button>
          </div>
          {recientes.length === 0 ? (
            <div className="empty">Todavía no tenés apuntes. Tocá el <strong>+</strong> para crear el primero.</div>
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
                <button
                  onClick={() => setNotasExpandidas(p => !p)}
                  style={{ width:'100%', padding:'10px 0', borderRadius:10, border:'0.5px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:4 }}
                >
                  {notasExpandidas ? '▲ Ver menos' : `▼ Ver todos (${notes.length})`}
                </button>
              )}
            </>
          )}
        </div>


        {/* ── Modales ── */}
        {reward && (
          <RewardModal
            streak={reward.streak}
            habitName={reward.habitName}
            rewardText={reward.rewardText}
            onClose={() => setReward(null)}
          />
        )}
        {consolidacion && (
          <ConsolidacionModal
            habitName={consolidacion.habitName}
            onArchivar={() => handleArchivarHabito(consolidacion.habitId)}
            onSeguir={() => setConsolidacion(null)}
          />
        )}
        {ayerModal && (
          <AyerModal
            tareas={ayerModal}
            onMover={handleMoverTareasDeAyer}
            onDescartar={handleDescartarTareasDeAyer}
          />
        )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   HabitRow
   ════════════════════════════════════════════════════════ */
function HabitRow({ habit, recoverable, onToggle, onRecover }) {
  const { doneToday, streak, last7 } = habit
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: doneToday ? 'rgba(249,115,22,0.1)' : 'rgba(14,14,26,0.8)',
      borderRadius: 12,
      border: `0.5px solid ${doneToday ? 'rgba(249,115,22,0.5)' : 'rgba(99,102,241,0.12)'}`,
      transition: 'all 0.2s',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${doneToday ? 'var(--c-habits)' : 'var(--text3)'}`,
          background: doneToday ? 'var(--c-habits)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          boxShadow: doneToday ? '0 0 8px rgba(249,115,22,0.4)' : 'none',
        }}
      >
        {doneToday && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: doneToday ? 'var(--text2)' : 'var(--text)',
          textDecoration: doneToday ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}>
          {habit.emoji} {habit.name}
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
          {last7.map((day, i) => (
            <div key={i} title={day.isRecovered ? 'Racha recuperada ⚡' : ''} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: day.done ? (day.isRecovered ? '#a78bfa' : 'var(--c-habits)') : 'var(--bg3)',
              opacity: day.done ? 1 : 0.4,
              transition: 'all 0.2s',
              boxShadow: day.done ? `0 0 4px ${day.isRecovered ? '#a78bfa' : 'rgba(249,115,22,0.5)'}` : 'none',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {recoverable && !doneToday ? (
          <button
            onClick={onRecover}
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px',
              borderRadius: 8, border: '0.5px solid #a78bfa',
              background: 'rgba(167,139,250,0.12)', color: '#a78bfa',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            ⚡ Recuperar
          </button>
        ) : streak > 0 ? (
          <>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: streak >= 7 ? 'var(--c-habits)' : 'var(--text)' }}>
              {streak}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text3)', opacity: 0.4 }}>—</span>
        )}
      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   AyerModal
   ════════════════════════════════════════════════════════ */
function AyerModal({ tareas, onMover, onDescartar }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0 0 24px' }}>
      <div style={{ width:'100%', maxWidth:420, background:'var(--bg2)', borderRadius:'24px 24px 16px 16px', padding:'28px 24px 20px', border:'0.5px solid rgba(255,255,255,0.08)', animation:'slideUp 0.25s ease' }}>
        <div style={{ fontSize:28, textAlign:'center', marginBottom:8 }}>⚠️</div>
        <div style={{ fontSize:17, fontWeight:700, textAlign:'center', marginBottom:4, color:'var(--text)' }}>
          {tareas.length === 1 ? 'Quedó 1 tarea de ayer sin completar' : `Quedaron ${tareas.length} tareas de ayer sin completar`}
        </div>
        <div style={{ fontSize:13, color:'var(--text2)', textAlign:'center', marginBottom:20 }}>
          ¿Qué querés hacer con {tareas.length === 1 ? 'ella' : 'ellas'}?
        </div>
        <div style={{ background:'var(--bg3)', borderRadius:12, padding:'4px 14px', marginBottom:20 }}>
          {tareas.map((t, i) => (
            <div key={t.id} style={{ fontSize:13, fontWeight:500, padding:'8px 0', color:'var(--text2)', borderBottom: i < tareas.length-1 ? '0.5px solid var(--border)' : 'none' }}>
              • {t.title}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onDescartar} style={{ flex:1, padding:'13px 0', borderRadius:12, border:'0.5px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:14, fontWeight:600, cursor:'pointer' }}>Descartar</button>
          <button onClick={onMover} style={{ flex:1, padding:'13px 0', borderRadius:12, border:'none', background:'var(--c-tasks)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>📋 Mover a hoy</button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ConsolidacionModal
   ════════════════════════════════════════════════════════ */
function ConsolidacionModal({ habitName, onArchivar, onSeguir }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:340, background:'var(--bg2)', borderRadius:24, padding:'32px 24px', textAlign:'center', border:'0.5px solid rgba(99,102,241,0.3)', animation:'popIn 0.25s ease' }}>
        <div style={{ fontSize:56, marginBottom:12, lineHeight:1 }}>🏆</div>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:6, color:'var(--text)' }}>¡30 días seguidos!</div>
        <div style={{ fontSize:14, color:'var(--c-habits)', fontWeight:600, marginBottom:12 }}>{habitName}</div>
        <div style={{ fontSize:13, color:'var(--text2)', marginBottom:24, lineHeight:1.6 }}>
          Este hábito ya está consolidado. Podés archivarlo como logro y liberar espacio para uno nuevo, o seguir manteniéndolo.
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={onArchivar} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'var(--c-habits)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>🏅 Archivarlo como logrado</button>
          <button onClick={onSeguir}   style={{ width:'100%', padding:'13px 0', borderRadius:14, border:'0.5px solid var(--border)', background:'transparent', color:'var(--text)', fontSize:14, fontWeight:600, cursor:'pointer' }}>Seguir manteniéndolo</button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   RewardModal
   ════════════════════════════════════════════════════════ */
function RewardModal({ streak, habitName, rewardText, onClose }) {
  const emoji = streak >= 21 ? '🌟' : streak >= 14 ? '🌟' : '🎉'
  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:340, background:'var(--bg2)', borderRadius:24, padding:'32px 24px', textAlign:'center', border:'0.5px solid rgba(249,115,22,0.3)', animation:'popIn 0.25s ease' }}>
        <div style={{ fontSize:56, marginBottom:12, lineHeight:1 }}>{emoji}</div>
        <div style={{ fontSize:22, fontWeight:700, marginBottom:6, color:'var(--text)' }}>¡{streak} días seguidos!</div>
        <div style={{ fontSize:14, color:'var(--c-habits)', fontWeight:600, marginBottom:16 }}>{habitName}</div>
        {rewardText ? (
          <div style={{ background:'var(--bg3)', borderRadius:14, padding:'14px 16px', marginBottom:24 }}>
            <div style={{ fontSize:11, color:'var(--text2)', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>Tu premio</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>🎁 {rewardText}</div>
          </div>
        ) : (
          <div style={{ background:'var(--bg3)', borderRadius:14, padding:'12px 16px', marginBottom:24, fontSize:13, color:'var(--text2)' }}>
            Configurá un premio en "Mi premio" al crear hábitos 🎁
          </div>
        )}
        <button onClick={onClose} style={{ width:'100%', padding:'14px 0', borderRadius:14, border:'none', background:'var(--c-habits)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>
          {streak >= 21 ? '¡Lo merezco! 🌟' : '¡Sigo así! 💪'}
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   NoteCard
   ════════════════════════════════════════════════════════ */
function NoteCard({ note, catLabel, notaTags, onPress, onToggleFavorite }) {
  const preview = truncate(stripHtml(note.content))
  return (
    <div className="note-row" onClick={onPress}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div className="nt" style={{ flex:1 }}>{note.title}</div>
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'2px 4px', lineHeight:1, flexShrink:0, opacity:note.is_favorite?1:0.2, color:'#f59e0b', transition:'opacity 0.15s' }}
        >★</button>
      </div>
      {preview && <div className="np">{preview}</div>}
      {notaTags.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
          {notaTags.map(tag => <span key={tag.id} className="chip">#{tag.name}</span>)}
        </div>
      )}
      <div className="nd" style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel && <span className="chip">{catLabel}</span>}
      </div>
    </div>
  )
}
