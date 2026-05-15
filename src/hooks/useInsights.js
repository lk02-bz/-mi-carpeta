/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useInsights.js                                ║
║                                                          ║
║  Cambios Fase 6:                                         ║
║  ✦ Hábito sin marcar 1 día → prioridad alta              ║
║  ✦ Hábito sin marcar 2+ días → urgencia                  ║
║  ✦ Metas corto/mediano sin progreso → siempre            ║
║  ✦ Meta largo plazo → solo si 7+ días sin actividad      ║
║  ✦ Tareas: bajo % completadas esta semana → avisar       ║
║  ✦ Tareas: movidas repetidamente → avisar                ║
║  ✦ Tareas: sobrecarga → avisar                           ║
║  ✦ Mensajes positivos → solo si todo está bien           ║
║  ✦ Máximo 2 insights, el más urgente primero             ║
╚══════════════════════════════════════════════════════════╝
*/

import { useMemo } from 'react'


/* ── Helper: fecha local como 'YYYY-MM-DD' ─────────────── */
function localDateStr(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ── Helper: días desde la última actividad de una meta ───
   Recorre goalItems buscando el más reciente que esté
   completado. Devuelve cuántos días pasaron desde entonces,
   o Infinity si nunca tuvo actividad.
*/
function diasSinActividadEnMeta(goalId, goalItems) {
  const itemsDeEsta = goalItems.filter(
    i => i.goal_id === goalId && i.completed_at
  )
  if (itemsDeEsta.length === 0) return Infinity

  const masReciente = itemsDeEsta.reduce((latest, item) => {
    const d = new Date(item.completed_at)
    return d > latest ? d : latest
  }, new Date(0))

  const ahora = new Date()
  const diff  = ahora - masReciente
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}


export function useInsights({
  habitStats,    // de useStats — incluye streak, doneToday, last7
  tasksToday,    // tareas de hoy [ {id, title, completed, ...} ]
  notes,         // todos los apuntes
  notesByWeek,   // [ {label, count} ] últimas 4 semanas
  goals,         // metas con { id, title, term } (term: 'short'|'medium'|'long')
  goalItems,     // items de todas las metas [ {goal_id, completed_at, ...} ]
  goalImages,    // imágenes del vision board
  getProgress,   // fn(goalId) → número 0-100
  taskStats,     // de useStats — métricas de tareas
}) {

  const insights = useMemo(() => {
    const warnings = []   // problemas urgentes (se muestran primero)
    const positives = []  // logros y buenas noticias
    const tips = []       // sugerencias de baja prioridad

    /* ══════════════════════════════════════════════════════
       BLOQUE 1 — HÁBITOS
       Regla: el problema más urgente de cada hábito
       (no apilar múltiples avisos sobre el mismo hábito).
       ══════════════════════════════════════════════════════ */

    const hoy     = localDateStr(0)
    const ayer    = localDateStr(1)
    const hace2   = localDateStr(2)

    const habitsTotal     = habitStats.length
    const habitsDoneToday = habitStats.filter(h => h.doneToday).length

    habitStats.forEach(h => {
      const doneHoy  = h.last7[6]?.done ?? false   // índice 6 = hoy
      const doneAyer = h.last7[5]?.done ?? false   // índice 5 = ayer

      if (doneHoy) return   // ya lo hizo hoy, sin aviso

      if (!doneAyer) {
        // No marcado ayer NI hoy → cuántos días seguidos faltó?
        const diasFaltando = h.last7
          .slice()
          .reverse()
          .findIndex(d => d.done)

        // diasFaltando = -1 si nunca hizo en 7 días
        const diasSinHacer = diasFaltando === -1 ? 7 : diasFaltando

        if (diasSinHacer >= 2) {
          warnings.push({
            type: 'warning',
            priority: diasSinHacer >= 4 ? 1 : 2,   // más urgente cuanto más días
            emoji: '💤',
            title: `"${h.name}" lleva ${diasSinHacer} días sin completarse`,
            detail: diasSinHacer >= 4
              ? 'La racha está en riesgo real. ¿Lo retomás hoy?'
              : 'Dos días seguidos sin marcarlo rompe el ritmo.',
          })
        }
      } else {
        // Lo hizo ayer pero no hoy → es el aviso más suave (falta solo hoy)
        warnings.push({
          type: 'warning',
          priority: 5,
          emoji: '⏰',
          title: `Pendiente: "${h.name}"`,
          detail: 'Ayer lo hiciste. Hoy lo podés hacer igual.',
        })
      }
    })

    // ✅ Todos los hábitos completados → positivo
    if (habitsTotal > 0 && habitsDoneToday === habitsTotal) {
      positives.push({
        type: 'success',
        priority: 10,
        emoji: '🏅',
        title: '¡Hábitos del día completados!',
        detail: `Los ${habitsTotal} hábitos de hoy. Seguí así.`,
      })
    }

    // 🔥 Racha destacada (7+ días) → positivo
    const mejorRacha = habitStats.reduce(
      (best, h) => h.streak > best.streak ? h : best,
      { streak: 0, name: '' }
    )
    if (mejorRacha.streak >= 7) {
      positives.push({
        type: 'success',
        priority: 12,
        emoji: '🔥',
        title: `${mejorRacha.streak} días seguidos de "${mejorRacha.name}"`,
        detail: mejorRacha.streak >= 21
          ? '¡Más de 3 semanas! Ya es un hábito sólido.'
          : mejorRacha.streak >= 14
          ? '¡Dos semanas! Estás construyendo algo real.'
          : '¡Una semana completa! No pares ahora.',
      })
    }

    // 💡 Sin hábitos → sugerencia
    if (habitsTotal === 0) {
      tips.push({
        type: 'tip',
        priority: 20,
        emoji: '⚡',
        title: 'No tenés hábitos definidos',
        detail: 'Un hábito pequeño y constante es el primer paso.',
      })
    }


    /* ══════════════════════════════════════════════════════
       BLOQUE 2 — TAREAS DE HOY
       ══════════════════════════════════════════════════════ */

    const tareasHoy        = tasksToday.length
    const tareasCompletas  = tasksToday.filter(t => t.completed).length
    const tareasPendientes = tareasHoy - tareasCompletas

    // ⚠️ Sobrecarga puntual hoy
    if (tareasPendientes >= 5) {
      warnings.push({
        type: 'warning',
        priority: 3,
        emoji: '⚠️',
        title: `${tareasPendientes} tareas pendientes para hoy`,
        detail: '¿Cuáles son realmente urgentes? Enfocate en 1 o 2.',
      })
    }

    // ✅ Todas las tareas de hoy hechas → positivo
    if (tareasHoy > 0 && tareasCompletas === tareasHoy) {
      positives.push({
        type: 'success',
        priority: 11,
        emoji: '✅',
        title: '¡Todas las tareas de hoy completadas!',
        detail: 'Día productivo. Podés descansar tranquilo.',
      })
    }


    /* ══════════════════════════════════════════════════════
       BLOQUE 3 — MÉTRICAS DE TAREAS (taskStats)
       Solo si taskStats está disponible.
       ══════════════════════════════════════════════════════ */

    if (taskStats) {
      const {
        porcentajeCompletadasEstaSemana,
        diasConSobrecarga,
        tareasMovidasRepetidas,
      } = taskStats

      // 📉 Bajo porcentaje de completadas esta semana (< 40%)
      if (
        porcentajeCompletadasEstaSemana > 0 &&
        porcentajeCompletadasEstaSemana < 40
      ) {
        warnings.push({
          type: 'warning',
          priority: 4,
          emoji: '📉',
          title: `Solo el ${porcentajeCompletadasEstaSemana}% de las tareas completadas esta semana`,
          detail: 'Estás creando más de lo que podés hacer. Bajá el volumen.',
        })
      }

      // 📦 Varios días con sobrecarga
      if (diasConSobrecarga.length >= 2) {
        warnings.push({
          type: 'warning',
          priority: 4,
          emoji: '📦',
          title: `${diasConSobrecarga.length} días esta semana con 5+ tareas pendientes`,
          detail: 'El patrón se repite. Planificá menos tareas por día.',
        })
      }

      // 🔁 Tareas que se siguen moviendo sin completar
      if (tareasMovidasRepetidas.length > 0) {
        const nombres = tareasMovidasRepetidas
          .slice(0, 2)
          .map(t => `"${t.title}"`)
          .join(' y ')
        warnings.push({
          type: 'warning',
          priority: 6,
          emoji: '🔁',
          title: `${tareasMovidasRepetidas.length > 1 ? 'Tareas que se mueven' : 'Tarea que se mueve'} sin completarse`,
          detail: `${nombres}${tareasMovidasRepetidas.length > 2 ? ` y ${tareasMovidasRepetidas.length - 2} más` : ''}. ¿Las dividís en algo más chico?`,
        })
      }
    }


    /* ══════════════════════════════════════════════════════
       BLOQUE 4 — METAS
       Lógica diferente según el plazo de la meta.
       ══════════════════════════════════════════════════════ */

    goals.forEach(g => {
      const progress = getProgress(g.id)
      const term     = g.term  // 'short' | 'medium' | 'long'

      /* Metas corto/mediano plazo: siempre avisar si no tienen progreso */
      if ((term === 'short' || term === 'medium') && progress === 0) {
        warnings.push({
          type: 'warning',
          priority: 7,
          emoji: '🎯',
          title: `"${g.title}" no tiene ningún paso completado`,
          detail: term === 'short'
            ? 'Es una meta a corto plazo. El momento de avanzar es ahora.'
            : 'Meta de mediano plazo sin movimiento. Empezá con el primer ítem.',
        })
        return
      }

      /* Metas largo plazo: avisar solo si pasaron 7+ días sin actividad */
      if (term === 'long') {
        const dias = diasSinActividadEnMeta(g.id, goalItems ?? [])
        if (dias >= 7 && progress < 100) {
          tips.push({
            type: 'info',
            priority: 15,
            emoji: '🏔️',
            title: `"${g.title}" sin actividad hace ${dias === Infinity ? 'mucho tiempo' : `${dias} días`}`,
            detail: 'Las metas largas también necesitan pequeños pasos constantes.',
          })
        }
        return
      }

      /* Meta casi completa (>= 80%) → positivo */
      if (progress >= 80 && progress < 100) {
        positives.push({
          type: 'success',
          priority: 13,
          emoji: '🏁',
          title: `"${g.title}" está casi completa`,
          detail: `${progress}% — te falta poco para terminarla.`,
        })
      }
    })

    // Sin metas → sugerencia de baja prioridad
    if (goals.length === 0) {
      tips.push({
        type: 'tip',
        priority: 22,
        emoji: '🏔️',
        title: 'No tenés metas definidas',
        detail: '¿Qué querés lograr este mes? Una meta con checklist da dirección.',
      })
    }


    /* ══════════════════════════════════════════════════════
       BLOQUE 5 — APUNTES
       Solo sugerencias, nunca urgente.
       ══════════════════════════════════════════════════════ */

    const notasEstaSemana = notesByWeek[notesByWeek.length - 1]?.count ?? 0
    const notasSemanaAnt  = notesByWeek[notesByWeek.length - 2]?.count ?? 0

    if (notasEstaSemana === 0 && notes.length > 0) {
      tips.push({
        type: 'info',
        priority: 25,
        emoji: '📝',
        title: 'Esta semana no registraste ninguna idea',
        detail: 'Una nota corta mantiene el hábito de aprender.',
      })
    }

    if (notasEstaSemana > 0 && notasEstaSemana > notasSemanaAnt && notasSemanaAnt > 0) {
      positives.push({
        type: 'success',
        priority: 18,
        emoji: '📈',
        title: 'Más apuntes que la semana pasada',
        detail: `${notasEstaSemana} vs ${notasSemanaAnt} — en racha de productividad.`,
      })
    }


    /* ══════════════════════════════════════════════════════
       REGLA FINAL — armar la lista de salida

       Prioridad de aparición:
         1. warnings (problemas, ordenados por priority)
         2. positivos (solo si no hay warnings, o si hay espacio)
         3. tips (solo si no hay nada más urgente)

       Máximo 2 insights en pantalla.
       Los mensajes positivos SOLO aparecen si no hay warnings
       que ocupen los 2 slots.
       ══════════════════════════════════════════════════════ */

    const warningsSorted  = warnings.sort((a, b) => a.priority - b.priority)
    const positivesSorted = positives.sort((a, b) => a.priority - b.priority)
    const tipsSorted      = tips.sort((a, b) => a.priority - b.priority)

    const result = []

    // Primero: hasta 2 warnings
    result.push(...warningsSorted.slice(0, 2))

    // Si quedó espacio (menos de 2), agregar positivos
    if (result.length < 2) {
      result.push(...positivesSorted.slice(0, 2 - result.length))
    }

    // Si aún quedó espacio, agregar tips
    if (result.length < 2) {
      result.push(...tipsSorted.slice(0, 2 - result.length))
    }

    return result

  }, [habitStats, tasksToday, notes, notesByWeek, goals, goalItems, goalImages, getProgress, taskStats])

  return { insights }
}