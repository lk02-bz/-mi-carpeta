/*
╔══════════════════════════════════════════════════════════╗
║  src/components/editor/AttachmentPanel.jsx               ║
║                                                          ║
║  Panel de archivos adjuntos que aparece debajo           ║
║  del editor. Muestra PDFs, docs y otros archivos         ║
║  como tarjetas con ícono, nombre, tamaño y               ║
║  botones de descargar/eliminar.                          ║
║                                                          ║
║  Props:                                                  ║
║  • attachments  — array de adjuntos (de useAttachments)  ║
║  • uploading    — bool, true mientras sube un archivo    ║
║  • onUpload     — fn(file) para subir un archivo nuevo   ║
║  • onRemove     — fn(attachment) para eliminar           ║
║  • disabled     — bool, true si la nota no está guardada ║
╚══════════════════════════════════════════════════════════╝
*/

import { useRef } from 'react'
import { ALLOWED_TYPES, MAX_FILE_SIZE, formatFileSize, getFileIcon } from '../../lib/storage'

export default function AttachmentPanel({
  attachments = [],
  uploading   = false,
  onUpload,
  onRemove,
  disabled    = false,
}) {

  const inputRef = useRef(null)

  /*
    Filtramos solo los adjuntos que NO son imágenes.
    Las imágenes se insertan inline en el editor TipTap,
    no aparecen en este panel.
  */
  const fileAttachments = attachments.filter(a => !a.file_type.startsWith('image/'))

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file)
    // Limpiamos el input para poder subir el mismo archivo dos veces
    e.target.value = ''
  }

  /*
    Construimos la lista de tipos aceptados para el input.
    Solo los que son 'file', no imágenes (las imágenes tienen su propio botón en la toolbar).
  */
  const acceptedTypes = Object.keys(ALLOWED_TYPES)
    .filter(t => ALLOWED_TYPES[t] === 'file')
    .join(',')

  return (
    <div className="attachment-panel">

      {/* ── Encabezado ── */}
      <div className="attachment-header">
        <span className="lbl" style={{ margin: 0 }}>Archivos adjuntos</span>

        {disabled ? (
          <span className="attachment-hint">
            Guardá el apunte primero
          </span>
        ) : (
          <button
            type="button"
            className="attachment-add-btn"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : '+ Adjuntar'}
          </button>
        )}

        {/* Input oculto — lo activamos con el botón de arriba */}
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* ── Lista de adjuntos ── */}
      {fileAttachments.length === 0 && !uploading ? (
        <p className="attachment-empty">
          {disabled
            ? 'Los adjuntos estarán disponibles después de guardar.'
            : 'Sin archivos adjuntos todavía.'}
        </p>
      ) : (
        <div className="attachment-list">

          {/* Indicador de carga mientras sube */}
          {uploading && (
            <div className="attachment-card attachment-uploading">
              <span className="attachment-icon">⏳</span>
              <span className="attachment-name">Subiendo archivo...</span>
            </div>
          )}

          {fileAttachments.map(att => (
            <AttachmentCard
              key={att.id}
              attachment={att}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}


/* ── Tarjeta individual de adjunto ─────────────────────── */
function AttachmentCard({ attachment, onRemove }) {
  return (
    <div className="attachment-card">

      {/* Ícono según tipo de archivo */}
      <span className="attachment-icon" aria-hidden="true">
        {getFileIcon(attachment.file_type)}
      </span>

      {/* Info del archivo */}
      <div className="attachment-info">
        <span className="attachment-name" title={attachment.file_name}>
          {attachment.file_name}
        </span>
        <span className="attachment-size">
          {formatFileSize(attachment.file_size)}
        </span>
      </div>

      {/* Acciones */}
      <div className="attachment-actions">
        <a
          href={attachment.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="attachment-btn"
          title="Descargar"
          aria-label={`Descargar ${attachment.file_name}`}
        >
          <DownloadIcon />
        </a>
        <button
          type="button"
          className="attachment-btn attachment-btn-delete"
          onClick={() => onRemove(attachment)}
          title="Eliminar adjunto"
          aria-label={`Eliminar ${attachment.file_name}`}
        >
          <TrashIcon />
        </button>
      </div>

    </div>
  )
}


/* ── Íconos ── */
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5 7l3 3 3-3"/>
      <path d="M3 13h10"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5l.5-9"/>
    </svg>
  )
}
