/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useProfile.js                                 ║
║                                                          ║
║  Maneja tres cosas del perfil del usuario:               ║
║    1. Nombre para mostrar  → Supabase user_metadata      ║
║    2. Foto de perfil       → Supabase Storage            ║
║    3. Color de acento      → localStorage + CSS variable ║
║                                                          ║
║  Fase 3.1.B — Perfil / Settings                          ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ════════════════════════════════════════════════════════
   COLORES DE ACENTO — Presets disponibles

   Cada preset tiene:
     id     → clave guardada en localStorage
     label  → nombre legible para el usuario
     accent → valor de --accent (el color principal)
     fg     → valor de --accent-fg (texto SOBRE el acento, siempre legible)
   ════════════════════════════════════════════════════════ */
export const ACCENT_PRESETS = [
  { id: 'negro',   label: 'Negro',   accent: '#1a1a1a', fg: '#ffffff' },
  { id: 'azul',    label: 'Azul',    accent: '#2563eb', fg: '#ffffff' },
  { id: 'verde',   label: 'Verde',   accent: '#16a34a', fg: '#ffffff' },
  { id: 'violeta', label: 'Violeta', accent: '#7c3aed', fg: '#ffffff' },
  { id: 'rojo',    label: 'Rojo',    accent: '#e11d48', fg: '#ffffff' },
  { id: 'ambar',   label: 'Ámbar',   accent: '#d97706', fg: '#ffffff' },
]

/* Clave de localStorage donde guardamos el id del tema elegido */
const STORAGE_KEY = 'mi-carpeta-accent'

/* Bucket de Supabase Storage (el mismo que usan los adjuntos) */
const BUCKET = 'note-files'


/* ── applyAccent ───────────────────────────────────────────
   Función pura (fuera del hook) que:
     1. Encuentra el preset por id
     2. Aplica las variables CSS en tiempo real
     3. Lo guarda en localStorage

   Al setear style en document.documentElement (= <html>),
   tiene más especificidad que el @media prefers-color-scheme
   del index.css → el color elegido sobreescribe el modo oscuro.
*/
export function applyAccent(id) {
  const preset = ACCENT_PRESETS.find(p => p.id === id) ?? ACCENT_PRESETS[0]
  document.documentElement.style.setProperty('--accent',    preset.accent)
  document.documentElement.style.setProperty('--accent-fg', preset.fg)
  localStorage.setItem(STORAGE_KEY, id)
}


/* ════════════════════════════════════════════════════════
   HOOK PRINCIPAL
   ════════════════════════════════════════════════════════ */

export function useProfile(user) {

  const [displayName,     setDisplayName]     = useState('')
  const [avatarUrl,       setAvatarUrl]       = useState(null)
  const [accentId,        setAccentId]        = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'negro'
  )
  const [saving,          setSaving]          = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [assistantName, setAssistantName] = useState('')


  /* ── Carga inicial desde Supabase user_metadata ────────
     user_metadata es un objeto JSON libre que Supabase guarda
     por cada usuario. No necesita tabla propia en la DB.
  */
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setDisplayName(meta.display_name || '')
    setAvatarUrl(meta.avatar_url   || null)
    setAssistantName(meta.assistant_name || '')
  }, [user])

  /* ── Aplica el color guardado al montar ──────────────── */
  useEffect(() => {
    applyAccent(accentId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  /* ════════════════════════════════════════════════════════
     ACTUALIZAR NOMBRE
     ════════════════════════════════════════════════════════ */

  const updateDisplayName = useCallback(async (name) => {
    setSaving(true)
    try {
      /*
        supabase.auth.updateUser() actualiza los datos del usuario.
        El campo 'data' se fusiona con el user_metadata existente —
        no sobreescribe todo, solo los campos que mandás.
      */
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: name.trim() }
      })
      if (error) throw error
      setDisplayName(data.user.user_metadata.display_name || '')
      return { error: null }

    } catch (err) {
      console.error('updateDisplayName:', err.message)
      return { error: err }
    } finally {
      setSaving(false)
    }
  }, [])


  /* ════════════════════════════════════════════════════════
     ACTUALIZAR AVATAR
     ════════════════════════════════════════════════════════ */

  const updateAvatar = useCallback(async (file) => {
    if (!user || !file) return { error: new Error('Sin archivo') }

    setUploadingAvatar(true)
    try {
      /*
        Path fijo: {userId}/avatar.{ext}
        Con upsert: true → siempre sobreescribe el mismo archivo.
        Así el usuario no acumula avatares viejos en el bucket.

        Problema de caché del CDN:
        Aunque el archivo cambie en el servidor, el navegador puede
        tener en caché la URL anterior. Solución: agregamos ?t=timestamp
        a la URL de display para forzar una nueva request.
        El archivo en el bucket no cambia de nombre.
      */
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`

      /* Guardamos la URL en user_metadata */
      const { error: metaError } = await supabase.auth.updateUser({
        data: { avatar_url: url }
      })
      if (metaError) throw metaError

      setAvatarUrl(url)
      return { error: null }

    } catch (err) {
      console.error('updateAvatar:', err.message)
      return { error: err }
    } finally {
      setUploadingAvatar(false)
    }
  }, [user])


  /* ════════════════════════════════════════════════════════
     CAMBIAR COLOR DE ACENTO
     ════════════════════════════════════════════════════════ */
  const updateAssistantName = useCallback(async (name) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { assistant_name: name.trim() }
      })
      if (error) throw error
      setAssistantName(data.user.user_metadata.assistant_name || '')
      return { error: null }
    } catch (err) {
      console.error('updateAssistantName:', err.message)
      return { error: err }
    }
  }, [])


  const changeAccent = useCallback((id) => {
    applyAccent(id)   // aplica CSS + guarda en localStorage
    setAccentId(id)   // re-renderiza los swatches con el nuevo seleccionado
  }, [])


  /* ── Valor retornado ────────────────────────────────── */
  return {
    displayName,
    avatarUrl,
    accentId,
    saving,
    uploadingAvatar,
    updateDisplayName,
    updateAvatar,
    changeAccent,
    assistantName,
    updateAssistantName,
  }
}
