/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/CalendarScreen.jsx               ║
║                                                          ║
║  Fase 3 — Calendario                                     ║
║                                                          ║
║  Contiene (todo en un solo archivo):                     ║
║    • CalendarScreen  → componente principal              ║
║    • MonthGrid       → grilla mensual con puntos         ║
║    • DayPanel        → eventos + tareas + hábitos        ║
║    • EventModal      → crear/editar evento               ║
║    • TaskModal       → crear tarea del día               ║
║    • HabitModal      → crear hábito                      ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState } from 'react'
import { useApp }   from '../../context/AppContext'


/* ════════════════════════════════════════════════════════
   CONSTANTES Y HELPERS
   ════════════════════════════════════════════════════════ */

/* Días de la semana en español, empezando en Lunes
   (Argentina usa lunes como primer día de la semana)     */
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/* Tipos de eventos con color y emoji asociados */
export const TIPOS_EVENTO = [
  { value: 'event',    label: 'Evento',         color: '#4a90d9', emoji: '📅' },
  { value: 'reminder', label: 'Recordatorio',   color: '#40e617', emoji: '🔔' },
  { value: 'deadline', label: 'Entrega',        color: '#e67e22', emoji: '📌' },
  { value: 'exam',     label: 'Examen',         color: '#8e44ad', emoji: '📝' },
  { value: 'partial',  label: 'Parcial',        color: '#c40d0d', emoji: '📋' },
]

function getTipoEvento(type) {
  return TIPOS_EVENTO.find(t => t.value === type) || TIPOS_EVENTO[0]
}

