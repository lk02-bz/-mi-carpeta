/*
╔══════════════════════════════════════════════════════════╗
║  src/context/AppContext.jsx                              ║
║                                                          ║
║  Cambios Fase 3.1.A:                                     ║
║  ✦ Agrega 'stats' a MAIN_SCREEN_TITLES                   ║
╚══════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase }         from '../lib/supabase'
import { useCategories }    from '../hooks/useCategories'
import { useNotes }         from '../hooks/useNotes'
import { useTags }          from '../hooks/useTags'
import { useCalendar }      from '../hooks/useCalendar'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp() debe usarse dentro de <AppProvider>')
  return ctx
}

const MAIN_SCREEN_TITLES = {
  home:     'Mi Carpeta',
  cats:     'Categorías',
  search:   'Buscar',
  calendar: 'Calendario',
  stats:    'Estadísticas',           // ← nuevo Fase 3.1.A
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

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])


  /* ══════════════════════════════════════════════
     DATOS — Integración de hooks
     ══════════════════════════════════════════════ */
  const {
    cats,
    setCats,
    loading:        catsLoading,
    createCategory,
    deleteCategory,
  } = useCategories(user)

  const {
    notes,
    setNotes,
    loading:        notesLoading,
    createNote,
    updateNote,
    toggleFavorite,
    deleteNote,
  } = useNotes(user)

  const {
    tags,
    loading:        tagsLoading,
    createTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
    getTagsForNote,
  } = useTags(user)

  /* ── useCalendar — Fase 3 ────────────────────── */
  const {
    events,
    tasks,
    habits,
    habitLogs,
    calLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    createTask,
    toggleTask,
    deleteTask,
    createHabit,
    deleteHabit,
    toggleHabitLog,
    getEventsForDate,
    getTasksForDate,
    isHabitDone,
  } = useCalendar(user)

  const dataLoading = catsLoading || notesLoading || tagsLoading


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

    // Datos generales
    cats,         setCats,
    notes,        setNotes,
    dataLoading,

    // Operaciones de categorías
    createCategory,
    deleteCategory,

    // Operaciones de apuntes
    createNote,
    updateNote,
    toggleFavorite,
    deleteNote,

    // Tags
    tags,
    createTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
    getTagsForNote,

    // ── Calendario (Fase 3) ───────────────────────
    events,
    tasks,
    habits,
    habitLogs,
    calLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    createTask,
    toggleTask,
    deleteTask,
    createHabit,
    deleteHabit,
    toggleHabitLog,
    getEventsForDate,
    getTasksForDate,
    isHabitDone,

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
