/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Cambios Fase 3.1.B:                                     ║
║  ✦ El saludo usa displayName si existe,                  ║
║    si no, muestra el email como antes                    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp }                                        from '../../context/AppContext'
import { getGreeting, fdate, truncate, stripHtml }       from '../../utils/helpers'

export default function HomeScreen() {
  const {
    user,
    cats,
    notes,
    dataLoading,
    pushTo,
    toggleFavorite,
    getTagsForNote,
    displayName,         // ← nuevo Fase 3.1.B
  } = useApp()

  const favoritos = notes.filter(n => n.is_favorite)
  const recientes = notes.slice(0, 4)

  function getNombreCat(catId) {
    const cat = cats.find(c => c.id === catId)
    return cat ? `${cat.emoji} ${cat.name}` : ''
  }

  if (dataLoading) {
    return (
      <div className="cnt">
        <div className="empty">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="cnt">

      {/* ── Saludo ── */}
      <div style={{ marginBottom: 24 }}>
        <p className="greet-name">{getGreeting()}</p>
        {/*
          Si el usuario configuró un nombre en Perfil, lo mostramos.
          Si no, mostramos el email como antes.
          Así el cambio es compatible con usuarios que no hayan ido al Perfil todavía.
        */}
        <p className="greet-sub">
          {displayName || user.email}
        </p>
      </div>

      {/* ── Estadísticas rápidas ── */}
      <div className="stat-row">
        <div className="stat-c">
          <div className="sl">Categorías</div>
          <div className="sv">{cats.length}</div>
        </div>
        <div className="stat-c">
          <div className="sl">Apuntes</div>
          <div className="sv">{notes.length}</div>
        </div>
      </div>

      {/* ── Favoritos ── */}
      {favoritos.length > 0 && (
        <>
          <div className="sec">Favoritos</div>
          {favoritos.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              catLabel={getNombreCat(note.category_id)}
              notaTags={getTagsForNote(note.id)}
              onPress={() => pushTo('editor', {
                noteId: note.id,
                catId:  note.category_id,
                title:  'Editar apunte',
              })}
              onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
            />
          ))}
        </>
      )}

      {/* ── Recientes ── */}
      <div className="sec">Recientes</div>

      {recientes.length === 0 ? (
        <div className="empty">
          Todavía no tenés apuntes.<br />
          Tocá el <strong>+</strong> para crear el primero.
        </div>
      ) : (
        recientes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            catLabel={getNombreCat(note.category_id)}
            notaTags={getTagsForNote(note.id)}
            onPress={() => pushTo('editor', {
              noteId: note.id,
              catId:  note.category_id,
              title:  'Editar apunte',
            })}
            onToggleFavorite={() => toggleFavorite(note.id, note.is_favorite)}
          />
        ))
      )}

    </div>
  )
}


function NoteCard({ note, catLabel, notaTags, onPress, onToggleFavorite }) {
  const preview = truncate(stripHtml(note.content))

  return (
    <div className="note-row" onClick={onPress}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div className="nt" style={{ flex: 1 }}>{note.title}</div>
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          aria-label={note.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 16, padding: '2px 4px', lineHeight: 1, flexShrink: 0,
            opacity: note.is_favorite ? 1 : 0.25,
            color: 'var(--text)', transition: 'opacity 0.15s',
          }}
        >
          ★
        </button>
      </div>

      {preview ? <div className="np">{preview}</div> : null}

      {notaTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {notaTags.map(tag => (
            <span key={tag.id} className="chip">#{tag.name}</span>
          ))}
        </div>
      )}

      <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel ? <span className="chip">{catLabel}</span> : null}
      </div>

    </div>
  )
}
