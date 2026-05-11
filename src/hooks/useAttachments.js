/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useAttachments.js                             ║
║                                                          ║
║  Hook para manejar los adjuntos de una nota.             ║
║  Interactúa con la tabla note_attachments en Supabase    ║
║  y con el bucket note-files en Storage.                  ║
║                                                          ║
║  Se usa dentro de EditorScreen pasándole el noteId       ║
║  de la nota que se está editando.                        ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase }                          from '../lib/supabase'
import { uploadFile, deleteFile }            from '../lib/storage'

export function useAttachments(noteId, userId) {

  const [attachments, setAttachments] = useState([])
  const [loading,     setLoading]     = useState(false)
  const [uploading,   setUploading]   = useState(false)


  /* ── Cargar adjuntos cuando cambia la nota ── */
  useEffect(() => {
    if (!noteId) {
      setAttachments([])
      return
    }
    fetchAttachments()
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── fetchAttachments ──────────────────────────────────── */
  async function fetchAttachments() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('note_attachments')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setAttachments(data)

    } catch (err) {
      console.error('Error al cargar adjuntos:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ── addAttachment ─────────────────────────────────────────
     Sube el archivo a Storage y guarda la metadata en la DB.

     @param {File} file
     @returns {{ data, error }}
  */
  const addAttachment = useCallback(async (file) => {
    if (!noteId || !userId) return { data: null, error: new Error('Nota no guardada') }

    setUploading(true)
    try {
      // 1. Subir el archivo al bucket
      const { url, path, type, error: uploadError } = await uploadFile(file, userId)
      if (uploadError) throw uploadError

      // 2. Guardar metadata en la tabla
      const { data, error: dbError } = await supabase
        .from('note_attachments')
        .insert({
          note_id:   noteId,
          user_id:   userId,
          file_name: file.name,
          file_url:  url,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single()

      if (dbError) {
        // Si falla la DB, intentamos borrar el archivo ya subido
        await deleteFile(path)
        throw dbError
      }

      setAttachments(prev => [...prev, data])
      return { data, error: null }

    } catch (err) {
      console.error('Error al adjuntar archivo:', err.message)
      return { data: null, error: err }
    } finally {
      setUploading(false)
    }
  }, [noteId, userId])


  /* ── removeAttachment ──────────────────────────────────────
     Borra el archivo del Storage y la fila de la DB.

     @param {object} attachment - fila completa de note_attachments
     @returns {{ error }}
  */
  const removeAttachment = useCallback(async (attachment) => {
    try {
      /*
        La URL tiene el formato:
        https://xxx.supabase.co/storage/v1/object/public/note-files/{path}
        Extraemos el path para pasárselo a deleteFile().
      */
      const urlParts = attachment.file_url.split('/note-files/')
      const filePath = urlParts[1]

      // 1. Borrar de Storage
      if (filePath) {
        await deleteFile(filePath)
      }

      // 2. Borrar de la DB
      const { error } = await supabase
        .from('note_attachments')
        .delete()
        .eq('id', attachment.id)

      if (error) throw error

      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
      return { error: null }

    } catch (err) {
      console.error('Error al eliminar adjunto:', err.message)
      return { error: err }
    }
  }, [])


  return {
    attachments,  // Array de adjuntos de la nota actual
    loading,      // true mientras carga la lista
    uploading,    // true mientras sube un archivo
    addAttachment,    // (file) → { data, error }
    removeAttachment, // (attachment) → { error }
    fetchAttachments, // Para refrescar manualmente si hace falta
  }
}
