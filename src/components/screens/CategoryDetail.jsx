/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/CategoryDetail.jsx               ║
║                                                          ║
║  Pantalla de detalle de una categoría.                   ║
║  Muestra todos los apuntes de esa categoría.             ║
║  Permite eliminar la categoría con confirmación.         ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                    from 'react'
import { useApp }                      from '../../context/AppContext'
import { fdate, truncate }             from '../../utils/helpers'

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

  // Controla si se muestra el cuadro de confirmación de eliminación
  const [confirmando, setConfirmando] = useState(false)
  const [borrando,    setBorrando]    = useState(false)

  /*
    currentFrame.catId contiene el ID de la categoría activa.
    Lo pusimos en el nav cuando el usuario tocó una tarjeta
    en CategoriesScreen: pushTo('catd', { catId: cat.id, ... })
  */
  const catId = currentFrame.catId

  // Buscamos los datos completos de la categoría
  const cat = cats.find(c => c.id === catId)

  // Filtramos solo los apuntes de esta categoría
  const apuntesDeEstaCat = notes.filter(n => n.category_id === catId)

  // Si la categoría no existe (fue eliminada o hubo un error de nav)
  if (!cat) {
    return (
      <div className="cnt">
        <div className="empty">Categoría no encontrada.</div>
      </div>
    )
  }

  /* ── handleEliminarCategoria ─────────────────────────────── */
  async function handleEliminarCategoria() {
    setBorrando(true)
    const { error } = await deleteCategory(catId)
    setBorrando(false)

    if (error) {
      showToast('Error al eliminar la categoría')
      return
    }

    showToast('Categoría eliminada')
    /*
      Volvemos atrás después de eliminar.
      goBack() nos lleva a CategoriesScreen (o donde estábamos antes).
    */
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
          noteId: null,          // null = crear nuevo (no editar)
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
        apuntesDeEstaCat.map(note => (
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
            {note.content
              ? <div className="np">{truncate(note.content)}</div>
              : null
            }
            <div className="nd">{fdate(note.updated_at)}</div>
          </div>
        ))
      )}

      {/* ── Zona de peligro: eliminar categoría ── */}
      <div style={{ marginTop: 32 }}>
        <div className="sec">Zona de peligro</div>

        {!confirmando ? (
          /*
            Primer clic: muestra el cuadro de confirmación.
            Esto evita que el usuario elimine por accidente.
            Equivale al div.confirm-box oculto/visible de la app vanilla.
          */
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
