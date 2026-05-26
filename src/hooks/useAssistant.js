/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useAssistant.js                               ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ useFinanzas — centro de comando financiero            ║
║    · ingresos: CRUD en Supabase income_records           ║
║    · ideas: CRUD en Supabase business_ideas              ║
║    · presupuesto: análisis con IA                        ║
║    · proyección: simulación hacia meta                   ║
║    · decisiones: debate con IA                           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useCallback, useEffect } from 'react'
import { supabase }              from '../lib/supabase'
import { askGemini, buildSystemPrompt, buildFreeSystemPrompt } from '../services/geminiService'

export function useAssistant({ contextData }) {

  /* ── Chat ── */
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  /* ── Devocional ── */
  const [devotional,  setDevotional]  = useState(null)
  const [devLoading,  setDevLoading]  = useState(false)
  const [userAnswer,  setUserAnswer]  = useState('')
  const [answerSaved, setAnswerSaved] = useState(false)

  /* ── Briefing ── */
  const [briefing,     setBriefing]     = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  /* ── Plan de estudio ── */
  const [studyPlan,    setStudyPlan]    = useState(null)
  const [studyLoading, setStudyLoading] = useState(false)

  /* ── Coach de hábitos ── */
  const [habitAnalysis, setHabitAnalysis] = useState(null)
  const [habitLoading,  setHabitLoading]  = useState(false)

  /* ── Finanzas ── */
  const [incomeRecords,   setIncomeRecords]   = useState([])
  const [businessIdeas,   setBusinessIdeas]   = useState([])
  const [financeLoading,  setFinanceLoading]  = useState(false)
  const [budgetAnalysis,  setBudgetAnalysis]  = useState(null)
  const [budgetLoading,   setBudgetLoading]   = useState(false)
  const [decisionResult,  setDecisionResult]  = useState(null)
  const [decisionLoading, setDecisionLoading] = useState(false)


  /* ════════════════════════════════════════════════════════
     CHAT LIBRE
     ════════════════════════════════════════════════════════ */

  const sendMessage = useCallback(async (userText, useSearch = false, actions = {}) => {
    if (!userText.trim() || loading) return
    setError(null)
    const newUserMsg      = { role: 'user', content: userText }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const systemPrompt = buildFreeSystemPrompt({ assistantName: contextData.assistantName || 'Asistente' })

      /* ── Detectar intención de acción ── */
      const lower = userText.toLowerCase()

      const isTarea = /\b(cre[aá]|agrega[á]?|a[ñn]ad[ií]|nueva?|pon[eé]|recordame|tarea)\b.*\b(tarea|recordatorio|pendiente)\b|\b(tarea|recordatorio)\b.*\b(cre[aá]|agrega[á]?|para|de|:)\b/i.test(userText)
      const isMeta  = /\b(nueva?|cre[aá]|agrega[á]?)\b.*\b(meta|objetivo|goal)\b|\b(meta|objetivo)\b.*\b(nueva?|cre[aá]|agrega[á]?|quiero|de|:)\b/i.test(userText)
      const isApunte = /\b(guard[aá]|anot[aá]|cre[aá]|guard[aá] esto|crear apunte|guardar apunte|nuevo apunte)\b/i.test(userText)

      // Ejecutar acción detectada
      let accionRealizada = null

      if (isTarea && actions.createTask) {
        // Extraer fecha si la menciona
        let fecha = new Date().toISOString().slice(0, 10)
        const manana = /ma[ñn]ana/i.test(userText)
        const pasado = /pasado ma[ñn]ana/i.test(userText)
        if (pasado) { const d = new Date(); d.setDate(d.getDate()+2); fecha = d.toISOString().slice(0,10) }
        else if (manana) { const d = new Date(); d.setDate(d.getDate()+1); fecha = d.toISOString().slice(0,10) }

        // Extraer título — quitar palabras de comando
        const titulo = userText
          .replace(/cre[aá]|agrega[á]?|a[ñn]ad[ií]|nueva?|pon[eé]|recordame|una tarea|tarea para|tarea:|tarea/gi, '')
          .replace(/ma[ñn]ana|pasado ma[ñn]ana|hoy|para|de|:/gi, '')
          .trim()
          .replace(/^[\s,.-]+/, '')

        if (titulo.length > 2) {
          await actions.createTask({ title: titulo, date: fecha, completed: false })
          accionRealizada = { tipo: 'tarea', titulo, fecha }
        }
      }

      else if (isMeta && actions.createGoal) {
        const titulo = userText
          .replace(/nueva?|cre[aá]|agrega[á]?|a[ñn]ad[ií]|meta:|meta|objetivo:|objetivo|quiero lograr|quiero/gi, '')
          .trim()
          .replace(/^[\s,.:]+/, '')

        if (titulo.length > 2) {
          await actions.createGoal({ title: titulo })
          accionRealizada = { tipo: 'meta', titulo }
        }
      }

      else if (isApunte && actions.createNote) {
        // Buscar el último mensaje del asistente para guardarlo
        const lastAssistant = [...updatedMessages].reverse().find(m => m.role === 'assistant')
        const contenido = lastAssistant?.content || userText
        const titulo = userText
          .replace(/guard[aá]|anot[aá]|cre[aá]|esto|como apunte|apunte:|apunte|nuevo/gi, '')
          .trim()
          .replace(/^[\s,.:]+/, '') || 'Apunte del asistente'

        const catId = actions.defaultCatId || null
        await actions.createNote({ title: titulo || 'Apunte del asistente', content: `<p>${contenido}</p>`, categoryId: catId })
        accionRealizada = { tipo: 'apunte', titulo: titulo || 'Apunte del asistente' }
      }

      // Construir system prompt con contexto de la acción realizada
      let systemFinal = systemPrompt
      if (accionRealizada) {
        const confirmaciones = {
          tarea:  `El usuario pidió crear una tarea y ya la creaste exitosamente: "${accionRealizada.titulo}" para el ${accionRealizada.fecha}. Confirmale que la creaste y ofrecé ayuda adicional.`,
          meta:   `El usuario pidió crear una meta y ya la creaste exitosamente: "${accionRealizada.titulo}". Confirmale que la creaste y motivalo con un comentario breve.`,
          apunte: `El usuario pidió guardar un apunte y ya lo guardaste exitosamente: "${accionRealizada.titulo}". Confirmale que lo guardaste.`,
        }
        systemFinal = systemPrompt + `\n\nACCIÓN YA EJECUTADA: ${confirmaciones[accionRealizada.tipo]}`
      }

      const { text, sources } = await askGemini({
        messages:  updatedMessages,
        systemPrompt: systemFinal,
        useSearch,
      })

      // Si hubo acción, agregar badge visual al mensaje
      const msgExtra = accionRealizada ? { accion: accionRealizada } : {}
      setMessages(prev => [...prev, { role: 'assistant', content: text, sources, ...msgExtra }])

    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [messages, loading, contextData])

  const clearChat = useCallback(() => { setMessages([]); setError(null) }, [])

  const saveLastResponseAsNote = useCallback(async (createNote, categoryId = null) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant || !createNote) return null
    try {
      const { data, error: createError } = await createNote({ title: 'Respuesta del asistente', content: lastAssistant.content, categoryId })
      if (createError) throw createError
      return data ?? null
    } catch (err) { setError(err.message); return null }
  }, [messages])


  /* ════════════════════════════════════════════════════════
     DEVOCIONAL
     ════════════════════════════════════════════════════════ */

  const loadDevotional = useCallback(async () => {
    if (devLoading || devotional) return
    setDevLoading(true); setError(null)
    const today = new Date().toISOString().slice(0, 10)
    try {
      const { data: existing } = await supabase.from('devotional_diary').select('*').eq('date', today).maybeSingle()
      if (existing) {
        try { setDevotional(JSON.parse(existing.reflection)) }
        catch { setDevotional({ verse: existing.verse, reflection: existing.reflection, question: existing.question }) }
        setUserAnswer(existing.user_answer ?? ''); setAnswerSaved(!!existing.user_answer); return
      }
      const systemPrompt = buildSystemPrompt(contextData)
      const prompt = `Generá un devocional cristiano profundo para hoy. Respondé ÚNICAMENTE con este JSON exacto (sin markdown):
{
  "verse": "Texto completo del versículo (Libro capítulo:versículo)",
  "verseRef": "Libro capítulo:versículo",
  "historicalContext": "2-3 oraciones sobre el contexto histórico.",
  "centralTeaching": "3-4 oraciones sobre qué verdad revela este pasaje acerca de DIOS.",
  "deepDive": "4-5 oraciones con recurso: historia bíblica, testimonio histórico o enseñanza clásica.",
  "christianValue": "2-3 oraciones sobre qué virtud de Cristo se ve en este pasaje.",
  "meditationQuestion": "Una pregunta contemplativa sobre quién es Dios.",
  "lifeConnection": "2 oraciones conectando con la vida diaria de un joven cristiano.",
  "prayer": "Oración de 5-7 oraciones en primera persona, de adoración y rendición."
}
Elegí un versículo rico teológicamente. Variá los libros bíblicos.`
      const { text } = await askGemini({ messages: [{ role: 'user', content: prompt }], systemPrompt, useSearch: false })
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('devotional_diary').insert({ user_id: user.id, date: today, verse: parsed.verse, reflection: JSON.stringify(parsed), question: parsed.meditationQuestion })
      setDevotional(parsed)
    } catch (err) { setError('No se pudo generar el devocional: ' + err.message) }
    finally { setDevLoading(false) }
  }, [devLoading, devotional, contextData])

  const saveDevotionalAnswer = useCallback(async () => {
    if (!userAnswer.trim() || answerSaved) return
    const today = new Date().toISOString().slice(0, 10)
    try { await supabase.from('devotional_diary').update({ user_answer: userAnswer }).eq('date', today); setAnswerSaved(true) }
    catch (err) { setError(err.message) }
  }, [userAnswer, answerSaved])


  /* ════════════════════════════════════════════════════════
     BRIEFING
     ════════════════════════════════════════════════════════ */

  const loadBriefing = useCallback(async () => {
    if (briefLoading || briefing) return
    setBriefLoading(true); setError(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)
      const { habitStats = [], tasksToday = [], goals = [], bestStreak = 0 } = contextData
      const prompt = `Hacé el briefing diario. Hábitos: ${habitStats.filter(h=>h.doneToday).length}/${habitStats.length}. Tareas pendientes: ${tasksToday.filter(t=>!t.completed).length}. Metas: ${goals.length}. Racha: ${bestStreak} días. Respondé breve y directo.`
      const { text } = await askGemini({ messages: [{ role: 'user', content: prompt }], systemPrompt, useSearch: false })
      setBriefing(text)
    } catch (err) { setError(err.message) }
    finally { setBriefLoading(false) }
  }, [briefLoading, briefing, contextData])


  /* ════════════════════════════════════════════════════════
     PLAN DE ESTUDIO
     ════════════════════════════════════════════════════════ */

  const generateStudyPlan = useCallback(async ({ materia, noteContent, diasDisponibles, horasPorDia, fechaInicio, fechaExamen }) => {
    setStudyLoading(true); setStudyPlan(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)
      const prompt = `Generá un plan de estudio detallado.
CONFIGURACIÓN: Materia: ${materia} | Inicio: ${fechaInicio} | Días: ${diasDisponibles} | Horas/día: ${horasPorDia}h${fechaExamen ? ` | Examen: ${fechaExamen}` : ''}
${noteContent ? `\nCONTENIDO:\n${noteContent.slice(0, 2500)}` : ''}
Respondé ÚNICAMENTE con este JSON (sin markdown):
{
  "title": "Plan: ${materia}",
  "totalSessions": número,
  "examDate": ${fechaExamen ? `"${fechaExamen}"` : 'null'},
  "sessions": [{"date":"YYYY-MM-DD","dayName":"Lunes","title":"Tema","duration":"${horasPorDia} horas","type":"normal","topics":["t1","t2"],"tip":"consejo"}],
  "tips": ["consejo1","consejo2","consejo3"]
}
type: normal|intensivo|repaso. Progresivo simple→complejo.`
      const { text } = await askGemini({ messages: [{ role: 'user', content: prompt }], systemPrompt, useSearch: false })
      setStudyPlan(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch (err) { setStudyPlan({ error: `No se pudo generar el plan: ${err.message}` }) }
    finally { setStudyLoading(false) }
  }, [contextData])

  const resetStudyPlan = useCallback(() => setStudyPlan(null), [])


  /* ════════════════════════════════════════════════════════
     COACH DE HÁBITOS
     ════════════════════════════════════════════════════════ */

  const analyzeHabits = useCallback(async ({ habitStats, habitLogs }) => {
    if (habitStats.length === 0) return
    setHabitLoading(true); setHabitAnalysis(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)
      const habitData = habitStats.map(h => {
        const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
        const logs30 = habitLogs.filter(l => l.habit_id === h.id && new Date(l.date + 'T00:00:00') >= hace30)
        const tasa30 = Math.round((logs30.length / 30) * 100)
        const dias7  = h.last7.filter(d => d.done).length
        const hoy = new Date(); hoy.setHours(0,0,0,0)
        const hace7  = new Date(hoy); hace7.setDate(hoy.getDate() - 7)
        const hace14 = new Date(hoy); hace14.setDate(hoy.getDate() - 14)
        const hace7a14 = habitLogs.filter(l => { if (l.habit_id !== h.id) return false; const d = new Date(l.date + 'T00:00:00'); return d >= hace14 && d < hace7 }).length
        const tendencia = dias7 > hace7a14 ? 'mejorando' : dias7 < hace7a14 ? 'bajando' : 'estable'
        const porDia = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((nombre, dow) => ({ nombre, total: habitLogs.filter(l => l.habit_id === h.id && new Date(l.date + 'T00:00:00').getDay() === dow).length }))
        const minDia = porDia.reduce((min, d) => d.total < min.total ? d : min, porDia[0])
        return { nombre: h.name, emoji: h.emoji||'⚡', racha: h.streak, tasa30, tendencia, dias7, diaMasDificil: minDia.nombre, porDia }
      })
      const prompt = `Analizá los patrones de estos hábitos y dá coaching personalizado.
DATOS:
${habitData.map(h => `- ${h.emoji} ${h.nombre}: racha ${h.racha}d, ${h.tasa30}% (30d), ${h.tendencia}, día difícil: ${h.diaMasDificil}, últimos 7: ${h.dias7}/7`).join('\n')}
Respondé ÚNICAMENTE con este JSON (sin markdown):
{
  "resumen": "2-3 oraciones sobre el estado general, honesto y directo",
  "habitoFoco": "nombre del hábito más prioritario esta semana",
  "habitos": [{"nombre":"nombre","estado":"excelente|bueno|riesgo|critico","patron":"patrón detectado","causa_probable":"hipótesis concreta","sugerencia":"consejo para esta semana","microajuste":"cambio pequeño para hoy mismo"}],
  "mensajeFinal": "mensaje motivador y honesto basado en los datos reales"
}`
      const { text } = await askGemini({ messages: [{ role: 'user', content: prompt }], systemPrompt, useSearch: false })
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      parsed._habitData = habitData
      setHabitAnalysis(parsed)
    } catch (err) { setHabitAnalysis({ error: `No se pudo analizar: ${err.message}` }) }
    finally { setHabitLoading(false) }
  }, [contextData])

  const resetHabitAnalysis = useCallback(() => setHabitAnalysis(null), [])


  /* ════════════════════════════════════════════════════════
     FINANZAS — INGRESOS (Supabase)
     ════════════════════════════════════════════════════════ */

  const loadIncomeRecords = useCallback(async () => {
    setFinanceLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('income_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100)
      setIncomeRecords(data || [])
    } catch (err) { console.error(err) }
    finally { setFinanceLoading(false) }
  }, [])

  const addIncomeRecord = useCallback(async ({ source, amount, date, note }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error: insertError } = await supabase
        .from('income_records')
        .insert({ user_id: user.id, source, amount: Number(amount), date, note: note || null })
        .select()
        .single()
      if (insertError) throw insertError
      setIncomeRecords(prev => [data, ...prev])
      return { data }
    } catch (err) { return { error: err.message } }
  }, [])

  const deleteIncomeRecord = useCallback(async (id) => {
    try {
      await supabase.from('income_records').delete().eq('id', id)
      setIncomeRecords(prev => prev.filter(r => r.id !== id))
    } catch (err) { console.error(err) }
  }, [])


  /* ════════════════════════════════════════════════════════
     FINANZAS — IDEAS DE NEGOCIO (Supabase)
     ════════════════════════════════════════════════════════ */

  const loadBusinessIdeas = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('business_ideas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setBusinessIdeas(data || [])
    } catch (err) { console.error(err) }
  }, [])

  const addBusinessIdea = useCallback(async (idea) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error: insertError } = await supabase
        .from('business_ideas')
        .insert({ user_id: user.id, ...idea })
        .select()
        .single()
      if (insertError) throw insertError
      setBusinessIdeas(prev => [data, ...prev])
      return { data }
    } catch (err) { return { error: err.message } }
  }, [])

  const updateBusinessIdea = useCallback(async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('business_ideas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (updateError) throw updateError
      setBusinessIdeas(prev => prev.map(i => i.id === id ? data : i))
    } catch (err) { console.error(err) }
  }, [])

  const deleteBusinessIdea = useCallback(async (id) => {
    try {
      await supabase.from('business_ideas').delete().eq('id', id)
      setBusinessIdeas(prev => prev.filter(i => i.id !== id))
    } catch (err) { console.error(err) }
  }, [])


  /* ════════════════════════════════════════════════════════
     FINANZAS — ANALIZAR PRESUPUESTO CON IA
     ════════════════════════════════════════════════════════ */

  const analyzeBudget = useCallback(async ({ ingresos, gastos, meta, plazo }) => {
    setBudgetLoading(true); setBudgetAnalysis(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)

      // Calcular totales
      const totalIngresos = ingresos.reduce((s, i) => s + Number(i.amount), 0)
      const totalGastos   = gastos.reduce((s, g) => s + Number(g.amount), 0)
      const saldo         = totalIngresos - totalGastos

      const prompt = `Sos un asesor financiero experto para jóvenes emprendedores argentinos. Analizá este presupuesto y dá recomendaciones concretas.

PERFIL: Joven de ~20 años, estudiante de ingeniería en computación, barbero particular, desarrollador web freelance, quiere llegar a $1.000.000/mes de ingresos para tener libertad financiera.

INGRESOS MENSUALES:
${ingresos.map(i => `- ${i.label}: $${Number(i.amount).toLocaleString('es-AR')}`).join('\n')}
TOTAL INGRESOS: $${totalIngresos.toLocaleString('es-AR')}

GASTOS MENSUALES:
${gastos.map(g => `- ${g.label}: $${Number(g.amount).toLocaleString('es-AR')}`).join('\n')}
TOTAL GASTOS: $${totalGastos.toLocaleString('es-AR')}

SALDO DISPONIBLE: $${saldo.toLocaleString('es-AR')}
META MENSUAL: $${Number(meta).toLocaleString('es-AR')}
PLAZO: ${plazo} meses

Respondé ÚNICAMENTE con este JSON (sin markdown):
{
  "diagnostico": "2 oraciones sobre la situación actual, honesto y directo",
  "saludFinanciera": "excelente|buena|ajustada|critica",
  "distribucionIdeal": [
    {"categoria": "nombre", "porcentaje": número, "montoSugerido": número, "observacion": "nota corta"}
  ],
  "saldoParaAhorrar": número,
  "mesesParaMeta": número,
  "pasosSemanaQueViene": [
    "acción concreta 1",
    "acción concreta 2",
    "acción concreta 3"
  ],
  "alertas": ["alerta si algún gasto es desproporcionado"],
  "oportunidad": "la mayor oportunidad de crecimiento de ingresos dado su perfil",
  "mensajeFinal": "mensaje motivador corto y honesto"
}`

      const { text } = await askGemini({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })
      setBudgetAnalysis(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch (err) {
      setBudgetAnalysis({ error: err.message })
    } finally {
      setBudgetLoading(false)
    }
  }, [contextData])

  const resetBudgetAnalysis = useCallback(() => setBudgetAnalysis(null), [])


  /* ════════════════════════════════════════════════════════
     FINANZAS — DEBATIR IDEA CON IA
     ════════════════════════════════════════════════════════ */

  const debateIdea = useCallback(async ({ idea, context }) => {
    try {
      const systemPrompt = buildSystemPrompt(contextData)
      const prompt = `Sos un mentor de negocios experto para jóvenes emprendedores argentinos. Evaluá esta idea de negocio con honestidad y profundidad.

IDEA: ${idea}
${context ? `CONTEXTO ADICIONAL: ${context}` : ''}

PERFIL DEL EMPRENDEDOR:
- Estudiante de ingeniería en computación (conocimientos técnicos base)
- Sabe hacer páginas web y apps (ya vendió su primera página)
- Barbero particular (ingreso complementario)
- Interesado en automatizaciones con IA
- Meta: $1.000.000/mes, libertad financiera, ayudar a sus padres

Respondé ÚNICAMENTE con este JSON (sin markdown):
{
  "titulo": "nombre atractivo para la idea",
  "potencialIngresos": "estimación realista mensual en pesos argentinos",
  "dificultad": "baja|media|alta",
  "tiempoParaPrimerIngreso": "estimación realista (ej: 2-4 semanas)",
  "alineacion": número_del_1_al_10,
  "prosContra": {
    "pros": ["pro 1", "pro 2", "pro 3"],
    "contras": ["contra 1", "contra 2", "contra 3"]
  },
  "pasosConcretosParaEmpezar": [
    "paso 1 — qué hacer esta semana",
    "paso 2 — qué hacer el próximo mes",
    "paso 3 — qué tener en 3 meses"
  ],
  "riesgos": ["riesgo principal 1", "riesgo principal 2"],
  "veredicto": "Recomendada|Prometedora|Con reservas|No recomendada",
  "razonVeredicto": "2-3 oraciones explicando el veredicto con contexto de su situación real",
  "alternativa": "si hay una variación mejor de la misma idea, describila aquí"
}`

      const { text } = await askGemini({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })
      return { data: JSON.parse(text.replace(/```json|```/g, '').trim()) }
    } catch (err) {
      return { error: err.message }
    }
  }, [contextData])


  /* ════════════════════════════════════════════════════════
     FINANZAS — DEBATIR DECISIÓN CON IA
     ════════════════════════════════════════════════════════ */

  const debateDecision = useCallback(async ({ decision, context }) => {
    setDecisionLoading(true); setDecisionResult(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)
      const prompt = `Sos un mentor sabio y honesto. Ayudá a este joven a tomar una decisión importante analizándola desde múltiples ángulos.

DECISIÓN: ${decision}
${context ? `CONTEXTO: ${context}` : ''}

Respondé ÚNICAMENTE con este JSON (sin markdown):
{
  "decision": "la decisión resumida en una oración",
  "marcos": [
    {
      "nombre": "Corto plazo",
      "perspectiva": "cómo impacta en los próximos 3-6 meses"
    },
    {
      "nombre": "Largo plazo",
      "perspectiva": "cómo impacta en 1-3 años"
    },
    {
      "nombre": "Financiero",
      "perspectiva": "impacto económico concreto"
    },
    {
      "nombre": "Personal",
      "perspectiva": "impacto en bienestar, estudio, relaciones"
    }
  ],
  "pros": ["pro 1", "pro 2", "pro 3"],
  "contras": ["contra 1", "contra 2", "contra 3"],
  "preguntasQueDebesHacerte": ["pregunta reflexiva 1", "pregunta reflexiva 2"],
  "recomendacion": "la recomendación del mentor, honesta y directa",
  "alternativa": "si hay una tercera opción que no estás considerando, describila"
}`

      const { text } = await askGemini({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })
      setDecisionResult(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch (err) {
      setDecisionResult({ error: err.message })
    } finally {
      setDecisionLoading(false)
    }
  }, [contextData])

  const resetDecision = useCallback(() => setDecisionResult(null), [])


  return {
    // Chat
    messages, loading, error,
    sendMessage, clearChat, saveLastResponseAsNote,

    // Devocional
    devotional, devLoading,
    userAnswer, setUserAnswer, answerSaved,
    loadDevotional, saveDevotionalAnswer,

    // Briefing
    briefing, briefLoading, loadBriefing,

    // Plan de estudio
    studyPlan, studyLoading,
    generateStudyPlan, resetStudyPlan,

    // Coach de hábitos
    habitAnalysis, habitLoading,
    analyzeHabits, resetHabitAnalysis,

    // Finanzas
    incomeRecords, businessIdeas, financeLoading,
    loadIncomeRecords, addIncomeRecord, deleteIncomeRecord,
    loadBusinessIdeas, addBusinessIdea, updateBusinessIdea, deleteBusinessIdea,
    budgetAnalysis, budgetLoading, analyzeBudget, resetBudgetAnalysis,
    decisionResult, decisionLoading, debateDecision, resetDecision,
    debateIdea,
  }
}