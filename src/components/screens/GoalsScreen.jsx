/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/GoalsScreen.jsx                  ║
║                                                          ║
║  Cambios Fase 4.1:                                       ║
║  ✦ navTo('vision') → pushTo('vision')                    ║
║    → el botón ← del TopBar funciona al volver            ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'

const TABS = [
  { key: 'short',  label: '⚡ Corto',  desc: 'Menos de 1 mes'  },
  { key: 'medium', label: '📅 Mediano', desc: '1 – 6 meses'    },
  { key: 'long',   label: '🏔️ Largo',  desc: 'Más de 6 meses'  },
]

export default function GoalsScreen() {
  const {
    goals, goalsLoading,
    createGoal, updateGoal, deleteGoal,
    addGoalItem, toggleGoalItem, deleteGoalItem,
    getItemsForGoal, getProgress,
    uploadGoalCover,
    showToast,
    pushTo,
  } = useApp()

  const [activeTab,   setActiveTab]   = useState('short')
  const [expandedId,  setExpandedId]  = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [newItemText, setNewItemText] = useState({})

  const filtered = goals.filter(g => g.type === activeTab)

  function openCreate() { setEditingGoal(null); setShowModal(true) }
  function openEdit(goal) { setEditingGoal(goal); setShowModal(true) }

  async function handleSave(fields) {
    if (editingGoal) {
      await updateGoal(editingGoal.id, fields)
      showToast('Meta actualizada ✓')
    } else {
      await createGoal({ ...fields, type: activeTab })
      showToast('Meta creada ✓')
    }
    setShowModal(false)
  }

  async function handleDelete(goalId) {
    if (!confirm('¿Eliminar esta meta y todo su contenido?')) return
    await deleteGoal(goalId)
    setExpandedId(null)
    showToast('Meta eliminada')
  }

  async function handleAddItem(goalId) {
    const text = (newItemText[goalId] || '').trim()
    if (!text) return
    await addGoalItem(goalId, text)
    setNewItemText(prev => ({ ...prev, [goalId]: '' }))
  }

  if (goalsLoading) {
    return <div className="cnt"><div className="empty">Cargando metas…</div></div>
  }

  return (
    <div className="cnt">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>
          {TABS.find(t => t.key === activeTab)?.desc}
        </p>
        <button className="pill-btn" onClick={openCreate}>+ Nueva meta</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '8px 4px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: activeTab === tab.key ? 'var(--accent)' : 'var(--card)',
              color:      activeTab === tab.key ? '#fff'          : 'var(--text2)',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          No tenés metas de {TABS.find(t => t.key === activeTab)?.label.split(' ')[1]} plazo.<br />
          Tocá <strong>+ Nueva meta</strong> para crear la primera.
        </div>
      ) : (
        filtered.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            items={getItemsForGoal(goal.id)}
            progress={getProgress(goal.id)}
            expanded={expandedId === goal.id}
            newItemText={newItemText[goal.id] || ''}
            onToggleExpand={() => setExpandedId(prev => prev === goal.id ? null : goal.id)}
            onEdit={() => openEdit(goal)}
            onDelete={() => handleDelete(goal.id)}
            onToggleItem={(itemId, done) => toggleGoalItem(itemId, done)}
            onDeleteItem={(itemId) => deleteGoalItem(itemId)}
            onNewItemChange={(val) => setNewItemText(prev => ({ ...prev, [goal.id]: val }))}
            onAddItem={() => handleAddItem(goal.id)}
            onCoverUpload={(file) => uploadGoalCover(goal.id, file)}
          />
        ))
      )}

      {/* ── Vision Board — ahora pushTo para que el ← funcione ── */}
      <button
        onClick={() => pushTo('vision', { title: 'Vision Board' })}
        style={{
          width: '100%', marginTop: 24, padding: '14px 0',
          borderRadius: 14, border: '1.5px dashed var(--accent)',
          background: 'transparent', color: 'var(--accent)',
          fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}
      >
        🖼️ Abrir Vision Board
      </button>

      {showModal && (
        <GoalModal
          initial={editingGoal}
          activeType={activeTab}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

    </div>
  )
}


function GoalCard({
  goal, items, progress, expanded, newItemText,
  onToggleExpand, onEdit, onDelete,
  onToggleItem, onDeleteItem, onNewItemChange, onAddItem, onCoverUpload,
}) {
  const coverRef   = useRef()
  const doneCount  = items.filter(i => i.done).length
  const totalCount = items.length

  function barColor(pct) {
    if (pct >= 100) return '#22c55e'
    if (pct >= 50)  return 'var(--accent)'
    return 'var(--text2)'
  }

  return (
    <div className="note-row" style={{ padding: 0, overflow: 'hidden' }}>
      {goal.cover_url && (
        <div style={{ position: 'relative', height: 110, overflow: 'hidden' }}>
          <img src={goal.cover_url} alt="portada"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
          }} />
        </div>
      )}

      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="nt" style={{ marginBottom: 2 }}>{goal.title}</div>
            {goal.deadline && <div className="nd">📆 {formatDate(goal.deadline)}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <IconBtn title="Editar"   onClick={onEdit}>✏️</IconBtn>
            <IconBtn title="Expandir" onClick={onToggleExpand}>{expanded ? '▲' : '▼'}</IconBtn>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{doneCount}/{totalCount} completados</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: barColor(progress) }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'var(--card2, rgba(128,128,128,0.15))', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: barColor(progress), borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border, rgba(128,128,128,0.12))' }}>
          {goal.notes && (
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '12px 0 10px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {goal.notes}
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            <div className="sec" style={{ marginBottom: 8 }}>Checklist</div>
            {items.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Sin ítems aún.</div>
            )}
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border, rgba(128,128,128,0.08))' }}>
                <button onClick={() => onToggleItem(item.id, item.done)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.done ? 'var(--accent)' : 'var(--text2)'}`, background: item.done ? 'var(--accent)' : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {item.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span style={{ flex: 1, fontSize: 14, color: item.done ? 'var(--text2)' : 'var(--text)', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                <button onClick={() => onDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text2)', opacity: 0.5, padding: '2px 4px' }}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input className="inp" placeholder="Agregar paso…" value={newItemText} onChange={e => onNewItemChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAddItem()} style={{ flex: 1, fontSize: 13 }} />
              <button className="pill-btn" onClick={onAddItem}>+</button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="sec" style={{ marginBottom: 8 }}>Imagen de portada</div>
            <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) onCoverUpload(f); e.target.value = '' }} />
            <button className="pill-btn" style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border, rgba(128,128,128,0.2))' }} onClick={() => coverRef.current.click()}>
              📷 {goal.cover_url ? 'Cambiar imagen' : 'Agregar imagen'}
            </button>
          </div>

          <button onClick={onDelete} style={{ marginTop: 20, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: 'rgb(239,68,68)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            Eliminar meta
          </button>
        </div>
      )}
    </div>
  )
}


function GoalModal({ initial, activeType, onSave, onClose }) {
  const [title,    setTitle]    = useState(initial?.title    || '')
  const [deadline, setDeadline] = useState(initial?.deadline || '')
  const [notes,    setNotes]    = useState(initial?.notes    || '')
  const [saving,   setSaving]   = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), type: activeType, deadline, notes })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', background: 'var(--bg)', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', boxShadow: '0 -4px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{initial ? 'Editar meta' : 'Nueva meta'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
        </div>
        <label style={labelStyle}>Título *</label>
        <input className="inp" placeholder="¿Qué querés lograr?" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: 14 }} autoFocus />
        <label style={labelStyle}>Fecha límite (opcional)</label>
        <input className="inp" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ marginBottom: 14 }} />
        <label style={labelStyle}>Notas</label>
        <textarea className="inp" placeholder="Describí la meta, motivación, contexto…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none', marginBottom: 20, lineHeight: 1.5 }} />
        <button className="pill-btn" onClick={handleSubmit} disabled={saving || !title.trim()} style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>
          {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear meta'}
        </button>
      </div>
    </div>
  )
}


function IconBtn({ children, onClick, title }) {
  return (
    <button title={title} onClick={onClick} style={{ background: 'var(--card)', border: 'none', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
      {children}
    </button>
  )
}

function formatDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
}
