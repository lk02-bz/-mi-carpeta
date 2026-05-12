/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useTags.js                                    ║
║                                                          ║
║  Maneja toda la lógica de etiquetas:                     ║
║    • Cargar todos los tags del usuario                   ║
║    • Cargar todas las relaciones note_tags               ║
║    • Crear / eliminar tags                               ║
║    • Agregar / quitar tags de una nota                   ║
║    • Helper getTagsForNote(noteId) → Tag[]               ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTags(user) {

  const [tags,     setTags]     = useState([])  // todos los tags del usuario
  const [noteTags, setNoteTags] = useState([])  // array de { note_id, tag_id }
  const [loading,  setLoading]  = useState(false)


  /* ── Efecto: cargar cuando cambia el usuario ───────────── */
  useEffect(() => {
    if (!user) {
      setTags([])
      setNoteTags([])
      return
    }
    fetchTags()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── fetchTags — Carga tags y relaciones en paralelo ───── */
  async function fetchTags() {
    setLoading(true)
    try {
      /*
        Promise.all ejecuta las dos queries al mismo tiempo
        en vez de una después de la otra. Más rápido.
      */
      const [tagsRes, noteTagsRes] = await Promise.all([
        supabase.from('tags').select('*').order('name'),
        supabase.from('note_tags').select('note_id, tag_id'),
      ])

      if (tagsRes.error)     throw tagsRes.error
      if (noteTagsRes.error) throw noteTagsRes.error

      setTags(tagsRes.data)
      setNoteTags(noteTagsRes.data)

    } catch (err) {
      console.error('Error al cargar tags:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ── createTag — Crea un tag nuevo ─────────────────────────
     
     Si el tag ya existe (código de error 23505 = unique_violation),
     en vez de fallar lo buscamos en el array local y lo devolvemos.
     Esto es útil cuando el usuario tipea un nombre que ya tiene.
  */
  const createTag = useCallback(async (name) => {
    const nombreLimpio = name.trim().toLowerCase()
    if (!nombreLimpio) return { data: null, error: new Error('Nombre vacío') }

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: nombreLimpio, user_id: user.id })
        .select()
        .single()

      if (error) throw error

      /* Insertamos en el array local ordenado alfabéticamente */
      setTags(prev =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      )
      return { data, error: null }

    } catch (err) {
      /* Tag duplicado → devolver el existente sin error */
      if (err.code === '23505') {
        // tags en el closure puede estar desactualizado, por eso usamos
        // el setter con función para acceder al valor más reciente
        let existing = null
        setTags(prev => {
          existing = prev.find(t => t.name === nombreLimpio) ?? null
          return prev // no modificamos el array
        })
        return { data: existing, error: null }
      }

      console.error('Error al crear tag:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  /* ── deleteTag — Elimina un tag (y sus relaciones por CASCADE) */
  const deleteTag = useCallback(async (tagId) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error

      /*
        Borramos el tag y todas sus relaciones en el estado local.
        En la DB el CASCADE lo hace automáticamente en note_tags.
      */
      setTags(prev => prev.filter(t => t.id !== tagId))
      setNoteTags(prev => prev.filter(nt => nt.tag_id !== tagId))
      return { error: null }

    } catch (err) {
      console.error('Error al eliminar tag:', err.message)
      return { error: err }
    }
  }, [])


  /* ── addTagToNote — Asocia un tag a una nota ────────────── */
  const addTagToNote = useCallback(async (noteId, tagId) => {
    /* Evitamos duplicados en el estado local antes de ir a la DB */
    const yaExiste = noteTags.some(
      nt => nt.note_id === noteId && nt.tag_id === tagId
    )
    if (yaExiste) return { error: null }

    try {
      const { error } = await supabase
        .from('note_tags')
        .insert({ note_id: noteId, tag_id: tagId })

      if (error) throw error

      setNoteTags(prev => [...prev, { note_id: noteId, tag_id: tagId }])
      return { error: null }

    } catch (err) {
      console.error('Error al agregar tag a nota:', err.message)
      return { error: err }
    }
  }, [noteTags])


  /* ── removeTagFromNote — Desasocia un tag de una nota ───── */
  const removeTagFromNote = useCallback(async (noteId, tagId) => {
    try {
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', noteId)
        .eq('tag_id', tagId)

      if (error) throw error

      setNoteTags(prev =>
        prev.filter(nt => !(nt.note_id === noteId && nt.tag_id === tagId))
      )
      return { error: null }

    } catch (err) {
      console.error('Error al quitar tag de nota:', err.message)
      return { error: err }
    }
  }, [])


  /* ── getTagsForNote — Helper: tags de una nota específica ──
     
     Recibe un noteId y devuelve el array de Tag objects
     que tiene asociados esa nota.
     
     Ejemplo:
       getTagsForNote('abc-123')
       → [{ id: '...', name: 'react' }, { id: '...', name: 'hooks' }]
     
     Se usa en los componentes para mostrar los chips de tags
     en las tarjetas sin necesidad de más queries a Supabase.
  */
  const getTagsForNote = useCallback((noteId) => {
    const tagIds = noteTags
      .filter(nt => nt.note_id === noteId)
      .map(nt => nt.tag_id)

    return tags.filter(t => tagIds.includes(t.id))
  }, [noteTags, tags])


  /* ── Valor retornado por el hook ────────────────────────── */
  return {
    tags,              // Tag[] — todos los tags del usuario
    noteTags,          // { note_id, tag_id }[] — todas las relaciones
    loading,
    fetchTags,
    createTag,         // (name) → { data, error }
    deleteTag,         // (tagId) → { error }
    addTagToNote,      // (noteId, tagId) → { error }
    removeTagFromNote, // (noteId, tagId) → { error }
    getTagsForNote,    // (noteId) → Tag[]
  }
}
