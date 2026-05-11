/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Pantalla de inicio. Muestra:                            ║
║  • Saludo personalizado según la hora                    ║
║  • Estadísticas: total de categorías y apuntes           ║
║  • Los 4 apuntes más recientes                           ║
║                                                          ║
║  Cambios Fase 2:                                         ║
║  ✦ Importa stripHtml para limpiar el HTML de TipTap      ║
║    antes de mostrarlo en el preview de la tarjeta        ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp }                             from '../../context/AppContext'
import { getGreeting, fdate, truncate, stripHtml } from '../../utils/helpers'

export default function HomeScreen() {
  const {
    user,
    cats,
    notes,
    dataLoading,
    pushTo,
  } = useApp()

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
        <p className="greet-sub">{user.email}</p>
      </div>

      {/* ── Estadísticas ── */}
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

      {/* ── Apuntes recientes ── */}
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
            onPress={() => pushTo('editor', {
              noteId: note.id,
              catId:  note.category_id,
              title:  'Editar apunte',
            })}
          />
        ))
      )}

    </div>
  )
}


function NoteCard({ note, catLabel, onPress }) {
  /*
    stripHtml() elimina los tags HTML que genera TipTap.
    Sin esto, el preview mostraría: "<p>texto</p><h1>Tít..."
    Con esto muestra:               "texto Título..."
  */
  const preview = truncate(stripHtml(note.content))

  return (
    <div className="note-row" onClick={onPress}>
      <div className="nt">{note.title}</div>
      {preview ? (
        <div className="np">{preview}</div>
      ) : null}
      <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel ? <span className="chip">{catLabel}</span> : null}
      </div>
    </div>
  )
}
