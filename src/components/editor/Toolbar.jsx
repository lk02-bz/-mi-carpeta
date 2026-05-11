/*
╔══════════════════════════════════════════════════════════╗
║  src/components/editor/Toolbar.jsx                       ║
║                                                          ║
║  Barra de herramientas del editor enriquecido.           ║
║                                                          ║
║  Cada botón llama a un comando de TipTap y se marca      ║
║  como activo (.tb-active) cuando el cursor está dentro   ║
║  del formato correspondiente.                            ║
║                                                          ║
║  Props:                                                  ║
║  • editor — instancia de TipTap (de useEditor)           ║
╚══════════════════════════════════════════════════════════╝
*/

export default function Toolbar({ editor }) {
  if (!editor) return null

  /*
    Cada botón de la toolbar tiene:
    • onClick   — el comando TipTap que ejecuta
    • isActive  — si el formato está activo en la posición actual
    • title     — tooltip al hacer hover (accesibilidad)
    • label     — lo que se muestra (texto o SVG)
  */
  const buttons = [
    // ── Formato de texto ──────────────────────────────────
    {
      group: 'format',
      title: 'Negrita',
      label: <b>B</b>,
      isActive: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
      disabled: !editor.can().chain().focus().toggleBold().run(),
    },
    {
      group: 'format',
      title: 'Cursiva',
      label: <i>I</i>,
      isActive: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
      disabled: !editor.can().chain().focus().toggleItalic().run(),
    },
    {
      group: 'format',
      title: 'Tachado',
      label: <s>S</s>,
      isActive: editor.isActive('strike'),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },

    // ── Títulos ───────────────────────────────────────────
    {
      group: 'heading',
      title: 'Título 1',
      label: 'H1',
      isActive: editor.isActive('heading', { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      group: 'heading',
      title: 'Título 2',
      label: 'H2',
      isActive: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },

    // ── Listas ────────────────────────────────────────────
    {
      group: 'list',
      title: 'Lista con viñetas',
      label: <BulletIcon />,
      isActive: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      group: 'list',
      title: 'Lista numerada',
      label: <OrderedIcon />,
      isActive: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      group: 'list',
      title: 'Checklist',
      label: <CheckIcon />,
      isActive: editor.isActive('taskList'),
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },

    // ── Bloque de código ──────────────────────────────────
    {
      group: 'code',
      title: 'Bloque de código',
      label: <CodeIcon />,
      isActive: editor.isActive('codeBlock'),
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ]

  /*
    Agrupamos los botones con un separador visual entre grupos.
    Usamos reduce para insertar un <div className="tb-sep" /> 
    entre grupos distintos.
  */
  let lastGroup = null

  return (
    <div className="toolbar" role="toolbar" aria-label="Opciones de formato">
      {buttons.map((btn, i) => {
        const showSep = lastGroup !== null && btn.group !== lastGroup
        lastGroup = btn.group

        return (
          <span key={i} style={{ display: 'contents' }}>
            {showSep && <span className="tb-sep" aria-hidden="true" />}
            <button
              type="button"
              title={btn.title}
              aria-label={btn.title}
              aria-pressed={btn.isActive}
              className={`tb-btn ${btn.isActive ? 'tb-active' : ''}`}
              onClick={btn.onClick}
              disabled={btn.disabled}
            >
              {btn.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}


/* ── Íconos SVG inline ──────────────────────────────────────
   Pequeños, accesibles, sin dependencia externa.
   16x16, stroke heredado del padre para respetar dark mode.
*/

function BulletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="3" cy="4.5" r="1" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="8"   r="1" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="11.5" r="1" fill="currentColor" stroke="none"/>
      <line x1="6.5" y1="4.5" x2="13" y2="4.5"/>
      <line x1="6.5" y1="8"   x2="13" y2="8"/>
      <line x1="6.5" y1="11.5" x2="13" y2="11.5"/>
    </svg>
  )
}

function OrderedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <text x="1" y="5.5" fontSize="5" fontWeight="600" stroke="none" fill="currentColor">1.</text>
      <text x="1" y="9"   fontSize="5" fontWeight="600" stroke="none" fill="currentColor">2.</text>
      <text x="1" y="12.5" fontSize="5" fontWeight="600" stroke="none" fill="currentColor">3.</text>
      <line x1="6.5" y1="4.5"  x2="13" y2="4.5"/>
      <line x1="6.5" y1="8"    x2="13" y2="8"/>
      <line x1="6.5" y1="11.5" x2="13" y2="11.5"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3" width="5" height="5" rx="1"/>
      <polyline points="2.5,5.5 4,7 6.5,4"/>
      <line x1="8.5" y1="5.5"  x2="14" y2="5.5"/>
      <rect x="1.5" y="10" width="5" height="5" rx="1"/>
      <line x1="8.5" y1="12.5" x2="14" y2="12.5"/>
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,4 1,8 5,12"/>
      <polyline points="11,4 15,8 11,12"/>
      <line x1="9" y1="2.5" x2="7" y2="13.5"/>
    </svg>
  )
}
