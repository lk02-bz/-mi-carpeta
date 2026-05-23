/*
╔══════════════════════════════════════════════════════════╗
║  src/services/geminiService.js                           ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ HTML_SYSTEM incluye soporte de checklist TipTap       ║
╚══════════════════════════════════════════════════════════╝
*/

import { supabase } from '../lib/supabase'

export async function askGemini({ messages, systemPrompt, useSearch = false }) {
  const { data, error } = await supabase.functions.invoke('dynamic-service', {
    body: { messages, systemPrompt, useSearch }
  })
  if (error) throw new Error(error.message ?? 'Error al conectar con el asistente')
  if (data?.error) throw new Error(data.error)
  return { text: data?.text ?? '', sources: data?.sources ?? [] }
}


/* ════════════════════════════════════════════════════════
   MARKDOWN → HTML
   ════════════════════════════════════════════════════════ */

function formatInline(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/__(.+?)__/g,         '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/_(.+?)_/g,           '<em>$1</em>')
    .replace(/`(.+?)`/g,           '<code>$1</code>')
}

function looksLikeMarkdown(text) {
  return /\*\*/.test(text)
      || /^#{1,3} /m.test(text)
      || /^[-*+] /m.test(text)
      || /^\d+\. /m.test(text)
      || /^\[[ x]\] /m.test(text)
}

export function markdownToHtml(text = '') {
  if (!text) return text
  if (text.trim().startsWith('<') && !looksLikeMarkdown(text)) return text
  if (!looksLikeMarkdown(text)) {
    return text.split(/\n\n+/).map(b => b.trim() ? `<p>${b.replace(/\n/g, ' ')}</p>` : '').filter(Boolean).join('\n')
  }

  const lines = text.split('\n')
  const result = []
  let inUl = false
  let inOl = false
  let inTask = false

  function closeList() {
    if (inTask) { result.push('</ul>'); inTask = false }
    if (inUl)   { result.push('</ul>'); inUl   = false }
    if (inOl)   { result.push('</ol>'); inOl   = false }
  }

  for (const line of lines) {
    if (/^### (.+)/.test(line)) {
      closeList()
      result.push(`<h3>${formatInline(line.replace(/^### /, ''))}</h3>`)
      continue
    }
    if (/^## (.+)/.test(line)) {
      closeList()
      result.push(`<h2>${formatInline(line.replace(/^## /, ''))}</h2>`)
      continue
    }
    if (/^# (.+)/.test(line)) {
      closeList()
      result.push(`<h2>${formatInline(line.replace(/^# /, ''))}</h2>`)
      continue
    }
    if (/^---+$/.test(line.trim())) {
      closeList(); result.push('<hr>'); continue
    }
    // Checklist: - [ ] item o - [x] item
    const task = line.match(/^[-*] \[([ x])\] (.+)/)
    if (task) {
      if (inUl || inOl) { result.push(inUl ? '</ul>' : '</ol>'); inUl = false; inOl = false }
      if (!inTask) { result.push('<ul data-type="taskList">'); inTask = true }
      const checked = task[1] === 'x' ? 'true' : 'false'
      result.push(`<li data-type="taskItem" data-checked="${checked}">${formatInline(task[2])}</li>`)
      continue
    }
    const ul = line.match(/^[-*+] (.+)/)
    if (ul) {
      if (inOl)   { result.push('</ol>'); inOl   = false }
      if (inTask) { result.push('</ul>'); inTask = false }
      if (!inUl)  { result.push('<ul>');  inUl   = true  }
      result.push(`<li>${formatInline(ul[1])}</li>`)
      continue
    }
    const ol = line.match(/^\d+\. (.+)/)
    if (ol) {
      if (inUl)   { result.push('</ul>'); inUl   = false }
      if (inTask) { result.push('</ul>'); inTask = false }
      if (!inOl)  { result.push('<ol>');  inOl   = true  }
      result.push(`<li>${formatInline(ol[1])}</li>`)
      continue
    }
    if (!line.trim()) { closeList(); result.push(''); continue }
    closeList()
    result.push(formatInline(line))
  }
  closeList()

  const blocks = result.join('\n').split(/\n\n+/)
  return blocks.map(block => {
    block = block.trim()
    if (!block) return ''
    if (/^<(h[1-6]|ul|ol|hr|p|div|blockquote)/.test(block)) return block
    return `<p>${block.replace(/\n/g, ' ')}</p>`
  }).filter(Boolean).join('\n')
}


/* ════════════════════════════════════════════════════════
   PROMPTS
   ════════════════════════════════════════════════════════ */

