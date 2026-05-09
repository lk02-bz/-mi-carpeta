/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/HomeScreen.jsx                   ║
║                                                          ║
║  Pantalla de inicio. Muestra:                            ║
║  • Saludo personalizado según la hora                    ║
║  • Estadísticas: total de categorías y apuntes           ║
║  • Los 4 apuntes más recientes                           ║
╚══════════════════════════════════════════════════════════╝
*/

import { useApp }                   from '../../context/AppContext'
import { getGreeting, fdate, truncate } from '../../utils/helpers'

export default function HomeScreen() {
  const {
    user,
    cats,
    notes,
    dataLoading,
    pushTo,
  } = useApp()

  /*
    Los 4 apuntes más recientes.
    Como useNotes ya los devuelve ordenados por updated_at DESC,
    solo necesitamos tomar los primeros 4 con slice().
  */
  const recientes = notes.slice(0, 4)

  /*
    Para mostrar el nombre de la categoría en cada tarjeta de apunte,
    necesitamos buscar la categoría por su ID.
    find() recorre el array y devuelve el primer elemento que cumple la condición.
  */
  function getNombreCat(catId) {
    const cat = cats.find(c => c.id === catId)
    return cat ? `${cat.emoji} ${cat.name}` : ''
  }

  // Mientras carga, mostramos un estado vacío limpio
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
          user.email → el email del usuario logueado.
          En el futuro podemos reemplazarlo por un nombre personalizado.
        */}
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


/* ── Subcomponente: tarjeta de apunte ──────────────────────
   Lo definimos acá (no en un archivo separado) porque solo
   lo usa HomeScreen por ahora. Cuando lo necesitemos en
   CategoryDetail también, lo movemos a components/ui/.
*/
function NoteCard({ note, catLabel, onPress }) {
  return (
    <div className="note-row" onClick={onPress}>
      <div className="nt">{note.title}</div>
      {note.content ? (
        <div className="np">{truncate(note.content)}</div>
      ) : null}
      <div className="nd" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>{fdate(note.updated_at)}</span>
        {catLabel ? <span className="chip">{catLabel}</span> : null}
      </div>
    </div>
  )
}
