/*
╔══════════════════════════════════════════════════════════╗
║  src/utils/helpers.js — Funciones utilitarias            ║
║                                                          ║
║  Funciones puras y reutilizables que no dependen de      ║
║  React ni de Supabase. Pueden importarse desde           ║
║  cualquier componente.                                   ║
║                                                          ║
║  Cambios Fase 2:                                         ║
║  ✦ stripHtml() — elimina tags HTML del contenido         ║
║    TipTap para poder mostrar previews de texto limpio    ║
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
 * stripHtml(html) — Elimina todos los tags HTML y devuelve texto plano
 *
 * @param {string} html - String con HTML (el que guarda TipTap)
 * @returns {string}    - Texto limpio sin tags
 *
 * ¿Por qué lo necesitamos?
 * TipTap guarda el contenido como HTML: "<p>Hola</p><h1>Título</h1>"
 * Cuando mostramos previews en las tarjetas de apuntes, React renderiza
 * ese string como texto plano — el usuario vería los tags crudos.
 * stripHtml() convierte "<p>Hola</p><h1>Título</h1>" → "Hola Título"
 *
 * También es importante en la búsqueda: sin stripHtml, buscar "p"
 * encontraría todas las notas porque todas tienen el tag <p>.
 *
 * Cómo funciona:
 * 1. replace(/<[^>]*>/g, ' ')  → reemplaza cada tag por un espacio
 *    (un espacio, no nada, para no pegar palabras de distintos bloques)
 * 2. replace(/\s+/g, ' ')      → colapsa múltiples espacios en uno
 * 3. trim()                    → saca espacios al principio y final
 */
export function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')  // <p>, </p>, <h1>, <li>, etc. → espacio
    .replace(/&nbsp;/g, ' ')   // entidad HTML "no-break space"
    .replace(/&amp;/g, '&')    // entidad &
    .replace(/&lt;/g, '<')     // entidad <
    .replace(/&gt;/g, '>')     // entidad >
    .replace(/&quot;/g, '"')   // entidad "
    .replace(/\s+/g, ' ')      // múltiples espacios → uno solo
    .trim()
}


/**
 * truncate(text, maxLength) — Acorta un texto largo y agrega "..."
 *
 * @param {string} text      - Texto original (ya sin HTML, después de stripHtml)
 * @param {number} maxLength - Longitud máxima (default: 90 caracteres)
 * @returns {string}         - Texto acortado
 *
 * Uso: en las tarjetas de apuntes para mostrar solo un preview del contenido.
 * Siempre usarlo después de stripHtml() cuando el contenido viene de TipTap:
 *   truncate(stripHtml(note.content))
 */
export function truncate(text, maxLength = 90) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
