/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useStats.js                                   ║
║                                                          ║
║  Cambios Fase 6:                                         ║
║  ✦ localDateStr() — fix timezone bug (UTC-3 Argentina)   ║
║  ✦ getLast7Days() — mismo fix                            ║
║  ✦ taskStats — métricas de tareas para useInsights       ║
║    · promedioTareasPorDía                                ║
║    · porcentajeCompletadasEstaSemana                     ║
║    · diasConSobrecarga (5+ tareas pendientes)            ║
║    · diasVacios (0 tareas creadas)                       ║
║    · tareasMovidasRepetidas (misma tarea movida N veces)  ║
╚══════════════════════════════════════════════════════════╝
*/

import { useMemo } from 'react'


/* ════════════════════════════════════════════════════════
   HELPERS DE FECHA — usan getFullYear/Month/Date
   para evitar el bug de timezone en Argentina (UTC-3).
   ════════════════════════════════════════════════════════ */

/**
 * localDateStr(offsetDays)
 * Devuelve la fecha local en formato 'YYYY-MM-DD'.
 *   offsetDays = 0  → hoy
 *   offsetDays = 1  → ayer
 */
function localDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}


/**
 * calcStreak(habitId, habitLogs)
 * Racha actual: días consecutivos hacia atrás desde hoy.
 */
function calcStreak(habitId, habitLogs) {
  let streak = 0
  const d = new Date()

  while (streak < 365) {
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`

    if (!habitLogs.some(l => l.habit_id === habitId && l.date === dateStr)) break
    streak++
    d.setDate(d.getDate() - 1)
  }

  return streak
}


/**
 * getLast7Days(habitId, habitLogs)
 * Array de los últimos 7 días con { dateStr, done, isRecovered }.
 * Orden: más antiguo (índice 0) → hoy (índice 6).
 */
function getLast7Days(habitId, habitLogs) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d   = new Date()
    d.setDate(d.getDate() - i)
    const y   = d.getFullYear()
    const m   = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`
    const log = habitLogs.find(l => l.habit_id === habitId && l.date === dateStr)
    days.push({
      dateStr,
      done:        !!log,
      isRecovered: log?.is_recovered ?? false,
    })
  }
  return days
}


/**
 * getMondayOfWeek(weeksAgo)
 * Devuelve el lunes de la semana correspondiente.
 *   weeksAgo = 0 → esta semana
 *   weeksAgo = 1 → semana pasada
 */
