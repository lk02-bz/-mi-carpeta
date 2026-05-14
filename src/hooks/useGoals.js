/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useGoals.js                                   ║
║                                                          ║
║  Fase 4 — Metas & Vision Board                           ║
║  Maneja 3 tablas en Supabase:                            ║
║    • goals       → metas (corto/mediano/largo plazo)     ║
║    • goal_items  → checklist de cada meta                ║
║    • goal_images → imágenes del vision board             ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useGoals(user) {

  const [goals,      setGoals]      = useState([])
  const [goalItems,  setGoalItems]  = useState([])   // checklist de TODAS las metas
  const [goalImages, setGoalImages] = useState([])   // imágenes del vision board
  const [goalsLoading, setGoalsLoading] = useState(false)


  /* ── Cargar todo cuando el usuario se loguea ──────────── */
  useEffect(() => {
    if (!user) {
      setGoals([])
      setGoalItems([])
      setGoalImages([])
      return
    }
    fetchAll()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── fetchAll — las 3 tablas en paralelo ──────────────── */
  async function fetchAll() {
    setGoalsLoading(true)
    try {
      const [goalsRes, itemsRes, imgsRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('goal_items')
          .select('*')
          .order('position'),
        supabase
          .from('goal_images')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      if (goalsRes.error) throw goalsRes.error
      if (itemsRes.error) throw itemsRes.error
      if (imgsRes.error)  throw imgsRes.error

      setGoals(goalsRes.data)
      setGoalItems(itemsRes.data)
      setGoalImages(imgsRes.data)
    } catch (err) {
      console.error('useGoals fetchAll:', err.message)
    } finally {
      setGoalsLoading(false)
    }
  }


  /* ══════════════════════════════════════════════════════════
     METAS
     ══════════════════════════════════════════════════════════ */

  /* Crear meta */
  const createGoal = useCallback(async ({ title, type, deadline, notes }) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: user.id, title, type, deadline: deadline || null, notes: notes || '' })
      .select()
      .single()

    if (error) { console.error('createGoal:', error.message); return null }
    setGoals(prev => [data, ...prev])
    return data
  }, [user])


  /* Actualizar meta */
  const updateGoal = useCallback(async (goalId, fields) => {
    const { data, error } = await supabase
      .from('goals')
      .update(fields)
      .eq('id', goalId)
      .select()
      .single()

    if (error) { console.error('updateGoal:', error.message); return }
    setGoals(prev => prev.map(g => g.id === goalId ? data : g))
  }, [])


  /* Eliminar meta (los goal_items y goal_images se borran en cascada) */
  const deleteGoal = useCallback(async (goalId) => {
    // Primero borramos archivos de Storage si la meta tiene cover
    const goal = goals.find(g => g.id === goalId)
    if (goal?.cover_url) {
      await deleteStorageFile(goal.cover_url)
    }
    // También borramos imágenes del vision board asociadas a esta meta
    const imgs = goalImages.filter(i => i.goal_id === goalId)
    for (const img of imgs) {
      await deleteStorageFile(img.url)
    }

    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) { console.error('deleteGoal:', error.message); return }

    setGoals(prev      => prev.filter(g => g.id !== goalId))
    setGoalItems(prev  => prev.filter(i => i.goal_id !== goalId))
    setGoalImages(prev => prev.filter(i => i.goal_id !== goalId))
  }, [goals, goalImages])


  /* ══════════════════════════════════════════════════════════
     CHECKLIST (goal_items)
     ══════════════════════════════════════════════════════════ */

  /* Agregar ítem al checklist */
  const addGoalItem = useCallback(async (goalId, label) => {
    if (!label.trim()) return
    const position = goalItems.filter(i => i.goal_id === goalId).length
    const { data, error } = await supabase
      .from('goal_items')
      .insert({ goal_id: goalId, label: label.trim(), position })
      .select()
      .single()

    if (error) { console.error('addGoalItem:', error.message); return }
    setGoalItems(prev => [...prev, data])
  }, [goalItems])


  /* Marcar/desmarcar ítem */
  const toggleGoalItem = useCallback(async (itemId, currentDone) => {
    const { data, error } = await supabase
      .from('goal_items')
      .update({ done: !currentDone })
      .eq('id', itemId)
      .select()
      .single()

    if (error) { console.error('toggleGoalItem:', error.message); return }
    setGoalItems(prev => prev.map(i => i.id === itemId ? data : i))
  }, [])


  /* Eliminar ítem */
  const deleteGoalItem = useCallback(async (itemId) => {
    const { error } = await supabase.from('goal_items').delete().eq('id', itemId)
    if (error) { console.error('deleteGoalItem:', error.message); return }
    setGoalItems(prev => prev.filter(i => i.id !== itemId))
  }, [])


  /* Obtener ítems de una meta específica */
  const getItemsForGoal = useCallback((goalId) => {
    return goalItems.filter(i => i.goal_id === goalId)
  }, [goalItems])


  /* Calcular % de progreso */
  const getProgress = useCallback((goalId) => {
    const items = goalItems.filter(i => i.goal_id === goalId)
    if (items.length === 0) return 0
    const done = items.filter(i => i.done).length
    return Math.round((done / items.length) * 100)
  }, [goalItems])


  /* ══════════════════════════════════════════════════════════
     IMÁGENES — Vision Board
     ══════════════════════════════════════════════════════════ */

  /* Subir imagen al Storage y guardar registro */
  const uploadGoalImage = useCallback(async (file, goalId = null, caption = '') => {
    if (!user) return null

    // Nombre único: userId/timestamp-nombrearchivo
    const ext      = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${ext}`

    const { error: upError } = await supabase.storage
      .from('goal-images')
      .upload(fileName, file, { upsert: false })

    if (upError) { console.error('uploadGoalImage storage:', upError.message); return null }

    // URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('goal-images')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // Guardar en la tabla goal_images
    const { data, error } = await supabase
      .from('goal_images')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        url: publicUrl,
        caption: caption || '',
      })
      .select()
      .single()

    if (error) { console.error('uploadGoalImage insert:', error.message); return null }
    setGoalImages(prev => [data, ...prev])
    return data
  }, [user])


  /* Actualizar caption de una imagen */
  const updateImageCaption = useCallback(async (imageId, caption) => {
    const { data, error } = await supabase
      .from('goal_images')
      .update({ caption })
      .eq('id', imageId)
      .select()
      .single()

    if (error) { console.error('updateImageCaption:', error.message); return }
    setGoalImages(prev => prev.map(i => i.id === imageId ? data : i))
  }, [])


  /* Eliminar imagen del vision board */
  const deleteGoalImage = useCallback(async (imageId) => {
    const img = goalImages.find(i => i.id === imageId)
    if (img) await deleteStorageFile(img.url)

    const { error } = await supabase.from('goal_images').delete().eq('id', imageId)
    if (error) { console.error('deleteGoalImage:', error.message); return }
    setGoalImages(prev => prev.filter(i => i.id !== imageId))
  }, [goalImages])


  /* Obtener imágenes de una meta o todas las del board */
  const getImagesForGoal = useCallback((goalId) => {
    return goalImages.filter(i => i.goal_id === goalId)
  }, [goalImages])

  const getBoardImages = useCallback(() => {
    return goalImages  // todas, sin filtrar
  }, [goalImages])


  /* ══════════════════════════════════════════════════════════
     COVER de la meta (imagen principal)
     ══════════════════════════════════════════════════════════ */
  const uploadGoalCover = useCallback(async (goalId, file) => {
    if (!user) return

    const ext      = file.name.split('.').pop()
    const fileName = `${user.id}/cover-${goalId}.${ext}`

    // Si ya hay cover, lo reemplazamos (upsert: true)
    const { error: upError } = await supabase.storage
      .from('goal-images')
      .upload(fileName, file, { upsert: true })

    if (upError) { console.error('uploadGoalCover:', upError.message); return }

    const { data: urlData } = supabase.storage
      .from('goal-images')
      .getPublicUrl(fileName)

    // Agregar cache-buster para que React muestre la imagen nueva
    const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await updateGoal(goalId, { cover_url: coverUrl })
  }, [user, updateGoal])


  /* ══════════════════════════════════════════════════════════
     HELPER INTERNO — borrar archivo de Storage por URL
     ══════════════════════════════════════════════════════════ */
  async function deleteStorageFile(publicUrl) {
    try {
      // La URL pública tiene la forma: .../storage/v1/object/public/goal-images/USER_ID/xxx
      // Necesitamos solo la parte después de "goal-images/"
      const marker = '/goal-images/'
      const idx    = publicUrl.indexOf(marker)
      if (idx === -1) return
      const filePath = publicUrl.slice(idx + marker.length).split('?')[0]
      await supabase.storage.from('goal-images').remove([filePath])
    } catch (e) {
      console.warn('deleteStorageFile:', e.message)
    }
  }


  /* ══════════════════════════════════════════════════════════
     RETORNO DEL HOOK
     ══════════════════════════════════════════════════════════ */
  return {
    // Estado
    goals,
    goalItems,
    goalImages,
    goalsLoading,

    // Metas
    createGoal,
    updateGoal,
    deleteGoal,

    // Checklist
    addGoalItem,
    toggleGoalItem,
    deleteGoalItem,
    getItemsForGoal,
    getProgress,

    // Imágenes
    uploadGoalImage,
    updateImageCaption,
    deleteGoalImage,
    getImagesForGoal,
    getBoardImages,
    uploadGoalCover,
  }
}
