/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useNotifications.js  — v3 "Modo Pesado"       ║
║  ✦ 11 notificaciones por día                             ║
║  ✦  8:00 /  8:30 — mañana                               ║
║  ✦ 10:00          — media mañana                         ║
║  ✦ 12:00 / 12:30  — mediodía                             ║
║  ✦ 15:00          — tarde                                ║
║  ✦ 18:00 / 18:30  — noche temprana                       ║
║  ✦ 20:00 / 20:30  — noche                                ║
║  ✦ 22:00          — cierre / dormir (al azar)            ║
╚══════════════════════════════════════════════════════════╝
*/

import { useCallback } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// ─── IDs fijos por slot ───────────────────────────────────
const SLOT = {
  MANANA:       10,
  MANANA_2:     11,
  MEDIA_MAN:    12,
  MEDIODIA:     13,
  MEDIODIA_2:   14,
  TARDE:        15,
  NOCHE_TEMP:   16,
  NOCHE_TEMP_2: 17,
  NOCHE:        18,
  NOCHE_2:      19,
  CIERRE:       20,
  META_OFFSET:  1000,
}

// ─── Imágenes rotativas por tipo ──────────────────────────
// Tienen que estar en android/app/src/main/res/drawable/
const IMGS = {
  HABITOS: ['notif_habitos_1', 'notif_habitos_2', 'notif_habitos_3'],
  TAREAS:  ['notif_tareas_1'],
  METAS:   ['notif_meta_1'],
}

// ─── Helpers ──────────────────────────────────────────────

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function diasSinActividad(goalId, goalItems) {
  const items = goalItems.filter(i => i.goal_id === goalId && i.completed_at)
  if (items.length === 0) return Infinity
  const masReciente = items.reduce((latest, item) => {
    const d = new Date(item.completed_at)
    return d > latest ? d : latest
  }, new Date(0))
  return Math.floor((Date.now() - masReciente.getTime()) / 86400000)
}

function proximaHora(hour, minute) {
  const t = new Date()
  t.setHours(hour, minute, 0, 0)
  if (t <= new Date()) t.setDate(t.getDate() + 1)
  return t
}

// Rota por día de la semana
function porDia(array) {
  return array[new Date().getDay() % array.length]
}

// Rota imagen por hora (más variedad dentro del mismo día)
function imgPorHora(array) {
  return array[new Date().getHours() % array.length]
}

