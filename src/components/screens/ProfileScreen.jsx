/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/ProfileScreen.jsx                ║
║                                                          ║
║  Fix: sincronización de nameInput con useEffect          ║
║  Fix: layout del campo nombre (input full width + btn)   ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from 'react'
import { useApp }                      from '../../context/AppContext'
import { ACCENT_PRESETS }              from '../../hooks/useProfile'


export default function ProfileScreen() {
  const {
    user,
    displayName,
    avatarUrl,
    accentId,
    profileSaving,
    uploadingAvatar,
    updateDisplayName,
    updateAvatar,
    changeAccent,
    logout,
    showToast,
  } = useApp()

  const [nameInput, setNameInput] = useState('')
  const fileInputRef = useRef(null)

  /*
    ¿Por qué useEffect y no useState con valor inicial?

    displayName llega vacío la primera vez (el hook useProfile
    lo carga de user_metadata en un useEffect propio).
    Si usamos useState('') y después el displayName llega con valor,
    el input ya no se actualiza porque useState solo toma el valor
    inicial UNA sola vez.

    useEffect con [displayName] como dependencia se ejecuta
    cada vez que displayName cambia → sincroniza el input
    cuando el valor llega desde Supabase.
  */
  useEffect(() => {
    setNameInput(displayName)
  }, [displayName])


  async function handleSaveName() {
    if (!nameInput.trim()) return
    const { error } = await updateDisplayName(nameInput)
    if (error) showToast('Error al guardar el nombre')
    else       showToast('Nombre actualizado ✓')
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes')
      return
    }
    const { error } = await updateAvatar(file)
    if (error) showToast('Error al subir la foto')
    else       showToast('Foto actualizada ✓')
  }

  function getInitials() {
    return (displayName || user?.email || '?').charAt(0).toUpperCase()
  }

  const nameChanged = nameInput.trim() !== displayName

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
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="avatar-img" />
          ) : (
            <span className="avatar-initials">{getInitials()}</span>
          )}
          <div className="avatar-overlay">
            {uploadingAvatar ? '…' : '📷'}
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>


      {/* ── Nombre ── */}
      <div className="sec">Nombre</div>

      {/*
        Layout corregido: input y botón en columna, no en fila.
        El input ocupa todo el ancho. El botón está debajo.
        Esto evita que el botón "Guardar" aplaste al input.
      */}
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

      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 28 }}>
        {user?.email}
      </p>


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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={preset.fg}
                strokeWidth="3"
                width="14"
                height="14"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 28, marginTop: 8 }}>
        El color se aplica a botones, barras y acentos de toda la app.
      </p>


      {/* ── Cuenta ── */}
      <div className="sec">Cuenta</div>

      <button className="btn-danger" onClick={logout}>
        Cerrar sesión
      </button>

    </div>
  )
}