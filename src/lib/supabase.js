/*
╔══════════════════════════════════════════════════════════╗
║  src/lib/supabase.js — Cliente de Supabase               ║
║                                                          ║
║  Este archivo crea y exporta UNA ÚNICA instancia del     ║
║  cliente de Supabase. Toda la app usa este mismo objeto  ║
║  para hablar con la base de datos en la nube.            ║
║                                                          ║
║  Patrón "singleton": creamos el cliente una sola vez     ║
║  y lo reutilizamos en todos los archivos que lo importen.║
╚══════════════════════════════════════════════════════════╝
*/

import { createClient } from '@supabase/supabase-js'

/*
  import.meta.env → Así accedemos a las variables de entorno en Vite.
  Son las que definiste en .env.local con el prefijo VITE_.
  En producción (Netlify), estas variables se configuran en el dashboard.
*/
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
  Validación temprana: si faltan las variables, la app falla con un mensaje
  claro en lugar de un error críptico más adelante. Esto te ahorra tiempo
  debugueando.
*/
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '⚠️  Faltan variables de entorno de Supabase.\n' +
    'Creá el archivo .env.local en la raíz del proyecto con:\n' +
    '  VITE_SUPABASE_URL=...\n' +
    '  VITE_SUPABASE_ANON_KEY=...'
  )
}

/*
  createClient() inicializa la conexión a Supabase.
  Este objeto tiene métodos para todo:
    supabase.auth.signIn(...)         → autenticación
    supabase.from('notes').select()   → leer datos
    supabase.from('notes').insert()   → crear datos
    supabase.from('notes').update()   → actualizar datos
    supabase.from('notes').delete()   → eliminar datos
*/
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
