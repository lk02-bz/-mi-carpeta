/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useCalendar.js                                ║
║                                                          ║
║  Cambios Fase 4.1:                                       ║
║  ✦ calcStreak() helper local (con timezone correcta)     ║
║  ✦ createHabit acepta reward_text                        ║
║  ✦ toggleHabitLog devuelve { milestone } para premios    ║
║  ✦ getStreak(habitId) expuesto para usar en pantallas    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'


/* ── Helper: fecha local como 'YYYY-MM-DD' ─────────────────
   Usamos getFullYear/Month/Date en vez de toISOString()
   porque toISOString() convierte a UTC, dando el día
   equivocado a las 22-23hs en Argentina (UTC-3).
*/
function localDateStr(date = new Date()) {
  const y   = date.getFullYear()
  const m   = String(date.getMonth() + 1).padStart(2, '0')
  const d   = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}


/* ── Helper: calcular racha actual de un hábito ────────────
   Recorre días hacia atrás desde hoy.
   Para cuando encuentra un día sin log.
   Devuelve cantidad de días consecutivos.
*/
function calcStreak(habitId, habitLogs) {
  let streak = 0
  const d    = new Date()

  while (streak < 365) {
    const dateStr = localDateStr(d)
    const hecho   = habitLogs.some(l => l.habit_id === habitId && l.date === dateStr)
    if (!hecho) break
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}


export function useCalendar(user) {

  const [events,    setEvents]    = useState([])
  const [tasks,     setTasks]     = useState([])
  const [habits,    setHabits]    = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [loading,   setLoading]   = useState(false)


  /* ── Cargar todo cuando el usuario se loguea ─────────── */
  useEffect(() => {
    if (!user) {
      setEvents([])
      setTasks([])
      setHabits([])
      setHabitLogs([])
      return
    }
    fetchAll()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  async function fetchAll() {
    setLoading(true)
    try {
      const [evRes, taskRes, habitRes, logRes] = await Promise.all([
        supabase.from('events').select('*').order('date').order('time', { nullsFirst: true }),
        supabase.from('daily_tasks').select('*').order('created_at'),
        supabase.from('habits').select('*').order('created_at'),
        supabase.from('habit_logs').select('*'),
      ])

      if (evRes.error)    throw evRes.error
      if (taskRes.error)  throw taskRes.error
      if (habitRes.error) throw habitRes.error
      if (logRes.error)   throw logRes.error

      setEvents(evRes.data)
      setTasks(taskRes.data)
      setHabits(habitRes.data)
      setHabitLogs(logRes.data)

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


  /* ════════════════════════════════════════════════════════
     HÁBITOS
     ════════════════════════════════════════════════════════ */

  /* createHabit ahora acepta reward_text ─────────────────── */
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


  /* ════════════════════════════════════════════════════════
     REGISTROS DE HÁBITOS — con detección de milestone

     toggleHabitLog ahora devuelve:
       { error, milestone, habitName, rewardText }

       milestone  → número de días (7, 14, 21…) si se alcanzó
                    null si no hay milestone o se desmarcó
       habitName  → nombre del hábito (para mostrar en el modal)
       rewardText → premio personalizado del hábito
     ════════════════════════════════════════════════════════ */

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
        return { error: null, milestone: null, habitName: null, rewardText: null }
      }

      /* ── Marcar como hecho ─────────────────────────────── */
      const { data: log, error } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: user.id, date })
        .select()
        .single()
      if (error) throw error

      /* Calculamos la nueva racha con el log recién agregado */
      const newLogs = [...habitLogs, log]
      const streak  = calcStreak(habitId, newLogs)
      setHabitLogs(newLogs)

      /* Milestone si la racha es múltiplo de 7 (7, 14, 21…) */
      const milestone = streak > 0 && streak % 7 === 0 ? streak : null
      const habit     = habits.find(h => h.id === habitId)

      return {
        error:      null,
        milestone,
        habitName:  habit?.name  || '',
        rewardText: habit?.reward_text || '',
        streak,
      }

    } catch (err) {
      console.error('toggleHabitLog:', err.message)
      return { error: err, milestone: null, habitName: null, rewardText: null }
    }
  }, [user, habitLogs, habits])


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
    calLoading: loading,

    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,

    getEventsForDate, getTasksForDate, isHabitDone,
    getStreak,        // ← nuevo Fase 4.1
  }
}
