/*
╔══════════════════════════════════════════════════════════╗
║  src/components/editor/RichEditor.jsx                    ║
║                                                          ║
║  Editor de texto enriquecido basado en TipTap.           ║
║                                                          ║
║  Props:                                                  ║
║  • content  (string) — HTML inicial (puede ser '')       ║
║  • onChange (fn)     — se llama con el HTML actualizado  ║
║  • placeholder       — texto de ayuda cuando está vacío  ║
╚══════════════════════════════════════════════════════════╝
*/

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit                   from '@tiptap/starter-kit'
import TaskList                     from '@tiptap/extension-task-list'
import TaskItem                     from '@tiptap/extension-task-item'
import Placeholder                  from '@tiptap/extension-placeholder'
import { useEffect }                from 'react'

import Toolbar from './Toolbar'

export default function RichEditor({ content = '', onChange, placeholder = 'Escribí tu apunte acá...' }) {

  /*
    useEditor inicializa la instancia de TipTap.
    
    extensions — lista de funcionalidades que habilitamos:
    • StarterKit incluye: Bold, Italic, Strike, Heading (H1-H6),
      BulletList, OrderedList, CodeBlock, Blockquote, HardBreak,
      HorizontalRule, History (deshacer/rehacer)
    • TaskList + TaskItem — checklists interactivos ([ ] → [x])
    • Placeholder — texto fantasma cuando el editor está vacío
    
    onUpdate — se ejecuta cada vez que el usuario escribe algo.
    Llamamos a onChange con el HTML actualizado para que
    EditorScreen pueda sincronizar el estado.
  */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],  // Solo H1 y H2 para mantener jerarquía simple
        },
        codeBlock: {
          HTMLAttributes: { class: 'code-block' },
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: false,  // No permitir checklists anidados (más simple)
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],

    content,  // Contenido inicial (HTML o texto plano)

    onUpdate: ({ editor }) => {
      /*
        getHTML() devuelve el contenido como string HTML.
        Si el editor está vacío, TipTap devuelve '<p></p>'.
        Lo normalizamos a '' para no guardar HTML vacío.
      */
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange?.(html)
    },
  })


  /*
    Sincronización externa del contenido.
    
    Si el padre cambia `content` (por ejemplo, el usuario abre
    otra nota sin desmontar el componente — cuando noteId cambia),
    necesitamos actualizar el editor sin que pierda el foco ni
    genere un loop infinito.
    
    setContent(..., false) → el "false" evita emitir onUpdate,
    cortando el loop: onChange → setContent → onUpdate → onChange...
  */
  useEffect(() => {
    if (!editor) return

    const currentHtml = editor.isEmpty ? '' : editor.getHTML()
    if (content !== currentHtml) {
      editor.commands.setContent(content || '', false)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps


  /*
    Limpiar la instancia de TipTap cuando el componente
    se desmonta. TipTap lo hace automáticamente, pero
    es buena práctica explicitarlo.
  */
  // useEditor ya maneja cleanup interno en su destroy


  if (!editor) return null

  return (
    <div className="rich-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  )
}
