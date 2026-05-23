/*
╔══════════════════════════════════════════════════════════╗
║  src/context/AppContext.jsx                              ║
║                                                          ║
║  Cambios:                                                ║
║  ✦ Agrega aiPanelOpen, openAiPanel, closeAiPanel         ║
║    para comunicar TopBar ↔ EditorScreen                  ║
╚══════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import { supabase }         from '../lib/supabase'
import { useCategories }    from '../hooks/useCategories'
import { useNotes }         from '../hooks/useNotes'
import { useTags }          from '../hooks/useTags'
import { useCalendar }      from '../hooks/useCalendar'
import { useProfile }       from '../hooks/useProfile'
import { useGoals }         from '../hooks/useGoals'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp() debe usarse dentro de <AppProvider>')
  return ctx
}

const MAIN_SCREEN_TITLES = {
  home:      'Mi Carpeta',
  cats:      'Categorías',
  search:    'Buscar',
  calendar:  'Calendario',
  stats:     'Estadísticas',
  profile:   'Perfil',
  goals:     'Mis Metas',
  vision:    'Vision Board',
  asistente: 'Asistente',
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
     DATOS
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
    achievements,
    moveTaskToToday,
    getYesterdayPendingTasks,
    archiveHabit,
    recoverStreak,
    isRecoverable,
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
    assistantName,
    updateAssistantName,
  } = useProfile(user)

  const {
    goals, goalItems, goalImages, goalsLoading,
    createGoal, updateGoal, deleteGoal,
    addGoalItem, toggleGoalItem, deleteGoalItem,
    getItemsForGoal, getProgress,
    uploadGoalImage, updateImageCaption, deleteGoalImage,
    getImagesForGoal, getBoardImages, uploadGoalCover,
  } = useGoals(user)

  const { inicializarNotificaciones } = useNotifications({
    habits, habitLogs, tasks, goals, goalItems, getProgress,
  })

  useEffect(() => {
    if (user && !calLoading && !goalsLoading && habits.length > 0) {
      inicializarNotificaciones()
    }
  }, [user, calLoading, goalsLoading])

  const dataLoading = catsLoading || notesLoading || tagsLoading


  /* ══════════════════════════════════════════════
     PANEL DEL ASISTENTE EN EDITOR
     Permite que TopBar abra el panel del asistente
     que vive en EditorScreen
     ══════════════════════════════════════════════ */
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const openAiPanel  = useCallback(() => setAiPanelOpen(true),  [])
  const closeAiPanel = useCallback(() => setAiPanelOpen(false), [])


  /* ══════════════════════════════════════════════
     NAVEGACIÓN
     ══════════════════════════════════════════════ */
  const [nav, setNav] = useState({ stack: [HOME_FRAME] })
  const currentFrame  = nav.stack[nav.stack.length - 1]

  // Cerrar panel del asistente al navegar
  const navTo = useCallback((screen) => {
    setAiPanelOpen(false)
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
    setAiPanelOpen(false)
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
    setAiPanelOpen(false)
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
    cats, setCats, notes, setNotes, dataLoading,

    // Categorías
    createCategory, deleteCategory,

    // Apuntes
    createNote, updateNote, toggleFavorite, deleteNote, moveCategoryNotes,

    // Tags
    tags, createTag, deleteTag,
    addTagToNote, removeTagFromNote, getTagsForNote,

    // Calendario
    events, tasks, habits, habitLogs, calLoading,
    createEvent, updateEvent, deleteEvent,
    createTask, toggleTask, deleteTask,
    createHabit, deleteHabit, toggleHabitLog,
    getEventsForDate, getTasksForDate, isHabitDone,
    getStreak, achievements, moveTaskToToday,
    getYesterdayPendingTasks, archiveHabit, recoverStreak, isRecoverable,

    // Perfil
    displayName, avatarUrl, accentId, profileSaving, uploadingAvatar,
    updateDisplayName, updateAvatar, changeAccent,
    assistantName, updateAssistantName,

    // Metas & Vision Board
    goals, goalItems, goalImages, goalsLoading,
    createGoal, updateGoal, deleteGoal,
    addGoalItem, toggleGoalItem, deleteGoalItem,
    getItemsForGoal, getProgress,
    uploadGoalImage, updateImageCaption, deleteGoalImage,
    getImagesForGoal, getBoardImages, uploadGoalCover,

    // Navegación
    nav, currentFrame,
    canGoBack: nav.stack.length > 1,
    navTo, pushTo, goBack,

    // Toast
    toast, showToast,

    // Notificaciones
    inicializarNotificaciones,

    // Panel asistente en editor
    aiPanelOpen, openAiPanel, closeAiPanel,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}