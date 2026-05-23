/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/ProfileScreen.jsx                ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Sección "Asistente" para cambiar el nombre del bot    ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }         from '../../context/AppContext'
import { ACCENT_PRESETS } from '../../hooks/useProfile'

export default function ProfileScreen() {
  const {
    user,
    displayName, avatarUrl, accentId,
    profileSaving, uploadingAvatar,
    updateDisplayName, updateAvatar, changeAccent,
    assistantName, updateAssistantName,
    logout, showToast, pushTo,
  } = useApp()

  const [nameInput,      setNameInput]      = useState('')
  const [assistantInput, setAssistantInput] = useState('')
  const [savingAssist,   setSavingAssist]   = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { setNameInput(displayName)          }, [displayName])
  useEffect(() => { setAssistantInput(assistantName || '') }, [assistantName])

  async function handleSaveName() {
    if (!nameInput.trim()) return
    const { error } = await updateDisplayName(nameInput)
    if (error) showToast('Error al guardar el nombre')
    else       showToast('Nombre actualizado ✓')
  }

  async function handleSaveAssistantName() {
    if (!assistantInput.trim()) return
    setSavingAssist(true)
    const { error } = await updateAssistantName(assistantInput.trim())
    setSavingAssist(false)
    if (error) showToast('Error al guardar')
    else       showToast(`Asistente renombrado a ${assistantInput.trim()} ✓`)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes'); return }
    const { error } = await updateAvatar(file)
    if (error) showToast('Error al subir la foto')
    else       showToast('Foto actualizada ✓')
  }

  function getInitials() {
    return (displayName || user?.email || '?').charAt(0).toUpperCase()
  }

  const nameChanged      = nameInput.trim() !== displayName
  const assistantChanged = assistantInput.trim() !== (assistantName || '')

  return (
    <div className="cnt">

      {/* ── Avatar ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <button
          className="avatar-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Cambiar foto de perfil"
          disabled={uploadingAvatar}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="Avatar" className="avatar-img" />
            : <span className="avatar-initials">{getInitials()}</span>
          }
          <div className="avatar-overlay">{uploadingAvatar ? '…' : '📷'}</div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>


      {/* ── Nombre ── */}
      <div className="sec">Nombre</div>
      <input
        className="profile-input"
        type="text"
        placeholder="Tu nombre"
        value={nameInput}
        onChange={e => setNameInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSaveName()}
        maxLength={40}
        style={{ marginBottom: 8 }}
      />
      <button
        className="btn-p"
        onClick={handleSaveName}
        disabled={profileSaving || !nameInput.trim() || !nameChanged}
        style={{ width: '100%', marginBottom: 6 }}
      >
        {profileSaving ? 'Guardando…' : 'Guardar nombre'}
      </button>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 28 }}>{user?.email}</p>


      {/* ── Asistente ── */}
      <div className="sec">Asistente personal</div>
      <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
        Cambiá el nombre de tu asistente cuando quieras.
      </p>
      <input
        className="profile-input"
        type="text"
        placeholder="Ej: JARVIS, Elías, Sam..."
        value={assistantInput}
        onChange={e => setAssistantInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSaveAssistantName()}
        maxLength={30}
        style={{ marginBottom: 8 }}
      />
      <button
        className="btn-p"
        onClick={handleSaveAssistantName}
        disabled={savingAssist || !assistantInput.trim() || !assistantChanged}
        style={{ width: '100%', marginBottom: 28 }}
      >
        {savingAssist ? 'Guardando…' : `Guardar nombre del asistente`}
      </button>


      {/* ── Tema de color ── */}
      <div className="sec">Tema de color</div>
      <div className="accent-swatches">
        {ACCENT_PRESETS.map(preset => (
          <button
            key={preset.id}
            className={`swatch ${accentId === preset.id ? 'selected' : ''}`}
            style={{ background: preset.accent }}
            onClick={() => changeAccent(preset.id)}
            aria-label={preset.label}
            title={preset.label}
          >
            {accentId === preset.id && (
              <svg viewBox="0 0 24 24" fill="none" stroke={preset.fg} strokeWidth="3" width="14" height="14">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 28, marginTop: 8 }}>
        El color se aplica a botones, barras y acentos de toda la app.
      </p>


      {/* ── Estadísticas ── */}
      <div className="sec">Progreso</div>
      <button
        onClick={() => pushTo('stats', { title: 'Estadísticas' })}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: 12,
          border: '1.5px solid var(--accent)', background: 'transparent',
          color: 'var(--accent)', fontWeight: 600, fontSize: 14,
          cursor: 'pointer', marginBottom: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        📊 Ver mis estadísticas
      </button>


      {/* ── Cuenta ── */}
      <div className="sec">Cuenta</div>
      <button className="btn-danger" onClick={logout}>Cerrar sesión</button>

    </div>
  )
}