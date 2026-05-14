/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/VisionBoardScreen.jsx            ║
║                                                          ║
║  Fase 4 — Vision Board                                   ║
║  ✦ Grid de imágenes motivacionales                       ║
║  ✦ Upload a Supabase Storage                             ║
║  ✦ Caption editable por imagen                           ║
║  ✦ Filtro por meta o "todas"                             ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'

export default function VisionBoardScreen() {
  const {
    goals,
    goalImages,
    goalsLoading,
    uploadGoalImage,
    updateImageCaption,
    deleteGoalImage,
    showToast,
    goBack,
  } = useApp()

  const [filterGoalId,  setFilterGoalId]  = useState('all')  // 'all' | uuid
  const [editCaption,   setEditCaption]   = useState(null)    // { id, text }
  const [uploading,     setUploading]     = useState(false)
  const [lightbox,      setLightbox]      = useState(null)    // url o null
  const fileRef = useRef()

  /* ── Imágenes filtradas ─────────────────────────────── */
  const displayed = filterGoalId === 'all'
    ? goalImages
    : goalImages.filter(i => i.goal_id === filterGoalId)

  /* ── Upload ─────────────────────────────────────────── */
  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const goalId = filterGoalId === 'all' ? null : filterGoalId
        const result = await uploadGoalImage(file, goalId, '')
        if (!result) showToast('Error al subir imagen')
      }
      showToast(`${files.length > 1 ? files.length + ' imágenes agregadas' : 'Imagen agregada'} ✓`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  /* ── Guardar caption ────────────────────────────────── */
  async function saveCaption() {
    if (!editCaption) return
    await updateImageCaption(editCaption.id, editCaption.text)
    setEditCaption(null)
    showToast('Caption guardado ✓')
  }

  /* ── Eliminar imagen ────────────────────────────────── */
  async function handleDelete(imageId) {
    if (!confirm('¿Eliminar esta imagen del Vision Board?')) return
    await deleteGoalImage(imageId)
    showToast('Imagen eliminada')
  }

  if (goalsLoading) {
    return <div className="cnt"><div className="empty">Cargando…</div></div>
  }

  return (
    <div className="cnt">

      {/* ── Barra superior ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={goBack}
          style={{ background: 'var(--card)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16, color: 'var(--text2)' }}
        >
          ←
        </button>
        <p style={{ flex: 1, color: 'var(--text2)', fontSize: 13 }}>
          {displayed.length} {displayed.length === 1 ? 'imagen' : 'imágenes'}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
        <button
          className="pill-btn"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo…' : '+ Agregar'}
        </button>
      </div>

      {/* ── Filtro por meta ─────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 8, marginBottom: 16,
        scrollbarWidth: 'none',
      }}>
        <FilterChip
          label="Todas"
          active={filterGoalId === 'all'}
          onClick={() => setFilterGoalId('all')}
        />
        {goals.map(goal => (
          <FilterChip
            key={goal.id}
            label={goal.title}
            active={filterGoalId === goal.id}
            onClick={() => setFilterGoalId(goal.id)}
          />
        ))}
      </div>

      {/* ── Grid de imágenes ────────────────────────────── */}
      {displayed.length === 0 ? (
        <div className="empty" style={{ marginTop: 40 }}>
          {filterGoalId === 'all'
            ? 'Tu Vision Board está vacío.\nTocá "+ Agregar" para subir imágenes motivacionales.'
            : 'No hay imágenes para esta meta todavía.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {displayed.map(img => (
            <ImageCard
              key={img.id}
              img={img}
              goalTitle={goals.find(g => g.id === img.goal_id)?.title}
              isEditingCaption={editCaption?.id === img.id}
              captionText={editCaption?.id === img.id ? editCaption.text : img.caption}
              onOpenLightbox={() => setLightbox(img.url)}
              onStartEditCaption={() => setEditCaption({ id: img.id, text: img.caption || '' })}
              onCaptionChange={text => setEditCaption(prev => ({ ...prev, text }))}
              onSaveCaption={saveCaption}
              onCancelCaption={() => setEditCaption(null)}
              onDelete={() => handleDelete(img.id)}
            />
          ))}
        </div>
      )}

      {/* ── Lightbox ────────────────────────────────────── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <img
            src={lightbox}
            alt="Vista completa"
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              borderRadius: 12, objectFit: 'contain',
            }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: '50%',
              width: 36, height: 36,
              color: '#fff', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Caption editor modal ─────────────────────────── */}
      {editCaption && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: 'var(--bg)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 36px',
          }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Editar caption</div>
            <input
              className="inp"
              placeholder="Escribí algo motivador…"
              value={editCaption.text}
              onChange={e => setEditCaption(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && saveCaption()}
              autoFocus
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="pill-btn"
                onClick={saveCaption}
                style={{ flex: 1, padding: '12px 0' }}
              >
                Guardar
              </button>
              <button
                onClick={() => setEditCaption(null)}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'var(--card)', border: 'none',
                  borderRadius: 12, cursor: 'pointer',
                  color: 'var(--text2)', fontWeight: 600,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


/* ══════════════════════════════════════════════════════════
   COMPONENTE — Tarjeta de imagen
   ══════════════════════════════════════════════════════════ */
function ImageCard({
  img, goalTitle,
  onOpenLightbox, onStartEditCaption, onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      background: 'var(--card)',
      position: 'relative',
    }}>
      {/* Imagen */}
      <div
        style={{ position: 'relative', paddingTop: '120%', cursor: 'pointer' }}
        onClick={onOpenLightbox}
      >
        <img
          src={img.url}
          alt={img.caption || 'Vision board'}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
        {/* Gradiente inferior */}
        {(img.caption || goalTitle) && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            padding: '20px 10px 8px',
          }}>
            {img.caption && (
              <p style={{ color: '#fff', fontSize: 11, lineHeight: 1.3, margin: 0, fontStyle: 'italic' }}>
                {img.caption}
              </p>
            )}
            {goalTitle && (
              <span style={{
                display: 'inline-block', marginTop: 4,
                fontSize: 9, fontWeight: 700,
                background: 'var(--accent)', color: '#fff',
                padding: '2px 6px', borderRadius: 99,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {goalTitle.length > 16 ? goalTitle.slice(0, 14) + '…' : goalTitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Menú de opciones */}
      <button
        onClick={e => { e.stopPropagation(); setMenuOpen(p => !p) }}
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,0.45)',
          border: 'none', borderRadius: '50%',
          width: 28, height: 28,
          color: '#fff', fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ⋯
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute', top: 36, right: 6,
            background: 'var(--bg)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 50, minWidth: 130,
          }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem
            label="✏️ Editar caption"
            onClick={() => { onStartEditCaption(); setMenuOpen(false) }}
          />
          <MenuItem
            label="🗑️ Eliminar"
            danger
            onClick={() => { onDelete(); setMenuOpen(false) }}
          />
        </div>
      )}
    </div>
  )
}


/* ── Sub-componentes pequeños ─────────────────────────────── */

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
        background: active ? 'var(--accent)' : 'var(--card)',
        color:      active ? '#fff'          : 'var(--text2)',
        transition: 'all 0.15s',
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function MenuItem({ label, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%',
        padding: '10px 14px', textAlign: 'left',
        background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 13,
        color: danger ? 'rgb(239,68,68)' : 'var(--text)',
        borderBottom: '1px solid var(--border, rgba(128,128,128,0.1))',
      }}
    >
      {label}
    </button>
  )
}
