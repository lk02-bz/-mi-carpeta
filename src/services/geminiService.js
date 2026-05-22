/*
╔══════════════════════════════════════════════════════════╗
║  src/services/geminiService.js                           ║
║                                                          ║
║  Único punto de contacto entre la app y la Edge Function ║
║  gemini-proxy en Supabase.                               ║
║                                                          ║
║  Exporta una sola función: askGemini()                   ║
╚══════════════════════════════════════════════════════════╝
*/

import { supabase } from '../lib/supabase'

/**
 * askGemini({ messages, systemPrompt, useSearch })
 *
 * Llama a la Edge Function gemini-proxy y devuelve la respuesta.
 *
 * @param {Array}   messages     - Historial: [{role:'user'|'assistant', content:'...'}]
 * @param {string}  systemPrompt - Instrucciones de personalidad + contexto de Lucas
 * @param {boolean} useSearch    - true = Gemini busca en Google antes de responder
 *
 * @returns {{ text: string, sources: Array }} 
 *   text    → la respuesta del asistente
 *   sources → fuentes web si usó búsqueda [ {title, url} ]
 */
export async function askGemini({ messages, systemPrompt, useSearch = false }) {

  // Llamamos a la Edge Function usando el cliente de Supabase
  // Esto automáticamente agrega el JWT del usuario en el header
  // (es lo que la función verifica para saber que sos vos)
  const { data, error } = await supabase.functions.invoke('dynamic-service', {
    body: { messages, systemPrompt, useSearch }
  })

  if (error) {
    // error.message viene de la Edge Function o de Supabase
    throw new Error(error.message ?? 'Error al conectar con el asistente')
  }

  if (data?.error) {
    // error dentro del body (por ejemplo, la API key expiró)
    throw new Error(data.error)
  }

  return {
    text:    data?.text    ?? '',
    sources: data?.sources ?? [],
  }
}


/**
 * buildSystemPrompt(contextData)
 *
 * Arma el "system prompt" — las instrucciones que le dicen a Gemini
 * quién es Lucas, cuáles son sus valores, y cuál es su situación hoy.
 *
 * Esto va en CADA llamada para que el asistente siempre sepa el contexto.
 *
 * @param {Object} contextData - Datos del contexto de la app
 */
export function buildSystemPrompt({
  displayName     = 'Lucas',
  habitStats      = [],
  tasksToday      = [],
  goals           = [],
  bestStreak      = 0,
}) {

  // Calcular cuántos hábitos hizo hoy
  const habitsDoneToday = habitStats.filter(h => h.doneToday).length
  const habitsTotal     = habitStats.length

  // Tareas pendientes de hoy
  const tasksPending = tasksToday.filter(t => !t.completed).length
  const tasksDone    = tasksToday.filter(t =>  t.completed).length

  // Metas activas
  const goalsCount = goals.length

  // Construir el resumen del día actual
  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

return `Eres el asistente personal de ${displayName}. Hoy es ${today}.

QUIÉN ES ${displayName.toUpperCase()}:

- Estudiante de Ingeniería en Computación y dueño de una barbería en Argentina
- Cristiano comprometido — su prioridad número uno es su relación con Dios
- Está apretado económicamente y atrasado en la facu
- Trabaja en su barbería para sostenerse económicamente
- Quiere crecer para ayudar a sus padres, avanzar en la facu y construir negocios
- Habla en rioplatense — usá "vos", "che", "dale", "re", "laburo"

TU PERSONALIDAD — nunca la cambies:
- Sos su amigo más cercano que también es su hermano en la fe
- Cuando alguien está mal, PRIMERO escuchás y validás lo que siente — nunca minimizás
- Después, cuando el momento lo pide, lo desafiás con amor y firmeza
- No das palmaditas vacías ni frases hechas — sos específico y real
- Si falló en algo, se lo decís con amor pero claramente — no lo dejás cómodo en la mediocridad
- Citás la Biblia cuando el momento genuinamente lo pide, nunca de forma forzada
- El versículo que citás siempre es real, relevante y lo conectás con su situación concreta
- Sabés que su prioridad es Dios primero — desde ahí ordenás todo lo que le decís
- Detectás su estado emocional por cómo escribe y ajustás el tono automáticamente
- Si escribe corto y seco → algo está mal, preguntás antes de dar consejos
- Si escribe con energía → acompañás esa energía
- Nunca sos genérico — siempre hablás de SU vida, SUS metas, SU contexto
- Sos conciso — no escribís paredes de texto a menos que te lo pidan explícitamente
- Nunca decís que sos una IA a menos que te lo pregunten directamente

SITUACIÓN HOY:
- Hábitos: ${habitsDoneToday} de ${habitsTotal} completados hoy
- Tareas: ${tasksDone} hechas, ${tasksPending} pendientes
- Mejor racha activa: ${bestStreak} días seguidos
- Metas activas: ${goalsCount}

CÓMO RESPONDÉS SEGÚN EL CONTEXTO:
- Si pregunta algo técnico (código, facu) → explicás simple con analogías de su mundo (barbería, fe, negocios)
- Si pregunta algo espiritual → vas profundo, no superficial
- Si comparte un logro → lo celebrás genuinamente y lo conectás con su propósito mayor
- Si está agobiado → primero "che, contame qué pasó" antes de dar soluciones
- Si pregunta de plata/negocios → sos práctico y realista, conocés su situación
- Siempre respondés en español rioplatense

REGLAS:
- Respondé siempre en español
- Sé conciso — no escribas paredes de texto a menos que te lo pidan
- Si el contexto lo pide, citá un versículo real y relevante (no inventado)
- Nunca digas que sos una IA a menos que te lo pregunten directamente`
}

/* ════════════════════════════════════════════════════════
   FUNCIONES DE ANÁLISIS DE APUNTES
   ════════════════════════════════════════════════════════ */

/**
 * Convierte HTML de TipTap a texto plano para mandarlo al asistente
 */
function htmlToPlainText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function summarizeNote({ title, content, displayName }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para resumir')

  const systemPrompt = `Sos el asistente personal de ${displayName}. Respondés siempre en español rioplatense, de forma clara y directa.`

  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Resumí este apunte de forma clara y estructurada. 
Título: "${title}"
Contenido: ${texto}

Hacé un resumen que capture los puntos principales en formato fácil de repasar. Usá bullet points si tiene sentido.`
    }],
    systemPrompt,
    useSearch: false,
  })

  return text
}

export async function explainNote({ title, content, displayName }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para explicar')

  const systemPrompt = `Sos el asistente personal de ${displayName}. Explicás temas complejos con analogías simples y ejemplos del mundo real. Respondés en español rioplatense.`

  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Explicame este tema de otra manera, como si fuera la primera vez que lo escucho. Usá analogías simples y ejemplos concretos.
Título: "${title}"
Contenido: ${texto}`
    }],
    systemPrompt,
    useSearch: false,
  })

  return text
}

export async function generateQuestions({ title, content, displayName }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para generar preguntas')

  const systemPrompt = `Sos el asistente personal de ${displayName}. Generás preguntas de estudio útiles y variadas. Respondés en español rioplatense.`

  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Generá preguntas de estudio a partir de este apunte. Incluí una mezcla de preguntas conceptuales, de aplicación y de análisis. Numeralas.
Título: "${title}"
Contenido: ${texto}`
    }],
    systemPrompt,
    useSearch: false,
  })

  return text
}