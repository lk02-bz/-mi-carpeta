/*
╔══════════════════════════════════════════════════════════╗
║  src/components/editor/RichEditor.jsx                    ║
║                                                          ║
║  Cambios Fase 2 (Storage):                               ║
║  ✦ Extensión Image de TipTap para imágenes inline        ║
║  ✦ Drag & drop: arrastrar imagen → sube y se inserta     ║
║  ✦ Props nuevas: onImageUpload, uploading                 ║
╚══════════════════════════════════════════════════════════╝
*/

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit                   from '@tiptap/starter-kit'
import TaskList                     from '@tiptap/extension-task-list'
import TaskItem                     from '@tiptap/extension-task-item'
import Placeholder                  from '@tiptap/extension-placeholder'
import Image                        from '@tiptap/extension-image'
import { useEffect, useCallback }   from 'react'

import Toolbar from './Toolbar'

export default function RichEditor({
  content         = '',
  onChange,
  placeholder     = 'Escribí tu apunte acá...',
  onImageUpload,   // fn(file) → Promise<url> — sube la imagen y devuelve la URL
  uploading       = false,
}) {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading:   { levels: [1, 2] },
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder }),
      Image.configure({
        inline:      false,
        allowBase64: false,
        HTMLAttributes: { class: 'editor-image' },
      }),
    ],

    content,

    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML()
      onChange?.(html)
    },
  })


  /* ── Sincronización externa del contenido ── */
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.isEmpty ? '' : editor.getHTML()
    if (content !== currentHtml) {
      editor.commands.setContent(content || '', false)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── Drag & drop de imágenes ── */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    if (!onImageUpload || !editor) return

    const file = e.dataTransfer?.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    const url = await onImageUpload(file)
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor, onImageUpload])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])


  if (!editor) return null

  return (
    <div
      className="rich-editor"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Toolbar
        editor={editor}
        onImageUpload={onImageUpload}
        uploading={uploading}
      />
      <EditorContent editor={editor} className="rich-editor-content" />
      {uploading && (
        <div className="editor-uploading">Subiendo imagen...</div>
      )}
    </div>
  )
}
