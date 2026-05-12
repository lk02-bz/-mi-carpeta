/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useCalendar.js                                ║
║                                                          ║
║  Puente entre React y las tablas de Supabase:            ║
║    • events      → eventos, exámenes, parciales          ║
║    • daily_tasks → tareas del día                        ║
║    • habits      → hábitos diarios                       ║
║    • habit_logs  → registro de hábitos completados       ║
║                                                          ║
║  Fase 3 — Calendario                                     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCalendar(user) {

  const [events,    setEvents]    = useState([])
  const [tasks,     setTasks]     = useState([])
  const [habits,    setHabits]    = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [loading,   setLoading]   = useState(false)


  /* ── Efecto: cargar todo cuando el usuario se loguea ──── */
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


  /* ── fetchAll — Carga las 4 tablas en paralelo ─────────
     
     Promise.all ejecuta las 4 queries al mismo tiempo.
     Es más rápido que hacerlas una por una (en serie).
  */
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
     EVENTOS (events)
     ════════════════════════════════════════════════════════ */

  const createEvent = useCallback(async (data) => {
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .insert({ ...data, user_id: user.id })
        .select()
        .single()

      if (error) throw error

      /* Insertamos y re-ordenamos por fecha para mantener consistencia */
      setEvents(prev =>
        [...prev, ev].sort((a, b) => a.date.localeCompare(b.date))
      )
      return { data: ev, error: null }

    } catch (err) {
      console.error('createEvent:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  const updateEvent = useCallback(async (id, changes) => {
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .update(changes)
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
     TAREAS DEL DÍA (daily_tasks)
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


  /* toggleTask: igual que toggleFavorite en useNotes —
     invierte el booleano `completed` sin tocar nada más   */
  const toggleTask = useCallback(async (id, currentValue) => {
    try {
      const { data: task, error } = await supabase
        .from('daily_tasks')
        .update({ completed: !currentValue })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setTasks(prev => prev.map(t => t.id === id ? task : t))
      return { data: task, error: null }

    } catch (err) {
      console.error('toggleTask:', err.message)
      return { data: null, error: err }
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
     HÁBITOS (habits)
     ════════════════════════════════════════════════════════ */

  const createHabit = useCallback(async (data) => {
    try {
      const { data: habit, error } = await supabase
        .from('habits')
        .insert({ ...data, user_id: user.id })
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
      /* Los habit_logs se borran en cascada por la FK en Supabase,
         pero actualizamos el estado local para evitar re-fetch */
      setHabitLogs(prev => prev.filter(l => l.habit_id !== id))
      return { error: null }

    } catch (err) {
      console.error('deleteHabit:', err.message)
      return { error: err }
    }
  }, [])


  /* ════════════════════════════════════════════════════════
     REGISTROS DE HÁBITOS (habit_logs)

     Lógica toggle:
       Si existe un log para (habitId, date) → lo elimina
       Si no existe → lo inserta
       La tabla tiene UNIQUE(habit_id, date) para evitar duplicados
     ════════════════════════════════════════════════════════ */

  const toggleHabitLog = useCallback(async (habitId, date) => {
    try {
      const existing = habitLogs.find(
        l => l.habit_id === habitId && l.date === date
      )

      if (existing) {
        const { error } = await supabase
          .from('habit_logs')
          .delete()
          .eq('id', existing.id)

        if (error) throw error
        setHabitLogs(prev => prev.filter(l => l.id !== existing.id))

      } else {
        const { data: log, error } = await supabase
          .from('habit_logs')
          .insert({ habit_id: habitId, user_id: user.id, date })
          .select()
          .single()

        if (error) throw error
        setHabitLogs(prev => [...prev, log])
      }

      return { error: null }

    } catch (err) {
      console.error('toggleHabitLog:', err.message)
      return { error: err }
    }
  }, [user, habitLogs])


  /* ════════════════════════════════════════════════════════
     HELPERS — Filtros por fecha
     (evitan que CalendarScreen filtre el array directamente)
     ════════════════════════════════════════════════════════ */

  /* Devuelve los eventos de una fecha específica (string 'YYYY-MM-DD') */
  const getEventsForDate = useCallback((dateStr) =>
    events.filter(e => e.date === dateStr),
  [events])

  /* Devuelve las tareas de una fecha específica */
  const getTasksForDate = useCallback((dateStr) =>
    tasks.filter(t => t.date === dateStr),
  [tasks])

  /* Verifica si un hábito fue completado en una fecha */
  const isHabitDone = useCallback((habitId, dateStr) =>
    habitLogs.some(l => l.habit_id === habitId && l.date === dateStr),
  [habitLogs])


  /* ── Valor retornado por el hook ──────────────────────── */
  return {
    // Estado
    events,
    tasks,
    habits,
    habitLogs,
    calLoading: loading,

    // Operaciones de eventos
    createEvent,
    updateEvent,
    deleteEvent,

    // Operaciones de tareas
    createTask,
    toggleTask,
    deleteTask,

    // Operaciones de hábitos
    createHabit,
    deleteHabit,
    toggleHabitLog,

    // Helpers por fecha
    getEventsForDate,
    getTasksForDate,
    isHabitDone,
  }
}
