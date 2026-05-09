/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/SearchScreen.jsx                 ║
║                                                          ║
║  Búsqueda en tiempo real sobre todos los apuntes.        ║
║  Filtra por título Y contenido simultáneamente.          ║
║  Al tocar un resultado abre el editor para editarlo.     ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }        from 'react'
import { useApp }          from '../../context/AppContext'
import { fdate, truncate } from '../../utils/helpers'

export default function SearchScreen() {
  const { notes, cats, pushTo } = useApp()
  const [query, setQuery] = useState('')

  /*
    Búsqueda en tiempo real — no necesita Supabase.
    Todos los apuntes ya están en memoria (en el contexto),
    así que podemos filtrar instantáneamente sin llamadas a la red.

    toLowerCase() normaliza mayúsculas/minúsculas para que
    "react" encuentre "React", "REACT", etc.

    Buscamos en título Y en contenido con ||  (OR lógico).
  */
  const q = query.toLowerCase().trim()

  const resultados = q.length < 2
    ? []  // No buscamos con menos de 2 caracteres (evita resultados masivos)
    : notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      )

  function getCat(catId) {
    return cats.find(c => c.id === catId)
  }

  /*
    resaltarTexto — envuelve el término buscado en <mark> para destacarlo.

    Usamos una expresión regular (RegExp) construida dinámicamente
    para encontrar el texto sin importar mayúsculas (flag 'gi'):
    g = global (todas las ocurrencias), i = case insensitive.

    split() + map() para poder insertar el <mark> como JSX.
    (No podemos usar innerHTML en React por seguridad.)
  */
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

      {/* ── Estados de la búsqueda ── */}
      {q.length === 0 && (
        <div className="empty">
          Escribí al menos 2 caracteres para buscar.
        </div>
      )}

      {q.length >= 2 && resultados.length === 0 && (
        <div className="empty">
          No se encontraron apuntes para "{query}".
        </div>
      )}

      {/* ── Resultados ── */}
      {resultados.length > 0 && (
        <>
          <div className="sec">
            {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
          </div>

          {resultados.map(note => {
            const cat = getCat(note.category_id)
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
                {note.content ? (
                  <div className="np">
                    {resaltarTexto(truncate(note.content, 100), q)}
                  </div>
                ) : null}

                {/* Fecha y categoría */}
                <div className="nd" style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
                  <span>{fdate(note.updated_at)}</span>
                  {cat && (
                    <span className="chip">{cat.emoji} {cat.name}</span>
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
