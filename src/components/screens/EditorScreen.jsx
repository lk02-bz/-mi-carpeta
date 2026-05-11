/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/EditorScreen.jsx                 ║
║                                                          ║
║  Cambios Fase 2 (Storage):                               ║
║  ✦ Integra useAttachments para adjuntos de la nota       ║
║  ✦ handleImageUpload: sube imagen y devuelve URL         ║
║  ✦ AttachmentPanel debajo del editor                     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { useApp }                           from '../../context/AppContext'
import { useAttachments }                   from '../../hooks/useAttachments'
import { uploadFile, ALLOWED_TYPES }        from '../../lib/storage'
import RichEditor                           from '../editor/RichEditor'
import AttachmentPanel                      from '../editor/AttachmentPanel'

export default function EditorScreen() {
  const {
    cats, notes,
    createNote, updateNote, deleteNote,
    currentFrame, goBack, showToast, user,
  } = useApp()

  const { noteId, catId } = currentFrame
  const modoEdicion  = noteId !== null
  const notaExistente = modoEdicion ? notes.find(n => n.id === noteId) : null

  const [titulo,        setTitulo]        = useState('')
  const [contenido,     setContenido]     = useState('')
  const [catSelec,      setCatSelec]      = useState(catId || '')
  const [confirmando,   setConfirmando]   = useState(false)
  const [guardando,     setGuardando]     = useState(false)
  const [borrando,      setBorrando]      = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error,         setError]         = useState('')

  /* ── Hook de adjuntos ──
     Solo activo cuando hay un noteId (nota ya guardada).
     Si es nota nueva, attachments estará vacío y disabled=true.
  */
  const {
    attachments,
    uploading:   attachmentUploading,
    addAttachment,
    removeAttachment,
  } = useAttachments(noteId, user?.id)


  /* ── Inicializar formulario ── */
  useEffect(() => {
    if (modoEdicion && notaExistente) {
      setTitulo(notaExistente.title)
      setContenido(notaExistente.content)
      setCatSelec(notaExistente.category_id)
    } else {
      setTitulo('')
      setContenido('')
      setCatSelec(catId || (cats[0]?.id ?? ''))
    }
    setError('')
    setConfirmando(false)
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── handleImageUpload ─────────────────────────────────────
     Se pasa como prop a RichEditor y Toolbar.
     Sube la imagen a Storage y devuelve la URL pública
     para que TipTap la inserte como <img> en el editor.
  */
  const handleImageUpload = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes aquí')
      return null
    }

    setImageUploading(true)
    const { url, error: uploadError } = await uploadFile(file, user.id)
    setImageUploading(false)

    if (uploadError) {
      showToast(uploadError.message || 'Error al subir imagen')
      return null
    }

    return url
  }, [user, showToast])


  /* ── handleFileUpload ──────────────────────────────────────
     Se pasa a AttachmentPanel para subir PDFs y docs.
  */
  const handleFileUpload = useCallback(async (file) => {
    const fileCategory = ALLOWED_TYPES[file.type]
    if (!fileCategory) {
      showToast('Tipo de archivo no permitido')
      return
    }

    const { error: attachError } = await addAttachment(file)
    if (attachError) {
      showToast(attachError.message || 'Error al adjuntar archivo')
    } else {
      showToast('Archivo adjuntado ✓')
    }
  }, [addAttachment, showToast])


  /* ── handleRemoveAttachment ── */
  const handleRemoveAttachment = useCallback(async (attachment) => {
    const { error: removeError } = await removeAttachment(attachment)
    if (removeError) {
      showToast('Error al eliminar adjunto')
    } else {
      showToast('Adjunto eliminado')
    }
  }, [removeAttachment, showToast])


  /* ── handleGuardar ── */
  async function handleGuardar() {
    const tituloLimpio = titulo.trim()
    if (!tituloLimpio) { setError('El título no puede estar vacío'); return }
    if (!catSelec)     { setError('Seleccioná una categoría');       return }

    setError('')
    setGuardando(true)

    if (modoEdicion) {
      const cambios = {}
      if (tituloLimpio !== notaExistente.title)       cambios.title      = tituloLimpio
      if (contenido    !== notaExistente.content)     cambios.content    = contenido
      if (catSelec     !== notaExistente.category_id) cambios.categoryId = catSelec

      if (Object.keys(cambios).length === 0) {
        showToast('Sin cambios')
        goBack()
        return
      }

      const { error } = await updateNote(noteId, cambios)
      setGuardando(false)
      if (error) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte actualizado ✓')

    } else {
      const { error } = await createNote({
        title: tituloLimpio, content: contenido, categoryId: catSelec,
      })
      setGuardando(false)
      if (error) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte guardado ✓')
    }

    goBack()
  }


  /* ── handleEliminar ── */
  async function handleEliminar() {
    setBorrando(true)
    const { error } = await deleteNote(noteId)
    setBorrando(false)
    if (error) { showToast('Error al eliminar'); return }
    showToast('Apunte eliminado')
    goBack()
  }


  return (
    <div className="cnt">

      {/* ── Selector de categoría ── */}
      <div className="fld">
        <label className="lbl">Categoría</label>
        <select value={catSelec} onChange={e => setCatSelec(e.target.value)}>
          <option value="" disabled>Seleccioná una categoría</option>
          {cats.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Título ── */}
      <div className="fld">
        <label className="lbl">Título</label>
        <input
          type="text"
          value={titulo}
          onChange={e => { setTitulo(e.target.value); setError('') }}
          placeholder="Título del apunte"
          maxLength={100}
          autoFocus={!modoEdicion}
        />
      </div>

      {/* ── Editor ── */}
      <div className="fld">
        <label className="lbl">Contenido</label>
        <RichEditor
          content={contenido}
          onChange={setContenido}
          placeholder="Escribí tu apunte acá..."
          onImageUpload={handleImageUpload}
          uploading={imageUploading}
        />
      </div>

      {/* ── Panel de adjuntos (PDFs, docs) ── */}
      <div className="fld">
        <AttachmentPanel
          attachments={attachments}
          uploading={attachmentUploading}
          onUpload={handleFileUpload}
          onRemove={handleRemoveAttachment}
          disabled={!modoEdicion}
        />
      </div>

      {/* ── Error ── */}
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      {/* ── Botones ── */}
      <button className="btn-p" onClick={handleGuardar} disabled={guardando}>
        {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar apunte'}
      </button>

      <button className="btn-s" onClick={goBack}>Cancelar</button>

      {/* ── Eliminar ── */}
      {modoEdicion && (
        <div style={{ marginTop: 24 }}>
          {!confirmando ? (
            <button className="btn-d" onClick={() => setConfirmando(true)}>
              Eliminar apunte
            </button>
          ) : (
            <div className="confirm-box">
              <p>¿Eliminar este apunte? Esta acción no se puede deshacer.</p>
              <div className="confirm-row">
                <button className="confirm-yes" onClick={handleEliminar} disabled={borrando}>
                  {borrando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button className="confirm-no" onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
