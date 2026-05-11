/*
╔══════════════════════════════════════════════════════════╗
║  src/lib/storage.js                                      ║
║                                                          ║
║  Funciones para subir y borrar archivos en              ║
║  Supabase Storage (bucket: note-files).                  ║
║                                                          ║
║  La ruta de cada archivo en el bucket es:                ║
║  {user_id}/{timestamp}-{nombre-archivo}                  ║
║                                                          ║
║  Esto garantiza:                                         ║
║  • Cada usuario tiene su "carpeta" propia                ║
║  • Sin colisiones aunque dos usuarios suban el           ║
║    mismo nombre de archivo                               ║
║  • Las políticas RLS del bucket usan el primer           ║
║    segmento del path = user_id para validar acceso       ║
╚══════════════════════════════════════════════════════════╝
*/

import { supabase } from './supabase'

const BUCKET = 'note-files'

/*
  Tipos de archivo permitidos y su categoría.
  'image' → se inserta inline en el editor TipTap
  'file'  → se muestra como adjunto en el panel inferior
*/
export const ALLOWED_TYPES = {
  // Imágenes
  'image/jpeg':    'image',
  'image/png':     'image',
  'image/gif':     'image',
  'image/webp':    'image',
  // Documentos
  'application/pdf':                                                      'file',
  'application/msword':                                                   'file',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file',
  'application/vnd.ms-excel':                                            'file',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':  'file',
  'text/plain':    'file',
}

// Límite de tamaño: 10 MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024


/* ── uploadFile ─────────────────────────────────────────────
   Sube un archivo a Supabase Storage.

   @param {File}   file    - El archivo del input o drag & drop
   @param {string} userId  - ID del usuario logueado
   @returns {{ url, path, type, error }}
     url   → URL pública para mostrar/descargar
     path  → ruta en el bucket (para poder borrarlo después)
     type  → 'image' o 'file'
     error → null si todo fue bien, objeto Error si falló
*/
export async function uploadFile(file, userId) {
  // Validar tipo
  const fileType = ALLOWED_TYPES[file.type]
  if (!fileType) {
    return {
      url: null, path: null, type: null,
      error: new Error(`Tipo de archivo no permitido: ${file.type}`)
    }
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    return {
      url: null, path: null, type: null,
      error: new Error('El archivo supera el límite de 10 MB')
    }
  }

  /*
    Construimos el path: userId/timestamp-nombreoriginal
    Date.now() como timestamp evita colisiones si el usuario
    sube dos archivos con el mismo nombre.
    El nombre original se sanitiza para evitar caracteres raros en la URL.
  */
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `${userId}/${Date.now()}-${safeName}`

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,  // No sobreescribir si ya existe (no debería pasar con timestamp)
      })

    if (uploadError) throw uploadError

    /*
      getPublicUrl() devuelve la URL pública del archivo.
      Como el bucket es público, no necesita token de autenticación.
      Esta URL se guarda en la DB y se usa directamente en <img> o en links.
    */
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path)

    return {
      url:   data.publicUrl,
      path,
      type:  fileType,
      error: null,
    }

  } catch (err) {
    console.error('Error al subir archivo:', err.message)
    return { url: null, path: null, type: null, error: err }
  }
}


/* ── deleteFile ─────────────────────────────────────────────
   Borra un archivo del bucket por su path.

   @param {string} path - La ruta guardada al momento de subir
   @returns {{ error }}
*/
export async function deleteFile(path) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([path])

    if (error) throw error
    return { error: null }

  } catch (err) {
    console.error('Error al borrar archivo:', err.message)
    return { error: err }
  }
}


/* ── formatFileSize ─────────────────────────────────────────
   Convierte bytes a texto legible.
   Ej: 1048576 → "1.0 MB"
*/
export function formatFileSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}


/* ── getFileIcon ────────────────────────────────────────────
   Devuelve un emoji según el tipo MIME para mostrar en el panel.
*/
export function getFileIcon(fileType) {
  if (fileType.startsWith('image/'))      return '🖼️'
  if (fileType === 'application/pdf')     return '📄'
  if (fileType.includes('word'))          return '📝'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
  if (fileType === 'text/plain')          return '📃'
  return '📎'
}
