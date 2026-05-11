/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/SearchScreen.jsx                 ║
║                                                          ║
║  Búsqueda en tiempo real sobre todos los apuntes.        ║
║  Filtra por título Y contenido simultáneamente.          ║
║  Al tocar un resultado abre el editor para editarlo.     ║
║                                                          ║
║  Cambios Fase 2:                                         ║
║  ✦ Importa stripHtml para dos usos:                      ║
║    1. Búsqueda: busca en texto plano, no en HTML crudo   ║
║       (sin esto, buscar "p" matchearía todos los tags    ║
║       <p> de todas las notas)                            ║
║    2. Preview: muestra texto limpio en los resultados    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }                           from 'react'
import { useApp }                             from '../../context/AppContext'
import { fdate, truncate, stripHtml }         from '../../utils/helpers'

export default function SearchScreen() {
  const { notes, cats, pushTo } = useApp()
  const [query, setQuery] = useState('')

  const q = query.toLowerCase().trim()

  const resultados = q.length < 2
    ? []
    : notes.filter(n => {
        /*
          Buscamos en el texto plano, no en el HTML crudo.
          stripHtml() convierte "<p>hola</p>" → "hola"
          para que la búsqueda funcione sobre el contenido real.
        */
        const contenidoPlano = stripHtml(n.content).toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          contenidoPlano.includes(q)
        )
      })

  function getCat(catId) {
    return cats.find(c => c.id === catId)
  }

  /*
    resaltarTexto — envuelve el término buscado en <mark> para destacarlo.
    Recibe texto ya limpio (sin HTML), así que el resaltado
    funciona sobre el contenido real, no sobre los tags.
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
            /*
              stripHtml() antes de truncate y resaltarTexto
              para que el usuario vea texto limpio con el término
              resaltado, no tags HTML con el término resaltado.
            */
            const contenidoPlano = truncate(stripHtml(note.content), 100)

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

                {/* Preview del contenido (texto plano) con término resaltado */}
                {contenidoPlano ? (
                  <div className="np">
                    {resaltarTexto(contenidoPlano, q)}
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
