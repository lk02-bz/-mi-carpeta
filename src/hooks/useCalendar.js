/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useCalendar.js                                ║
║                                                          ║
║  Cambios Fase 6:                                         ║
║  ✦ localDateStr(offsetDays) — ahora acepta offset        ║
║  ✦ calcStreakUpTo() — racha hasta un día específico       ║
║  ✦ moveTaskToToday — mueve tarea de ayer con historial   ║
║  ✦ archiveHabit — archiva hábito + guarda logro          ║
║  ✦ recoverStreak — recupera racha perdida (⚡)            ║
║  ✦ isRecoverable — ¿vale la pena recuperar?              ║
║  ✦ toggleHabitLog — devuelve consolidation a los 30 días ║
║  ✦ achievements — registros de habit_achievements        ║
║  ✦ habits — solo hábitos activos (no archivados)         ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'


/* ════════════════════════════════════════════════════════
   HELPERS DE FECHA
   Todos usan getFullYear/Month/Date (no toISOString)
   para evitar el bug de timezone en Argentina (UTC-3).
   ════════════════════════════════════════════════════════ */

/**
 * localDateStr(offsetDays)
 * Devuelve la fecha local en formato 'YYYY-MM-DD'.
 *   offsetDays = 0  → hoy
 *   offsetDays = 1  → ayer
 *   offsetDays = -1 → mañana
 */
function localDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}


