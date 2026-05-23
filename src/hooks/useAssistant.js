/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useAssistant.js                               ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ sendMessage usa buildFreeSystemPrompt (chat libre)    ║
║  ✦ saveLastResponseAsNote devuelve nota con .id          ║
║    para poder navegar a ella después de guardar          ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useCallback } from 'react'
import { supabase }              from '../lib/supabase'
import { askGemini, buildSystemPrompt, buildFreeSystemPrompt } from '../services/geminiService'

export function useAssistant({ contextData }) {

  /* ── Estado del chat ─────────────────────────────────── */
  const [messages,  setMessages]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  /* ── Estado del devocional ───────────────────────────── */
  const [devotional,  setDevotional]  = useState(null)
  const [devLoading,  setDevLoading]  = useState(false)
  const [userAnswer,  setUserAnswer]  = useState('')
  const [answerSaved, setAnswerSaved] = useState(false)

  /* ── Estado del briefing ─────────────────────────────── */
  const [briefing,     setBriefing]     = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)


  /* ════════════════════════════════════════════════════════
     CHAT LIBRE — usa prompt libre, sin forzar contexto
     ════════════════════════════════════════════════════════ */

  const sendMessage = useCallback(async (userText, useSearch = false) => {
    if (!userText.trim() || loading) return

    setError(null)

    const newUserMsg      = { role: 'user', content: userText }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const systemPrompt = buildFreeSystemPrompt({
        assistantName: contextData.assistantName || 'Asistente',
      })

      const { text, sources } = await askGemini({
        messages:  updatedMessages,
        systemPrompt,
        useSearch,
      })

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: text, sources }
      ])

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [messages, loading, contextData])


  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])


  /* ════════════════════════════════════════════════════════
     GUARDAR RESPUESTA COMO APUNTE
     Fix: devuelve data directamente con su .id
     para que AssistantScreen pueda navegar a la nota
     ════════════════════════════════════════════════════════ */
  const saveLastResponseAsNote = useCallback(async (createNote, categoryId = null) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant || !createNote) return null

    try {
      const { data, error: createError } = await createNote({
        title:      'Respuesta del asistente',
        content:    lastAssistant.content,
        categoryId, // ← ahora sí manda la categoría
      })

      if (createError) throw createError
      return data ?? null

    } catch (err) {
      setError(err.message)
      return null
    }
  }, [messages])


  /* ════════════════════════════════════════════════════════
     DEVOCIONAL DIARIO — usa prompt personal
     ════════════════════════════════════════════════════════ */

  const loadDevotional = useCallback(async () => {
    if (devLoading || devotional) return
    setDevLoading(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)

    try {
      const { data: existing } = await supabase
        .from('devotional_diary')
        .select('*')
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        try {
          const parsed = JSON.parse(existing.reflection)
          setDevotional(parsed)
        } catch {
          setDevotional({
            verse:      existing.verse,
            reflection: existing.reflection,
            question:   existing.question,
          })
        }
        setUserAnswer(existing.user_answer ?? '')
        setAnswerSaved(!!existing.user_answer)
        return
      }

      const systemPrompt = buildSystemPrompt(contextData)

      const prompt = `Generá un devocional cristiano profundo para hoy. Es un espacio de encuentro con Dios — no un coaching personal.

Respondé ÚNICAMENTE con este formato JSON exacto (sin texto adicional, sin markdown):
{
  "verse": "Texto completo del versículo (Libro capítulo:versículo)",
  "verseRef": "Libro capítulo:versículo",
  "historicalContext": "2-3 oraciones sobre el contexto histórico y cultural del pasaje. Quién lo escribió, a quién, en qué momento de la historia bíblica, qué estaba pasando.",
  "centralTeaching": "3-4 oraciones sobre qué verdad revela este pasaje acerca de DIOS — Su carácter, Su amor, Su poder, Su voluntad. No sobre el lector, sobre Dios.",
  "deepDive": "4-5 oraciones con UNO de estos recursos según lo que mejor aplique al versículo: (a) una historia bíblica relacionada que ilustre la misma verdad, (b) un testimonio o experiencia de un cristiano histórico como Spurgeon, Tozer, C.S. Lewis, Hudson Taylor, Corrie ten Boom, etc., o (c) una enseñanza de un libro cristiano clásico. Citá la fuente si usás (b) o (c).",
  "christianValue": "2-3 oraciones sobre qué virtud o carácter de Cristo se ve en este pasaje — fe, humildad, gracia, obediencia, amor, etc. — y cómo esa virtud se forma en el creyente.",
  "meditationQuestion": "Una pregunta contemplativa que invite a conocer más a Dios a través de este pasaje. Que no sea sobre problemas personales sino sobre quién es Dios y cómo responder a Su presencia.",
  "lifeConnection": "2 oraciones máximo conectando esta verdad con la vida diaria de un joven cristiano que estudia, trabaja y busca a Dios en lo cotidiano.",
  "prayer": "Una oración de 5-7 oraciones en primera persona. Que sea principalmente de adoración, reconocimiento de quién es Dios y rendición — no una lista de pedidos. Honesta, cálida, basada en la verdad del versículo."
}

Elegí un versículo rico en contenido teológico. Variá los libros bíblicos. El tono debe ser contemplativo y reverente.`

      const { text } = await askGemini({
        messages:  [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })

      const clean  = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('devotional_diary').insert({
        user_id:    user.id,
        date:       today,
        verse:      parsed.verse,
        reflection: JSON.stringify(parsed),
        question:   parsed.meditationQuestion,
      })

      setDevotional(parsed)

    } catch (err) {
      setError('No se pudo generar el devocional: ' + err.message)
    } finally {
      setDevLoading(false)
    }
  }, [devLoading, devotional, contextData])


  const saveDevotionalAnswer = useCallback(async () => {
    if (!userAnswer.trim() || answerSaved) return
    const today = new Date().toISOString().slice(0, 10)

    try {
      await supabase
        .from('devotional_diary')
        .update({ user_answer: userAnswer })
        .eq('date', today)
      setAnswerSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }, [userAnswer, answerSaved])


  /* ════════════════════════════════════════════════════════
     BRIEFING DIARIO — usa prompt personal
     ════════════════════════════════════════════════════════ */

  const loadBriefing = useCallback(async () => {
    if (briefLoading || briefing) return
    setBriefLoading(true)
    setError(null)

    try {
      const systemPrompt = buildSystemPrompt(contextData)

      const { habitStats = [], tasksToday = [], goals = [], bestStreak = 0 } = contextData

      const habitsDone  = habitStats.filter(h => h.doneToday).length
      const habitsTotal = habitStats.length
      const pending     = tasksToday.filter(t => !t.completed)
      const done        = tasksToday.filter(t =>  t.completed)

      const prompt = `Hacé el briefing diario. Tenés esta información:

HÁBITOS HOY: ${habitsDone}/${habitsTotal} completados
${habitStats.map(h => `- ${h.name}: ${h.doneToday ? '✓ hecho' : '✗ pendiente'} (racha: ${h.streak} días)`).join('\n')}

TAREAS HOY:
- Completadas (${done.length}): ${done.map(t => t.title).join(', ') || 'ninguna'}
- Pendientes (${pending.length}): ${pending.map(t => t.title).join(', ') || 'ninguna'}

METAS ACTIVAS: ${goals.length}
${goals.map(g => `- ${g.title}`).join('\n')}

MEJOR RACHA: ${bestStreak} días seguidos

Respondé con un briefing breve y personal: estado real del día, qué priorizar ahora, y una palabra de aliento o versículo relevante según cómo viene. Sé directo, no genérico.`

      const { text } = await askGemini({
        messages:  [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch: false,
      })

      setBriefing(text)

    } catch (err) {
      setError(err.message)
    } finally {
      setBriefLoading(false)
    }
  }, [briefLoading, briefing, contextData])


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
  }
}