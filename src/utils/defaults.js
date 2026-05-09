/*
╔══════════════════════════════════════════════════════════╗
║  src/utils/defaults.js — Datos iniciales de la app       ║
║                                                          ║
║  Estas categorías se insertan automáticamente en         ║
║  Supabase la primera vez que un usuario nuevo            ║
║  inicia sesión. Reemplaza la lógica de "DEFAULTS"        ║
║  que teníamos en la app vanilla con localStorage.        ║
╚══════════════════════════════════════════════════════════╝

  Diferencia clave con la app original:
  ─────────────────────────────────────
  Antes: { id: 'c1', name: '...', emoji: '...', ts: Date.now() }
  Ahora: { name: '...', emoji: '...' }
  
  ¿Por qué no incluimos 'id' ni 'user_id'?
  Supabase genera el 'id' automáticamente (UUID).
  El 'user_id' se agrega en el hook useCategories al momento
  de insertar, usando el ID del usuario logueado.
*/

export const DEFAULT_CATEGORIES = [
  { name: 'Ingeniería Computación', emoji: '💻' },
  { name: 'Inglés',                 emoji: '🗣️' },
  { name: 'Finanzas',               emoji: '💰' },
  { name: 'Barbería & Productos',   emoji: '✂️' },
  { name: 'Crecimiento Personal',   emoji: '🌱' },
  { name: 'Ideas de Negocios',      emoji: '💡' },
  { name: 'Cocina',                 emoji: '🍳' },
  { name: 'Deporte',                emoji: '💪' },
]
