/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/EditorScreen.jsx                 ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ buildNoteSystemPrompt pide HTML en vez de Markdown    ║
║  ✦ Respuestas del asistente se convierten a HTML         ║
║  ✦ Burbujas del asistente renderizan HTML con formato    ║
║  ✦ handleAddToNote usa markdownToHtml como fallback      ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp }            from '../../context/AppContext'
import { useAttachments }    from '../../hooks/useAttachments'
import { uploadFile, ALLOWED_TYPES } from '../../lib/storage'
import RichEditor            from '../editor/RichEditor'
import AttachmentPanel       from '../editor/AttachmentPanel'
import { askGemini, markdownToHtml } from '../../services/geminiService'

function htmlToText(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function isEditIntent(text) {
  const lower = text.toLowerCase()
  return [
    /reescrib/,
    /mejora.*(apunte|nota|esto|el|la)/,
    /format[eé]/,
    /pon[eé].*(lindo|mejor|bonito|prolijo)/,
    /hace?lo.*(m[aá]s|mejor)/,
    /redact[aá]/,
    /orden[aá].*(apunte|nota|esto)/,
    /modific[aá]/,
    /limpí?a.*(apunte|nota|esto)/,
    /correg[ií].*(apunte|nota|esto)/,
    /traduci?[íi]/,
    /agregá.*(apunte|nota)/,
  ].some(p => p.test(lower))
}

const IconSend  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>

export default function EditorScreen() {
  const {
    cats, notes,
    createNote, updateNote, deleteNote,
    toggleFavorite,
    tags, createTag, addTagToNote, removeTagFromNote, getTagsForNote,
    currentFrame, goBack, showToast, user,
    displayName, assistantName,
    aiPanelOpen, closeAiPanel,
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

  const [aiMessages, setAiMessages] = useState([])
  const [aiInput,    setAiInput]    = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiSaved,    setAiSaved]    = useState(false)
  const aiBottomRef = useRef(null)

  const [autoSaveStatus,  setAutoSaveStatus]  = useState('')
  const autoSaveTimer        = useRef(null)
  const contenidoGuardadoRef = useRef('')

  const [tagInput,    setTagInput]    = useState('')
  const [tagSuggests, setTagSuggests] = useState([])

  const {
    attachments, uploading: attachmentUploading,
    addAttachment, removeAttachment,
  } = useAttachments(noteId, user?.id)


  useEffect(() => {
    if (modoEdicion && notaExistente) {
      setTitulo(notaExistente.title)
      setContenido(notaExistente.content)
      setCatSelec(notaExistente.category_id)
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

  useEffect(() => {
    if (aiPanelOpen) {
      setAiMessages([])
      setAiInput('')
      setAiSaved(false)
    }
  }, [aiPanelOpen])

  useEffect(() => {
    if (aiPanelOpen) {
      setTimeout(() => aiBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [aiMessages, aiLoading, aiPanelOpen])

  useEffect(() => {
    if (!modoEdicion) return
    if (contenido === contenidoGuardadoRef.current) return
    setAutoSaveStatus('pendiente')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('guardando')
      const { error: saveError } = await updateNote(noteId, { content: contenido })
      if (saveError) { setAutoSaveStatus(''); return }
      contenidoGuardadoRef.current = contenido
      setAutoSaveStatus('guardado')
      setTimeout(() => setAutoSaveStatus(''), 2500)
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [contenido]) // eslint-disable-line react-hooks/exhaustive-deps


  function handleTagInput(valor) {
    setTagInput(valor)
    if (!valor.trim()) { setTagSuggests([]); return }
    const q = valor.trim().toLowerCase()
    const notaTagIds = getTagsForNote(noteId).map(t => t.id)
    setTagSuggests(tags.filter(t => t.name.includes(q) && !notaTagIds.includes(t.id)))
  }

  const handleAddTag = useCallback(async () => {
    const nombre = tagInput.trim().toLowerCase()
    if (!nombre) return
    const notaTags = getTagsForNote(noteId)
    if (notaTags.some(t => t.name === nombre)) { setTagInput(''); setTagSuggests([]); return }
    let tag = tags.find(t => t.name === nombre)
    if (!tag) {
      const { data, error: createError } = await createTag(nombre)
      if (createError || !data) { showToast('Error al crear la etiqueta'); return }
      tag = data
    }
    const { error: addError } = await addTagToNote(noteId, tag.id)
    if (addError) { showToast('Error al agregar la etiqueta'); return }
    setTagInput(''); setTagSuggests([])
  }, [tagInput, noteId, tags, getTagsForNote, createTag, addTagToNote, showToast])

  const handleRemoveTag = useCallback(async (tagId) => {
    const { error: removeError } = await removeTagFromNote(noteId, tagId)
    if (removeError) showToast('Error al quitar la etiqueta')
  }, [noteId, removeTagFromNote, showToast])

  const handleToggleFavorite = useCallback(async () => {
    if (!notaExistente) return
    await toggleFavorite(noteId, notaExistente.is_favorite)
  }, [noteId, notaExistente, toggleFavorite])

  const handleImageUpload = useCallback(async (file) => {
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes aquí'); return null }
    setImageUploading(true)
    const { url, error: uploadError } = await uploadFile(file, user.id)
    setImageUploading(false)
    if (uploadError) { showToast(uploadError.message || 'Error al subir imagen'); return null }
    return url
  }, [user, showToast])

  const handleFileUpload = useCallback(async (file) => {
    const fileCategory = ALLOWED_TYPES[file.type]
    if (!fileCategory) { showToast('Tipo de archivo no permitido'); return }
    const { error: attachError } = await addAttachment(file)
    if (attachError) { showToast(attachError.message || 'Error al adjuntar archivo') }
    else { showToast('Archivo adjuntado ✓') }
  }, [addAttachment, showToast])

  const handleRemoveAttachment = useCallback(async (attachment) => {
    const { error: removeError } = await removeAttachment(attachment)
    if (removeError) { showToast('Error al eliminar adjunto') }
    else { showToast('Adjunto eliminado') }
  }, [removeAttachment, showToast])


  async function handleGuardar() {
    const tituloLimpio = titulo.trim()
    if (!tituloLimpio) { setError('El título no puede estar vacío'); return }
    if (!catSelec)     { setError('Seleccioná una categoría');       return }
    clearTimeout(autoSaveTimer.current)
    setAutoSaveStatus('')
    setError('')
    setGuardando(true)
    if (modoEdicion) {
      const cambios = {}
      if (tituloLimpio !== notaExistente.title)       cambios.title      = tituloLimpio
      if (contenido    !== notaExistente.content)     cambios.content    = contenido
      if (catSelec     !== notaExistente.category_id) cambios.categoryId = catSelec
      if (Object.keys(cambios).length === 0) { showToast('Sin cambios'); goBack(); return }
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

  async function handleEliminar() {
    setBorrando(true)
    const { error: deleteError } = await deleteNote(noteId)
    setBorrando(false)
    if (deleteError) { showToast('Error al eliminar'); return }
    showToast('Apunte eliminado')
    goBack()
  }


  /* ════════════════════════════════════════════════════════
     CHAT DEL ASISTENTE
     ════════════════════════════════════════════════════════ */

  // ── CAMBIO 1: buildNoteSystemPrompt pide HTML directamente ──
  function buildNoteSystemPrompt() {
    const noteText = htmlToText(contenido).slice(0, 3000)
    return `Sos ${assistantName || 'Asistente'}, un asistente que ayuda a estudiar y entender apuntes.

APUNTE ACTUAL:
Título: "${titulo}"
Contenido: ${noteText || '(sin contenido aún)'}

CÓMO RESPONDÉS:
- Si te piden un resumen → resumís con puntos clave bien estructurados
- Si te piden que expliques → explicás con analogías simples y ejemplos
- Si te piden preguntas → generás preguntas de estudio numeradas
- Respondés en español rioplatense, conciso y claro

FORMATO OBLIGATORIO:
- Respondés SIEMPRE en HTML usando estas etiquetas: <h2>, <strong>, <em>, <ul><li>, <ol><li>, <p>
- NUNCA uses markdown (sin **, sin #, sin - para listas, sin asteriscos)
- Para checklists usá: <ul data-type="taskList"><li data-type="taskItem" data-checked="false">tarea</li></ul>
- Solo HTML puro, sin texto adicional fuera de las etiquetas
- Ejemplo: en vez de **texto** usá <strong>texto</strong>`
  }

  function buildEditSystemPrompt() {
    return `Sos ${assistantName || 'Asistente'}, un asistente que modifica apuntes.

APUNTE ACTUAL:
Título: "${titulo}"
Contenido HTML actual:
${contenido.slice(0, 4000)}

El usuario quiere que modifiques este apunte. Respondé ÚNICAMENTE con este JSON exacto (sin markdown, sin texto extra):
{
  "explanation": "Una oración corta explicando qué cambios hiciste",
  "newContent": "El HTML completo del contenido modificado usando <h2>, <strong>, <em>, <ul><li>, <ol><li>, <p>"
}

Aplicá exactamente lo que el usuario pidió. Mantené toda la información importante del apunte original.`
  }


  async function handleAiSend(texto) {
    const msg = (texto || aiInput).trim()
    if (!msg || aiLoading) return

    const userMsg     = { role: 'user', content: msg }
    const updatedMsgs = [...aiMessages, userMsg]
    setAiMessages(updatedMsgs)
    setAiInput('')
    setAiLoading(true)
    setAiSaved(false)

    const editMode = isEditIntent(msg)

    try {
      if (editMode) {
        const { text } = await askGemini({
          messages:     [{ role: 'user', content: `El usuario pide: "${msg}"` }],
          systemPrompt: buildEditSystemPrompt(),
          useSearch:    false,
        })

        let explanation = '¿Aplicar estos cambios a la nota?'
        let newContent  = text

        try {
          const clean  = text.replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(clean)
          explanation  = parsed.explanation || explanation
          newContent   = markdownToHtml(parsed.newContent || text)
        } catch {
          newContent = markdownToHtml(text)
        }

        setAiMessages(prev => [...prev, {
          role: 'assistant', content: explanation, editProposal: newContent,
        }])

      } else {
        const { text } = await askGemini({
          messages:     updatedMsgs.map(m => ({ role: m.role, content: m.content })),
          systemPrompt: buildNoteSystemPrompt(),
          useSearch:    false,
        })

        // ── CAMBIO 2: aplicar markdownToHtml como fallback por si el modelo
        //    devuelve Markdown a pesar de la instrucción ──
        const htmlContent = markdownToHtml(text)
        setAiMessages(prev => [...prev, { role: 'assistant', content: htmlContent }])
      }

    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: `<p>Error: ${err.message}</p>` }])
    } finally {
      setAiLoading(false)
    }
  }

  async function handleApplyEdit(newContent) {
    const { error: saveError } = await updateNote(noteId, { content: newContent })
    if (saveError) { showToast('Error al aplicar cambios'); return }
    setContenido(newContent)
    contenidoGuardadoRef.current = newContent
    setAiMessages(prev => [...prev, { role: 'assistant', content: '<p>✅ ¡Listo! La nota fue actualizada.</p>' }])
    showToast('✅ Nota actualizada')
  }

  function handleClearChat() {
    setAiMessages([])
    setAiInput('')
    setAiSaved(false)
  }

  // ── CAMBIO 3: handleAddToNote usa markdownToHtml como fallback ──
  async function handleAddToNote() {
    const assistantMsgs = aiMessages.filter(m => m.role === 'assistant' && !m.editProposal)
    if (assistantMsgs.length === 0 || !modoEdicion) return

    const contenidoAgregar = assistantMsgs
      .map(m => markdownToHtml(m.content)) // fallback si quedó algún markdown
      .join('<hr>')

    const nuevoContenido = contenido
      + `<hr><h2>💬 ${assistantName || 'Asistente'}</h2>`
      + contenidoAgregar

    const { error: saveError } = await updateNote(noteId, { content: nuevoContenido })
    if (saveError) { showToast('Error al agregar'); return }

    setContenido(nuevoContenido)
    contenidoGuardadoRef.current = nuevoContenido
    setAiSaved(true)
    showToast('✅ Conversación agregada a la nota')
  }

  const notaTags = modoEdicion ? getTagsForNote(noteId) : []
  const hasNormalAssistantMessages = aiMessages.some(m => m.role === 'assistant' && !m.editProposal)


  return (
    <div className="cnt">

      <div className="fld">
        <label className="lbl">Categoría</label>
        <select value={catSelec} onChange={e => setCatSelec(e.target.value)}>
          <option value="" disabled>Seleccioná una categoría</option>
          {cats.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>

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
          {modoEdicion && (
            <button onClick={handleToggleFavorite}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 22, padding: '4px 6px', lineHeight: 1, flexShrink: 0,
                opacity: notaExistente?.is_favorite ? 1 : 0.35, transition: 'opacity 0.15s',
              }}>★</button>
          )}
        </div>
      </div>

      <div className="fld">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="lbl" style={{ marginBottom: 0 }}>Contenido</label>
          {autoSaveStatus === 'guardando' && <span style={{ fontSize: 11, color: 'var(--text2)' }}>Guardando...</span>}
          {autoSaveStatus === 'guardado'  && <span style={{ fontSize: 11, color: 'var(--text2)' }}>✓ Guardado</span>}
        </div>
        <RichEditor
          content={contenido}
          onChange={setContenido}
          placeholder="Escribí tu apunte acá..."
          onImageUpload={handleImageUpload}
          uploading={imageUploading}
        />
      </div>

      <div className="fld">
        <label className="lbl">Etiquetas</label>
        {!modoEdicion ? (
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
            Guardá el apunte para poder agregar etiquetas.
          </p>
        ) : (
          <div>
            {notaTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {notaTags.map(tag => (
                  <span key={tag.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg3)', borderRadius: 99,
                    padding: '3px 10px', fontSize: 12, color: 'var(--text)',
                  }}>
                    #{tag.name}
                    <button onClick={() => handleRemoveTag(tag.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', fontSize: 14, lineHeight: 1, color: 'var(--text2)' }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" value={tagInput}
                  onChange={e => handleTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                    if (e.key === 'Escape') { setTagInput(''); setTagSuggests([]) }
                  }}
                  placeholder="Nueva etiqueta..." maxLength={30} style={{ flex: 1 }}
                />
                <button onClick={handleAddTag} style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                  border: '1px solid var(--bg3)', background: 'var(--bg2)',
                  color: 'var(--text)', fontSize: 20, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+</button>
              </div>
              {tagSuggests.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg2)', border: '1px solid var(--bg3)',
                  borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden',
                }}>
                  {tagSuggests.slice(0, 5).map(tag => (
                    <button key={tag.id}
                      onClick={() => { addTagToNote(noteId, tag.id); setTagInput(''); setTagSuggests([]) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        background: 'none', border: 'none', padding: '10px 14px',
                        cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                      }}>
                      #{tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fld">
        <AttachmentPanel
          attachments={attachments}
          uploading={attachmentUploading}
          onUpload={handleFileUpload}
          onRemove={handleRemoveAttachment}
          disabled={!modoEdicion}
        />
      </div>

      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      <button className="btn-p" onClick={handleGuardar} disabled={guardando}>
        {guardando ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Guardar apunte'}
      </button>
      <button className="btn-s" onClick={goBack}>Cancelar</button>

      {modoEdicion && (
        <div style={{ marginTop: 24 }}>
          {!confirmando ? (
            <button className="btn-d" onClick={() => setConfirmando(true)}>Eliminar apunte</button>
          ) : (
            <div className="confirm-box">
              <p>¿Eliminar este apunte? Esta acción no se puede deshacer.</p>
              <div className="confirm-row">
                <button className="confirm-yes" onClick={handleEliminar} disabled={borrando}>
                  {borrando ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button className="confirm-no" onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}


      {aiPanelOpen && modoEdicion && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeAiPanel() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 430, margin: '0 auto',
            background: 'var(--bg)',
            borderRadius: '20px 20px 0 0',
            height: '78vh',
            display: 'flex', flexDirection: 'column',
          }}>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  🤖 {assistantName || 'Asistente'}
                </span>
                <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                  📄 {titulo}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {aiMessages.length > 0 && (
                  <button onClick={handleClearChat} title="Borrar conversación"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                    <IconTrash />
                  </button>
                )}
                <button onClick={closeAiPanel}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
                  ×
                </button>
              </div>
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>

              {aiMessages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '4px 0 6px' }}>
                    Acciones rápidas
                  </p>
                  {[
                    { emoji: '✨', label: 'Hacer un resumen',            prompt: 'Haceme un resumen del apunte' },
                    { emoji: '💡', label: 'Explicame este tema',          prompt: 'Explicame este tema de otra manera, con analogías simples' },
                    { emoji: '❓', label: 'Generar preguntas de estudio', prompt: 'Generame preguntas de estudio para repasar este apunte, numeradas' },
                    { emoji: '✏️', label: 'Mejorar el formato',           prompt: 'Mejorá el formato de este apunte, poné títulos y listas donde corresponda' },
                  ].map(({ emoji, label, prompt }) => (
                    <button key={label} onClick={() => handleAiSend(prompt)}
                      style={{
                        padding: '11px 14px', borderRadius: 12, fontSize: 13,
                        border: '1.5px solid var(--border)', background: 'var(--bg2)',
                        color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {aiMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '88%',
                    padding: '9px 13px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg2)',
                    color: msg.role === 'user' ? 'var(--accent-fg)' : 'var(--text)',
                    fontSize: 13, lineHeight: 1.6,
                    wordBreak: 'break-word',
                  }}>
                    {msg.role === 'user' ? (
                      // Mensajes del usuario: texto plano
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                    ) : (
                      // ── CAMBIO 4: mensajes del asistente renderizan HTML ──
                      <div
                        style={{ fontSize: 13, lineHeight: 1.6 }}
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    )}
                  </div>

                  {msg.editProposal && (
                    <button
                      onClick={() => handleApplyEdit(msg.editProposal)}
                      style={{
                        marginTop: 6, padding: '8px 14px', borderRadius: 10, border: 'none',
                        background: 'var(--accent)', color: 'var(--accent-fg)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--sans)',
                      }}>
                      ✅ Aplicar cambios a la nota
                    </button>
                  )}
                </div>
              ))}

              {aiLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg2)', display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="dot" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={aiBottomRef} />
            </div>

            {hasNormalAssistantMessages && (
              <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
                {!aiSaved ? (
                  <button onClick={handleAddToNote}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                      background: 'var(--accent)', color: 'var(--accent-fg)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)',
                    }}>
                    ➕ Agregar conversación a la nota
                  </button>
                ) : (
                  <div style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, textAlign: 'center',
                    background: 'rgba(16,185,129,0.1)', color: '#16a34a',
                    fontSize: 13, fontWeight: 600,
                  }}>
                    ✅ Agregado a la nota
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '10px 14px 24px', flexShrink: 0, borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend() }
                  }}
                  placeholder="Preguntá o pedile que modifique la nota..."
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '9px 12px', fontSize: 13,
                    background: 'var(--bg2)', color: 'var(--text)',
                    fontFamily: 'var(--sans)', minHeight: 'unset',
                  }}
                />
                <button
                  onClick={() => handleAiSend()}
                  disabled={aiLoading || !aiInput.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: 'none',
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, padding: 0,
                    opacity: (aiLoading || !aiInput.trim()) ? 0.4 : 1,
                  }}>
                  <IconSend />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}