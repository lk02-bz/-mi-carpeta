/*
╔══════════════════════════════════════════════════════════╗
║  src/context/AppContext.jsx — VERSIÓN ACTUALIZADA        ║
║                                                          ║
║  Cambios respecto al Bloque 1:                           ║
║  ✦ Integra useCategories y useNotes                      ║
║  ✦ Elimina los useState de cats/notes (los manejan       ║
║    los hooks ahora)                                      ║
║  ✦ Expone createCategory, deleteCategory, createNote,    ║
║    updateNote, deleteNote en el contexto                 ║
║                                                          ║
║  El resto (auth, navegación, toast) no cambia.           ║
╚══════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase }         from '../lib/supabase'
import { useCategories }    from '../hooks/useCategories'
import { useNotes }         from '../hooks/useNotes'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp() debe usarse dentro de <AppProvider>')
  return ctx
}

const MAIN_SCREEN_TITLES = {
  home:   'Mi Carpeta',
  cats:   'Categorías',
  search: 'Buscar',
}

const HOME_FRAME = { screen: 'home', title: 'Mi Carpeta', catId: null, noteId: null }


export function AppProvider({ children }) {

  /* ══════════════════════════════════════════════
     AUTENTICACIÓN (sin cambios)
     ══════════════════════════════════════════════ */
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  /* Función de logout — la usaremos en el futuro para un botón de salir */
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    // onAuthStateChange detecta el logout y pone user=null automáticamente
  }, [])


  /* ══════════════════════════════════════════════
     DATOS — Integración de hooks
     ══════════════════════════════════════════════
     
     Llamamos a los hooks aquí, dentro del Provider.
     Les pasamos 'user' para que sepan cuándo cargar datos
     (cuando user es null, no hacen nada).
     
     AppProvider ES un componente React, por eso podemos
     llamar hooks dentro de él (regla de hooks: solo en
     componentes o en otros hooks).
  */
  const {
    cats,
    setCats,
    loading:         catsLoading,
    createCategory,
    deleteCategory,
  } = useCategories(user)

  const {
    notes,
    setNotes,
    loading:     notesLoading,
    createNote,
    updateNote,
    deleteNote,
  } = useNotes(user)

  /*
    dataLoading es true si CUALQUIERA de los dos hooks está cargando.
    Usamos el operador || (OR): true si uno o ambos son true.
  */
  const dataLoading = catsLoading || notesLoading


  /* ══════════════════════════════════════════════
     NAVEGACIÓN (sin cambios)
     ══════════════════════════════════════════════ */
  const [nav, setNav] = useState({ stack: [HOME_FRAME] })
  const currentFrame  = nav.stack[nav.stack.length - 1]

  const navTo = useCallback((screen) => {
    setNav({
      stack: [{
        screen,
        title:  MAIN_SCREEN_TITLES[screen] || screen,
        catId:  null,
        noteId: null,
      }]
    })
  }, [])

  const pushTo = useCallback((screen, params = {}) => {
    setNav(prev => {
      const prevFrame = prev.stack[prev.stack.length - 1]
      return {
        stack: [...prev.stack, {
          screen,
          title:  params.title  || '',
          catId:  params.catId  ?? prevFrame.catId,
          noteId: params.noteId ?? null,
        }]
      }
    })
  }, [])

  const goBack = useCallback(() => {
    setNav(prev => {
      if (prev.stack.length <= 1) return prev
      return { stack: prev.stack.slice(0, -1) }
    })
  }, [])


  /* ══════════════════════════════════════════════
     TOAST (sin cambios)
     ══════════════════════════════════════════════ */
  const [toast, setToast] = useState({ msg: '', visible: false })

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2200)
  }, [])


  /* ══════════════════════════════════════════════
     VALOR DEL CONTEXTO
     ══════════════════════════════════════════════ */
  const value = {
    // Auth
    user,
    authLoading,
    logout,

    // Datos
    cats,         setCats,
    notes,        setNotes,
    dataLoading,

    // Operaciones de categorías
    createCategory,  // ({ name, emoji }) → { data, error }
    deleteCategory,  // (catId) → { error }

    // Operaciones de apuntes
    createNote,   // ({ title, content, categoryId }) → { data, error }
    updateNote,   // (noteId, { title?, content?, categoryId? }) → { data, error }
    deleteNote,   // (noteId) → { error }

    // Navegación
    nav,
    currentFrame,
    canGoBack: nav.stack.length > 1,
    navTo,
    pushTo,
    goBack,

    // Toast
    toast,
    showToast,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}