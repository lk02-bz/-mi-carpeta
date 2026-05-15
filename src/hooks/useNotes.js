/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useNotes.js                                   ║
║                                                          ║
║  Puente entre React y la tabla "notes" de Supabase.      ║
║  Maneja todo el CRUD de apuntes:                         ║
║    • Cargar todos los apuntes del usuario                ║
║    • Crear un nuevo apunte                               ║
║    • Actualizar un apunte existente (título, contenido,  ║
║      o cambio de categoría)                              ║
║    • Eliminar un apunte                                  ║
║                                                          ║
║  Cambios Bloque C:                                       ║
║  ✦ toggleFavorite — alterna is_favorite sin tocar        ║
║    el resto de los campos                                ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotes(user) {

  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(false)


  /* ── Efecto: cargar apuntes cuando cambia el usuario ──────── */
  useEffect(() => {
    if (!user) {
      setNotes([])
      return
    }
    fetchNotes()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── fetchNotes — Trae todos los apuntes del usuario ──────── */
  async function fetchNotes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data)

    } catch (err) {
      console.error('Error al cargar apuntes:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ── createNote — Crea un nuevo apunte ────────────────────── */
  const createNote = useCallback(async ({ title, content = '', categoryId }) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          category_id: categoryId,
          user_id:     user.id,
        })
        .select()
        .single()

      if (error) throw error

      setNotes(prev => [data, ...prev])
      return { data, error: null }

    } catch (err) {
      console.error('Error al crear apunte:', err.message)
      return { data: null, error: err }
    }
  }, [user])


  /* ── updateNote — Actualiza un apunte existente ─────────────
     
     Solo actualiza los campos que se pasan. Si no se pasa
     "content", no lo modifica (no lo pisa con undefined).
  */
  const updateNote = useCallback(async (noteId, { title, content, categoryId }) => {
    try {
      const cambios = {}
      if (title      !== undefined) cambios.title       = title
      if (content    !== undefined) cambios.content     = content
      if (categoryId !== undefined) cambios.category_id = categoryId

      const { data, error } = await supabase
        .from('notes')
        .update(cambios)
        .eq('id', noteId)
        .select()
        .single()

      if (error) throw error

      setNotes(prev => prev.map(n => n.id === noteId ? data : n))
      return { data, error: null }

    } catch (err) {
      console.error('Error al actualizar apunte:', err.message)
      return { data: null, error: err }
    }
  }, [])


  /* ── toggleFavorite — Alterna el estado de favorito ─────────
     
     Recibe el noteId y el valor ACTUAL de is_favorite.
     Invierte el valor: true → false, false → true.
     
     No usa updateNote() porque ese actualiza updated_at
     a través del trigger SQL. El toggle de favorito no
     debería mover la nota al tope de "Recientes".
     Por eso actualizamos directamente sin pasar por el helper.
  */
  const toggleFavorite = useCallback(async (noteId, currentValue) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ is_favorite: !currentValue })
        .eq('id', noteId)
        .select()
        .single()

      if (error) throw error

      /* Actualiza solo el apunte afectado en el array local */
      setNotes(prev => prev.map(n => n.id === noteId ? data : n))
      return { data, error: null }

    } catch (err) {
      console.error('Error al cambiar favorito:', err.message)
      return { data: null, error: err }
    }
  }, [])


  /* ── deleteNote — Elimina un apunte ─────────────────────── */
  const deleteNote = useCallback(async (noteId) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setNotes(prev => prev.filter(n => n.id !== noteId))
      return { error: null }

    } catch (err) {
      console.error('Error al eliminar apunte:', err.message)
      return { error: err }
    }
  }, [])


  /* ── moveCategoryNotes — Mueve apuntes entre categorías ──────
     Llamado desde CategoryDetail antes de eliminar una categoría,
     cuando el usuario elige mover sus apuntes en lugar de borrarlos.
  */
  const moveCategoryNotes = useCallback(async (fromCatId, toCatId) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ category_id: toCatId })
        .eq('category_id', fromCatId)

      if (error) throw error

      // Actualizar estado local sin refetch
      setNotes(prev => prev.map(n =>
        n.category_id === fromCatId ? { ...n, category_id: toCatId } : n
      ))
      return { error: null }
    } catch (err) {
      console.error('moveCategoryNotes:', err.message)
      return { error: err }
    }
  }, [])


  /* ── Valor retornado por el hook ──────────────────────────── */
  return {
    notes,
    setNotes,
    loading,
    fetchNotes,
    createNote,
    updateNote,
    toggleFavorite,
    deleteNote,
    moveCategoryNotes,  // ← nuevo Fase 5
  }
}