// Elige al azar (para el cierre nocturno)
function alAzar(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// ─── Mensajes ─────────────────────────────────────────────

const MSG = {

  /* ── 8:00 AM ── */
  MANANA: [
    { title: '☀️ Nuevo día, nueva oportunidad',  body: (h, t) => `${h} hábito${h!==1?'s':''} te esperan hoy. ${t > 0 ? `Y tenés ${t} tarea${t!==1?'s':''} anotadas.` : ''}` },
    { title: '🔥 ¿Vas a mantener la racha?',     body: (h, t) => `Abrí la app y marcá tus ${h} hábito${h!==1?'s':''} de hoy.` },
    { title: '💪 El día empieza ahora',           body: (h, t) => `${t > 0 ? `${t} tarea${t!==1?'s':''} y ` : ''}${h} hábito${h!==1?'s':''} te esperan. Vamos.` },
    { title: '⚡ Buenos días',                    body: (h, t) => `No dejes que el día te gane. Tenés ${h} hábito${h!==1?'s':''} por completar.` },
    { title: '🌅 Arrancá fuerte',                body: (h, t) => `Cada mañana es una oportunidad. ${h} hábito${h!==1?'s':''} hoy.` },
    { title: '🎯 Enfocate desde temprano',        body: (h, t) => `${h} hábito${h!==1?'s':''} ${t > 0 ? `y ${t} tarea${t!==1?'s':''} ` : ''}para hoy.` },
    { title: '🚀 ¿Listo para hoy?',              body: (h, t) => `Abrí Mi Carpeta y empezá con tus hábitos del día.` },
  ],

  /* ── 8:30 AM ── */
  MANANA_2: [
    { title: '⏰ ¿Arrancaste ya?',               body: (h) => `Ya son las 8:30. ${h} hábito${h!==1?'s':''} esperando tu marca.` },
    { title: '🔔 Recordatorio de las 8:30',      body: (h) => `La mañana ya empezó. ¿Abriste la app?` },
    { title: '💡 No lo dejes para después',       body: (h) => `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}. Cuanto antes, mejor.` },
    { title: '🏃 Momentum de mañana',            body: (h) => `Los primeros 30 minutos marcan el tono del día.` },
    { title: '⚡ Segundo llamado',               body: (h) => `${h} hábito${h!==1?'s':''} sin marcar todavía. ¿Lo hacemos ya?` },
    { title: '🎯 Todavía es temprano',           body: (h) => `El mejor momento para empezar es ahora.` },
    { title: '🔥 La racha te espera',            body: (h) => `Un día más es un día más de racha. Marcá tus hábitos.` },
  ],

  /* ── 10:00 AM ── */
  MEDIA_MAN: [
    { title: '⏰ Ya son las 10:00',              body: (h) => `¿Marcaste tus hábitos de hoy? Quedan ${h} pendiente${h!==1?'s':''}.` },
    { title: '🔔 Check-in de la mañana',          body: (h) => `No olvides tus ${h} hábito${h!==1?'s':''} antes del mediodía.` },
    { title: '💡 Recordatorio rápido',            body: (h) => `${h} hábito${h!==1?'s':''} sin marcar. Un minuto es todo lo que necesitás.` },
    { title: '📋 ¿Cómo vas?',                    body: (h) => `A mitad de la mañana y ${h} hábito${h!==1?'s':''} sin completar.` },
    { title: '🎯 No lo dejes para más tarde',     body: (h) => `${h} hábito${h!==1?'s':''} te esperan. Cuanto antes, mejor.` },
    { title: '⚡ Momento de marcar',              body: (h) => `Todavía tenés ${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''} hoy.` },
    { title: '🔥 No pierdas el ritmo',            body: (h) => `La mañana se acaba. ${h} hábito${h!==1?'s':''} sin marcar.` },
  ],

  /* ── 12:00 PM ── */
  MEDIODIA: [
    { title: '☀️ Mediodía — ¿cómo arrancó el día?', body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar aún.` : '✅ Hábitos completos.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}` },
    { title: '🍽️ Antes del almuerzo',               body: (h, t) => h > 0 ? `${h} hábito${h!==1?'s':''} sin completar. ¿Los marcás antes de comer?` : `¡Hábitos al día! ${t > 0 ? `Quedan ${t} tarea${t!==1?'s':''}.` : 'Vas perfecto.'}` },
    { title: '⚡ Son las 12 — revisión rápida',      body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : 'Hábitos listos ✅'} ${t > 0 ? `${t} tarea${t!==1?'s':''} más.` : ''}` },
    { title: '🎯 Mitad del día',                     body: (h, t) => h > 0 ? `Todavía estás a tiempo. ${h} hábito${h!==1?'s':''} sin marcar.` : '¡Todo en orden! Seguí así.' },
    { title: '💪 12 PM — check del mediodía',        body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} por completar.` : '✅ Hábitos del día al día.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}` },
    { title: '🔔 Pausa del mediodía',                body: (h, t) => `Revisá cómo vas. ${h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar.` : 'Hábitos completos ✅'}` },
    { title: '📌 Revisión de las 12',                body: (h, t) => `${h > 0 ? `Faltan ${h} hábito${h!==1?'s':''}.` : 'Hábitos listos.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} anotadas para hoy.` : ''}` },
  ],

  /* ── 12:30 PM ── */
  MEDIODIA_2: [
    { title: '🍴 ¿Almorzaste ya?',               body: (t, nombre) => t > 0 ? `Mientras descansás: ${nombre ? `"${nombre}"` : `${t} tarea${t!==1?'s':''}`} pendiente${t!==1?'s':''} para hoy.` : 'Sin tareas pendientes. ¡Vas genial! ✅' },
    { title: '📋 Revisá tus tareas',              body: (t, nombre) => t > 0 ? `${nombre ? `"${nombre}" y ${t-1} más` : `${t} tarea${t!==1?'s':''}`} sin completar.` : '¡Todas las tareas al día! 🎉' },
    { title: '⚡ 12:30 — segunda vuelta',         body: (t, nombre) => t > 0 ? `La tarde empieza bien si arrancás con ${nombre ? `"${nombre}"` : 'tus tareas'}.` : 'Sin pendientes. ¡Usá la tarde para avanzar en tus metas!' },
    { title: '🎯 Aprovechá el mediodía',          body: (t, nombre) => t > 0 ? `${nombre ? `Empezá por "${nombre}".` : `${t} tarea${t!==1?'s':''} esperando.`}` : '¡Libre de tareas! Gran trabajo.' },
    { title: '💡 Recordatorio post-almuerzo',     body: (t)         => t > 0 ? `${t} tarea${t!==1?'s':''} en tu lista de hoy.` : 'Todo al día. ¡Excelente gestión!' },
    { title: '🔔 Antes de arrancar la tarde',     body: (t, nombre) => nombre ? `"${nombre}" te espera para esta tarde.` : t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : '¡Sin pendientes! Usá la tarde para lo que querés.' },
    { title: '📌 Checklist del mediodía',         body: (t)         => t > 0 ? `Quedan ${t} tarea${t!==1?'s':''} para hoy.` : 'Todo al día. ¡Excelente!' },
  ],

  /* ── 3:00 PM ── */
  TARDE: [
    { title: '☕ Las 3 PM — momento de avanzar', body: (h, nombre) => `¿Ya marcaste "${nombre || 'tus hábitos'}" hoy?` },
    { title: '🔥 La tarde es tuya',              body: (h)         => `${h} hábito${h!==1?'s':''} sin completar. Aprovechá la energía de la tarde.` },
    { title: '💡 Recordatorio de la tarde',      body: (h, nombre) => nombre ? `"${nombre}" todavía sin marcar hoy.` : `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` },
    { title: '⚡ No esperés a último momento',   body: (h)         => `Quedan ${h} hábito${h!==1?'s':''} por completar hoy.` },
    { title: '🎯 Tarde productiva',              body: (h, nombre) => `Ahora es buen momento para "${nombre || 'tus hábitos'}".` },
    { title: '💪 Empuje de la tarde',            body: (h)         => `${h} hábito${h!==1?'s':''} más y el día está completo.` },
    { title: '🔔 ¿Qué falta todavía?',           body: (h, nombre) => nombre ? `"${nombre}" sigue pendiente.` : `${h} hábito${h!==1?'s':''} sin marcar hoy.` },
  ],

  /* ── 6:00 PM ── */
  NOCHE_TEMP: [
    { title: '🌆 6 PM — la jornada termina',     body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar.` : '✅ Hábitos completos.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}` },
    { title: '⏰ Quedan pocas horas del día',     body: (h, t) => h > 0 ? `Todavía podés completar tus ${h} hábito${h!==1?'s':''} de hoy.` : `¡Hábitos completos! ${t > 0 ? `${t} tarea${t!==1?'s':''} más.` : ''}` },
    { title: '🔥 No rompas la racha hoy',        body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} sin completar.` : 'Hábitos del día listos ✅'} Cerrá el día fuerte.` },
    { title: '💪 Hora de cerrar el día bien',    body: (h, t) => `${h > 0 ? `Te faltan ${h} hábito${h!==1?'s':''}.` : 'Hábitos completos.'} ${t > 0 ? `Y ${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}` },
    { title: '📋 Revisión de tarde',             body: ()      => `¿Cerrás el día con todo completo?` },
    { title: '🎯 Última oportunidad de la tarde',body: (h)     => h > 0 ? `${h} hábito${h!==1?'s':''} más y el día es perfecto.` : '¡Todo hecho! Gran día.' },
    { title: '⚡ 6 PM — ¿completaste todo?',     body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : '✅ Hábitos al día.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} más.` : ''}` },
  ],

  /* ── 6:30 PM ── */
  NOCHE_TEMP_2: [
    { title: '🌇 6:30 — segundo aviso',          body: (h, t) => h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar. Quedan pocas horas del día.` : `✅ Hábitos listos. ${t > 0 ? `${t} tarea${t!==1?'s':''} por cerrar.` : '¡Día completo!'}` },
    { title: '⏰ La tarde se va',                 body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : 'Hábitos completos ✅'} ${t > 0 ? `${t} tarea${t!==1?'s':''} sin cerrar.` : ''}` },
    { title: '🔔 Recordatorio de las 6:30',      body: (h)     => h > 0 ? `Todavía estás a tiempo. ${h} hábito${h!==1?'s':''} por marcar.` : '¡Racha protegida! 🔥' },
    { title: '💡 No te olvides',                 body: (h, t) => (`${h > 0 ? `${h} hábito${h!==1?'s':''} sin completar.` : ''} ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}`).trim() || '¡Todo al día! Gran trabajo.' },
    { title: '🎯 La constancia se construye hoy',body: (h)     => h > 0 ? `${h} hábito${h!==1?'s':''} más y el día fue tuyo.` : '¡Constancia ganada hoy! 💪' },
    { title: '🔥 Cada día suma',                 body: (h)     => h > 0 ? `No rompas la racha hoy. ${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : 'Racha mantenida 🔥 Seguí mañana.' },
    { title: '⚡ Momento de actuar',             body: (h, t) => (`${h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar.` : ''} ${t > 0 ? `${t} tarea${t!==1?'s':''} más.` : ''}`).trim() || '¡Todo hecho! Descansá tranquilo.' },
  ],

  /* ── 8:00 PM ── */
  NOCHE: [
    { title: '🌙 8 PM — ¿terminaste el día?',    body: (h, t) => `${h > 0 ? `Aún podés marcar ${h} hábito${h!==1?'s':''}.` : '✅ Hábitos del día completos.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} sin terminar.` : ''}` },
    { title: '🔔 Aviso de las 8',                body: (h, t) => h > 0 ? `${h} hábito${h!==1?'s':''} sin completar hoy. Todavía estás a tiempo.` : `Hábitos completos. ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : '¡Todo listo!'}` },
    { title: '⏰ La noche está acá',             body: (h, t) => (`${h > 0 ? `${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : ''} ${t > 0 ? `${t} tarea${t!==1?'s':''} sin cerrar.` : ''}`).trim() || 'Revisá cómo cerrar el día.' },
    { title: '💪 La noche es tuya',              body: (h)     => h > 0 ? `No dejes que el día termine sin tus ${h} hábito${h!==1?'s':''}.` : '¡Día completo! Eso es constancia.' },
    { title: '🎯 Cerrá fuerte',                  body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} más` : 'Hábitos listos'}${t > 0 ? ` y ${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : '. ¡Gran trabajo!'}` },
    { title: '🔥 No pierdas lo que construiste', body: (h)     => h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar. La racha depende de vos.` : '¡Racha mantenida! 🔥' },
    { title: '📋 Revisión nocturna',             body: ()      => '¿Cerrás el día con todo completado?' },
  ],

  /* ── 8:30 PM ── */
  NOCHE_2: [
    { title: '🌃 8:30 — último empuje',          body: (h, t) => h > 0 ? `${h} hábito${h!==1?'s':''} sin completar. Abrí la app y marcalos.` : `✅ Hábitos del día listos. ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : '¡Día perfecto!'}` },
    { title: '⚡ Segundo aviso nocturno',         body: (h)     => h > 0 ? `La racha se rompe a medianoche. ${h} hábito${h!==1?'s':''} pendiente${h!==1?'s':''}.` : '¡Racha salvada! 🔥 Ahora a descansar.' },
    { title: '🔔 8:30 PM',                       body: (h, t) => (`${h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar.` : ''} ${t > 0 ? `${t} tarea${t!==1?'s':''} pendiente${t!==1?'s':''}.` : ''}`).trim() || '¡Todo completado! Gran día.' },
    { title: '💡 Todavía estás a tiempo',        body: (h)     => h > 0 ? `${h} hábito${h!==1?'s':''} más y el día fue tuyo.` : 'Hábitos completos ✅ Cerrá el día tranquilo.' },
    { title: '🎯 No abandones en la recta final',body: (h)     => h > 0 ? `Los últimos ${h} hábito${h!==1?'s':''} del día. ¿Los hacemos?` : '¡Completaste todo! Eso es disciplina real.' },
    { title: '🏁 Casi terminás el día',          body: (h, t) => `${h > 0 ? `${h} hábito${h!==1?'s':''} más.` : '✅ Hábitos listos.'} ${t > 0 ? `${t} tarea${t!==1?'s':''} sin cerrar.` : ''}` },
    { title: '🔥 Las 8:30 — última llamada',     body: (h)     => h > 0 ? `${h} hábito${h!==1?'s':''} sin marcar. La noche es larga, el hábito es corto.` : '¡Racha protegida! 🔥' },
  ],

  /* ── 10:00 PM — completamente al azar, mensajes de cierre/dormir ── */
  CIERRE: [
    // Motivacionales
    { title: '🌙 Hora de descansar',             body: () => 'Lo que hiciste hoy ya no te lo saca nadie. Mañana, más.' },
    { title: '😴 A dormir',                      body: () => 'El descanso también es parte del proceso. Apagá el celular.' },
    { title: '🌟 Cerrá el día con gratitud',     body: () => 'Un día más de constancia. No todos pueden decir eso.' },
    { title: '💤 El cuerpo necesita descansar',  body: () => 'Los hábitos se construyen durmiendo bien también. Descansá.' },
    { title: '🏆 Otro día sumado',               body: () => 'Cada noche que cerrás bien es un ladrillo más en lo que estás construyendo.' },
    // Desafío para mañana
    { title: '⚡ Mañana, arrancá antes de las 9',body: () => 'Desafío: mañana marcá tus hábitos antes de las 9 AM. ¿Podés?' },
    { title: '🎯 Desafío de mañana',             body: () => 'Mañana intentá completar todos tus hábitos antes del mediodía.' },
    { title: '🔥 ¿Podés mantener la racha?',     body: () => 'Mañana es un nuevo día. La racha te está esperando. No la rompas.' },
    { title: '💪 Mañana empieza esta noche',     body: () => 'Dormí bien. Mañana arrancás de cero y con energía.' },
    { title: '🚀 El mejor momento para mañana',  body: () => 'Si querés un buen día mañana, empezá durmiendo bien esta noche.' },
    // Recordatorio de mañana
    { title: '📋 Antes de dormir',               body: () => '¿Tenés todo listo para mañana? Revisá tu lista de tareas.' },
    { title: '⏰ Mañana hay que levantarse',      body: () => 'Poné el despertador. Los hábitos no esperan.' },
    { title: '🌅 Mañana es otro día',            body: () => 'Cerrá los ojos tranquilo. Mañana volvés a sumar.' },
    // Divertidos
    { title: '📵 Soltá el teléfono',             body: () => 'En serio. Apagá esto y dormí. Mañana hay trabajo.' },
    { title: '😴 ¿Qué hacés despierto todavía?', body: () => 'Las 10 PM. A dormir. Mi Carpeta puede esperar hasta mañana.' },
    { title: '🛌 El teléfono ya fue',            body: () => 'Dejás el teléfono, cerrás los ojos, y mañana volvés con todo.' },
  ],
}

// ─── El hook ──────────────────────────────────────────────
export function useNotifications({
  habits    = [],
  habitLogs = [],
  tasks     = [],
  goals     = [],
  goalItems = [],
  getProgress,
}) {

  const pedirPermisos = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }, [])

  const registrarCanal = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return
    await LocalNotifications.createChannel({
      id:          'mi-carpeta-principal',
      name:        'Mi Carpeta',
      description: 'Recordatorios de hábitos, tareas y metas',
      importance:  5,
      visibility:  1,
      sound:       'default',
      lights:      true,
      vibration:   true,
    })
  }, [])

  const cancelarTodas = useCallback(async () => {
    const { notifications: pendientes } = await LocalNotifications.getPending()
    if (pendientes.length > 0) {
      await LocalNotifications.cancel({
        notifications: pendientes.map(n => ({ id: n.id }))
      })
    }
  }, [])

  const agendarDia = useCallback(async () => {
    const hoy = hoyStr()

    // Hábitos sin completar hoy
    const habitosActivos   = habits.filter(h => !h.archived)
    const habitosSinMarcar = habitosActivos.filter(h =>
      !habitLogs.some(l => l.habit_id === h.id && l.date === hoy)
    )
    const cantHabitos  = habitosSinMarcar.length
    const habitoNombre = habitosSinMarcar[0]?.name ?? null

    // Tareas pendientes de hoy
    const tareasPendientes = tasks.filter(t => t.date === hoy && !t.completed)
    const cantTareas       = tareasPendientes.length
    const tareaNombre      = tareasPendientes[0]?.title ?? null

    // Los 11 slots del día
    const slots = [
      {
        id: SLOT.MANANA,       hora:  8, min:  0,
        msgs: MSG.MANANA,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.MANANA_2,     hora:  8, min: 30,
        msgs: MSG.MANANA_2,
        args: () => [cantHabitos],
        skipSi: () => cantHabitos === 0,
      },
      {
        id: SLOT.MEDIA_MAN,    hora: 10, min:  0,
        msgs: MSG.MEDIA_MAN,
        args: () => [cantHabitos],
        skipSi: () => cantHabitos === 0,
      },
      {
        id: SLOT.MEDIODIA,     hora: 12, min:  0,
        msgs: MSG.MEDIODIA,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.MEDIODIA_2,   hora: 12, min: 30,
        msgs: MSG.MEDIODIA_2,
        args: () => [cantTareas, tareaNombre],
      },
      {
        id: SLOT.TARDE,        hora: 15, min:  0,
        msgs: MSG.TARDE,
        args: () => [cantHabitos, habitoNombre],
        skipSi: () => cantHabitos === 0,
      },
      {
        id: SLOT.NOCHE_TEMP,   hora: 18, min:  0,
        msgs: MSG.NOCHE_TEMP,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.NOCHE_TEMP_2, hora: 18, min: 30,
        msgs: MSG.NOCHE_TEMP_2,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.NOCHE,        hora: 20, min:  0,
        msgs: MSG.NOCHE,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.NOCHE_2,      hora: 20, min: 30,
        msgs: MSG.NOCHE_2,
        args: () => [cantHabitos, cantTareas],
      },
      {
        id: SLOT.CIERRE,       hora: 22, min:  0,
        msgs: MSG.CIERRE,
        args: () => [],
        usarAlAzar: true,
      },
    ]

    const notificaciones = []

    for (const slot of slots) {
      if (slot.skipSi && slot.skipSi()) continue

      const trigger = proximaHora(slot.hora, slot.min)
      const yaFueHoy = trigger.getDate() !== new Date().getDate()
      if (yaFueHoy) continue

      const msg  = slot.usarAlAzar ? alAzar(slot.msgs) : porDia(slot.msgs)
      const args = slot.args()
      const body = msg.body(...args)

      // Elegir imagen según tipo de slot
      const esSlotTareas = [SLOT.MEDIODIA_2].includes(slot.id)
      const imgActual = esSlotTareas
        ? imgPorHora(IMGS.TAREAS)
        : imgPorHora(IMGS.HABITOS)

      notificaciones.push({
        id:        slot.id,
        title:     msg.title,
        body:      body,
        channelId: 'mi-carpeta-principal',
        largeIcon: imgActual,
        smallIcon: 'ic_stat_notif',
        schedule: {
          at:             trigger,
          allowWhileIdle: true,
        },
      })
    }

    // Metas sin movimiento (7+ días)
    goals.forEach((goal, index) => {
      const progreso = getProgress(goal.id)
      if (progreso >= 100) return

      const dias = diasSinActividad(goal.id, goalItems)
      if (dias < 7) return

      const trigger = proximaHora(10, 10)
      trigger.setMinutes(trigger.getMinutes() + index * 5)
      if (trigger.getDate() !== new Date().getDate()) return

      const diasStr = dias === Infinity ? 'mucho tiempo' : `${dias} días`
      notificaciones.push({
        id:        SLOT.META_OFFSET + index,
        title:     '🎯 Meta sin movimiento',
        body:      `"${goal.title}" lleva ${diasStr} sin avance. Un paso hoy es suficiente.`,
        channelId: 'mi-carpeta-principal',
        largeIcon: imgPorHora(IMGS.METAS),
        smallIcon: 'ic_stat_notif',
        schedule: {
          at:             trigger,
          allowWhileIdle: true,
        },
      })
    })

    if (notificaciones.length > 0) {
      await LocalNotifications.schedule({ notifications: notificaciones })
      console.log(`[Notif] ✅ ${notificaciones.length} notificaciones agendadas para hoy`)
    } else {
      console.log('[Notif] Sin horarios pendientes para hoy (todos ya pasaron)')
    }
  }, [habits, habitLogs, tasks, goals, goalItems, getProgress])

  const inicializarNotificaciones = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return

    try {
      const permiso = await pedirPermisos()
      if (!permiso) {
        console.log('[Notif] Permiso denegado')
        return
      }

      await registrarCanal()
      await cancelarTodas()
      await agendarDia()
    } catch (err) {
      console.error('[Notif] Error:', err)
    }
  }, [pedirPermisos, registrarCanal, cancelarTodas, agendarDia])

  return { inicializarNotificaciones }
}