export function buildFreeSystemPrompt({ assistantName = 'Asistente' }) {
  return `Sos ${assistantName}, un asistente de IA inteligente y útil.

CÓMO SOS:
- Respondés cualquier pregunta de forma clara, precisa y útil
- Si alguien pregunta algo técnico, explicás con claridad y ejemplos concretos
- Si alguien comparte un problema personal, escuchás primero antes de dar consejos
- Sos directo pero amable, hablás en español rioplatense (vos, che, dale)
- Sos conciso — respondés lo que se pregunta sin agregar relleno

REGLAS:
- Respondé siempre en español rioplatense
- Nunca decís que sos una IA a menos que te lo pregunten directamente
- No asumís nada sobre el usuario a menos que te lo diga él mismo`
}

export function buildSystemPrompt({
  displayName   = 'Lucas',
  habitStats    = [],
  tasksToday    = [],
  goals         = [],
  bestStreak    = 0,
  assistantName = 'Asistente',
}) {
  const habitsDoneToday = habitStats.filter(h => h.doneToday).length
  const habitsTotal     = habitStats.length
  const tasksPending    = tasksToday.filter(t => !t.completed).length
  const tasksDone       = tasksToday.filter(t =>  t.completed).length
  const goalsCount      = goals.length
  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return `Sos ${assistantName}, el asistente personal de ${displayName}. Hoy es ${today}.

CONTEXTO DEL USUARIO:
- Estudiante de Ingeniería en Computación y dueño de una barbería en Argentina
- Cristiano comprometido — su prioridad número uno es su relación con Dios
- Está apretado económicamente y atrasado en la facu
- Trabaja en su barbería para sostenerse económicamente
- Quiere crecer para ayudar a sus padres, avanzar en la facu y construir negocios

TU PERSONALIDAD:
- Sos su amigo más cercano que también es su hermano en la fe
- Cuando está mal, PRIMERO escuchás y validás — nunca minimizás
- Después, cuando el momento lo pide, lo desafiás con amor y firmeza
- Citás la Biblia cuando el momento genuinamente lo pide, nunca forzado
- Hablás en español rioplatense (vos, che, dale)

SITUACIÓN HOY:
- Hábitos: ${habitsDoneToday} de ${habitsTotal} completados
- Tareas: ${tasksDone} hechas, ${tasksPending} pendientes
- Mejor racha: ${bestStreak} días seguidos
- Metas activas: ${goalsCount}

REGLAS:
- Respondé siempre en español
- Sé conciso a menos que te pidan más detalle
- Versículos siempre reales y relevantes, nunca inventados`
}


/* ════════════════════════════════════════════════════════
   FUNCIONES DE ANÁLISIS DE APUNTES
   ════════════════════════════════════════════════════════ */

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

/* HTML_SYSTEM ahora incluye soporte de checklist */
const HTML_SYSTEM = `Respondés SOLO con HTML válido. Etiquetas permitidas:
- <h2> títulos de sección
- <strong> texto importante
- <em> énfasis
- <ul><li> listas de puntos
- <ol><li> listas numeradas
- <ul data-type="taskList"><li data-type="taskItem" data-checked="false">tarea</li></ul> para checklists/listas de tareas
- <p> párrafos normales
NUNCA uses markdown (sin **, sin #, sin - para listas). Solo HTML puro, sin texto adicional.`

export async function summarizeNote({ title, content }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para resumir')
  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Resumí este apunte en HTML estructurado.
Título: "${title}"
Contenido: ${texto}
Usá <h2> para secciones, <strong> para conceptos clave, <ul><li> para listas.
Respondé ÚNICAMENTE con HTML, sin markdown, sin texto extra.`
    }],
    systemPrompt: HTML_SYSTEM,
    useSearch: false,
  })
  return markdownToHtml(text.replace(/```html|```/g, '').trim())
}

export async function explainNote({ title, content }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para explicar')
  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Explicame este tema de otra manera, con analogías simples y ejemplos concretos. Formato HTML.
Título: "${title}"
Contenido: ${texto}
Usá <h2> para secciones, <strong> para conceptos, <ul><li> para ejemplos.
Respondé ÚNICAMENTE con HTML, sin markdown, sin texto extra.`
    }],
    systemPrompt: HTML_SYSTEM,
    useSearch: false,
  })
  return markdownToHtml(text.replace(/```html|```/g, '').trim())
}

export async function generateQuestions({ title, content }) {
  const texto = htmlToPlainText(content)
  if (!texto) throw new Error('La nota no tiene contenido para generar preguntas')
  const { text } = await askGemini({
    messages: [{
      role: 'user',
      content: `Generá preguntas de estudio a partir de este apunte en HTML estructurado.
Título: "${title}"
Contenido: ${texto}
Estructura: <h2>Preguntas conceptuales</h2><ol><li>...</li></ol> + <h2>Preguntas de aplicación</h2><ol>...</ol> + <h2>Preguntas de análisis</h2><ol>...</ol>
Usá <strong> para términos clave. Solo HTML, sin markdown.`
    }],
    systemPrompt: HTML_SYSTEM,
    useSearch: false,
  })
  return markdownToHtml(text.replace(/```html|```/g, '').trim())
}