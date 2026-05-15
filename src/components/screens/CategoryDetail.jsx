/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/CategoryDetail.jsx               ║
║                                                          ║
║  Cambios Fase 5:                                         ║
║  ✦ Fix bug — opción de MOVER apuntes antes de eliminar   ║
║  ✦ Selector de categoría destino en el modal             ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                   from 'react'
import { useApp }                     from '../../context/AppContext'
import { fdate, truncate, stripHtml } from '../../utils/helpers'

export default function CategoryDetail() {
  const {
    cats,
    notes,
    deleteCategory,
    moveCategoryNotes,
    pushTo,
    goBack,
    showToast,
    currentFrame,
    toggleFavorite,
    getTagsForNote,
  } = useApp()

  const [confirmando, setConfirmando] = useState(false)
  const [borrando,    setBorrando]    = useState(false)
  const [moviendo,    setMoviendo]    = useState(false)
  const [catDestino,  setCatDestino]  = useState('')    // id de la cat destino

  const catId              = currentFrame.catId
  const cat                = cats.find(c => c.id === catId)
  const apuntesDeEstaCat   = notes.filter(n => n.category_id === catId)
  const otrasCateg         = cats.filter(c => c.id !== catId)

  if (!cat) {
    return (
      <div className="cnt">
        <div className="empty">Categoría no encontrada.</div>
      </div>
    )
  }

  /* ── Eliminar sin mover ─────────────────────────────── */
  async function handleEliminarCategoria() {
    setBorrando(true)
    const { error } = await deleteCategory(catId)
    setBorrando(false)
    if (error) { showToast('Error al eliminar la categoría'); return }
    showToast('Categoría eliminada')
    goBack()
  }

  /* ── Mover apuntes y luego eliminar ─────────────────── */
  async function handleMoverYEliminar() {
    if (!catDestino) { showToast('Elegí una categoría destino'); return }
    setMoviendo(true)
    const { error: errMover } = await moveCategoryNotes(catId, catDestino)
    if (errMover) { showToast('Error al mover los apuntes'); setMoviendo(false); return }
    const { error: errBorrar } = await deleteCategory(catId)
    setMoviendo(false)
    if (errBorrar) { showToast('Error al eliminar la categoría'); return }
    const destNombre = cats.find(c => c.id === catDestino)?.name || ''
    showToast(`Apuntes movidos a "${destNombre}" ✓`)
    goBack()
  }

  return (
    <div className="cnt">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="cat-hero">
        <span className="cat-hero-emoji">{cat.emoji}</span>
        <div>
          <div className="cat-hero-name">{cat.name}</div>
          <div className="cat-hero-count">
            {apuntesDeEstaCat.length}{' '}
            {apuntesDeEstaCat.length === 1 ? 'apunte' : 'apuntes'}
          </div>
        </div>
      </div>

      {/* ── Botón nuevo apunte ───────────────────────────── */}
      <button
        className="btn-p"
        style={{ marginBottom: 20 }}
        onClick={() => pushTo('editor', { catId, noteId: null, title: 'Nuevo apunte' })}
      >
        + Nuevo apunte
      </button>

      {/* ── Lista de apuntes ─────────────────────────────── */}
      <div className="sec">Apuntes</div>

      {apuntesDeEstaCat.length === 0 ? (
        <div className="empty">
          Esta categoría no tiene apuntes todavía.<br />
          Tocá el botón de arriba para crear el primero.
        </div>
      ) : (
        apuntesDeEstaCat.map(note => {
          const preview  = truncate(stripHtml(note.content))
          const notaTags = getTagsForNote(note.id)
          return (
            <div
              key={note.id}
              className="note-row"
              onClick={() => pushTo('editor', { catId, noteId: note.id, title: 'Editar apunte' })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div className="nt" style={{ flex: 1 }}>{note.title}</div>
                <button
                  onClick={e => { e.stopPropagation(); toggleFavorite(note.id, note.is_favorite) }}
                  aria-label={note.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', lineHeight: 1, flexShrink: 0, opacity: note.is_favorite ? 1 : 0.25, color: 'var(--text)', transition: 'opacity 0.15s' }}
                >★</button>
              </div>
              {preview && <div className="np">{preview}</div>}
              {notaTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {notaTags.map(tag => <span key={tag.id} className="chip">#{tag.name}</span>)}
                </div>
              )}
              <div className="nd" style={{ marginTop: 6 }}>{fdate(note.updated_at)}</div>
            </div>
          )
        })
      )}


      {/* ══════════════════════════════════════════════════
          ZONA DE PELIGRO — eliminar categoría
          ══════════════════════════════════════════════════ */}
      <div style={{ marginTop: 32 }}>
        <div className="sec">Zona de peligro</div>

        {!confirmando ? (
          <button className="btn-d" onClick={() => setConfirmando(true)}>
            Eliminar categoría
          </button>
        ) : (
          <div className="confirm-box">

            {/* Cuántos apuntes se afectan */}
            <p style={{ marginBottom: 14, lineHeight: 1.5 }}>
              {apuntesDeEstaCat.length > 0 ? (
                <>
                  <strong>"{cat.name}"</strong> tiene{' '}
                  <strong style={{ color: 'var(--danger)' }}>
                    {apuntesDeEstaCat.length} {apuntesDeEstaCat.length === 1 ? 'apunte' : 'apuntes'}
                  </strong>.
                  ¿Qué querés hacer con ellos?
                </>
              ) : (
                <>¿Eliminar <strong>"{cat.name}"</strong>? No tiene apuntes. Esta acción no se puede deshacer.</>
              )}
            </p>

            {/* Opción A: mover apuntes (solo si hay apuntes y otras categorías) */}
            {apuntesDeEstaCat.length > 0 && otrasCateg.length > 0 && (
              <div style={{
                background: 'rgba(59,130,246,0.07)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 12, padding: '12px 14px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-tasks)', marginBottom: 8 }}>
                  📦 Mover apuntes a otra categoría
                </div>
                <select
                  value={catDestino}
                  onChange={e => setCatDestino(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px',
                    borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)',
                    fontSize: 14, marginBottom: 10,
                  }}
                >
                  <option value="">Elegí una categoría…</option>
                  {otrasCateg.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleMoverYEliminar}
                  disabled={moviendo || !catDestino}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    border: 'none', background: 'var(--c-tasks)', color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    opacity: !catDestino ? 0.5 : 1,
                  }}
                >
                  {moviendo ? 'Moviendo...' : 'Mover y eliminar categoría'}
                </button>
              </div>
            )}

            {/* Opción B: eliminar todo */}
            <div style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
                🗑️ {apuntesDeEstaCat.length > 0 ? 'Eliminar categoría y todos sus apuntes' : 'Eliminar categoría'}
              </div>
              <button
                className="confirm-yes"
                onClick={handleEliminarCategoria}
                disabled={borrando}
                style={{ width: '100%' }}
              >
                {borrando ? 'Eliminando...' : apuntesDeEstaCat.length > 0 ? `Sí, eliminar todo (${apuntesDeEstaCat.length} apuntes)` : 'Sí, eliminar'}
              </button>
            </div>

            {/* Cancelar */}
            <button className="confirm-no" onClick={() => { setConfirmando(false); setCatDestino('') }} style={{ width: '100%' }}>
              Cancelar
            </button>

          </div>
        )}
      </div>

    </div>
  )
}
