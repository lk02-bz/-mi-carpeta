/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/CategoryDetail.jsx               ║
║                                                          ║
║  Pantalla de detalle de una categoría.                   ║
║  Muestra todos los apuntes de esa categoría.             ║
║  Permite eliminar la categoría con confirmación.         ║
║                                                          ║
║  Cambios Fase 2:                                         ║
║  ✦ Importa stripHtml para limpiar el HTML de TipTap      ║
║    antes de mostrarlo en el preview de cada apunte       ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                           from 'react'
import { useApp }                             from '../../context/AppContext'
import { fdate, truncate, stripHtml }         from '../../utils/helpers'

export default function CategoryDetail() {
  const {
    cats,
    notes,
    deleteCategory,
    pushTo,
    goBack,
    showToast,
    currentFrame,
  } = useApp()

  const [confirmando, setConfirmando] = useState(false)
  const [borrando,    setBorrando]    = useState(false)

  const catId = currentFrame.catId
  const cat   = cats.find(c => c.id === catId)
  const apuntesDeEstaCat = notes.filter(n => n.category_id === catId)

  if (!cat) {
    return (
      <div className="cnt">
        <div className="empty">Categoría no encontrada.</div>
      </div>
    )
  }

  async function handleEliminarCategoria() {
    setBorrando(true)
    const { error } = await deleteCategory(catId)
    setBorrando(false)

    if (error) {
      showToast('Error al eliminar la categoría')
      return
    }

    showToast('Categoría eliminada')
    goBack()
  }

  return (
    <div className="cnt">

      {/* ── Hero: emoji, nombre y cantidad de apuntes ── */}
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

      {/* ── Botón nuevo apunte ── */}
      <button
        className="btn-p"
        style={{ marginBottom: 20 }}
        onClick={() => pushTo('editor', {
          catId,
          noteId: null,
          title: 'Nuevo apunte',
        })}
      >
        + Nuevo apunte
      </button>

      {/* ── Lista de apuntes ── */}
      <div className="sec">Apuntes</div>

      {apuntesDeEstaCat.length === 0 ? (
        <div className="empty">
          Esta categoría no tiene apuntes todavía.<br />
          Tocá el botón de arriba para crear el primero.
        </div>
      ) : (
        apuntesDeEstaCat.map(note => {
          /*
            stripHtml() elimina los tags HTML que genera TipTap.
            Sin esto, el preview mostraría: "<p>texto</p><h1>Tít..."
            Con esto muestra:               "texto Título..."
          */
          const preview = truncate(stripHtml(note.content))

          return (
            <div
              key={note.id}
              className="note-row"
              onClick={() => pushTo('editor', {
                catId,
                noteId: note.id,
                title:  'Editar apunte',
              })}
            >
              <div className="nt">{note.title}</div>
              {preview ? <div className="np">{preview}</div> : null}
              <div className="nd">{fdate(note.updated_at)}</div>
            </div>
          )
        })
      )}

      {/* ── Zona de peligro: eliminar categoría ── */}
      <div style={{ marginTop: 32 }}>
        <div className="sec">Zona de peligro</div>

        {!confirmando ? (
          <button
            className="btn-d"
            onClick={() => setConfirmando(true)}
          >
            Eliminar categoría
          </button>
        ) : (
          <div className="confirm-box">
            <p>
              ¿Eliminar "{cat.name}"? Se borrarán también sus{' '}
              {apuntesDeEstaCat.length}{' '}
              {apuntesDeEstaCat.length === 1 ? 'apunte' : 'apuntes'}.
              Esta acción no se puede deshacer.
            </p>
            <div className="confirm-row">
              <button
                className="confirm-yes"
                onClick={handleEliminarCategoria}
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

    </div>
  )
}
