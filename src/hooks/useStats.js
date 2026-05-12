/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useStats.js                                   ║
║                                                          ║
║  Calcula métricas a partir de los datos ya en memoria.   ║
║  NO hace llamadas a Supabase.                            ║
║                                                          ║
║  Fase 3.1.A — Estadísticas                               ║
╚══════════════════════════════════════════════════════════╝
*/

import { useMemo } from 'react'


/* ════════════════════════════════════════════════════════
   FUNCIONES PURAS — definidas fuera del hook

   ¿Por qué fuera del hook?
   - Son funciones independientes que no necesitan estado de React.
   - Al estar fuera, no se redefinen en cada render.
   - Son más fáciles de probar (unit testing) y reutilizar.
   ════════════════════════════════════════════════════════ */

/**
 * calcStreak(habitId, habitLogs)
 * Recorre días hacia atrás desde hoy.
 * Cuando encuentra un día sin log, para y devuelve la cantidad de días consecutivos.
 *
 * Ejemplo: si completaste Lunes + Martes + Miércoles → streak = 3
 */
function calcStreak(habitId, habitLogs) {
  let streak = 0
  const d = new Date()

  /* Límite de 365 días: evita bucles infinitos si hay datos corruptos */
  while (streak < 365) {
    const dateStr = d.toISOString().split('T')[0]   // 'YYYY-MM-DD'
    const hecho   = habitLogs.some(l => l.habit_id === habitId && l.date === dateStr)
    if (!hecho) break
    streak++
    d.setDate(d.getDate() - 1)   // retrocede un día
  }

  return streak
}


/**
 * getLast7Days(habitId, habitLogs)
 * Devuelve un array de los últimos 7 días con { dateStr, done }.
 * Orden: de más antiguo (índice 0) a hoy (índice 6).
 *
 * Se usa para los puntitos de los últimos 7 días en cada hábito.
 */
function getLast7Days(habitId, habitLogs) {
  const days = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    days.push({
      dateStr,
      done: habitLogs.some(l => l.habit_id === habitId && l.date === dateStr),
    })
  }

  return days
}


/* ════════════════════════════════════════════════════════
   HOOK PRINCIPAL
   ════════════════════════════════════════════════════════ */

/**
 * useStats({ notes, habits, habitLogs })
 *
 * Recibe los arrays del contexto (ya cargados) y devuelve métricas
 * calculadas con useMemo para no recalcular en cada render.
 *
 * @param {Array} notes      - Todos los apuntes del usuario
 * @param {Array} habits     - Todos los hábitos
 * @param {Array} habitLogs  - Todos los registros de hábitos completados
 */
export function useStats({ notes, habits, habitLogs }) {

  /* ── Fecha de hoy en formato 'YYYY-MM-DD' ─────────────
     Calculada UNA sola vez al montar el componente.
     No cambia durante la sesión (razonable para una app de notas).
  */
  const todayStr = useMemo(
    () => new Date().toISOString().split('T')[0],
    []
  )


  /* ── Estadísticas por hábito ───────────────────────────
     Por cada hábito calculamos:
       - streak:    racha actual en días
       - total:     veces completado en toda la historia
       - doneToday: ¿fue completado hoy?
       - last7:     array de los últimos 7 días
  */
  const habitStats = useMemo(() =>
    habits.map(h => ({
      ...h,                                          // id, name, emoji, user_id…
      streak:    calcStreak(h.id, habitLogs),
      total:     habitLogs.filter(l => l.habit_id === h.id).length,
      doneToday: habitLogs.some(l => l.habit_id === h.id && l.date === todayStr),
      last7:     getLast7Days(h.id, habitLogs),
    })),
  [habits, habitLogs, todayStr])


  /* ── Apuntes por semana — últimas 4 semanas ────────────
     Para el gráfico de barras.
     Calcula cuántos apuntes fueron CREADOS en cada semana.

     Lógica:
       - Semana 0 = semana actual (de lunes a hoy)
       - Semana 1 = semana pasada
       - etc.

     setDay(1) = lunes:  JavaScript usa 0=Dom, 1=Lun … 6=Sáb
  */
  const notesByWeek = useMemo(() => {
    const today = new Date()
    const weeks = []

    for (let w = 3; w >= 0; w--) {

      /* Lunes de la semana que corresponde */
      const monday = new Date(today)
      const dayOfWeek = today.getDay()                    // 0=Dom, 1=Lun…
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      monday.setDate(today.getDate() + diffToMonday - w * 7)
      monday.setHours(0, 0, 0, 0)

      /* Domingo de esa semana */
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)

      const count = notes.filter(n => {
        const d = new Date(n.created_at)
        return d >= monday && d <= sunday
      }).length

      /* Etiqueta para el eje X del gráfico */
      const label = w === 0 ? 'Esta sem.'
                  : w === 1 ? 'Sem. ant.'
                  : `Hace ${w} sem.`

      weeks.push({ label, count })
    }

    return weeks
  }, [notes])


  /* ── Totales rápidos ────────────────────────────────── */

  const totalNotes = notes.length

  /* Cuántos hábitos distintos se completaron hoy */
  const habitsDoneToday = habitLogs.filter(l => l.date === todayStr).length

  /* La racha más larga actual entre todos los hábitos */
  const bestStreak = habitStats.length > 0
    ? Math.max(...habitStats.map(h => h.streak))
    : 0


  /* ── Valor retornado por el hook ────────────────────── */
  return {
    todayStr,
    habitStats,
    notesByWeek,
    totalNotes,
    habitsDoneToday,
    bestStreak,
  }
}
