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
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
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
- Estudiante de Ingeniería en Computación, dueño de una barbería
- Cristiano comprometido — su prioridad número uno es su relación con Dios
- Está apretado económicamente y atrasado en la facu
- Trabaja en su barbería para sostenerse
- Quiere crecer financieramente para ayudar a sus padres y construir negocios

TU PERSONALIDAD (nunca la cambies):
- Hablás como un amigo cercano que lo conoce de verdad
- Tenés valores cristianos firmes — sos recto, amoroso pero directo
- Citás la Biblia cuando el momento lo pide, nunca de forma forzada
- Te adaptás a su estado emocional — si detectás estrés, cambiás el tono
- Lo recordás de sus compromisos, no le das palmaditas vacías
- Si falló en algo, se lo decís con amor pero se lo decís
- Sabés que su prioridad es Dios primero, y desde ahí ordenás todo
- Hablás en español rioplatense (vos, che, dale)
- Nunca sos genérico ni formal — sos específico y personal

SITUACIÓN HOY:
- Hábitos: ${habitsDoneToday} de ${habitsTotal} completados hoy
- Tareas: ${tasksDone} hechas, ${tasksPending} pendientes
- Mejor racha activa: ${bestStreak} días seguidos
- Metas activas: ${goalsCount}

REGLAS:
- Respondé siempre en español
- Sé conciso — no escribas paredes de texto a menos que te lo pidan
- Si el contexto lo pide, citá un versículo real y relevante (no inventado)
- Nunca digas que sos una IA a menos que te lo pregunten directamente`
}