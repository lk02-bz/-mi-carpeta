/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/CategoriesScreen.jsx             ║
║                                                          ║
║  Grilla de todas las categorías del usuario.             ║
║  Al tocar una categoría navega a CategoryDetail.         ║
║  Botón para agregar nueva categoría.                     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp } from '../../context/AppContext'

export default function CategoriesScreen() {
  const { cats, notes, dataLoading, pushTo } = useApp()

  /*
    Contamos cuántos apuntes tiene cada categoría.
    filter() crea un nuevo array con solo los apuntes
    cuyo category_id coincide con el id de la categoría.
    .length nos da la cantidad.

    Esto es equivalente al nts.filter(n=>n.cid===c.id).length
    de la app vanilla.
  */
  function contarApuntes(catId) {
    return notes.filter(n => n.category_id === catId).length
  }

  if (dataLoading) {
    return <div className="cnt"><div className="empty">Cargando...</div></div>
  }

  return (
    <div className="cnt">

      {/* ── Botón nueva categoría ── */}
      <button
        className="btn-p"
        style={{ marginBottom: 20 }}
        onClick={() => pushTo('addcat', { title: 'Nueva categoría' })}
      >
        + Nueva categoría
      </button>

      {/* ── Grilla de categorías ── */}
      {cats.length === 0 ? (
        <div className="empty">No tenés categorías todavía.</div>
      ) : (
        <div className="grid2">
          {cats.map(cat => {
            const cantidad = contarApuntes(cat.id)
            return (
              <div
                key={cat.id}
                className="cat-card"
                onClick={() => pushTo('catd', {
                  catId: cat.id,
                  title: cat.name,
                })}
              >
                <span className="cat-emoji">{cat.emoji}</span>
                <div className="cat-name">{cat.name}</div>
                <div className="cat-count">
                  {cantidad} {cantidad === 1 ? 'apunte' : 'apuntes'}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
