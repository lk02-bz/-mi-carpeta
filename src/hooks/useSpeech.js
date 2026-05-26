/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useSpeech.js                                  ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Detecta si corre en APK nativo (Capacitor)            ║
║  ✦ Nativo: usa @capacitor-community/text-to-speech       ║
║  ✦ Web: usa Web Speech API como antes                    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useRef, useCallback } from 'react'

/* ── Detectar si estamos en APK nativo ── */
function isNative() {
  try {
    return window?.Capacitor?.isNativePlatform?.() === true
  } catch {
    return false
  }
}

/* ── Limpia HTML para que TTS no lea etiquetas ── */
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

/* ── Mejor voz española (web only) ── */
function getBestSpanishVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const priorities = [
    v => v.lang === 'es-AR' && v.name.toLowerCase().includes('google'),
    v => v.lang === 'es-MX' && v.name.toLowerCase().includes('google'),
    v => v.lang === 'es-ES' && v.name.toLowerCase().includes('google'),
    v => v.lang.startsWith('es') && v.name.toLowerCase().includes('google'),
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
  const native = isNative()


  /* ════════════════════════════════════════════════════════
     STOP
     ════════════════════════════════════════════════════════ */
  const stop = useCallback(async () => {
    if (native) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
        await TextToSpeech.stop()
      } catch (e) { console.warn('TTS stop error:', e) }
    } else {
      window.speechSynthesis?.cancel()
    }
    setIsSpeaking(false)
  }, [native])


  /* ════════════════════════════════════════════════════════
     SPEAK
     ════════════════════════════════════════════════════════ */
  const speak = useCallback(async (text) => {
    const clean = text.includes('<') ? stripHtml(text) : text
    if (!clean.trim()) return

    /* ── APK nativo ── */
    if (native) {
      try {
        const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
        await TextToSpeech.stop()
        setIsSpeaking(true)
        await TextToSpeech.speak({
          text:     clean,
          lang:     'es-AR',
          rate:     0.88,
          pitch:    1.0,
          volume:   1.0,
          category: 'ambient',
        })
        setIsSpeaking(false)
      } catch (e) {
        console.warn('TTS error:', e)
        setIsSpeaking(false)
      }
      return
    }

    /* ── Web ── */
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang  = 'es-AR'
      utterance.rate  = 0.88
      utterance.pitch = 1.0

      const voice = getBestSpanishVoice()
      if (voice) utterance.voice = voice

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend   = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      setIsSpeaking(true)
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
      window.speechSynthesis.onvoiceschanged = handler
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
  }, [native])


  /* ════════════════════════════════════════════════════════
     TOGGLE
     ════════════════════════════════════════════════════════ */
  const toggle = useCallback((text) => {
    if (isSpeaking) { stop() } else { speak(text) }
  }, [isSpeaking, speak, stop])


  return { isSpeaking, speak, stop, toggle }
}


/* ════════════════════════════════════════════════════════
   Hook para micrófono (Speech Recognition)
   Exportado separado para usar en AssistantScreen
   ════════════════════════════════════════════════════════ */
export function useMic({ onResult, onError }) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const native = isNative()

  const startListening = useCallback(async () => {
    if (listening) return

    /* ── APK nativo ── */
    if (native) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')

        // Pedir permisos la primera vez
        const { speechRecognition } = await SpeechRecognition.available()
        if (!speechRecognition) { onError?.('No disponible en este dispositivo'); return }

        await SpeechRecognition.requestPermission()

        setListening(true)
        SpeechRecognition.addListener('partialResults', data => {
          const text = data.matches?.[0]
          if (text) { onResult?.(text); stopListening() }
        })

        await SpeechRecognition.start({
          language:      'es-AR',
          maxResults:    1,
          prompt:        'Hablá ahora...',
          partialResults: true,
          popup:         false,
        })
      } catch (e) {
        console.warn('SpeechRecognition error:', e)
        setListening(false)
        onError?.('Error al escuchar')
      }
      return
    }

    /* ── Web ── */
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onError?.('Tu navegador no soporta reconocimiento de voz'); return }

    const r = new SR()
    r.lang = 'es-AR'
    r.continuous = false
    r.interimResults = false
    r.onresult = e => { onResult?.(e.results[0][0].transcript); setListening(false) }
    r.onerror  = e => { if (e.error !== 'aborted') onError?.('No se pudo escuchar'); setListening(false) }
    r.onend    = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }, [listening, native, onResult, onError])

  const stopListening = useCallback(async () => {
    if (native) {
      try {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        await SpeechRecognition.stop()
        SpeechRecognition.removeAllListeners()
      } catch (e) { console.warn(e) }
    } else {
      recognitionRef.current?.abort()
    }
    setListening(false)
  }, [native])

  const toggleListening = useCallback(() => {
    if (listening) { stopListening() } else { startListening() }
  }, [listening, startListening, stopListening])

  return { listening, startListening, stopListening, toggleListening }
}