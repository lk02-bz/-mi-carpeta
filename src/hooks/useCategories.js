/*
╔══════════════════════════════════════════════════════════╗
║  src/hooks/useCategories.js                              ║
║                                                          ║
║  ¿Qué es un hook personalizado?                          ║
║  Es una función que empieza con "use" y puede usar       ║
║  otros hooks de React (useState, useEffect, etc.).       ║
║  Te permite encapsular lógica reutilizable y sacarla     ║
║  del componente para que quede más limpio.               ║
║                                                          ║
║  Este hook es el "puente" entre React y la tabla         ║
║  "categories" de Supabase. Maneja:                       ║
║    • Cargar categorías cuando el usuario inicia sesión   ║
║    • Insertar las categorías por defecto (primera vez)   ║
║    • Crear una nueva categoría                           ║
║    • Eliminar una categoría (y sus apuntes en cascada)   ║
╚══════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase }           from '../lib/supabase'
import { DEFAULT_CATEGORIES } from '../utils/defaults'

/*
  useCategories(user) recibe el objeto user de Supabase Auth.
  Si user es null (no logueado), el hook no hace nada.
  Cuando user cambia (login/logout), se re-ejecuta automáticamente.
*/
export function useCategories(user) {

  const [cats,    setCats]    = useState([])
  const [loading, setLoading] = useState(false)


  /* ── Efecto: cargar categorías cuando cambia el usuario ──────
     
     El array [user] al final significa "ejecutá este efecto
     cada vez que 'user' cambie". Se ejecuta:
     - Cuando el usuario hace login (user pasa de null a objeto)
     - Cuando el usuario hace logout (user pasa de objeto a null)
     - Una vez al montar si ya hay sesión guardada
  */
  useEffect(() => {
    if (!user) {
      setCats([])  // Si no hay usuario, limpiamos el estado
      return
    }
    fetchCategories()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps


  /* ── fetchCategories — Trae las categorías del usuario ────── */
  async function fetchCategories() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('categories')          // → SELECT * FROM categories
        .select('*')
        .order('sort_order', { ascending: true })   // Ordenadas por posición
        .order('created_at',  { ascending: true })  // Desempate por fecha

      if (error) throw error

      if (data.length === 0) {
        /*
          Primera vez que el usuario entra: no tiene categorías.
          Insertamos las 8 categorías por defecto automáticamente.
          Esto reemplaza la lógica de "DEFAULTS" de la app vanilla
          que usaba localStorage.
        */
        await insertarDefaults()
      } else {
        setCats(data)
      }

    } catch (err) {
      console.error('Error al cargar categorías:', err.message)
    } finally {
      setLoading(false)
    }
  }


  /* ── insertarDefaults — Inserta las categorías iniciales ───── */
  async function insertarDefaults() {
    try {
      /*
        map() transforma el array DEFAULT_CATEGORIES agregando
        los campos que Supabase necesita pero que no estaban
        en la definición original (user_id y sort_order).
      */
      const paraInsertar = DEFAULT_CATEGORIES.map((cat, index) => ({
        name:       cat.name,
        emoji:      cat.emoji,
        user_id:    user.id,   // ID del usuario logueado
        sort_order: index,     // 0, 1, 2, 3... para mantener el orden original
      }))

      const { data, error } = await supabase
        .from('categories')
        .insert(paraInsertar)
        .select() // Pide que devuelva los registros insertados (con sus IDs generados)

      if (error) throw error
      setCats(data)

    } catch (err) {
      console.error('Error al insertar categorías por defecto:', err.message)
    }
  }


  /* ── createCategory — Crea una nueva categoría ──────────────
     
     useCallback memoiza la función para que no se re-cree en
     cada render. Es una optimización que evita renders innecesarios
     en los componentes que usan esta función.

     Patrón de retorno { data, error }:
     El componente que llama a createCategory puede saber si
     funcionó (data tiene valor) o falló (error tiene valor).
  */
  const createCategory = useCallback(async ({ name, emoji }) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name,
          emoji,
          user_id:    user.id,
          sort_order: cats.length, // La nueva categoría va al final
        })
        .select()
        .single() // Como insertamos 1 sola fila, .single() devuelve el objeto directamente
                  // (sin .single() devolvería un array de 1 elemento)

      if (error) throw error

      // Actualiza el estado local SUMANDO la nueva categoría al array existente
      // En vez de volver a hacer fetch (que sería una llamada extra a la red)
      setCats(prev => [...prev, data])
      return { data, error: null }

    } catch (err) {
      console.error('Error al crear categoría:', err.message)
      return { data: null, error: err }
    }
  }, [user, cats.length])


  /* ── deleteCategory — Elimina una categoría ─────────────────
     
     Gracias al ON DELETE CASCADE que definimos en el SQL,
     al eliminar una categoría se eliminan TODOS sus apuntes
     automáticamente en la base de datos.
     Nosotros solo necesitamos limpiar el estado local.
  */
  const deleteCategory = useCallback(async (catId) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId) // → WHERE id = catId

      if (error) throw error

      // filter() crea un nuevo array sin la categoría eliminada
      // (igual que en la app vanilla: nts = nts.filter(...))
      setCats(prev => prev.filter(c => c.id !== catId))
      return { error: null }

    } catch (err) {
      console.error('Error al eliminar categoría:', err.message)
      return { error: err }
    }
  }, [])


  /* ── Valor retornado por el hook ──────────────────────────── */
  return {
    cats,             // Array de categorías del usuario
    setCats,          // Por si algún componente necesita manipularlo directo
    loading,          // true mientras carga (para mostrar skeleton/spinner)
    fetchCategories,  // Para refrescar manualmente si se necesita
    createCategory,   // (name, emoji) → { data, error }
    deleteCategory,   // (catId) → { error }
  }
}