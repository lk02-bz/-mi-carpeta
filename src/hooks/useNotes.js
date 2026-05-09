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
        /*
          Ordenamos por updated_at descendente (más reciente primero).
          Esto es importante para la pantalla "Recientes" del inicio
          y para que el apunte editado aparezca primero en la lista.
        */
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data)

    } catch (err) {
      console.error('Error al cargar apuntes:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ── createNote — Crea un nuevo apunte ──────────────────────
     
     Parámetros:
     - title:      string, obligatorio
     - content:    string, opcional (default '')
     - categoryId: uuid de la categoría a la que pertenece
  */
  const createNote = useCallback(async ({ title, content = '', categoryId }) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          category_id: categoryId,  // Supabase usa snake_case en la DB
          user_id:     user.id,
        })
        .select()
        .single()

      if (error) throw error

      /*
        Agregamos el nuevo apunte AL PRINCIPIO del array (unshift en vanilla).
        Como los apuntes están ordenados por updated_at DESC,
        el más nuevo debe aparecer primero.
      */
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
     
     Esto es importante cuando el usuario solo cambia la categoría
     de un apunte sin tocar el contenido, o viceversa.
  */
  const updateNote = useCallback(async (noteId, { title, content, categoryId }) => {
    try {
      /*
        Construimos el objeto de cambios dinámicamente.
        Solo incluimos los campos que realmente cambiaron.
      */
      const cambios = {}
      if (title      !== undefined) cambios.title       = title
      if (content    !== undefined) cambios.content     = content
      if (categoryId !== undefined) cambios.category_id = categoryId
      // Nota: updated_at se actualiza automáticamente por el trigger SQL

      const { data, error } = await supabase
        .from('notes')
        .update(cambios)
        .eq('id', noteId)   // → WHERE id = noteId
        .select()
        .single()

      if (error) throw error

      /*
        map() reemplaza el apunte viejo por el actualizado.
        Los demás apuntes no se tocan.
        Equivale a: nts[indice] = { ...nts[indice], ...cambios } en la app vanilla.
      */
      setNotes(prev => prev.map(n => n.id === noteId ? data : n))
      return { data, error: null }

    } catch (err) {
      console.error('Error al actualizar apunte:', err.message)
      return { data: null, error: err }
    }
  }, [])


  /* ── deleteNote — Elimina un apunte ─────────────────────────
     
     Equivale a:
     nts = nts.filter(n => n.id !== editId) en la app vanilla.
     Pero ahora también lo elimina de la base de datos en Supabase.
  */
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


  /* ── Valor retornado por el hook ──────────────────────────── */
  return {
    notes,       // Array de apuntes del usuario (ordenados: más reciente primero)
    setNotes,    // Acceso directo al setter por si se necesita
    loading,     // true mientras carga
    fetchNotes,  // Para refrescar manualmente
    createNote,  // ({ title, content, categoryId }) → { data, error }
    updateNote,  // (noteId, { title?, content?, categoryId? }) → { data, error }
    deleteNote,  // (noteId) → { error }
  }
}