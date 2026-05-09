/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/EditorScreen.jsx                 ║
║                                                          ║
║  Pantalla para crear y editar apuntes.                   ║
║                                                          ║
║  Dos modos según currentFrame.noteId:                    ║
║  • null  → Crear nuevo apunte                            ║
║  • uuid  → Editar apunte existente                       ║
║                                                          ║
║  Incluye selector de categoría y opción de eliminar.     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect } from 'react'
import { useApp }              from '../../context/AppContext'

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

  /*
    Leemos del frame actual qué nota y qué categoría están activas.
    noteId = null → modo creación
    noteId = uuid → modo edición
  */
  const { noteId, catId } = currentFrame
  const modoEdicion = noteId !== null

  /*
    Si estamos editando, buscamos la nota existente.
    Si estamos creando, nota es undefined (no importa).
  */
  const notaExistente = modoEdicion
    ? notes.find(n => n.id === noteId)
    : null

  /*
    Estado del formulario.
    useEffect inicializa los campos cuando la pantalla se monta
    o cuando noteId cambia (por si el usuario abre otra nota).
  */
  const [titulo,      setTitulo]      = useState('')
  const [contenido,   setContenido]   = useState('')
  const [catSelec,    setCatSelec]    = useState(catId || '')
  const [confirmando, setConfirmando] = useState(false)
  const [guardando,   setGuardando]   = useState(false)
  const [borrando,    setBorrando]    = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (modoEdicion && notaExistente) {
      // Modo edición: pre-cargar los datos de la nota
      setTitulo(notaExistente.title)
      setContenido(notaExistente.content)
      setCatSelec(notaExistente.category_id)
    } else {
      // Modo creación: empezar limpio, con la categoría del contexto preseleccionada
      setTitulo('')
      setContenido('')
      setCatSelec(catId || (cats[0]?.id ?? ''))
    }
    setError('')
    setConfirmando(false)
  }, [noteId]) // Se re-ejecuta si noteId cambia // eslint-disable-line react-hooks/exhaustive-deps


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
      /*
        Modo edición: comparamos con los valores originales.
        Solo enviamos los campos que realmente cambiaron.
        Esto evita writes innecesarios a Supabase.
      */
      const cambios = {}
      if (tituloLimpio         !== notaExistente.title)       cambios.title       = tituloLimpio
      if (contenido            !== notaExistente.content)     cambios.content     = contenido
      if (catSelec             !== notaExistente.category_id) cambios.categoryId  = catSelec

      if (Object.keys(cambios).length === 0) {
        // No hubo cambios, no vale la pena hacer la llamada
        showToast('Sin cambios')
        goBack()
        return
      }

      const { error } = await updateNote(noteId, cambios)
      setGuardando(false)
      if (error) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte actualizado ✓')

    } else {
      // Modo creación
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

      {/* ── Contenido ── */}
      <div className="fld">
        <label className="lbl">Contenido</label>
        <textarea
          value={contenido}
          onChange={e => setContenido(e.target.value)}
          placeholder="Escribí tu apunte acá..."
          style={{ minHeight: 200 }}
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
