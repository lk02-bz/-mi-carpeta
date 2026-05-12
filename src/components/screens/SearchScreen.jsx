/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/SearchScreen.jsx                 ║
║                                                          ║
║  Cambios Bloque C:                                       ║
║  ✦ Filtro por etiqueta: fila de chips en la parte        ║
║    superior, se combinan con la búsqueda de texto        ║
║  ✦ Chips de etiquetas en cada resultado                  ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                           from 'react'
import { useApp }                             from '../../context/AppContext'
import { fdate, truncate, stripHtml }         from '../../utils/helpers'

export default function SearchScreen() {
  const { notes, cats, tags, pushTo, getTagsForNote } = useApp()

  const [query,     setQuery]     = useState('')
  const [filtroTag, setFiltroTag] = useState(null) // id del tag activo, o null

  const q = query.toLowerCase().trim()

  /*
    La búsqueda combina texto libre + filtro de tag.
    Si solo hay filtro de tag (sin texto), muestra todas las notas con ese tag.
    Si solo hay texto (sin filtro), búsqueda normal.
    Si hay ambos, muestra notas que cumplan los dos criterios.
  */
  const hayFiltro = q.length >= 2 || filtroTag !== null

  const resultados = !hayFiltro ? [] : notes.filter(n => {
    const matchTexto = q.length < 2 || (
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q)
    )
    const matchTag = !filtroTag ||
      getTagsForNote(n.id).some(t => t.id === filtroTag)

    return matchTexto && matchTag
  })

  function getCat(catId) {
    return cats.find(c => c.id === catId)
  }

  function resaltarTexto(texto, termino) {
    if (!termino || !texto) return texto
    const regex  = new RegExp(`(${termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const partes = texto.split(regex)
    return partes.map((parte, i) =>
      regex.test(parte)
        ? <mark key={i} style={{ background: 'var(--bg3)', color: 'var(--text)', borderRadius: 3 }}>{parte}</mark>
        : parte
    )
  }

  function toggleFiltroTag(tagId) {
    /* Si el tag ya estaba activo, lo deseleccionamos */
    setFiltroTag(prev => prev === tagId ? null : tagId)
  }

  return (
    <div className="cnt">

      {/* ── Input de búsqueda ── */}
      <div className="search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar en todos los apuntes..."
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* ── Filtro de etiquetas (solo si el usuario tiene tags) ── */}
      {tags.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}>
          {tags.map(tag => {
            const activo = filtroTag === tag.id
            return (
              <button
                key={tag.id}
                onClick={() => toggleFiltroTag(tag.id)}
                style={{
                  background: activo ? 'var(--accent)' : 'var(--bg3)',
                  color:      activo ? '#fff'          : 'var(--text)',
                  border:     'none',
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  fontWeight: activo ? 600 : 400,
                }}
              >
                #{tag.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Estados de la búsqueda ── */}
      {!hayFiltro && (
        <div className="empty">
          Escribí al menos 2 caracteres o seleccioná una etiqueta para buscar.
        </div>
      )}

      {hayFiltro && resultados.length === 0 && (
        <div className="empty">
          No se encontraron apuntes{query ? ` para "${query}"` : ''}{filtroTag ? ' con esa etiqueta' : ''}.
        </div>
      )}

      {/* ── Resultados ── */}
      {resultados.length > 0 && (
        <>
          <div className="sec">
            {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
          </div>

          {resultados.map(note => {
            const cat           = getCat(note.category_id)
            const contenidoPlano = truncate(stripHtml(note.content), 100)
            const notaTags      = getTagsForNote(note.id)

            return (
              <div
                key={note.id}
                className="note-row"
                onClick={() => pushTo('editor', {
                  noteId: note.id,
                  catId:  note.category_id,
                  title:  'Editar apunte',
                })}
              >
                {/* Título con término resaltado */}
                <div className="nt">
                  {resaltarTexto(note.title, q)}
                </div>

                {/* Preview del contenido con término resaltado */}
                {contenidoPlano ? (
                  <div className="np">
                    {resaltarTexto(contenidoPlano, q)}
                  </div>
                ) : null}

                {/* Chips de etiquetas del resultado */}
                {notaTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {notaTags.map(tag => (
                      <span
                        key={tag.id}
                        className="chip"
                        style={filtroTag === tag.id ? {
                          /* Resaltar el tag activo en el filtro */
                          background: 'var(--accent)',
                          color: '#fff',
                        } : {}}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Fecha y categoría */}
                <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <span>{fdate(note.updated_at)}</span>
                  {cat && (
                    <span className="chip">{cat.emoji} {cat.name}</span>
                  )}
                  {note.is_favorite && (
                    <span style={{ fontSize: 13 }} title="Favorito">★</span>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

    </div>
  )
}
