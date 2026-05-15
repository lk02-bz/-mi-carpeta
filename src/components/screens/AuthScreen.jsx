/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AuthScreen.jsx                   ║
║                                                          ║
║  Cambios Fase 5:                                         ║
║  ✦ Identidad visual — logo, nombre, frase motivacional   ║
║  ✦ Diseño más limpio y expresivo                         ║
║  ✦ Lógica sin cambios (misma funcionalidad de siempre)   ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthScreen() {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar, luego iniciá sesión.')
      }
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
    setSuccess('')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>

      {/* ══════════════════════════════════════════════════
          HERO — identidad visual
          ══════════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>

        {/* Logo */}
        <div style={{
          width: 80, height: 80,
          borderRadius: 22,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38,
          margin: '0 auto 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          📚
        </div>

        {/* Nombre */}
        <h1 style={{
          fontSize: 30,
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          marginBottom: 8,
        }}>
          Mi Carpeta
        </h1>

        {/* Frase motivacional */}
        <p style={{
          fontSize: 14,
          color: 'var(--text2)',
          lineHeight: 1.5,
          maxWidth: 260,
          margin: '0 auto',
        }}>
          {mode === 'login'
            ? 'Tu espacio personal para organizarte y crecer cada día.'
            : 'Empezá hoy a construir tus hábitos y metas.'}
        </p>

      </div>


      {/* ══════════════════════════════════════════════════
          FORMULARIO
          ══════════════════════════════════════════════════ */}
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--card)',
        borderRadius: 20,
        padding: '28px 24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>

        {/* Título del formulario */}
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </div>

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
              autoCapitalize="none"
              style={{
                width: '100%', padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid var(--border, rgba(128,128,128,0.2))',
                background: 'var(--bg)',
                color: 'var(--text)', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{
                width: '100%', padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid var(--border, rgba(128,128,128,0.2))',
                background: 'var(--bg)',
                color: 'var(--text)', fontSize: 15,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              color: '#ef4444', fontSize: 13, marginBottom: 14,
              padding: '10px 12px', background: 'rgba(239,68,68,0.08)',
              borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div style={{
              color: '#16a34a', fontSize: 13, marginBottom: 14,
              padding: '10px 12px', background: 'rgba(22,163,74,0.08)',
              borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)',
              lineHeight: 1.4,
            }}>
              {success}
            </div>
          )}

          {/* Botón principal */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0',
              borderRadius: 12, border: 'none',
              background: loading ? 'var(--text2)' : 'var(--accent)',
              color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>

        </form>

      </div>


      {/* ── Toggle login / registro ──────────────────────── */}
      <button
        onClick={toggleMode}
        style={{
          marginTop: 20,
          background: 'none', border: 'none',
          color: 'var(--accent)',
          fontSize: 14, fontWeight: 600,
          cursor: 'pointer', padding: '8px 16px',
        }}
      >
        {mode === 'login'
          ? '¿No tenés cuenta? Registrate'
          : '¿Ya tenés cuenta? Iniciá sesión'}
      </button>

    </div>
  )
}


function translateError(msg) {
  if (!msg) return 'Ocurrió un error inesperado'
  if (msg.includes('Invalid login credentials'))   return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed'))          return 'Confirmá tu email antes de ingresar (revisá tu bandeja de entrada)'
  if (msg.includes('User already registered'))      return 'Ya existe una cuenta con ese email. Iniciá sesión'
  if (msg.includes('Password should be at least'))  return 'La contraseña debe tener al menos 6 caracteres'
  if (msg.includes('Unable to validate email'))     return 'El formato del email no es válido'
  if (msg.includes('signup is disabled'))           return 'El registro está desactivado. Contactá al administrador'
  return msg
}
