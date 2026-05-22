/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useAssistant.js                               ║
║                                                          ║
║  Maneja el estado completo del asistente:                ║
║  - Historial de mensajes del chat                        ║
║  - Estado de carga y errores                             ║
║  - Devocional del día (carga y guarda en Supabase)       ║
║  - Briefing diario                                       ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useCallback } from 'react'
import { supabase }              from '../lib/supabase'
import { askGemini, buildSystemPrompt } from '../services/geminiService'

export function useAssistant({ contextData }) {
  // contextData viene desde AssistantScreen con los datos del AppContext

  /* ── Estado del chat ─────────────────────────────────── */
  const [messages,  setMessages]  = useState([])   // [{role, content, sources?}]
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  /* ── Estado del devocional ───────────────────────────── */
  const [devotional,    setDevotional]    = useState(null)  // {verse, reflection, question}
  const [devLoading,    setDevLoading]    = useState(false)
  const [userAnswer,    setUserAnswer]    = useState('')
  const [answerSaved,   setAnswerSaved]   = useState(false)

  /* ── Estado del briefing ─────────────────────────────── */
  const [briefing,      setBriefing]      = useState(null)
  const [briefLoading,  setBriefLoading]  = useState(false)


  /* ════════════════════════════════════════════════════════
     CHAT LIBRE
     ════════════════════════════════════════════════════════ */

  const sendMessage = useCallback(async (userText, useSearch = false) => {
    if (!userText.trim() || loading) return

    setError(null)

    // Agregar el mensaje del usuario al historial visualmente de inmediato
    const newUserMsg = { role: 'user', content: userText }
    const updatedMessages = [...messages, newUserMsg]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const systemPrompt = buildSystemPrompt(contextData)

      // Mandar todo el historial para que Gemini tenga contexto
      // de la conversación completa, no solo el último mensaje
      const { text, sources } = await askGemini({
        messages:     updatedMessages,
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
     Convierte la última respuesta del asistente en una nota
     en TipTap (la crea con createNote del AppContext)
     ════════════════════════════════════════════════════════ */

  const saveLastResponseAsNote = useCallback(async (createNote) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant || !createNote) return null

    try {
      // createNote viene del AppContext — es la misma función que usa el editor
      const note = await createNote({
        title:   'Respuesta del asistente',
        content: lastAssistant.content,
      })
      return note
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [messages])


  /* ════════════════════════════════════════════════════════
     DEVOCIONAL DIARIO
     ════════════════════════════════════════════════════════ */

  const loadDevotional = useCallback(async () => {
    if (devLoading || devotional) return  // ya lo cargó, no pedir de nuevo
    setDevLoading(true)
    setError(null)

    const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'

    try {
      // Primero buscar si ya existe un devocional guardado para hoy
      const { data: existing } = await supabase
        .from('devotional_diary')
        .select('*')
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        // Ya existe — cargar el guardado
        setDevotional({
          verse:      existing.verse,
          reflection: existing.reflection,
          question:   existing.question,
        })
        setUserAnswer(existing.user_answer ?? '')
        setAnswerSaved(!!existing.user_answer)
        return
      }

      // No existe — generar uno nuevo con Gemini
      const systemPrompt = buildSystemPrompt(contextData)

      const prompt = `Generá un devocional personalizado para hoy basado en el contexto de ${contextData.displayName ?? 'Lucas'}.

Respondé ÚNICAMENTE con este formato JSON (sin texto adicional, sin markdown):
{
  "verse": "Texto del versículo (Libro capítulo:versículo)",
  "reflection": "Reflexión de 3-4 oraciones conectada al versículo y al contexto real de Lucas",
  "question": "Una pregunta profunda para meditar durante el día"
}

El versículo debe ser real, relevante a su situación actual (fe, trabajo, estudio, finanzas, crecimiento personal).
La reflexión debe conectar el versículo con su vida concreta, no ser genérica.
La pregunta debe invitar a una respuesta personal honesta.`

      const { text } = await askGemini({
        messages:     [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch:    false,
      })

      // Gemini a veces envuelve el JSON en ```json ... ``` — lo limpiamos
      const clean   = text.replace(/```json|```/g, '').trim()
      const parsed  = JSON.parse(clean)

      // Guardar en Supabase para que mañana no se genere de nuevo
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('devotional_diary').insert({
        user_id:    user.id,
        date:       today,
        verse:      parsed.verse,
        reflection: parsed.reflection,
        question:   parsed.question,
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
     BRIEFING DIARIO
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

      const prompt = `Hacé el briefing diario de Lucas. Tenés esta información:

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
        messages:     [{ role: 'user', content: prompt }],
        systemPrompt,
        useSearch:    false,
      })

      setBriefing(text)

    } catch (err) {
      setError(err.message)
    } finally {
      setBriefLoading(false)
    }
  }, [briefLoading, briefing, contextData])


  /* ── API pública del hook ────────────────────────────── */
  return {
    // Chat
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
    saveLastResponseAsNote,

    // Devocional
    devotional,
    devLoading,
    userAnswer,
    setUserAnswer,
    answerSaved,
    loadDevotional,
    saveDevotionalAnswer,

    // Briefing
    briefing,
    briefLoading,
    loadBriefing,
  }
}