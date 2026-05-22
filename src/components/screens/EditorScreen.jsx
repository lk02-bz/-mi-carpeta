/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/EditorScreen.jsx                 ║
║                                                          ║
║  Cambios Bloque C:                                       ║
║  ✦ Autoguardado: debounce de 2s sobre el contenido       ║
║    del editor (solo para notas existentes)               ║
║  ✦ Favorito: botón ⭐ para togglear is_favorite          ║
║  ✦ Etiquetas: agregar/quitar tags desde el editor        ║
╚══════════════════════════════════════════════════════════╝
*/
import { summarizeNote, explainNote, generateQuestions } from '../../services/geminiService'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp }                                   from '../../context/AppContext'
import { useAttachments }                           from '../../hooks/useAttachments'
import { uploadFile, ALLOWED_TYPES }                from '../../lib/storage'
import RichEditor                                   from '../editor/RichEditor'
import AttachmentPanel                              from '../editor/AttachmentPanel'

export default function EditorScreen() {
const {
  cats, notes,
  createNote, updateNote, deleteNote,
  toggleFavorite,
  tags, createTag, addTagToNote, removeTagFromNote, getTagsForNote,
  currentFrame, goBack, showToast, user,
  displayName, assistantName,
} = useApp()

  const { noteId, catId } = currentFrame
  const modoEdicion   = noteId !== null
  const notaExistente = modoEdicion ? notes.find(n => n.id === noteId) : null

  const [titulo,         setTitulo]         = useState('')
  const [contenido,      setContenido]      = useState('')
  const [catSelec,       setCatSelec]       = useState(catId || '')
  const [confirmando,    setConfirmando]    = useState(false)
  const [guardando,      setGuardando]      = useState(false)
  const [borrando,       setBorrando]       = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error,          setError]          = useState('')

  /* ── Estados del asistente ── */
  const [aiPanel,      setAiPanel]      = useState(false)  // panel visible o no
  const [aiLoading,    setAiLoading]    = useState(false)  // cargando respuesta
  const [aiResult,     setAiResult]     = useState('')     // texto de la respuesta
  const [aiMode,       setAiMode]       = useState('')     // 'resumir'|'explicar'|'preguntas'

  /* ── Estados del autoguardado ── */
  const [autoSaveStatus, setAutoSaveStatus] = useState('')
  // 'pendiente' | 'guardando' | 'guardado' | ''
  const autoSaveTimer       = useRef(null)
  const contenidoGuardadoRef = useRef('')  // referencia al último contenido guardado

  /* ── Estados de etiquetas ── */
  const [tagInput,     setTagInput]     = useState('')
  const [tagSuggests,  setTagSuggests]  = useState([]) // sugerencias del input


  /* ── Hook de adjuntos ── */
  const {
    attachments,
    uploading:   attachmentUploading,
    addAttachment,
    removeAttachment,
  } = useAttachments(noteId, user?.id)


  /* ── Inicializar formulario ─────────────────────────────── */
  useEffect(() => {
    if (modoEdicion && notaExistente) {
      setTitulo(notaExistente.title)
      setContenido(notaExistente.content)
      setCatSelec(notaExistente.category_id)
      /* Registramos el contenido inicial para que el autosave
         no dispare al abrir la nota (porque no hay cambios reales) */
      contenidoGuardadoRef.current = notaExistente.content
    } else {
      setTitulo('')
      setContenido('')
      setCatSelec(catId || (cats[0]?.id ?? ''))
      contenidoGuardadoRef.current = ''
    }
    setError('')
    setConfirmando(false)
    setAutoSaveStatus('')
    setTagInput('')
    clearTimeout(autoSaveTimer.current)
  }, [noteId]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── Autoguardado — debounce de 2 segundos ──────────────────
     
     Solo activo cuando:
     1. Es una nota existente (modoEdicion === true)
     2. El contenido cambió respecto al último guardado
     
     Flujo:
     - Usuario escribe → efecto se dispara
     - Limpiamos el timer anterior (clearTimeout)
     - Ponemos un nuevo timer de 2 segundos
     - Si el usuario sigue escribiendo, el timer se reinicia
     - Si pasan 2 segundos sin cambios → llamamos a updateNote
     
     El return del useEffect es la función de limpieza:
     se ejecuta antes de cada re-ejecución del efecto y al desmontar.
     Esto cancela timers pendientes si el usuario navega para atrás
     antes de que se dispare el autoguardado.
  */
  useEffect(() => {
    if (!modoEdicion) return
    if (contenido === contenidoGuardadoRef.current) return  // sin cambios

    setAutoSaveStatus('pendiente')
    clearTimeout(autoSaveTimer.current)

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('guardando')
      const { error: saveError } = await updateNote(noteId, { content: contenido })

      if (saveError) {
        setAutoSaveStatus('')
        // No mostramos toast para no interrumpir al usuario mientras escribe
        console.error('Error en autoguardado:', saveError.message)
        return
      }

      /* Actualizamos la referencia para el próximo ciclo */
      contenidoGuardadoRef.current = contenido
      setAutoSaveStatus('guardado')
      setTimeout(() => setAutoSaveStatus(''), 2500)
    }, 2000)

    return () => clearTimeout(autoSaveTimer.current)
  }, [contenido]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── handleTagInput — filtra sugerencias al escribir ─────── */
  function handleTagInput(valor) {
    setTagInput(valor)
    if (!valor.trim()) {
      setTagSuggests([])
      return
    }
    const q = valor.trim().toLowerCase()
    const notaTagIds = getTagsForNote(noteId).map(t => t.id)
    /* Sugerencias: tags existentes que coincidan y que la nota no tenga aún */
    const sugerencias = tags.filter(
      t => t.name.includes(q) && !notaTagIds.includes(t.id)
    )
    setTagSuggests(sugerencias)
  }


  /* ── handleAddTag — confirma el tag al presionar Enter o + ──
     
     Si el input coincide con un tag existente, lo usamos.
     Si no, creamos uno nuevo y lo asociamos.
  */
  const handleAddTag = useCallback(async () => {
    const nombre = tagInput.trim().toLowerCase()
    if (!nombre) return

    /* ¿Ya está en la nota? */
    const notaTags = getTagsForNote(noteId)
    if (notaTags.some(t => t.name === nombre)) {
      setTagInput('')
      setTagSuggests([])
      return
    }

    /* Buscar en los tags existentes del usuario */
    let tag = tags.find(t => t.name === nombre)

    /* Si no existe, crearlo */
    if (!tag) {
      const { data, error: createError } = await createTag(nombre)
      if (createError || !data) {
        showToast('Error al crear la etiqueta')
        return
      }
      tag = data
    }

    /* Asociar tag a la nota */
    const { error: addError } = await addTagToNote(noteId, tag.id)
    if (addError) {
      showToast('Error al agregar la etiqueta')
      return
    }

    setTagInput('')
    setTagSuggests([])
  }, [tagInput, noteId, tags, getTagsForNote, createTag, addTagToNote, showToast])


  /* ── handleRemoveTag ── */
  const handleRemoveTag = useCallback(async (tagId) => {
    const { error: removeError } = await removeTagFromNote(noteId, tagId)
    if (removeError) showToast('Error al quitar la etiqueta')
  }, [noteId, removeTagFromNote, showToast])


  /* ── handleToggleFavorite ── */
  const handleToggleFavorite = useCallback(async () => {
    if (!notaExistente) return
    const { error: favError } = await toggleFavorite(noteId, notaExistente.is_favorite)
    if (favError) showToast('Error al cambiar favorito')
  }, [noteId, notaExistente, toggleFavorite, showToast])


  /* ── handleImageUpload ── */
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


  /* ── handleFileUpload ── */
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


  /* ── handleGuardar ─────────────────────────────────────────
     Cancelamos el timer de autoguardado pendiente antes de
     guardar manualmente para evitar un doble guardado.
  */
  async function handleGuardar() {
    const tituloLimpio = titulo.trim()
    if (!tituloLimpio) { setError('El título no puede estar vacío'); return }
    if (!catSelec)     { setError('Seleccioná una categoría');       return }

    /* Cancelar autoguardado pendiente */
    clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('')

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

      const { error: saveError } = await updateNote(noteId, cambios)
      setGuardando(false)
      if (saveError) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte actualizado ✓')

    } else {
      const { error: saveError } = await createNote({
        title: tituloLimpio, content: contenido, categoryId: catSelec,
      })
      setGuardando(false)
      if (saveError) { setError('Error al guardar. Intentá de nuevo.'); return }
      showToast('Apunte guardado ✓')
    }

    goBack()
  }


  /* ── handleEliminar ── */
  async function handleEliminar() {
    setBorrando(true)
    const { error: deleteError } = await deleteNote(noteId)
    setBorrando(false)
    if (deleteError) { showToast('Error al eliminar'); return }
    showToast('Apunte eliminado')
    goBack()
  }

    /* ── Handlers del asistente ── */
  async function handleAI(modo) {
    if (!contenido.trim()) {
      showToast('La nota no tiene contenido')
      return
    }
    setAiMode(modo)
    setAiPanel(true)
    setAiLoading(true)
    setAiResult('')

    try {
      let result = ''
      const params = { title: titulo, content: contenido, displayName: displayName || 'Lucas' }

      if (modo === 'resumir')   result = await summarizeNote(params)
      if (modo === 'explicar')  result = await explainNote(params)
      if (modo === 'preguntas') result = await generateQuestions(params)

      setAiResult(result)
    } catch (err) {
      setAiResult('Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSaveAiResult() {
    if (!aiResult) return
    const modeLabels = {
      resumir:   'Resumen',
      explicar:  'Explicación',
      preguntas: 'Preguntas de estudio',
    }
    const { error: saveError } = await createNote({
      title:      `${modeLabels[aiMode]}: ${titulo}`,
      content:    aiResult,
      categoryId: catSelec,
    })
    if (saveError) {
      showToast('Error al guardar')
      return
    }
    showToast('✅ Guardado como apunte nuevo')
    setAiPanel(false)
  }

  /* ── Tags de esta nota (para mostrar los chips) ── */
  const notaTags = modoEdicion ? getTagsForNote(noteId) : []


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

      {/* ── Título + botón favorito ── */}
      <div className="fld">
        <label className="lbl">Título</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={titulo}
            onChange={e => { setTitulo(e.target.value); setError('') }}
            placeholder="Título del apunte"
            maxLength={100}
            autoFocus={!modoEdicion}
            style={{ flex: 1 }}
          />
          {/* El botón favorito solo aparece en modo edición */}
          {modoEdicion && (
            <button
              onClick={handleToggleFavorite}
              aria-label={notaExistente?.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                padding: '4px 6px',
                lineHeight: 1,
                flexShrink: 0,
                opacity: notaExistente?.is_favorite ? 1 : 0.35,
                transition: 'opacity 0.15s',
              }}
            >
              ★
            </button>
          )}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="fld">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="lbl" style={{ marginBottom: 0 }}>Contenido</label>
          {/* Indicador de autoguardado */}
          {autoSaveStatus === 'guardando' && (
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              Guardando...
            </span>
          )}
          {autoSaveStatus === 'guardado' && (
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              ✓ Guardado
            </span>
          )}
        </div>
        <RichEditor
          content={contenido}
          onChange={setContenido}
          placeholder="Escribí tu apunte acá..."
          onImageUpload={handleImageUpload}
          uploading={imageUploading}
        />
      </div>

      {/* ── Etiquetas ── */}
      <div className="fld">
        <label className="lbl">Etiquetas</label>

        {!modoEdicion ? (
          /* Nota nueva: los tags se agregan después de guardar */
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
            Guardá el apunte para poder agregar etiquetas.
          </p>
        ) : (
          <div>
            {/* Chips de tags actuales */}
            {notaTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {notaTags.map(tag => (
                  <span
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--bg3)',
                      borderRadius: 99,
                      padding: '3px 10px 3px 10px',
                      fontSize: 12,
                      color: 'var(--text)',
                    }}
                  >
                    #{tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      aria-label={`Quitar etiqueta ${tag.name}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 0 0 2px',
                        fontSize: 14,
                        lineHeight: 1,
                        color: 'var(--text2)',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input para agregar tags */}
            <div style={{ position: 'relative' }}>
             <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => handleTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                    if (e.key === 'Escape') { setTagInput(''); setTagSuggests([]) }
                  }}
                  placeholder="Nueva etiqueta..."
                  maxLength={30}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddTag}
                  aria-label="Agregar etiqueta"
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1px solid var(--bg3)',
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  +
                </button>
              </div>

              {/* Sugerencias de tags existentes */}
              {tagSuggests.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg2)',
                  border: '1px solid var(--bg3)',
                  borderRadius: 8,
                  marginTop: 4,
                  zIndex: 10,
                  overflow: 'hidden',
                }}>
                  {tagSuggests.slice(0, 5).map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        addTagToNote(noteId, tag.id)
                        setTagInput('')
                        setTagSuggests([])
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text)',
                      }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>


        {/* ── Botones del asistente (solo en modo edición) ── */}
      {modoEdicion && (
        <div className="fld">
          <label className="lbl">✨ {assistantName || 'Asistente'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { modo: 'resumir',   label: '✨ Resumir'   },
              { modo: 'explicar',  label: '💡 Explicar'  },
              { modo: 'preguntas', label: '❓ Preguntas' },
            ].map(({ modo, label }) => (
              <button
                key={modo}
                onClick={() => handleAI(modo)}
                disabled={aiLoading}
                style={{
                  flex: 1, padding: '10px 4px',
                  borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid var(--border)',
                  background: aiMode === modo && aiPanel ? 'var(--accent)' : 'var(--bg2)',
                  color: aiMode === modo && aiPanel ? 'var(--accent-fg)' : 'var(--text)',
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                  opacity: aiLoading ? 0.6 : 1,
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Panel de resultado del asistente ── */}
      {aiPanel && (
        <div style={{
          background: 'var(--bg2)', borderRadius: 14,
          padding: 16, marginBottom: 16,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {aiMode === 'resumir'   && '✨ Resumen'}
              {aiMode === 'explicar'  && '💡 Explicación'}
              {aiMode === 'preguntas' && '❓ Preguntas de estudio'}
            </span>
            <button
              onClick={() => setAiPanel(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text2)', padding: 4 }}
            >
              ×
            </button>
          </div>

          {aiLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', fontSize: 13 }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              Analizando tu apunte...
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0, marginBottom: 12 }}>
                {aiResult}
              </p>
              <button
                onClick={handleSaveAiResult}
                style={{
                  width: '100%', padding: '10px 0',
                  borderRadius: 10, border: 'none',
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
              >
                💾 Guardar como apunte nuevo
              </button>
            </>
          )}
        </div>
      )}

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