/*
  todayStr — devuelve la fecha de HOY como 'YYYY-MM-DD'

  Usamos getFullYear/getMonth/getDate en vez de toISOString()
  porque toISOString() convierte a UTC, lo que puede dar
  el día "equivocado" si el usuario está en UTC-3 y son las 22hs.
  getDate() usa la zona horaria LOCAL del dispositivo.
*/
function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/*
  buildCalendarDays — genera el array de celdas para la grilla.

  Retorna un array donde:
    null  → celda vacía (relleno antes del día 1)
    1..N  → número del día del mes

  Argentina usa Lunes como primer día, entonces ajustamos:
    getDay() devuelve: Dom=0, Lun=1, Mar=2 ... Sáb=6
    Queremos:          Lun=0, Mar=1 ... Dom=6
    Fórmula:           (getDay() + 6) % 7
*/
function buildCalendarDays(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rawFirstDay = new Date(year, month, 1).getDay()
  const firstDow    = (rawFirstDay + 6) % 7  // Ajuste Lun=0

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

function formatMonthYear(year, month) {
  return new Date(year, month, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function formatDayLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* Convierte 'YYYY-MM-DD' a objeto Date sin problemas de timezone */
function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}


/* ════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════ */

export default function CalendarScreen() {
  const {
    events, tasks, habits,
    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,
    getEventsForDate, getTasksForDate, isHabitDone,
    showToast,
  } = useApp()

  /* Estado del calendario */
  const today = todayStr()
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewYear,  setViewYear]  = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  /*
    Estado del modal activo.
    modal = null                              → nada abierto
    modal = { mode: 'event', data: {}, editing: false }
    modal = { mode: 'task',  data: {} }
    modal = { mode: 'habit', data: {} }
  */
  const [modal, setModal] = useState(null)

  /* ── Navegación de mes ──────────────────────────────── */
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  /* Ir al mes de hoy con un tap en el título */
  function goToToday() {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelectedDate(todayStr())
  }

  /* ── Datos del día seleccionado ─────────────────────── */
  const dayEvents = getEventsForDate(selectedDate)
  const dayTasks  = getTasksForDate(selectedDate)
  const calDays   = buildCalendarDays(viewYear, viewMonth)

  /* ── Handlers del modal de evento ──────────────────── */
  async function handleSaveEvent(data) {
    if (modal?.editing) {
      await updateEvent(modal.data.id, data)
      showToast('Evento actualizado')
    } else {
      await createEvent({ ...data, date: data.date || selectedDate })
      showToast('Evento creado ✓')
    }
    setModal(null)
  }

  async function handleDeleteEvent() {
    await deleteEvent(modal.data.id)
    showToast('Evento eliminado')
    setModal(null)
  }

  async function handleSaveTask(data) {
    await createTask({ ...data, date: selectedDate, completed: false })
    showToast('Tarea creada ✓')
    setModal(null)
  }

  async function handleSaveHabit(data) {
    await createHabit(data)
    showToast('Hábito creado ✓')
    setModal(null)
  }


  return (
    <div className="cnt">

      {/* ── Navegador de mes ─────────────────────────── */}
      <div className="cal-nav">
        <button className="ibtn" onClick={prevMonth} aria-label="Mes anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button className="cal-month-label" onClick={goToToday} title="Ir a hoy">
          {formatMonthYear(viewYear, viewMonth)}
        </button>

        <button className="ibtn" onClick={nextMonth} aria-label="Mes siguiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>

      {/* ── Grilla del mes ─────────────────────────────── */}
      <div className="cal-grid-wrap">

        {/* Header: nombres de los días */}
        <div className="cal-weekdays">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="cal-weekday">{d}</div>
          ))}
        </div>

        {/* Celdas del mes */}
        <div className="cal-grid">
          {calDays.map((day, idx) => {

            /* Celda vacía de relleno */
            if (!day) return (
              <div key={`empty-${idx}`} className="cal-cell cal-cell--empty" />
            )

            /* Construimos el string de fecha para este día */
            const dateStr = [
              viewYear,
              String(viewMonth + 1).padStart(2, '0'),
              String(day).padStart(2, '0'),
            ].join('-')

            const isToday    = dateStr === today
            const isSelected = dateStr === selectedDate

            /* Puntos de eventos — máximo 3 visibles */
            const dotEvents = events.filter(e => e.date === dateStr).slice(0, 3)
            const hasTasks  = tasks.some(t => t.date === dateStr)

            return (
              <button
                key={dateStr}
                className={[
                  'cal-cell',
                  isSelected ? 'cal-cell--selected' : '',
                  isToday && !isSelected ? 'cal-cell--today' : '',
                ].join(' ')}
                onClick={() => setSelectedDate(dateStr)}
                aria-label={`${day} ${formatMonthYear(viewYear, viewMonth)}`}
              >
                <span className="cal-day-num">{day}</span>

                <div className="cal-dots">
                  {dotEvents.map(ev => (
                    <span
                      key={ev.id}
                      className="cal-dot"
                      style={{
                        background: isSelected
                          ? 'rgba(255,255,255,0.8)'
                          : getTipoEvento(ev.type).color
                      }}
                    />
                  ))}
                  {/* Punto gris para tareas */}
                  {hasTasks && !isSelected && (
                    <span className="cal-dot" style={{ background: 'var(--text3)' }} />
                  )}
                  {hasTasks && isSelected && (
                    <span className="cal-dot" style={{ background: 'rgba(255,255,255,0.5)' }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Leyenda de tipos ──────────────────────────── */}
      <div className="cal-legend">
        {TIPOS_EVENTO.map(et => (
          <span key={et.value} className="cal-legend-item">
            <span className="cal-dot" style={{ background: et.color }} />
            {et.label}
          </span>
        ))}
      </div>

      {/* ── Panel del día seleccionado ─────────────────── */}
      <div style={{ marginTop: 20 }}>

        {/* Encabezado con fecha y botones de acción */}
        <div className="cal-day-header">
          <span className="cal-day-title">
            {formatDayLong(selectedDate)}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="cal-add-btn"
              onClick={() => setModal({ mode: 'event', data: { date: selectedDate }, editing: false })}
            >
              + Evento
            </button>
            <button
              className="cal-add-btn"
              onClick={() => setModal({ mode: 'task', data: {} })}
            >
              + Tarea
            </button>
          </div>
        </div>

        {/* ── Eventos del día ──────────────────────────── */}
        {dayEvents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="sec" style={{ marginBottom: 8 }}>Eventos</div>
            {dayEvents.map(ev => {
              const et = getTipoEvento(ev.type)
              return (
                <div
                  key={ev.id}
                  className="cal-event-row"
                  onClick={() => setModal({ mode: 'event', data: ev, editing: true })}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{et.emoji}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cal-event-title">{ev.title}</div>
                    {ev.time && (
                      <div className="cal-event-time">🕐 {ev.time.slice(0, 5)}</div>
                    )}
                    {ev.notes && (
                      <div className="cal-event-notes">{ev.notes}</div>
                    )}
                  </div>

                  <span
                    className="chip"
                    style={{
                      background: et.color + '22',
                      color: et.color,
                      borderColor: et.color + '44',
                      fontSize: 10,
                      flexShrink: 0,
                    }}
                  >
                    {et.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Tareas del día ────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div className="sec" style={{ marginBottom: 8 }}>Tareas del día</div>

          {dayTasks.length === 0 ? (
            <div className="cal-empty">Sin tareas para este día</div>
          ) : (
            dayTasks.map(task => (
              <div key={task.id} className="cal-task-row">

                {/* Checkbox */}
                <button
                  className={`cal-check${task.completed ? ' cal-check--done' : ''}`}
                  onClick={() => toggleTask(task.id, task.completed)}
                  aria-label={task.completed ? 'Marcar como pendiente' : 'Completar tarea'}
                >
                  {task.completed && '✓'}
                </button>

                {/* Texto de la tarea */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: task.completed ? 'var(--text3)' : 'var(--text)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>

                {/* Indicador de prioridad */}
                {task.priority === 'high' && !task.completed && (
                  <span style={{ fontSize: 10, color: '#c0392b', fontWeight: 600 }}>ALTA</span>
                )}

                {/* Botón eliminar */}
                <button
                  className="ibtn"
                  style={{ padding: '2px 4px', minWidth: 'unset' }}
                  onClick={() => { deleteTask(task.id); showToast('Tarea eliminada') }}
                  aria-label="Eliminar tarea"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

              </div>
            ))
          )}
        </div>

        {/* ── Hábitos ──────────────────────────────────── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="sec" style={{ marginBottom: 0 }}>Hábitos</div>
            <button
              style={{
                fontSize: 12, color: 'var(--text2)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--sans)',
              }}
              onClick={() => setModal({ mode: 'habit', data: {} })}
            >
              + Nuevo
            </button>
          </div>

          {habits.length === 0 ? (
            <div className="cal-empty">
              No hay hábitos configurados.<br />Tocá &quot;+ Nuevo&quot; para agregar uno.
            </div>
          ) : (
            habits.map(habit => {
              const done = isHabitDone(habit.id, selectedDate)
              return (
                <div key={habit.id} className="cal-task-row">

                  <button
                    className={`cal-check${done ? ' cal-check--done' : ''}`}
                    onClick={() => toggleHabitLog(habit.id, selectedDate)}
                    aria-label={done ? 'Desmarcar hábito' : 'Completar hábito'}
                  >
                    {done && '✓'}
                  </button>

                  <span style={{
                    flex: 1, fontSize: 14,
                    color: done ? 'var(--text3)' : 'var(--text)',
                  }}>
                    {habit.emoji} {habit.name}
                  </span>

                  <button
                    className="ibtn"
                    style={{ padding: '2px 4px', minWidth: 'unset' }}
                    onClick={() => { deleteHabit(habit.id); showToast('Hábito eliminado') }}
                    aria-label="Eliminar hábito"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                </div>
              )
            })
          )}
        </div>

      </div>
      {/* fin panel del día */}


      {/* ════════════════════════════════════════════════
          MODALES
          ════════════════════════════════════════════════ */}

      {modal?.mode === 'event' && (
        <EventModal
          initial={modal.data}
          editing={modal.editing}
          onSave={handleSaveEvent}
          onDelete={modal.editing ? handleDeleteEvent : null}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.mode === 'task' && (
        <TaskModal
          onSave={handleSaveTask}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.mode === 'habit' && (
        <HabitModal
          onSave={handleSaveHabit}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  )
}


/* ════════════════════════════════════════════════════════
   MODAL DE EVENTO
   ════════════════════════════════════════════════════════ */

function EventModal({ initial, editing, onSave, onDelete, onClose }) {
  const [title,  setTitle]  = useState(initial?.title  || '')
  const [date,   setDate]   = useState(initial?.date   || todayStr())
  const [time,   setTime]   = useState(initial?.time   ? initial.time.slice(0, 5) : '')
  const [type,   setType]   = useState(initial?.type   || 'event')
  const [notes,  setNotes]  = useState(initial?.notes  || '')
  const [saving, setSaving] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      title:  title.trim(),
      date,
      time:   time || null,
      type,
      notes:  notes.trim() || null,
    })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">
            {editing ? 'Editar evento' : 'Nuevo evento'}
          </span>
          <button className="ibtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Título */}
        <div className="fld">
          <label className="lbl">Título *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Parcial de Algoritmos"
            autoFocus
          />
        </div>

        {/* Tipo de evento */}
        <div className="fld">
          <label className="lbl">Tipo</label>
          <div className="cal-type-grid">
            {TIPOS_EVENTO.map(et => (
              <button
                key={et.value}
                className={`cal-type-btn${type === et.value ? ' cal-type-btn--active' : ''}`}
                style={type === et.value
                  ? { borderColor: et.color, color: et.color, background: et.color + '15' }
                  : {}
                }
                onClick={() => setType(et.value)}
              >
                {et.emoji} {et.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha y hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fld">
            <label className="lbl">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="fld">
            <label className="lbl">Hora (opcional)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        {/* Notas */}
        <div className="fld">
          <label className="lbl">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Temas, sala, recordatorios..."
            style={{ minHeight: 72 }}
          />
        </div>

        <button
          className="btn-p"
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear evento'}
        </button>

        {/* Eliminar (solo en modo edición) */}
        {onDelete && !showConfirmDelete && (
          <button className="btn-d" onClick={() => setShowConfirmDelete(true)}>
            Eliminar evento
          </button>
        )}

        {onDelete && showConfirmDelete && (
          <div className="confirm-box">
            <p>¿Eliminar este evento? Esta acción no se puede deshacer.</p>
            <div className="confirm-row">
              <button className="confirm-yes" onClick={onDelete}>Eliminar</button>
              <button className="confirm-no"  onClick={() => setShowConfirmDelete(false)}>Cancelar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   MODAL DE TAREA
   ════════════════════════════════════════════════════════ */

function TaskModal({ onSave, onClose }) {
  const [title,    setTitle]    = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving,   setSaving]   = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), priority })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">Nueva tarea</span>
          <button className="ibtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="fld">
          <label className="lbl">Tarea *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ej: Estudiar capítulo 3"
            autoFocus
          />
        </div>

        <div className="fld">
          <label className="lbl">Prioridad</label>
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="high">🔴 Alta</option>
            <option value="normal">🟡 Normal</option>
            <option value="low">⚪ Baja</option>
          </select>
        </div>

        <button
          className="btn-p"
          onClick={handleSubmit}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Guardando...' : 'Crear tarea'}
        </button>

      </div>
    </div>
  )
}


/* ════════════════════════════════════════════════════════
   MODAL DE HÁBITO
   ════════════════════════════════════════════════════════ */

const EMOJIS_HABITO = ['✅','💪','📚','🏃','💧','🧘','🥗','😴','✍️','🎯','🚴','🏋️','🎨','💻','🌿']

function HabitModal({ onSave, onClose }) {
  const [name,   setName]   = useState('')
  const [emoji,  setEmoji]  = useState('✅')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), emoji })
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">Nuevo hábito</span>
          <button className="ibtn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Selector de emoji */}
        <div className="fld">
          <label className="lbl">Emoji</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EMOJIS_HABITO.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  fontSize: 22, padding: '6px 8px',
                  border: `2px solid ${emoji === e ? 'var(--border2)' : 'var(--border)'}`,
                  borderRadius: 8,
                  background: emoji === e ? 'var(--bg2)' : 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label={e}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="fld">
          <label className="lbl">Nombre del hábito *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Leer 30 minutos"
            autoFocus
          />
        </div>

        <button
          className="btn-p"
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
        >
          {saving ? 'Guardando...' : 'Crear hábito'}
        </button>

      </div>
    </div>
  )
}
