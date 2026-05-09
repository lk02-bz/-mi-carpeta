/*
╔══════════════════════════════════════════════════════════╗
║  src/utils/helpers.js — Funciones utilitarias            ║
║                                                          ║
║  Funciones puras y reutilizables que no dependen de      ║
║  React ni de Supabase. Pueden importarse desde           ║
║  cualquier componente.                                   ║
╚══════════════════════════════════════════════════════════╝
*/


/**
 * fdate(ts) — Formatea un timestamp a texto legible en español
 *
 * @param {string} ts - Timestamp ISO 8601 de Supabase (ej: "2025-01-15T14:30:00Z")
 *                      o timestamp numérico en milisegundos
 * @returns {string}  - Ej: "15 ene. 2025 · 14:30"
 *
 * Nota: En la app vanilla usábamos Date.now() (número).
 * Supabase devuelve fechas en formato ISO 8601 (string).
 * new Date() acepta ambos formatos, así que la función funciona en los dos casos.
 */
export function fdate(ts) {
  const d = new Date(ts)
  const fecha = d.toLocaleDateString('es-AR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
  const hora = d.toLocaleTimeString('es-AR', {
    hour:   '2-digit',
    minute: '2-digit',
  })
  return `${fecha} · ${hora}`
}


/**
 * getGreeting() — Devuelve el saludo según la hora del día
 *
 * @returns {string} - "Buenos días 👋" | "Buenas tardes 👋" | "Buenas noches 👋"
 */
export function getGreeting() {
  const h = new Date().getHours() // 0-23
  if (h < 12) return 'Buenos días 👋'
  if (h < 19) return 'Buenas tardes 👋'
  return 'Buenas noches 👋'
}


/**
 * truncate(text, maxLength) — Acorta un texto largo y agrega "..."
 *
 * @param {string} text      - Texto original
 * @param {number} maxLength - Longitud máxima (default: 90 caracteres)
 * @returns {string}         - Texto acortado
 *
 * Uso: en las tarjetas de apuntes para mostrar solo un preview del contenido.
 */
export function truncate(text, maxLength = 90) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
