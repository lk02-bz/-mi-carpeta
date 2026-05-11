/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/EditorScreen.jsx                 ║
║                                                          ║
║  Pantalla para crear y editar apuntes.                   ║
║                                                          ║
║  Cambios Fase 2:                                         ║
║  ✦ Reemplaza <textarea> por <RichEditor>                 ║
║  ✦ El estado `contenido` ahora es HTML (string)          ║
║  ✦ El resto de la lógica (guardar, eliminar, cats)       ║
║    no cambia — solo se enchufó el nuevo editor           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect } from 'react'
import { useApp }              from '../../context/AppContext'
import RichEditor              from '../editor/RichEditor'

export default function EditorScreen() {
  const {
    cats,
    notes,
    createNote,
    updateNote,
    deleteNote,
    currentFrame,
    goBack,
    showToast,
  } = useApp()

  const { noteId, catId } = currentFrame
  const modoEdicion = noteId !== null

  const notaExistente = modoEdicion
    ? notes.find(n => n.id === noteId)
    : null

  const [titulo,      setTitulo]      = useState('')
  const [contenido,   setContenido]   = useState('')
  const [catSelec,    setCatSelec]    = useState(catId || '')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [borrando,    setBorrando]    = useState(false)
  const [error,       setError]       = useState('')

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


  /* ── handleGuardar ─────────────────────────────────────── */
  async function handleGuardar() {
    const tituloLimpio = titulo.trim()
    if (!tituloLimpio) {
      setError('El título no puede estar vacío')
      return
    }
    if (!catSelec) {
      setError('Seleccioná una categoría')
      return
    }

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
        title:      tituloLimpio,
        content:    contenido,
        categoryId: catSelec,
      })
      setGuardando(false)
      if (error) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte guardado ✓')
    }

    goBack()
  }


  /* ── handleEliminar ────────────────────────────────────── */
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
        <select
          value={catSelec}
          onChange={e => setCatSelec(e.target.value)}
        >
          <option value="" disabled>Seleccioná una categoría</option>
          {cats.map(c => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
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

      {/* ── Contenido (RichEditor reemplaza al textarea) ── */}
      <div className="fld">
        <label className="lbl">Contenido</label>
        <RichEditor
          content={contenido}
          onChange={setContenido}
          placeholder="Escribí tu apunte acá..."
        />
      </div>

      {/* ── Error ── */}
      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      {/* ── Botón guardar ── */}
      <button className="btn-p" onClick={handleGuardar} disabled={guardando}>
        {guardando
          ? 'Guardando...'
          : modoEdicion ? 'Guardar cambios' : 'Guardar apunte'}
      </button>

      {/* ── Cancelar ── */}
      <button className="btn-s" onClick={goBack}>
        Cancelar
      </button>

      {/* ── Eliminar (solo en modo edición) ── */}
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
                <button
                  className="confirm-yes"
                  onClick={handleEliminar}
                  disabled={borrando}
                >
                  {borrando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  className="confirm-no"
                  onClick={() => setConfirmando(false)}
                >
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
