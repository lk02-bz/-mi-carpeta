/*
╔══════════════════════════════════════════════════════════╗
║  src/context/AppContext.jsx                              ║
║                                                          ║
║  Cambios Fase 4:                                         ║
║  ✦ Importa y conecta useGoals                            ║
║  ✦ Agrega 'goals' y 'vision' a MAIN_SCREEN_TITLES        ║
║  ✦ Expone todo el API de metas e imágenes                ║
╚══════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase }         from '../lib/supabase'
import { useCategories }    from '../hooks/useCategories'
import { useNotes }         from '../hooks/useNotes'
import { useTags }          from '../hooks/useTags'
import { useCalendar }      from '../hooks/useCalendar'
import { useProfile }       from '../hooks/useProfile'
import { useGoals }         from '../hooks/useGoals'      // ← nuevo Fase 4

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
  stats:    'Estadísticas',
  profile:  'Perfil',
  goals:    'Mis Metas',        // ← Fase 4
  vision:   'Vision Board',    // ← Fase 4
}

const HOME_FRAME = { screen: 'home', title: 'Mi Carpeta', catId: null, noteId: null }


export function AppProvider({ children }) {

  /* ══════════════════════════════════════════════
     AUTENTICACIÓN
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
     DATOS — hooks de datos
     ══════════════════════════════════════════════ */
  const {
    cats, setCats,
    loading: catsLoading,
    createCategory, deleteCategory,
  } = useCategories(user)

  const {
    notes, setNotes,
    loading: notesLoading,
    createNote, updateNote, toggleFavorite, deleteNote, moveCategoryNotes,
  } = useNotes(user)

  const {
    tags,
    loading: tagsLoading,
    createTag, deleteTag,
    addTagToNote, removeTagFromNote, getTagsForNote,
  } = useTags(user)

  const {
    events, tasks, habits, habitLogs,
    calLoading,
    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,
    getEventsForDate, getTasksForDate, isHabitDone,
    getStreak, 
    achievements,             // ← nuevo
    moveTaskToToday,          // ← nuevo
    getYesterdayPendingTasks, // ← nuevo
    archiveHabit,             // ← nuevo
    recoverStreak,            // ← nuevo
    isRecoverable,            // ← nuevo
  } = useCalendar(user)

  const {
    displayName,
    avatarUrl,
    accentId,
    saving:          profileSaving,
    uploadingAvatar,
    updateDisplayName,
    updateAvatar,
    changeAccent,
  } = useProfile(user)

  /* ── useGoals — nuevo Fase 4 ──────────────────────────── */
  const {
    goals,
    goalItems,
    goalImages,
    goalsLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalItem,
    toggleGoalItem,
    deleteGoalItem,
    getItemsForGoal,
    getProgress,
    uploadGoalImage,
    updateImageCaption,
    deleteGoalImage,
    getImagesForGoal,
    getBoardImages,
    uploadGoalCover,
  } = useGoals(user)

  const dataLoading = catsLoading || notesLoading || tagsLoading


  /* ══════════════════════════════════════════════
     NAVEGACIÓN
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
     TOAST
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
    user, authLoading, logout,

    // Datos
    cats, setCats,
    notes, setNotes,
    dataLoading,

    // Categorías
    createCategory, deleteCategory,

    // Apuntes
    createNote, updateNote, toggleFavorite, deleteNote, moveCategoryNotes,

    // Tags
    tags,
    createTag, deleteTag,
    addTagToNote, removeTagFromNote, getTagsForNote,

    // Calendario
    events, tasks, habits, habitLogs,
    calLoading,
    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,
    getEventsForDate, getTasksForDate, isHabitDone,
    getStreak, 
    achievements,             // ← nuevo
    moveTaskToToday,          // ← nuevo
    getYesterdayPendingTasks, // ← nuevo
    archiveHabit,             // ← nuevo
    recoverStreak,            // ← nuevo
    isRecoverable,            // ← nuevo

    // Perfil
    displayName,
    avatarUrl,
    accentId,
    profileSaving,
    uploadingAvatar,
    updateDisplayName,
    updateAvatar,
    changeAccent,

    // ── Metas & Vision Board (Fase 4) ─────────────────────
    goals,
    goalItems,
    goalImages,
    goalsLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalItem,
    toggleGoalItem,
    deleteGoalItem,
    getItemsForGoal,
    getProgress,
    uploadGoalImage,
    updateImageCaption,
    deleteGoalImage,
    getImagesForGoal,
    getBoardImages,
    uploadGoalCover,

    // Navegación
    nav, currentFrame,
    canGoBack: nav.stack.length > 1,
    navTo, pushTo, goBack,

    // Toast
    toast, showToast,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