/* ── Helper: racha actual desde hoy hacia atrás ────────── */
function calcStreak(habitId, habitLogs) {
  let streak = 0
  const d = new Date()

  while (streak < 365) {
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`

    const hecho = habitLogs.some(l => l.habit_id === habitId && l.date === dateStr)
    if (!hecho) break
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}


/* ── Helper: racha acumulada justo ANTES de una fecha ─────
   Útil para saber cuántos días consecutivos tenía
   un hábito antes de que se rompiera la racha.

   Ejemplo: si el usuario no marcó ayer ni hoy,
   calcStreakUpTo(id, logs, 'ayer') devuelve los días
   consecutivos que tenía antes de ayer.
*/
function calcStreakUpTo(habitId, habitLogs, beforeDateStr) {
  // Empezamos desde el día anterior a beforeDateStr
  const [y, mo, da] = beforeDateStr.split('-').map(Number)
  const start = new Date(y, mo - 1, da)
  start.setDate(start.getDate() - 1)   // un día antes de beforeDateStr

  let streak = 0
  const d = new Date(start)

  while (streak < 365) {
    const cy  = d.getFullYear()
    const cm  = String(d.getMonth() + 1).padStart(2, '0')
    const cd  = String(d.getDate()).padStart(2, '0')
    const dateStr = `${cy}-${cm}-${cd}`

    const hecho = habitLogs.some(l => l.habit_id === habitId && l.date === dateStr)
    if (!hecho) break
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}


/* ════════════════════════════════════════════════════════
   HOOK PRINCIPAL
   ════════════════════════════════════════════════════════ */

export function useCalendar(user) {

  const [events,       setEvents]       = useState([])
  const [tasks,        setTasks]        = useState([])
  const [habits,       setHabits]       = useState([])
  const [habitLogs,    setHabitLogs]    = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading,      setLoading]      = useState(false)


  /* ── Cargar todo cuando el usuario se loguea ─────────── */
  useEffect(() => {
    if (!user) {
      setEvents([])
      setTasks([])
      setHabits([])
      setHabitLogs([])
      setAchievements([])
      return
    }
    fetchAll()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  async function fetchAll() {
    setLoading(true)
    try {
      const [evRes, taskRes, habitRes, logRes, achRes] = await Promise.all([
        supabase.from('events').select('*').order('date').order('time', { nullsFirst: true }),
        supabase.from('daily_tasks').select('*').order('created_at'),
        supabase.from('habits').select('*').order('created_at'),
        supabase.from('habit_logs').select('*'),
        supabase.from('habit_achievements').select('*').order('achieved_at', { ascending: false }),
      ])

      if (evRes.error)    throw evRes.error
      if (taskRes.error)  throw taskRes.error
      if (habitRes.error) throw habitRes.error
      if (logRes.error)   throw logRes.error
      if (achRes.error)   throw achRes.error

      setEvents(evRes.data)
      setTasks(taskRes.data)
      // habits solo expone los activos — los archivados se ven en achievements
      setHabits(habitRes.data.filter(h => !h.is_archived))
      setHabitLogs(logRes.data)
      setAchievements(achRes.data)

    } catch (err) {
      console.error('useCalendar — fetchAll:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ════════════════════════════════════════════════════════
     EVENTOS
     ════════════════════════════════════════════════════════ */

  const createEvent = useCallback(async (data) => {
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .insert({ ...data, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)))
      return { data: ev, error: null }
    } catch (err) {
      console.error('createEvent:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  const updateEvent = useCallback(async (id, data) => {
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setEvents(prev => prev.map(e => e.id === id ? ev : e))
      return { data: ev, error: null }
    } catch (err) {
      console.error('updateEvent:', err.message)
      return { data: null, error: err }
    }
  }, [])


  const deleteEvent = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== id))
      return { error: null }
    } catch (err) {
      console.error('deleteEvent:', err.message)
      return { error: err }
    }
  }, [])


  /* ════════════════════════════════════════════════════════
     TAREAS DIARIAS
     ════════════════════════════════════════════════════════ */

  const createTask = useCallback(async (data) => {
    try {
      const { data: task, error } = await supabase
        .from('daily_tasks')
        .insert({ ...data, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      setTasks(prev => [...prev, task])
      return { data: task, error: null }
    } catch (err) {
      console.error('createTask:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  const toggleTask = useCallback(async (id, currentCompleted) => {
    try {
      const { data: task, error } = await supabase
        .from('daily_tasks')
        .update({ completed: !currentCompleted })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === id ? task : t))
      return { error: null }
    } catch (err) {
      console.error('toggleTask:', err.message)
      return { error: err }
    }
  }, [])


  const deleteTask = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('daily_tasks').delete().eq('id', id)
      if (error) throw error
      setTasks(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err) {
      console.error('deleteTask:', err.message)
      return { error: err }
    }
  }, [])


  /* ── moveTaskToToday ──────────────────────────────────────
     Mueve una tarea de cualquier fecha pasada a hoy.
     Guarda la fecha original en moved_from_date para el análisis.
     Usada por el modal "Tareas de ayer sin completar".
  */
  const moveTaskToToday = useCallback(async (taskId) => {
    const today = localDateStr(0)
    // Buscamos la tarea para guardar su fecha original
    const task = tasks.find(t => t.id === taskId)
    const originalDate = task?.date ?? null

    try {
      const { data: updated, error } = await supabase
        .from('daily_tasks')
        .update({ date: today, moved_from_date: originalDate })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
      return { error: null }
    } catch (err) {
      console.error('moveTaskToToday:', err.message)
      return { error: err }
    }
  }, [tasks])


  /* ── getYesterdayPendingTasks ─────────────────────────────
     Devuelve las tareas de ayer que quedaron sin completar.
     No hace llamada a Supabase — filtra el estado local.
     Usada en HomeScreen para el modal de aviso.
  */
  const getYesterdayPendingTasks = useCallback(() => {
    const yesterday = localDateStr(1)
    return tasks.filter(t => t.date === yesterday && !t.completed)
  }, [tasks])


  /* ════════════════════════════════════════════════════════
     HÁBITOS
     ════════════════════════════════════════════════════════ */

  const createHabit = useCallback(async ({ name, emoji, reward_text = '' }) => {
    try {
      const { data: habit, error } = await supabase
        .from('habits')
        .insert({ name, emoji, reward_text, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      setHabits(prev => [...prev, habit])
      return { data: habit, error: null }
    } catch (err) {
      console.error('createHabit:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  const deleteHabit = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
      setHabits(prev => prev.filter(h => h.id !== id))
      setHabitLogs(prev => prev.filter(l => l.habit_id !== id))
      return { error: null }
    } catch (err) {
      console.error('deleteHabit:', err.message)
      return { error: err }
    }
  }, [])


  /* ── archiveHabit ─────────────────────────────────────────
     Archiva un hábito con 30+ días de racha.
     1. Inserta un registro en habit_achievements.
     2. Marca el hábito como is_archived = true en habits.
     3. Lo saca del estado local (ya no aparece en activos).

     Llamada desde el modal de consolidación en HomeScreen.
  */
  const archiveHabit = useCallback(async (habitId) => {
    const habit  = habits.find(h => h.id === habitId)
    if (!habit) return { error: new Error('Hábito no encontrado') }

    const streak = calcStreak(habitId, habitLogs)
    const today  = localDateStr(0)

    try {
      /* Paso 1: guardar el logro */
      const { error: achError } = await supabase
        .from('habit_achievements')
        .insert({
          user_id:        user.id,
          habit_id:       habitId,
          habit_name:     habit.name,
          habit_emoji:    habit.emoji || '',
          streak_reached: streak,
          achieved_at:    today,
        })
      if (achError) throw achError

      /* Paso 2: marcar como archivado */
      const { error: habitError } = await supabase
        .from('habits')
        .update({ is_archived: true })
        .eq('id', habitId)
      if (habitError) throw habitError

      /* Paso 3: actualizar estado local */
      setHabits(prev => prev.filter(h => h.id !== habitId))
      setAchievements(prev => [{
        habit_id:       habitId,
        habit_name:     habit.name,
        habit_emoji:    habit.emoji || '',
        streak_reached: streak,
        achieved_at:    today,
        user_id:        user.id,
      }, ...prev])

      return { error: null }
    } catch (err) {
      console.error('archiveHabit:', err.message)
      return { error: err }
    }
  }, [user, habits, habitLogs])


  /* ════════════════════════════════════════════════════════
     REGISTROS DE HÁBITOS
     ════════════════════════════════════════════════════════ */

  /* ── toggleHabitLog ────────────────────────────────────────
     Devuelve:
       { error, milestone, consolidation, habitName, rewardText, streak }

       milestone    → número si la racha es múltiplo de 7 (7,14,21,28…)
                      null si no hay milestone o si se desmarcó
       consolidation → true si la racha llega exactamente a 30 días
                      (independiente del milestone)
       habitName    → nombre del hábito
       rewardText   → premio personalizado
       streak       → racha resultante
  */
  const toggleHabitLog = useCallback(async (habitId, date) => {
    try {
      const existing = habitLogs.find(
        l => l.habit_id === habitId && l.date === date
      )

      /* ── Desmarcar ─────────────────────────────────────── */
      if (existing) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', existing.id)
        if (error) throw error
        setHabitLogs(prev => prev.filter(l => l.id !== existing.id))
        return { error: null, milestone: null, consolidation: false, habitName: null, rewardText: null, streak: 0 }
      }

      /* ── Marcar como hecho ─────────────────────────────── */
      const { data: log, error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user.id, date })
        .select()
        .single()
      if (error) throw error

      const newLogs = [...habitLogs, log]
      const streak  = calcStreak(habitId, newLogs)
      setHabitLogs(newLogs)

      const milestone    = streak > 0 && streak % 7 === 0 ? streak : null
      // Consolidación: exactamente 30 días (el momento clave de archivar)
      const consolidation = streak === 30
      const habit        = habits.find(h => h.id === habitId)

      return {
        error: null,
        milestone,
        consolidation,
        habitName:  habit?.name        || '',
        rewardText: habit?.reward_text || '',
        streak,
      }

    } catch (err) {
      console.error('toggleHabitLog:', err.message)
      return { error: err, milestone: null, consolidation: false, habitName: null, rewardText: null, streak: 0 }
    }
  }, [user, habitLogs, habits])


  /* ── recoverStreak ────────────────────────────────────────
     Marca el hábito como hecho HOY con is_recovered = true.
     Solo actúa si el hábito no fue marcado hoy todavía.
     Usado por el botón "⚡ Recuperar racha" en HomeScreen.
  */
  const recoverStreak = useCallback(async (habitId) => {
    const today    = localDateStr(0)
    const yaHecho  = habitLogs.some(l => l.habit_id === habitId && l.date === today)
    if (yaHecho) return { error: null, alreadyDone: true }

    try {
      const { data: log, error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user.id, date: today, is_recovered: true })
        .select()
        .single()
      if (error) throw error
      setHabitLogs(prev => [...prev, log])
      return { error: null, alreadyDone: false }
    } catch (err) {
      console.error('recoverStreak:', err.message)
      return { error: err }
    }
  }, [user, habitLogs])


  /* ── isRecoverable ────────────────────────────────────────
     Devuelve true si vale la pena ofrecer "Recuperar racha".
     Condiciones:
       1. El hábito NO fue marcado hoy.
       2. El hábito NO fue marcado ayer (la racha ya se rompió).
       3. La racha que tenía antes de ayer era >= 7 días.

     Si la racha previa era menor a 7 días no tiene sentido
     mostrar el botón de recuperación.
  */
  const isRecoverable = useCallback((habitId) => {
    const today     = localDateStr(0)
    const yesterday = localDateStr(1)

    const doneToday     = habitLogs.some(l => l.habit_id === habitId && l.date === today)
    const doneYesterday = habitLogs.some(l => l.habit_id === habitId && l.date === yesterday)

    if (doneToday)     return false   // ya lo hizo hoy → no aplica
    if (doneYesterday) return false   // lo hizo ayer → racha intacta

    // ¿Cuántos días consecutivos tenía hasta antes de ayer?
    const preBreakStreak = calcStreakUpTo(habitId, habitLogs, yesterday)
    return preBreakStreak >= 7
  }, [habitLogs])


  /* ── getStreak — para usar en cualquier pantalla ──────── */
  const getStreak = useCallback((habitId) => {
    return calcStreak(habitId, habitLogs)
  }, [habitLogs])


  /* ════════════════════════════════════════════════════════
     HELPERS — Filtros por fecha
     ════════════════════════════════════════════════════════ */

  const getEventsForDate = useCallback((dateStr) =>
    events.filter(e => e.date === dateStr),
  [events])

  const getTasksForDate = useCallback((dateStr) =>
    tasks.filter(t => t.date === dateStr),
  [tasks])

  const isHabitDone = useCallback((habitId, dateStr) =>
    habitLogs.some(l => l.habit_id === habitId && l.date === dateStr),
  [habitLogs])


  /* ── Retorno del hook ─────────────────────────────────── */
  return {
    events, tasks, habits, habitLogs,
    achievements,       // ← nuevo: logros archivados
    calLoading: loading,

    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,

    moveTaskToToday,            // ← nuevo
    getYesterdayPendingTasks,   // ← nuevo
    archiveHabit,               // ← nuevo
    recoverStreak,              // ← nuevo
    isRecoverable,              // ← nuevo

    getEventsForDate, getTasksForDate, isHabitDone,
    getStreak,
  }
}