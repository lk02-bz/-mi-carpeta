/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useSpeech.js                                  ║
║                                                          ║
║  Hook centralizado para Text-to-Speech.                  ║
║  Selecciona automáticamente la mejor voz española        ║
║  disponible en el dispositivo.                           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useRef, useCallback } from 'react'

/* Limpia HTML para que TTS no lea las etiquetas */
function stripHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/* Selecciona la mejor voz española disponible */
function getBestSpanishVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? []

  const priorities = [
    // Google voces — mucho mejor calidad
    v => v.lang === 'es-AR' && v.name.toLowerCase().includes('google'),
    v => v.lang === 'es-MX' && v.name.toLowerCase().includes('google'),
    v => v.lang === 'es-ES' && v.name.toLowerCase().includes('google'),
    v => v.lang.startsWith('es') && v.name.toLowerCase().includes('google'),
    // Cualquier voz española
    v => v.lang === 'es-AR',
    v => v.lang === 'es-MX',
    v => v.lang === 'es-ES',
    v => v.lang.startsWith('es'),
  ]

  for (const check of priorities) {
    const voice = voices.find(check)
    if (voice) return voice
  }

  return null
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  /* Para la voz */
  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  /* Inicia la lectura */
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    // Si el texto tiene HTML, limpiarlo
    const clean = text.includes('<') ? stripHtml(text) : text
    if (!clean.trim()) return

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang  = 'es-AR'
      utterance.rate  = 0.88   // un poco más lento que el default
      utterance.pitch = 1.0

      const voice = getBestSpanishVoice()
      if (voice) utterance.voice = voice

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend   = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    // Las voces pueden no estar cargadas todavía (especialmente en Android)
    if (window.speechSynthesis.getVoices().length === 0) {
      setIsSpeaking(true) // optimista para feedback inmediato
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
      window.speechSynthesis.onvoiceschanged = handler
      // Fallback por si el evento no dispara
      setTimeout(() => {
        if (window.speechSynthesis.onvoiceschanged === handler) {
          window.speechSynthesis.onvoiceschanged = null
          doSpeak()
        }
      }, 500)
    } else {
      setIsSpeaking(true)
      doSpeak()
    }
  }, [])

  /* Toggle — si está hablando para, si no arranca */
  const toggle = useCallback((text) => {
    if (isSpeaking) {
      stop()
    } else {
      speak(text)
    }
  }, [isSpeaking, speak, stop])

  return { isSpeaking, speak, stop, toggle }
}