/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AddCategory.jsx                  ║
║                                                          ║
║  Formulario para crear una nueva categoría.              ║
║  Tiene un selector de emoji y un campo de nombre.        ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState }   from 'react'
import { useApp }     from '../../context/AppContext'

/* Lista de emojis disponibles para elegir */
const EMOJIS = [
  '📚','💻','🗣️','💰','✂️','🌱','💡','🍳','💪','🎵',
  '🎨','✈️','🏠','❤️','⚽','🎮','📷','🔬','📝','🌎',
  '🧠','🎯','🚀','⚡','🌟','🔑','💎','🎤','📊','🛠️',
]

export default function AddCategory() {
  const { createCategory, goBack, showToast } = useApp()

  const [nombre,   setNombre]   = useState('')
  const [emoji,    setEmoji]    = useState('📝')   // emoji seleccionado
  const [error,    setError]    = useState('')
  const [guardando, setGuardando] = useState(false)

  async function handleGuardar(e) {
    e.preventDefault()
    setError('')

    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) {
      setError('El nombre no puede estar vacío')
      return
    }

    setGuardando(true)
    const { error } = await createCategory({ name: nombreLimpio, emoji })
    setGuardando(false)

    if (error) {
      setError('Error al crear la categoría. Intentá de nuevo.')
      return
    }

    showToast('Categoría creada ✓')
    goBack() // Vuelve a CategoriesScreen
  }

  return (
    <div className="cnt">

      <form onSubmit={handleGuardar}>

        {/* ── Selector de emoji ── */}
        <div className="fld">
          <label className="lbl">Ícono</label>

          {/* Vista previa del emoji seleccionado */}
          <div style={{
            fontSize: 48,
            textAlign: 'center',
            padding: '12px 0 16px',
          }}>
            {emoji}
          </div>

          {/* Grilla de emojis para elegir */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
            background: 'var(--bg2)',
            borderRadius: 'var(--radius)',
            padding: 12,
          }}>
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"  // Importante: evita que envíe el form al hacer clic
                onClick={() => setEmoji(e)}
                style={{
                  fontSize: 24,
                  padding: '6px 0',
                  background: emoji === e ? 'var(--bg3)' : 'none',
                  border: emoji === e
                    ? '1px solid var(--border2)'
                    : '1px solid transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  /*
                    Resaltamos el emoji seleccionado con fondo y borde.
                    Los demás tienen borde transparente para mantener el tamaño
                    y evitar el "salto" visual al seleccionar.
                  */
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* ── Nombre ── */}
        <div className="fld">
          <label className="lbl">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Ingeniería Computación"
            maxLength={40}
            autoFocus
          />
          {error && <div className="err">{error}</div>}
        </div>

        <button className="btn-p" type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Crear categoría'}
        </button>

      </form>

      {/* Botón cancelar — vuelve sin guardar */}
      <button className="btn-s" onClick={goBack}>
        Cancelar
      </button>

    </div>
  )
}
