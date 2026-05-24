/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useAssistant.js                               ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ analyzeFinances — análisis financiero completo        ║
║  ✦ financialAnalysis, financeLoading, resetFinance       ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useCallback } from 'react'
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

  /* ── Análisis financiero ── */
  const [financialAnalysis, setFinancialAnalysis] = useState(null)
  const [financeLoading,    setFinanceLoading]    = useState(false)


  /* ════════════════════════════════════════════════════════
     CHAT LIBRE
     ════════════════════════════════════════════════════════ */

  const sendMessage = useCallback(async (userText, useSearch = false) => {
    if (!userText.trim() || loading) return
    setError(null)
    const newUserMsg      = { role: 'user', content: userText }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setLoading(true)
    try {
      const systemPrompt = buildFreeSystemPrompt({ assistantName: contextData.assistantName || 'Asistente' })
      const { text, sources } = await askGemini({ messages: updatedMessages, systemPrompt, useSearch })
      setMessages(prev => [...prev, { role: 'assistant', content: text, sources }])
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
     ANÁLISIS FINANCIERO
     ════════════════════════════════════════════════════════ */

  const analyzeFinances = useCallback(async ({
    ingresosBarberia,
    horasSemana,
    gastosBarberia,
    gastosPersonales,
    otrosIngresos,
    metaAhorro,
    plazoMeses,
    aportePadres,
  }) => {
    setFinanceLoading(true); setFinancialAnalysis(null)
    try {
      const systemPrompt = buildSystemPrompt(contextData)

      const ingresoTotal  = Number(ingresosBarberia) + Number(otrosIngresos || 0)
      const gastoTotal    = Number(gastosBarberia) + Number(gastosPersonales)
      const horasMes      = Number(horasSemana) * 4.3
      const gananciaNet   = Number(ingresosBarberia) - Number(gastosBarberia)
      const gananciaHora  = horasMes > 0 ? Math.round(gananciaNet / horasMes) : 0

      const prompt = `Analizá la situación financiera de este joven argentino y dá recomendaciones concretas y realistas.

DATOS FINANCIEROS (en pesos argentinos):
- Ingresos barbería/mes: $${ingresosBarberia}
- Gastos fijos barbería/mes: $${gastosBarberia}
- Ganancia neta barbería: $${gananciaNet}
- Horas trabajadas en barbería/semana: ${horasSemana}h (${horasMes.toFixed(0)}h/mes)
- Ganancia por hora de barbería: $${gananciaHora}
- Gastos personales/mes: $${gastosPersonales}
- Otros ingresos/mes: $${otrosIngresos || 0}
- Ingreso total/mes: $${ingresoTotal}
- Gasto total/mes: $${gastoTotal}
- Saldo disponible: $${ingresoTotal - gastoTotal}
- Meta de ahorro: $${metaAhorro} en ${plazoMeses} meses
- Aporte mensual para padres deseado: $${aportePadres || 0}

Contexto: Es estudiante de ingeniería, trabaja en su propia barbería, quiere crecer financieramente para ayudar a sus padres y construir negocios.

Respondé ÚNICAMENTE con este JSON exacto (sin markdown, sin texto extra):
{
  "resumen": "2-3 oraciones sobre la situación financiera actual, honesto y directo",
  "barberia": {
    "gananciaNetaMensual": número,
    "gananciaPorHora": número,
    "margenGanancia": número_porcentaje,
    "diagnostico": "diagnóstico conciso de la rentabilidad",
    "potencial": "qué podría ganar si optimiza (ej: subir precios, más clientes)",
    "puntosAMejorar": ["punto 1", "punto 2"]
  },
  "presupuesto": {
    "ingresoTotal": número,
    "gastoTotal": número,
    "saldoLibre": número,
    "categorias": [
      {"nombre": "Barbería (gastos)", "monto": número, "porcentaje": número, "color": "riesgo|ok|bien"},
      {"nombre": "Gastos personales", "monto": número, "porcentaje": número, "color": "riesgo|ok|bien"},
      {"nombre": "Ahorro propuesto", "monto": número, "porcentaje": número, "color": "bien"},
      {"nombre": "Aporte padres", "monto": número, "porcentaje": número, "color": "bien"},
      {"nombre": "Disponible", "monto": número, "porcentaje": número, "color": "ok"}
    ]
  },
  "ahorro": {
    "montoMensualRecomendado": número,
    "esAlcanzable": true_o_false,
    "mesesReales": número,
    "proyeccion": [
      {"mes": 3, "acumulado": número, "hito": "descripción opcional del hito"},
      {"mes": 6, "acumulado": número, "hito": ""},
      {"mes": 12, "acumulado": número, "hito": ""},
      {"mes": número_de_plazo, "acumulado": número, "hito": "Meta alcanzada"}
    ],
    "consejo": "consejo específico para ahorrar más dado su situación"
  },
  "padres": {
    "posible": true_o_false,
    "montoSugerido": número,
    "cuandoEmpezar": "descripción de cuándo y cómo empezar",
    "estrategia": "estrategia concreta para poder ayudarlos"
  },
  "accionesPrioritarias": [
    "Acción concreta y específica #1 para esta semana",
    "Acción concreta y específica #2 para este mes",
    "Acción concreta y específica #3 para este trimestre"
  ],
  "mensajeFinal": "Mensaje motivador, honesto, basado en los datos reales. Puede incluir perspectiva cristiana si aplica naturalmente."
}`

      const { text } = await askGemini({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })

      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setFinancialAnalysis(parsed)

    } catch (err) {
      setFinancialAnalysis({ error: `No se pudo analizar: ${err.message}` })
    } finally {
      setFinanceLoading(false)
    }
  }, [contextData])

  const resetFinancialAnalysis = useCallback(() => setFinancialAnalysis(null), [])


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

    // Análisis financiero
    financialAnalysis, financeLoading,
    analyzeFinances, resetFinancialAnalysis,
  }
}