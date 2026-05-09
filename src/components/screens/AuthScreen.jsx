/*
╔══════════════════════════════════════════════════════════╗
║  src/components/screens/AuthScreen.jsx — Login/Registro  ║
║                                                          ║
║  Esta pantalla es la PUERTA de entrada a la app.         ║
║  Si el usuario no está logueado, ve esto.                ║
║  Si se loguea con éxito, Supabase emite un evento que    ║
║  AppContext escucha y actualiza user → la app muestra     ║
║  el contenido principal automáticamente.                 ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthScreen() {
  /*
    mode: controla si mostramos el formulario de login o de registro.
    Con un solo booleano o string podemos reutilizar el mismo formulario
    para ambos casos, cambiando solo el texto y la acción.
  */
  const [mode,     setMode]     = useState('login') // 'login' | 'register'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')      // Mensaje de error visible al usuario
  const [success,  setSuccess]  = useState('')      // Mensaje de éxito (registro)
  const [loading,  setLoading]  = useState(false)   // Deshabilita el botón mientras espera

  /*
    handleSubmit — Maneja el envío del formulario
    
    async/await: como las llamadas a Supabase son asíncronas (necesitan
    ir al servidor y esperar respuesta), usamos async/await para
    escribir el código de forma secuencial y legible.
    
    e.preventDefault() evita que el formulario recargue la página
    (el comportamiento HTML por defecto que no queremos en una SPA).
  */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')    // Limpia error anterior
    setSuccess('')  // Limpia éxito anterior
    setLoading(true)

    try {
      if (mode === 'login') {
        // ── MODO LOGIN ──────────────────────────────────────
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        // Si no hay error, onAuthStateChange en AppContext detecta la nueva
        // sesión y actualiza user → el componente App renderiza la app.
        // No necesitamos hacer nada más acá.

      } else {
        // ── MODO REGISTRO ───────────────────────────────────
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // Supabase envía un email de confirmación por defecto.
        // Podés desactivar esto en: Dashboard → Auth → Settings → Disable email confirmations
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar, luego iniciá sesión.')
      }

    } catch (err) {
      // translateError convierte los mensajes de error (en inglés) al español
      setError(translateError(err.message))
    } finally {
      // finally se ejecuta SIEMPRE (haya error o no)
      setLoading(false)
    }
  }

  // Alterna entre login y registro, limpiando mensajes previos
  function toggleMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
    setSuccess('')
  }

  return (
    /*
      La pantalla de auth tiene su propio div#app para ocupar toda la pantalla.
      Usamos flexbox para centrar verticalmente el formulario.
    */
    <div id="app" style={{ justifyContent: 'center' }}>
      <div className="cnt" style={{ width: '100%' }}>

        {/* ── Encabezado ── */}
        <div style={{ marginBottom: 32 }}>
          <p className="greet-name">Mi Carpeta 📚</p>
          <p className="greet-sub">
            {mode === 'login'
              ? 'Iniciá sesión para continuar'
              : 'Creá tu cuenta gratis'}
          </p>
        </div>

        {/* ── Formulario ── */}
        <form onSubmit={handleSubmit}>

          <div className="fld">
            <label className="lbl">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>

          <div className="fld">
            <label className="lbl">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* ── Mensajes de error o éxito ── */}
          {error && (
            <div style={{
              color: 'var(--danger)',
              fontSize: 13,
              marginBottom: 12,
              padding: '10px 12px',
              background: 'rgba(192,57,43,0.08)',
              borderRadius: 'var(--radius-sm)',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              color: '#16a34a',
              fontSize: 13,
              marginBottom: 12,
              padding: '10px 12px',
              background: 'rgba(22,163,74,0.08)',
              borderRadius: 'var(--radius-sm)',
            }}>
              {success}
            </div>
          )}

          {/*
            disabled={loading} evita que el usuario haga doble-clic y
            envíe el formulario dos veces mientras espera la respuesta.
          */}
          <button className="btn-p" type="submit" disabled={loading}>
            {loading
              ? 'Cargando...'
              : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>

        </form>

        {/* ── Toggle login / registro ── */}
        <button className="btn-s" onClick={toggleMode}>
          {mode === 'login'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>

      </div>
    </div>
  )
}


/*
  translateError — Traduce los errores de Supabase al español
  
  Supabase devuelve mensajes en inglés. Esta función los mapea
  a mensajes amigables en español para el usuario.
*/
function translateError(msg) {
  if (!msg) return 'Ocurrió un error inesperado'
  if (msg.includes('Invalid login credentials'))
    return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed'))
    return 'Confirmá tu email antes de ingresar (revisá tu bandeja de entrada)'
  if (msg.includes('User already registered'))
    return 'Ya existe una cuenta con ese email. Iniciá sesión'
  if (msg.includes('Password should be at least'))
    return 'La contraseña debe tener al menos 6 caracteres'
  if (msg.includes('Unable to validate email'))
    return 'El formato del email no es válido'
  if (msg.includes('signup is disabled'))
    return 'El registro está desactivado. Contactá al administrador'
  // Si no reconocemos el error, mostramos el mensaje original
  return msg
}
