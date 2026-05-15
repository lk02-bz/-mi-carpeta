/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Fase 6 — Nuevas funcionalidades:                        ║
║  ✦ Modal de tareas pendientes del día anterior           ║
║  ✦ Modal de consolidación a los 30 días de racha         ║
║  ✦ Botón ⚡ para recuperar racha perdida en HabitRow     ║
║  ✦ useInsights recibe goalItems y taskStats              ║
║  ✦ Puntito violeta en días recuperados (last7)           ║
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
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function todayDisplay() {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
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

  /* ── Estado de modales ──────────────────────────────────── */
  const [reward,          setReward]          = useState(null)  // premio 7/14/21 días
  const [consolidacion,   setConsolidacion]   = useState(null)  // modal 30 días exactos
  const [ayerModal,       setAyerModal]       = useState(null)  // tareas de ayer
  const [notasExpandidas, setNotasExpandidas] = useState(false)

  /* ── Detectar tareas pendientes de ayer (una sola vez) ──── */
  const ayerChecked = useRef(false)
  useEffect(() => {
    if (ayerChecked.current) return   // ya se ejecutó esta sesión
    if (tasks.length === 0)  return   // todavía cargando
    ayerChecked.current = true
    const pendientes = getYesterdayPendingTasks()
    if (pendientes.length > 0) setAyerModal(pendientes)
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Hábitos recuperables ───────────────────────────────── */
  const recoverableIds = new Set(
    habitStats
      .filter(h => !h.doneToday && isRecoverable(h.id))
      .map(h => h.id)
  )

  /* ── Datos derivados ────────────────────────────────────── */
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

  /* ── Handlers ───────────────────────────────────────────── */
  async function handleToggleHabit(habitId) {
    const result = await toggleHabitLog(habitId, today)
    if (result.consolidation) {
      // 30 días exactos → modal especial de consolidación
      setConsolidacion({ habitId, habitName: result.habitName })
    } else if (result.milestone) {
      // 7, 14, 21 días → modal de premio
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
    return <div className="cnt"><div className="empty">Cargando...</div></div>
  }

  return (
    <div className="cnt">

      {/* ── Saludo ─────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div className="greeting-name">
          {getGreeting()}, {displayName || user?.email?.split('@')[0] || 'vos'} 👋
        </div>
        <div className="greeting-date" style={{ marginTop: 4 }}>
          {todayDisplay()}
        </div>
      </div>


      {/* ── Barra de foco del día ──────────────────────── */}
      {(habitosTotal > 0 || tareasTotal > 0) && (
        <div className="focus-bar">
          {habitosTotal > 0 && (
            <div className="focus-pill" style={{ background: 'rgba(249,115,22,0.10)' }}>
              <div className="focus-pill-icon">⚡</div>
              <div className="focus-pill-info">
                <div className="focus-pill-label" style={{ color: 'var(--c-habits)' }}>Hábitos</div>
                <div className="focus-pill-value" style={{ color: 'var(--c-habits)' }}>
                  {habitosDone}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6 }}>/{habitosTotal}</span>
                </div>
              </div>
              {habitosDone === habitosTotal && <span style={{ fontSize: 16 }}>✅</span>}
            </div>
          )}
          {tareasTotal > 0 && (
            <div className="focus-pill" style={{ background: 'rgba(59,130,246,0.10)' }}>
              <div className="focus-pill-icon">📋</div>
              <div className="focus-pill-info">
                <div className="focus-pill-label" style={{ color: 'var(--c-tasks)' }}>Tareas</div>
                <div className="focus-pill-value" style={{ color: 'var(--c-tasks)' }}>
                  {tareasDone}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6 }}>/{tareasTotal}</span>
                </div>
              </div>
              {tareasDone === tareasTotal && tareasTotal > 0 && <span style={{ fontSize: 16 }}>✅</span>}
            </div>
          )}
        </div>
      )}


      {/* ── Hábitos de hoy ─────────────────────────────── */}
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


      {/* ── Tareas de hoy ──────────────────────────────── */}
      {tasksToday.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <div className="sec-header tasks">
            <div className="sec-icon">✅</div>
            <span className="sec-label">Tareas de hoy</span>
            <button className="sec-action" onClick={() => navTo('calendar')}>Agregar →</button>
          </div>
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: '4px 14px' }}>
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
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6, fontWeight: 400 }}>
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
            borderRadius: 12, border: '1.5px dashed rgba(59,130,246,0.4)',
            background: 'rgba(59,130,246,0.05)', color: 'var(--c-tasks)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          📋 Planificar tareas para hoy
        </button>
      )}


      {/* ── Mi Análisis ────────────────────────────────── */}
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


      {/* ── Vision Board preview ───────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div className="sec-header vision">
          <div className="sec-icon">🖼️</div>
          <span className="sec-label">Vision Board</span>
          <button className="sec-action" onClick={() => navTo('vision')}>
            {boardPreview.length > 0 ? 'Ver todo →' : 'Crear →'}
          </button>
        </div>
        {boardPreview.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {boardPreview.map(img => (
              <button key={img.id} onClick={() => navTo('vision')} style={{ flexShrink: 0, width: 88, height: 88, borderRadius: 12, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer' }}>
                <img src={img.url} alt={img.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              </button>
            ))}
            <button onClick={() => navTo('vision')} style={{ flexShrink: 0, width: 88, height: 88, borderRadius: 12, border: '1.5px dashed rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.05)', color: 'var(--c-vision)', fontSize: 24, cursor: 'pointer' }}>+</button>
          </div>
        ) : (
          <button onClick={() => navTo('vision')} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: '1.5px dashed rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.05)', color: 'var(--c-vision)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🖼️ Agregá imágenes que te inspiren
          </button>
        )}
      </div>


      {/* ── Favoritos ──────────────────────────────────── */}
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
              onPress={() => pushTo('editor', { noteId: note.id, catId: note.category_id, title: 'Editar apunte' })}
              onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
            />
          ))}
        </div>
      )}


      {/* ── Recientes ──────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div className="sec-header notes">
          <div className="sec-icon">📝</div>
          <span className="sec-label">Recientes</span>
          <button className="sec-action" onClick={() => pushTo('editor', { title: 'Nuevo apunte' })}>+ Nuevo</button>
        </div>
        {recientes.length === 0 ? (
          <div className="empty">Todavía no tenés apuntes. Tocá el <strong>+</strong> para crear el primero.</div>
        ) : (
          <>
            {recientes.map(note => (
              <NoteCard key={note.id} note={note}
                catLabel={getNombreCat(note.category_id)}
                notaTags={getTagsForNote(note.id)}
                onPress={() => pushTo('editor', { noteId: note.id, catId: note.category_id, title: 'Editar apunte' })}
                onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
              />
            ))}
            {notes.length > 3 && (
              <button
                onClick={() => setNotasExpandidas(p => !p)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--bg2)', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
              >
                {notasExpandidas ? '▲ Ver menos' : `▼ Ver todos (${notes.length})`}
              </button>
            )}
          </>
        )}
      </div>


      {/* ════════════════════════════════════════════════
          MODALES
          ════════════════════════════════════════════════ */}

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
      background: doneToday ? 'rgba(249,115,22,0.07)' : 'var(--card)',
      borderRadius: 12,
      border: doneToday ? '1.5px solid rgba(249,115,22,0.3)' : '1.5px solid transparent',
      transition: 'all 0.2s',
    }}>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${doneToday ? 'var(--c-habits)' : 'var(--text2)'}`,
          background: doneToday ? 'var(--c-habits)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'all 0.15s',
        }}
      >
        {doneToday && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Nombre + puntitos */}
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
        {/* Puntitos últimos 7 días — violeta si fue recuperada */}
        <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
          {last7.map((day, i) => (
            <div
              key={i}
              title={day.isRecovered ? 'Racha recuperada ⚡' : ''}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: day.done
                  ? (day.isRecovered ? '#a78bfa' : 'var(--c-habits)')
                  : 'var(--text2)',
                opacity: day.done ? 0.9 : 0.2,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Derecha: botón recuperar O racha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {recoverable && !doneToday ? (
          <button
            onClick={onRecover}
            title="Recuperar racha"
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px',
              borderRadius: 8, border: '1.5px solid #a78bfa',
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
          <span style={{ fontSize: 12, color: 'var(--text2)', opacity: 0.4 }}>—</span>
        )}
      </div>

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   AyerModal — tareas pendientes del día anterior
   ════════════════════════════════════════════════════════ */
function AyerModal({ tareas, onMover, onDescartar }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--bg)',
        borderRadius: '24px 24px 16px 16px',
        padding: '28px 24px 20px',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.25s ease',
      }}>
        <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>
          {tareas.length === 1
            ? 'Quedó 1 tarea de ayer sin completar'
            : `Quedaron ${tareas.length} tareas de ayer sin completar`}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 20 }}>
          ¿Qué querés hacer con {tareas.length === 1 ? 'ella' : 'ellas'}?
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '4px 14px', marginBottom: 20 }}>
          {tareas.map((t, i) => (
            <div key={t.id} style={{
              fontSize: 13, fontWeight: 500, padding: '8px 0', color: 'var(--text2)',
              borderBottom: i < tareas.length - 1 ? '1px solid var(--bg2)' : 'none',
            }}>
              • {t.title}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDescartar}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              border: '1.5px solid var(--bg2)', background: 'transparent',
              color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Descartar
          </button>
          <button
            onClick={onMover}
            style={{
              flex: 1, padding: '13px 0', borderRadius: 12,
              border: 'none', background: 'var(--c-tasks)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            📋 Mover a hoy
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   ConsolidacionModal — hábito con 30 días de racha
   ════════════════════════════════════════════════════════ */
function ConsolidacionModal({ habitName, onArchivar, onSeguir }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--bg)', borderRadius: 24,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
        animation: 'popIn 0.25s ease',
      }}>
        <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>🏆</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>¡30 días seguidos!</div>
        <div style={{ fontSize: 14, color: 'var(--c-habits)', fontWeight: 600, marginBottom: 12 }}>
          {habitName}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
          Este hábito ya está consolidado. Podés archivarlo como logro y liberar espacio para uno nuevo, o seguir manteniéndolo.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onArchivar}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              border: 'none', background: 'var(--c-habits)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            🏅 Archivarlo como logrado
          </button>
          <button
            onClick={onSeguir}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 14,
              border: '1.5px solid var(--bg2)', background: 'transparent',
              color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Seguir manteniéndolo
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   RewardModal — premio por milestone 7/14/21 días
   (sin cambios respecto a Fase 5)
   ════════════════════════════════════════════════════════ */
function RewardModal({ streak, habitName, rewardText, onClose }) {
  const emoji = streak >= 21 ? '🌟' : streak >= 14 ? '🌟' : '🎉'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--bg)', borderRadius: 24,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
        animation: 'popIn 0.25s ease',
      }}>
        <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>{emoji}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>¡{streak} días seguidos!</div>
        <div style={{ fontSize: 14, color: 'var(--c-habits)', fontWeight: 600, marginBottom: 16 }}>{habitName}</div>
        {rewardText ? (
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Tu premio</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>🎁 {rewardText}</div>
          </div>
        ) : (
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text2)' }}>
            Configurá un premio en "Mi premio" al crear hábitos 🎁
          </div>
        )}
        <button
          onClick={onClose}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'var(--c-habits)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {streak >= 21 ? '¡Lo merezco! 🌟' : '¡Sigo así! 💪'}
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   NoteCard — sin cambios
   ════════════════════════════════════════════════════════ */
function NoteCard({ note, catLabel, notaTags, onPress, onToggleFavorite }) {
  const preview = truncate(stripHtml(note.content))
  return (
    <div className="note-row" onClick={onPress}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="nt" style={{ flex: 1 }}>{note.title}</div>
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', lineHeight: 1, flexShrink: 0, opacity: note.is_favorite ? 1 : 0.2, color: '#f59e0b', transition: 'opacity 0.15s' }}
        >★</button>
      </div>
      {preview && <div className="np">{preview}</div>}
      {notaTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {notaTags.map(tag => <span key={tag.id} className="chip">#{tag.name}</span>)}
        </div>
      )}
      <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel && <span className="chip">{catLabel}</span>}
      </div>
    </div>
  )
}