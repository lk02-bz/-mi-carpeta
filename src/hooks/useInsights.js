/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useInsights.js                                ║
║                                                          ║
║  Análisis inteligente basado en tus propios datos.       ║
║  Sin IA externa — pura lógica sobre estadísticas reales. ║
║                                                          ║
║  Devuelve un array de insights ordenados por prioridad:  ║
║    type:     'warning' | 'success' | 'tip' | 'info'     ║
║    emoji:    ícono visual                                ║
║    title:    mensaje corto                               ║
║    detail:   explicación opcional                        ║
║    priority: número (menor = más importante)             ║
╚══════════════════════════════════════════════════════════╝
*/

import { useMemo } from 'react'

export function useInsights({
  habitStats,       // de useStats
  tasksToday,       // tareas de hoy [ {id, title, completed, ...} ]
  notes,            // todos los apuntes
  notesByWeek,      // [ {label, count} ] últimas 4 semanas
  goals,            // metas con progress
  goalImages,       // imágenes del vision board
  getProgress,      // fn(goalId) → número
}) {

  const insights = useMemo(() => {
    const list = []

    /* ── Helpers de fecha ──────────────────────────────── */
    function localDateStr(offsetDays = 0) {
      const d = new Date()
      d.setDate(d.getDate() - offsetDays)
      return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-')
    }

    const today = localDateStr(0)


    /* ══════════════════════════════════════════════════════
       HÁBITOS
       ══════════════════════════════════════════════════════ */

    const habitsDoneToday  = habitStats.filter(h => h.doneToday).length
    const habitsTotal      = habitStats.length
    const habitsPendientes = habitsTotal - habitsDoneToday

    // ✅ Todos los hábitos del día completados
    if (habitsTotal > 0 && habitsDoneToday === habitsTotal) {
      list.push({
        type: 'success', priority: 1,
        emoji: '🏅',
        title: '¡Hábitos del día completados!',
        detail: `Completaste los ${habitsTotal} hábitos de hoy. Seguí así.`,
      })
    }

    // 🔥 Racha destacada (7+ días en algún hábito)
    const mejorRacha = habitStats.reduce(
      (best, h) => h.streak > best.streak ? h : best,
      { streak: 0 }
    )
    if (mejorRacha.streak >= 7) {
      list.push({
        type: 'success', priority: 2,
        emoji: '🔥',
        title: `${mejorRacha.streak} días seguidos de "${mejorRacha.name}"`,
        detail: mejorRacha.streak >= 21
          ? '¡Más de 3 semanas! Ya es un hábito sólido.'
          : mejorRacha.streak >= 14
          ? '¡Dos semanas! Estás construyendo algo real.'
          : '¡Una semana completa! No pares ahora.',
      })
    }

    // ⚠️ Hábitos sin racha hace 3+ días (máx 2 avisos para no saturar)
    const habitosEnfriados = habitStats
      .filter(h => {
        const last3 = [0, 1, 2].map(i => localDateStr(i))
        return !h.last7.slice(-3).some(d => d.done) && h.total > 0
      })
      .slice(0, 2)

    habitosEnfriados.forEach(h => {
      list.push({
        type: 'warning', priority: 10,
        emoji: '💤',
        title: `"${h.name}" lleva días sin completarse`,
        detail: 'Una racha corta no arruina el progreso. ¿Lo retomás hoy?',
      })
    })

    // 💡 Sin hábitos definidos
    if (habitsTotal === 0) {
      list.push({
        type: 'tip', priority: 15,
        emoji: '⚡',
        title: 'No tenés hábitos definidos',
        detail: 'Crear un hábito pequeño y constante es el primer paso.',
      })
    }


    /* ══════════════════════════════════════════════════════
       TAREAS DE HOY
       ══════════════════════════════════════════════════════ */

    const tareasHoy       = tasksToday.length
    const tareasCompletas = tasksToday.filter(t => t.completed).length
    const tareasPendientes = tareasHoy - tareasCompletas

    // ✅ Todas las tareas del día hechas
    if (tareasHoy > 0 && tareasCompletas === tareasHoy) {
      list.push({
        type: 'success', priority: 3,
        emoji: '✅',
        title: '¡Todas las tareas de hoy completadas!',
        detail: 'Día productivo. Podés descansar tranquilo.',
      })
    }

    // ⚠️ Muchas tareas pendientes
    if (tareasPendientes >= 5) {
      list.push({
        type: 'warning', priority: 8,
        emoji: '⚠️',
        title: `${tareasPendientes} tareas pendientes hoy`,
        detail: 'Puede ser mucho para un día. ¿Cuáles son realmente urgentes?',
      })
    }

    // Sin tareas para hoy
    if (tareasHoy === 0) {
      list.push({
        type: 'tip', priority: 18,
        emoji: '📋',
        title: 'No tenés tareas cargadas para hoy',
        detail: 'Planificar el día en el Calendario te ayuda a enfocarte.',
      })
    }


    /* ══════════════════════════════════════════════════════
       APUNTES
       ══════════════════════════════════════════════════════ */

    const notasEstaSemana = notesByWeek[notesByWeek.length - 1]?.count ?? 0
    const notasSemanaAnt  = notesByWeek[notesByWeek.length - 2]?.count ?? 0

    // 📝 Sin apuntes esta semana
    if (notasEstaSemana === 0 && notes.length > 0) {
      list.push({
        type: 'info', priority: 20,
        emoji: '📝',
        title: 'Esta semana no registraste ninguna idea',
        detail: 'Escribir aunque sea una nota corta mantiene el hábito de aprender.',
      })
    }

    // 📈 Más apuntes que la semana pasada
    if (notasEstaSemana > 0 && notasEstaSemana > notasSemanaAnt && notasSemanaAnt > 0) {
      list.push({
        type: 'success', priority: 12,
        emoji: '📈',
        title: `Más apuntes que la semana pasada`,
        detail: `${notasEstaSemana} vs ${notasSemanaAnt} — estás en racha de productividad.`,
      })
    }

    // Sin apuntes en absoluto
    if (notes.length === 0) {
      list.push({
        type: 'tip', priority: 16,
        emoji: '📚',
        title: 'No tenés ningún apunte todavía',
        detail: 'Empezá con algo pequeño: una idea, una frase, un resumen.',
      })
    }


    /* ══════════════════════════════════════════════════════
       METAS
       ══════════════════════════════════════════════════════ */

    // Sin metas definidas
    if (goals.length === 0) {
      list.push({
        type: 'tip', priority: 14,
        emoji: '🏔️',
        title: 'No tenés metas definidas',
        detail: '¿Qué querés lograr este mes? Una meta con checklist te da dirección.',
      })
    }

    // Metas con 0% progreso (máx 1 aviso)
    const metaSinProgreso = goals.find(g => getProgress(g.id) === 0)
    if (metaSinProgreso) {
      list.push({
        type: 'info', priority: 22,
        emoji: '🎯',
        title: `"${metaSinProgreso.title}" no tiene pasos completados`,
        detail: 'Agregá un primer ítem al checklist y marcalo hoy.',
      })
    }

    // Meta casi completa (>= 80%)
    const metaCasiLista = goals.find(g => {
      const p = getProgress(g.id)
      return p >= 80 && p < 100
    })
    if (metaCasiLista) {
      list.push({
        type: 'success', priority: 5,
        emoji: '🏁',
        title: `"${metaCasiLista.title}" está casi completa`,
        detail: `${getProgress(metaCasiLista.id)}% — te falta poco para terminarla.`,
      })
    }


    /* ══════════════════════════════════════════════════════
       VISION BOARD
       ══════════════════════════════════════════════════════ */

    if (goalImages.length === 0) {
      list.push({
        type: 'tip', priority: 25,
        emoji: '🖼️',
        title: 'Tu Vision Board está vacío',
        detail: 'Agregar imágenes que te motiven hace tu objetivo más real.',
      })
    }


    /* ══════════════════════════════════════════════════════
       BALANCE GENERAL — demasiado en un sector, nada en otro
       ══════════════════════════════════════════════════════ */

    // Tiene metas pero no hábitos → le falta consistencia diaria
    if (goals.length > 0 && habitsTotal === 0) {
      list.push({
        type: 'tip', priority: 13,
        emoji: '🔄',
        title: 'Tenés metas pero no hábitos diarios',
        detail: 'Las metas grandes se logran con acciones pequeñas todos los días.',
      })
    }

    // Tiene hábitos pero no metas → le falta visión
    if (habitsTotal > 0 && goals.length === 0) {
      list.push({
        type: 'tip', priority: 13,
        emoji: '🧭',
        title: 'Tenés hábitos pero no metas claras',
        detail: '¿Hacia dónde van esos hábitos? Definir una meta le da sentido.',
      })
    }


    /* ── Ordenar por prioridad y limitar a 4 insights ───── */
    return list
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 4)

  }, [habitStats, tasksToday, notes, notesByWeek, goals, goalImages, getProgress])

  return { insights }
}