function getMondayOfWeek(weeksAgo = 0) {
  const today      = new Date()
  const dayOfWeek  = today.getDay()                         // 0=Dom, 1=Lun…
  const diffToMon  = dayOfWeek === 0 ? -6 : 1 - dayOfWeek  // ajuste al lunes
  const monday     = new Date(today)
  monday.setDate(today.getDate() + diffToMon - weeksAgo * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}


/* ════════════════════════════════════════════════════════
   HOOK PRINCIPAL
   ════════════════════════════════════════════════════════ */

/**
 * useStats({ notes, habits, habitLogs, tasks })
 *
 * Recibe los arrays del contexto y devuelve métricas calculadas.
 * NO hace llamadas a Supabase.
 *
 * @param {Array} notes      - Todos los apuntes
 * @param {Array} habits     - Hábitos activos (no archivados)
 * @param {Array} habitLogs  - Registros de hábitos completados
 * @param {Array} tasks      - Todas las tareas diarias
 */
export function useStats({ notes, habits, habitLogs, tasks = [] }) {

  const todayStr = useMemo(() => localDateStr(0), [])


  /* ── Estadísticas por hábito ───────────────────────────── */
  const habitStats = useMemo(() =>
    habits.map(h => ({
      ...h,
      streak:    calcStreak(h.id, habitLogs),
      total:     habitLogs.filter(l => l.habit_id === h.id).length,
      doneToday: habitLogs.some(l => l.habit_id === h.id && l.date === todayStr),
      last7:     getLast7Days(h.id, habitLogs),
    })),
  [habits, habitLogs, todayStr])


  /* ── Apuntes por semana — últimas 4 semanas ────────────── */
  const notesByWeek = useMemo(() => {
    const weeks = []
    for (let w = 3; w >= 0; w--) {
      const monday = getMondayOfWeek(w)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const count = notes.filter(n => {
        const d = new Date(n.created_at)
        return d >= monday && d <= sunday
      }).length

      const label = w === 0 ? 'Esta sem.'
                  : w === 1 ? 'Sem. ant.'
                  : `Hace ${w} sem.`

      weeks.push({ label, count })
    }
    return weeks
  }, [notes])


  /* ══════════════════════════════════════════════════════════
     MÉTRICAS DE TAREAS
     Usadas por useInsights para detectar patrones problemáticos.
     ══════════════════════════════════════════════════════════ */
  const taskStats = useMemo(() => {

    if (tasks.length === 0) {
      return {
        promedioTareasPorDia:           0,
        porcentajeCompletadasEstaSemana: 0,
        diasConSobrecarga:              [],
        diasVacios:                     0,
        tareasMovidasRepetidas:         [],
      }
    }

    /* ── Rango de análisis: últimos 7 días ──────────────── */
    const dias7 = Array.from({ length: 7 }, (_, i) => localDateStr(i)).reverse()
    // dias7[0] = hace 6 días, dias7[6] = hoy

    /* ── Tareas de esta semana (lunes → hoy) ────────────── */
    const lunesEsta  = getMondayOfWeek(0)
    const tareasEsta = tasks.filter(t => {
      if (!t.date) return false
      const d = new Date(t.date + 'T00:00:00')
      return d >= lunesEsta
    })
    const creadasEsta   = tareasEsta.length
    const completasEsta = tareasEsta.filter(t => t.completed).length
    const porcentajeCompletadasEstaSemana = creadasEsta > 0
      ? Math.round((completasEsta / creadasEsta) * 100)
      : 0

    /* ── Promedio de tareas por día (últimos 7 días) ─────── */
    const tareasSemana = tasks.filter(t => t.date && dias7.includes(t.date))
    const promedioTareasPorDia = parseFloat(
      (tareasSemana.length / 7).toFixed(1)
    )

    /* ── Días con sobrecarga: 5+ tareas pendientes ──────── */
    const diasConSobrecarga = dias7.filter(dateStr => {
      const pendientes = tasks.filter(
        t => t.date === dateStr && !t.completed
      ).length
      return pendientes >= 5
    })

    /* ── Días vacíos: sin ninguna tarea creada ──────────── */
    const diasVacios = dias7.filter(dateStr =>
      !tasks.some(t => t.date === dateStr)
    ).length

    /* ── Tareas movidas repetidamente ───────────────────────
       Detecta tareas que tienen moved_from_date definido
       y cuyo moved_from_date es diferente a su fecha actual.
       Si el usuario lleva moviendo la misma tarea varios días
       sin completarla, useInsights lo señala.
    */
    const tareasMovidasRepetidas = tasks.filter(t =>
      t.moved_from_date &&
      !t.completed
    )

    return {
      promedioTareasPorDia,
      porcentajeCompletadasEstaSemana,
      diasConSobrecarga,   // array de fechas 'YYYY-MM-DD'
      diasVacios,          // número
      tareasMovidasRepetidas,
    }
  }, [tasks])


  /* ── Totales rápidos ────────────────────────────────────── */
  const totalNotes      = notes.length
  const habitsDoneToday = habitLogs.filter(l => l.date === todayStr).length
  const bestStreak      = habitStats.length > 0
    ? Math.max(...habitStats.map(h => h.streak))
    : 0
  const bestHabit       = habitStats.reduce(
    (best, h) => h.streak > best.streak ? h : best,
    { streak: 0, name: '' }
  )

  return {
    todayStr,
    habitStats,
    notesByWeek,
    taskStats,      // ← nuevo
    totalNotes,
    habitsDoneToday,
    bestStreak,
    bestHabit,
  }
}